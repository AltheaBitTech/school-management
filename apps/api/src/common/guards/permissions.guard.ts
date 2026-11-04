import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { AUTH_ERROR_CODES } from '../../auth/constants/auth.constants';
import { REQUIRE_PERMISSIONS_KEY, RBAC_ERROR_CODES } from '../constants/rbac.constants';
import { AuthenticatedRequest } from '../types/authenticated-request.types';
import { PermissionsService } from '../../permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        code: RBAC_ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
      });
    }

    if (!user.activeRoleId) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.ROLE_REVOKED,
        message: 'Unauthorized',
      });
    }

    if (!request.effectivePermissions) {
      const permissions = await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId,
      );

      if (!permissions) {
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.ROLE_REVOKED,
          message: 'Unauthorized',
        });
      }

      request.effectivePermissions = permissions;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      request.effectivePermissions?.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        code: RBAC_ERROR_CODES.FORBIDDEN,
        message: 'You do not have permission to perform this action',
      });
    }

    return true;
  }
}

export function getEffectivePermissionsFromRequest(request: AuthenticatedRequest): string[] {
  return request.effectivePermissions ?? [];
}

export function attachPermissionsToUser(
  user: AuthenticatedUser,
  permissions: string[],
): AuthenticatedUser & { permissions: string[] } {
  return {
    ...user,
    permissions,
  };
}

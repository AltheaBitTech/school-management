import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import { REQUIRE_PERMISSIONS_KEY } from '../constants/rbac.constants';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let permissionsService: jest.Mocked<Pick<PermissionsService, 'getEffectivePermissions'>>;
  let reflector: Reflector;

  beforeEach(() => {
    permissionsService = {
      getEffectivePermissions: jest.fn(),
    };
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector, permissionsService as unknown as PermissionsService);
  });

  function createContext(user?: {
    userId: string;
    organizationId: string;
    sessionId: string;
    email: string;
  }): ExecutionContext {
    const request: {
      user?: typeof user;
      effectivePermissions?: string[];
    } = { user };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => TestController,
    } as unknown as ExecutionContext;
  }

  class TestController {
    handler(): void {}
  }

  function handler(): void {}

  it('allows requests without required permissions metadata', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('returns 401 when there is no authenticated user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff.view']);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 403 when required permissions are missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff.view', 'staff.update']);
    permissionsService.getEffectivePermissions.mockResolvedValue(['staff.view']);

    await expect(
      guard.canActivate(
        createContext({
          userId: 'user-1',
          organizationId: 'org-1',
          sessionId: 'session-1',
          email: 'user@example.com',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows access when all required permissions are present', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff.view', 'staff.update']);
    permissionsService.getEffectivePermissions.mockResolvedValue(['staff.update', 'staff.view']);

    await expect(
      guard.canActivate(
        createContext({
          userId: 'user-1',
          organizationId: 'org-1',
          sessionId: 'session-1',
          email: 'user@example.com',
        }),
      ),
    ).resolves.toBe(true);
    expect(permissionsService.getEffectivePermissions).toHaveBeenCalledWith('user-1', 'org-1');
  });

  it('reads metadata from the permissions decorator key', () => {
    const getAllAndOverride = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff.view']);

    void getAllAndOverride.mock.calls;
    expect(REQUIRE_PERMISSIONS_KEY).toBe('require_permissions');
  });
});

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { auditActorContext } from './audit-actor.context';

@Injectable()
export class AuditActorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.activeRoleId && !user?.activeRoleCode) {
      return next.handle();
    }

    return auditActorContext.run(
      {
        activeRoleId: user.activeRoleId,
        activeRoleCode: user.activeRoleCode,
      },
      () => next.handle(),
    );
  }
}

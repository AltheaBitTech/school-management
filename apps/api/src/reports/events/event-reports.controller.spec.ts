import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventReportsController } from './event-reports.controller';
import { EventReportsService } from './event-reports.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/constants/rbac.constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventReportQueryDto } from './dto/event-report-query.dto';

describe('EventReportsController', () => {
  it('requires the dedicated report permission', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, EventReportsController.prototype.generate)).toEqual([
      'report.event.view',
    ]);
  });

  it('allows and denies access based on report.event.view', async () => {
    const service = { getEffectivePermissions: jest.fn() } as unknown as PermissionsService;
    const guard = new PermissionsGuard(new Reflector(), service);
    const controller = new EventReportsController({} as EventReportsService);
    const request: {
      user: {
        userId: string;
        organizationId: string;
        sessionId: string;
        email: string;
      };
      effectivePermissions?: string[];
    } = {
      user: {
        userId: 'user-1',
        organizationId: 'org-1',
        sessionId: 'session-1',
        email: 'user@example.com',
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => EventReportsController.prototype.generate,
      getClass: () => EventReportsController,
    } as unknown as ExecutionContext;

    service.getEffectivePermissions = jest.fn().mockResolvedValue(['report.event.view']);
    expect(await guard.canActivate(context)).toBe(true);
    expect(controller).toBeDefined();

    request.effectivePermissions = [];
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects client organization and arbitrary query fields', async () => {
    const errors = await validate(
      plainToInstance(EventReportQueryDto, {
        organizationId: 'org-bypass',
        sort: 'createdAt desc',
        where: { status: 'SCHEDULED' },
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['organizationId', 'sort', 'where']),
    );
  });
});

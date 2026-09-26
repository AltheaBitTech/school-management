import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DepartmentsModule } from './departments/departments.module';
import { StaffModule } from './staff/staff.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { NoticesModule } from './notices/notices.module';
import { VisitorsModule } from './visitors/visitors.module';
import { AssetsModule } from './assets/assets.module';
import { FilesModule } from './files/files.module';
import { StudentsModule } from './students/students.module';
import { DocumentsModule } from './documents/documents.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { EventsModule } from './events/events.module';
import { AttendanceReportsModule } from './reports/attendance/attendance-reports.module';
import { LeaveReportsModule } from './reports/leave/leave-reports.module';
import { EventReportsModule } from './reports/events/event-reports.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeesModule } from './fees/fees.module';
import { RbacModule } from './rbac/rbac.module';
import { OrganizationRegistrationsModule } from './organization-registrations/organization-registrations.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StaffSelfModule } from './staff-self/staff-self.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    PermissionsModule,
    HealthModule,
    AuthModule,
    OrganizationRegistrationsModule,
    OnboardingModule,
    DashboardModule,
    StaffSelfModule,
    OrganizationsModule,
    DepartmentsModule,
    StaffModule,
    AttendanceModule,
    LeaveModule,
    ComplaintsModule,
    NoticesModule,
    VisitorsModule,
    AssetsModule,
    FilesModule,
    StudentsModule,
    DocumentsModule,
    ApprovalsModule,
    EventsModule,
    EventReportsModule,
    AttendanceReportsModule,
    LeaveReportsModule,
    AuditModule,
    NotificationsModule,
    FeesModule,
    RbacModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ClassesModule } from './classes/classes.module';
import { DepartmentsModule } from './departments/departments.module';
import { StaffModule } from './staff/staff.module';
import { AttendanceModule } from './attendance/attendance.module';
import { StudentAttendanceModule } from './student-attendance/student-attendance.module';
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
import { FeesReportsModule } from './reports/fees/fees-reports.module';
import { ComplaintsReportsModule } from './reports/complaints/complaints-reports.module';
import { VisitorsReportsModule } from './reports/visitors/visitors-reports.module';
import { EventReportsModule } from './reports/events/event-reports.module';
import { AuditActorInterceptor } from './audit/audit-actor.interceptor';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeesModule } from './fees/fees.module';
import { RbacModule } from './rbac/rbac.module';
import { OrganizationRegistrationsModule } from './organization-registrations/organization-registrations.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CalendarModule } from './calendar/calendar.module';
import { StaffSelfModule } from './staff-self/staff-self.module';
import { StudentSelfModule } from './student-self/student-self.module';
import { CronModule } from './cron/cron.module';
import { FeaturesModule } from './common/features/features.module';
import { OperationalRequestsModule } from './operational-requests/operational-requests.module';
import { ParentSelfModule } from './parent-self/parent-self.module';
import { TransportModule } from './transport/transport.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    AppConfigModule,
    FeaturesModule,
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
    CalendarModule,
    StaffSelfModule,
    StudentSelfModule,
    OrganizationsModule,
    DepartmentsModule,
    ClassesModule,
    StaffModule,
    AttendanceModule,
    StudentAttendanceModule,
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
    FeesReportsModule,
    ComplaintsReportsModule,
    VisitorsReportsModule,
    AuditModule,
    CronModule,
    OperationalRequestsModule,
    ParentSelfModule,
    TransportModule,
    PlatformModule,
    NotificationsModule,
    FeesModule,
    RbacModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditActorInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

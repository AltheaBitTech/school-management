import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { AssetsModule } from '../assets/assets.module';
import { DocumentsModule } from '../documents/documents.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { OrganizationRegistrationsService } from './organization-registrations.service';
import { OrganizationRegistrationsController } from './organization-registrations.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AuthModule,
    RolesModule,
    AssetsModule,
    DocumentsModule,
    ApprovalsModule,
    AuditModule,
    NotificationsModule,
    PermissionsModule,
  ],
  controllers: [OrganizationRegistrationsController],
  providers: [OrganizationRegistrationsService, PermissionsGuard],
  exports: [OrganizationRegistrationsService],
})
export class OrganizationRegistrationsModule {}

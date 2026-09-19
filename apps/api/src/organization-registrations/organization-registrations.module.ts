import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { AssetsModule } from '../assets/assets.module';
import { DocumentsModule } from '../documents/documents.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { OrganizationRegistrationsService } from './organization-registrations.service';
import { OrganizationRegistrationsController } from './organization-registrations.controller';

@Module({
  imports: [PrismaModule, AuthModule, RolesModule, AssetsModule, DocumentsModule, ApprovalsModule],
  controllers: [OrganizationRegistrationsController],
  providers: [OrganizationRegistrationsService],
  exports: [OrganizationRegistrationsService],
})
export class OrganizationRegistrationsModule {}

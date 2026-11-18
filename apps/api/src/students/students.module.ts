import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClassesModule } from '../classes/classes.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { StudentImportService } from './student-import.service';
import { StudentLoginProvisioningService } from './student-login-provisioning.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [PermissionsModule, AuditModule, RolesModule, ClassesModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentImportService, StudentLoginProvisioningService],
  exports: [StudentsService],
})
export class StudentsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { DocumentsModule } from '../documents/documents.module';
import { TransportModule } from '../transport/transport.module';
import { FeesModule } from '../fees/fees.module';
import { StudentsModule } from '../students/students.module';
import { StudentContextService } from './student-context.service';
import { StudentSelfController } from './student-self.controller';
import { StudentSelfService } from './student-self.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    PermissionsModule,
    FeesModule,
    StudentsModule,
    DocumentsModule,
    TransportModule,
  ],
  controllers: [StudentSelfController],
  providers: [StudentContextService, StudentSelfService, PermissionsGuard],
  exports: [StudentContextService, StudentSelfService],
})
export class StudentSelfModule {}

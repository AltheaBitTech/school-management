import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComplaintsReportsController } from './complaints-reports.controller';
import { ComplaintsReportsService } from './complaints-reports.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ComplaintsReportsController],
  providers: [ComplaintsReportsService],
})
export class ComplaintsReportsModule {}

import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { VisitorsReportsController } from './visitors-reports.controller';
import { VisitorsReportsService } from './visitors-reports.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [VisitorsReportsController],
  providers: [VisitorsReportsService],
})
export class VisitorsReportsModule {}

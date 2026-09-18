import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveRequestStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { LEAVE_ERROR_CODES } from './constants/leave.constants';
import {
  calculateAvailableBalance,
  decimalToNumber,
} from './utils/leave.util';

@Injectable()
export class LeaveApprovalIntegrationService {
  async assertLeaveEntityExists(
    tx: Prisma.TransactionClient,
    organizationId: string,
    leaveRequestId: string,
  ): Promise<void> {
    const leaveRequest = await tx.leaveRequest.findFirst({
      where: { id: leaveRequestId, organizationId },
    });

    if (!leaveRequest) {
      throw new NotFoundException({
        code: LEAVE_ERROR_CODES.LEAVE_REQUEST_NOT_FOUND,
        message: 'Leave request not found',
      });
    }
  }

  async finalizeApproval(
    tx: Prisma.TransactionClient,
    organizationId: string,
    leaveRequestId: string,
    approver: AuthenticatedUser,
  ): Promise<void> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "LeaveRequest"
      WHERE id = ${leaveRequestId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND status = ${LeaveRequestStatus.PENDING_APPROVAL}::"LeaveRequestStatus"
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new ConflictException({
        code: LEAVE_ERROR_CODES.INVALID_LEAVE_STATE,
        message: 'Leave request is not pending approval',
      });
    }

    const request = await tx.leaveRequest.findFirstOrThrow({
      where: { id: leaveRequestId, organizationId },
      include: {
        staff: { select: { userId: true } },
        leaveType: true,
      },
    });

    this.assertNotSelfApproval(request.staff.userId, approver.userId);

    if (request.leaveType.tracksBalance) {
      const balance = await tx.leaveBalance.findFirst({
        where: {
          organizationId,
          staffId: request.staffId,
          leaveTypeId: request.leaveTypeId,
          periodStart: { lte: request.startDate },
          periodEnd: { gte: request.startDate },
        },
      });

      if (!balance) {
        throw new BadRequestException({
          code: LEAVE_ERROR_CODES.INSUFFICIENT_LEAVE_BALANCE,
          message: 'No leave balance is configured for this request period',
        });
      }

      await tx.$executeRaw`SELECT id FROM "LeaveBalance" WHERE id = ${balance.id}::uuid FOR UPDATE`;

      const lockedBalance = await tx.leaveBalance.findUniqueOrThrow({
        where: { id: balance.id },
      });
      const available = calculateAvailableBalance(lockedBalance);
      const requestedDays = decimalToNumber(request.duration);

      if (available < requestedDays) {
        throw new BadRequestException({
          code: LEAVE_ERROR_CODES.INSUFFICIENT_LEAVE_BALANCE,
          message: 'Insufficient leave balance',
        });
      }

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          usedAmount: {
            increment: request.duration,
          },
        },
      });
    }

    await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: LeaveRequestStatus.APPROVED,
        decidedAt: new Date(),
        decidedByUserId: approver.userId,
      },
    });
  }

  async finalizeRejection(
    tx: Prisma.TransactionClient,
    organizationId: string,
    leaveRequestId: string,
    approver: AuthenticatedUser,
  ): Promise<void> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "LeaveRequest"
      WHERE id = ${leaveRequestId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND status = ${LeaveRequestStatus.PENDING_APPROVAL}::"LeaveRequestStatus"
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new ConflictException({
        code: LEAVE_ERROR_CODES.INVALID_LEAVE_STATE,
        message: 'Leave request is not pending approval',
      });
    }

    const request = await tx.leaveRequest.findFirstOrThrow({
      where: { id: leaveRequestId, organizationId },
      include: {
        staff: { select: { userId: true } },
      },
    });

    this.assertNotSelfApproval(request.staff.userId, approver.userId);

    await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: LeaveRequestStatus.REJECTED,
        decidedAt: new Date(),
        decidedByUserId: approver.userId,
      },
    });
  }

  private assertNotSelfApproval(
    requesterUserId: string | null | undefined,
    approverUserId: string,
  ): void {
    if (requesterUserId && requesterUserId === approverUserId) {
      throw new ForbiddenException({
        code: LEAVE_ERROR_CODES.SELF_APPROVAL_NOT_ALLOWED,
        message: 'You cannot approve or reject your own leave request',
      });
    }
  }
}

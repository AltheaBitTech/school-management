import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Asset,
  AssetCategory,
  AssetCategoryStatus,
  AssetHistory,
  AssetHistoryEvent,
  AssetMaintenance,
  AssetStatus,
  AssetTransfer,
  DepartmentStatus,
  EmploymentStatus,
  Prisma,
  StudentStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ASSET_WARRANTY_ALERT_WINDOW_DAYS } from '../dashboard/constants/asset-alert.constants';
import { ASSET_CODE_PREFIX, ASSET_ERROR_CODES } from './constants/asset.constants';
import {
  AssignAssetDto,
  CreateAssetDto,
  RetireAssetDto,
  StartMaintenanceDto,
  TransferAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { ensureDefaultAssetCategories } from './utils/asset-category-seed.util';
import { formatAssetCode, parseAssetCodeSequence } from './utils/asset-code.util';
import { assertTrimmedNonEmpty } from './utils/asset-string.util';
import {
  assertValidWarrantyDates,
  parseAssetDate,
  parseOptionalAssetDate,
} from './utils/asset-date.util';

const staffSummarySelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  displayName: true,
} as const;

const studentSummarySelect = {
  id: true,
  studentCode: true,
  firstName: true,
  lastName: true,
  displayName: true,
} as const;

const departmentSummarySelect = {
  id: true,
  name: true,
  code: true,
} as const;

const categorySummarySelect = {
  id: true,
  name: true,
  code: true,
  status: true,
} as const;

const userSummarySelect = {
  id: true,
  email: true,
} as const;

const assetInclude = {
  category: { select: categorySummarySelect },
  department: { select: departmentSummarySelect },
  assignedStaff: { select: staffSummarySelect },
  assignedStudent: { select: studentSummarySelect },
} as const;

const assetDetailInclude = {
  ...assetInclude,
  createdBy: { select: userSummarySelect },
  maintenances: {
    orderBy: { startedAt: 'desc' as const },
    include: {
      createdBy: { select: userSummarySelect },
    },
  },
  transfers: {
    orderBy: { transferredAt: 'desc' as const },
    include: {
      transferredBy: { select: userSummarySelect },
    },
  },
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      actorUser: { select: userSummarySelect },
    },
  },
} as const;

type StaffSummary = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
};

type StudentSummary = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
};

type DepartmentSummary = {
  id: string;
  name: string;
  code: string;
};

type CategorySummary = {
  id: string;
  name: string;
  code: string;
  status: AssetCategoryStatus;
};

type UserSummary = {
  id: string;
  email: string;
};

type AssetWithRelations = Asset & {
  category: CategorySummary;
  department: DepartmentSummary | null;
  assignedStaff: StaffSummary | null;
  assignedStudent: StudentSummary | null;
};

type AssetMaintenanceWithRelations = AssetMaintenance & {
  createdBy: UserSummary;
};

type AssetTransferWithRelations = AssetTransfer & {
  transferredBy: UserSummary;
};

type AssetDetail = AssetWithRelations & {
  createdBy: UserSummary;
  maintenances: AssetMaintenanceWithRelations[];
  transfers: AssetTransferWithRelations[];
  history: Array<
    AssetHistory & {
      actorUser: UserSummary;
    }
  >;
};

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(organizationId: string) {
    await ensureDefaultAssetCategories(this.prisma, organizationId);

    const categories = await this.prisma.assetCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });

    return {
      data: categories.map((category) => this.toCategoryDto(category)),
    };
  }

  async list(organizationId: string, query: ListAssetsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const searchTerm = query.search?.trim();

    let warrantyEndFilter: Prisma.AssetWhereInput['warrantyEndDate'];
    if (query.warrantyAlert) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const windowEnd = new Date(today);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + ASSET_WARRANTY_ALERT_WINDOW_DAYS);
      warrantyEndFilter = { not: null, lte: windowEnd };
    }

    const where: Prisma.AssetWhereInput = {
      organizationId,
      ...(query.status
        ? { status: query.status }
        : query.warrantyAlert
          ? { status: { not: AssetStatus.RETIRED } }
          : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.assignedStaffId ? { assignedStaffId: query.assignedStaffId } : {}),
      ...(query.assignedStudentId ? { assignedStudentId: query.assignedStudentId } : {}),
      ...(warrantyEndFilter ? { warrantyEndDate: warrantyEndFilter } : {}),
      ...(searchTerm
        ? {
            OR: [
              { assetCode: { contains: searchTerm, mode: 'insensitive' } },
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { serialNumber: { contains: searchTerm, mode: 'insensitive' } },
              { barcode: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: assetInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  }

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateAssetDto,
  ): Promise<AssetDetail> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertActiveCategory(tx, organizationId, dto.categoryId);

        if (dto.departmentId) {
          await this.assertActiveDepartment(tx, organizationId, dto.departmentId);
        }

        if (dto.assignedStaffId) {
          await this.assertActiveStaff(tx, organizationId, dto.assignedStaffId);
        }

        const warrantyStartDate = dto.warrantyStartDate
          ? parseAssetDate(dto.warrantyStartDate)
          : null;
        const warrantyEndDate = dto.warrantyEndDate
          ? parseAssetDate(dto.warrantyEndDate)
          : null;
        assertValidWarrantyDates(warrantyStartDate, warrantyEndDate);

        const assetCode = await this.generateAssetCode(tx, organizationId);
        const initialStatus = dto.assignedStaffId
          ? AssetStatus.ASSIGNED
          : AssetStatus.AVAILABLE;

        const asset = await tx.asset.create({
          data: {
            organizationId,
            assetCode,
            categoryId: dto.categoryId,
            name: assertTrimmedNonEmpty(dto.name, 'Asset name'),
            description: dto.description?.trim() || null,
            serialNumber: this.normalizeOptionalString(dto.serialNumber) ?? null,
            barcode: this.normalizeOptionalString(dto.barcode) ?? null,
            qrCode: this.normalizeOptionalString(dto.qrCode) ?? null,
            purchaseDate: dto.purchaseDate ? parseAssetDate(dto.purchaseDate) : null,
            purchaseCost: this.mapPurchaseCost(dto.purchaseCost) ?? null,
            warrantyStartDate,
            warrantyEndDate,
            departmentId: dto.departmentId ?? null,
            location: dto.location?.trim() || null,
            assignedStaffId: dto.assignedStaffId ?? null,
            status: initialStatus,
            createdByUserId: actor.userId,
          },
          include: assetDetailInclude,
        });

        await this.recordHistory(tx, {
          organizationId,
          assetId: asset.id,
          eventType: AssetHistoryEvent.CREATED,
          actorUserId: actor.userId,
          comment: 'Asset created',
        });

        if (dto.assignedStaffId) {
          await this.recordHistory(tx, {
            organizationId,
            assetId: asset.id,
            eventType: AssetHistoryEvent.ASSIGNED,
            actorUserId: actor.userId,
            comment: 'Asset assigned during creation',
          });
        }

        return this.reloadAssetDetail(tx, organizationId, asset.id);
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async findById(organizationId: string, assetId: string): Promise<AssetDetail> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
      include: assetDetailInclude,
    });

    if (!asset) {
      throw new NotFoundException({
        code: ASSET_ERROR_CODES.ASSET_NOT_FOUND,
        message: 'Asset not found',
      });
    }

    return asset;
  }

  async update(
    organizationId: string,
    assetId: string,
    dto: UpdateAssetDto,
  ): Promise<AssetWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Asset"
        WHERE id = ${assetId}::uuid
          AND "organizationId" = ${organizationId}::uuid
        FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        throw new NotFoundException({
          code: ASSET_ERROR_CODES.ASSET_NOT_FOUND,
          message: 'Asset not found',
        });
      }

      const existing = await tx.asset.findFirstOrThrow({
        where: { id: assetId, organizationId },
      });

      if (existing.status === AssetStatus.RETIRED) {
        throw new ConflictException({
          code: ASSET_ERROR_CODES.ASSET_ALREADY_RETIRED,
          message: 'Retired assets cannot be updated',
        });
      }

      const nextWarrantyStartDate =
        dto.warrantyStartDate !== undefined
          ? parseOptionalAssetDate(dto.warrantyStartDate)
          : existing.warrantyStartDate;
      const nextWarrantyEndDate =
        dto.warrantyEndDate !== undefined
          ? parseOptionalAssetDate(dto.warrantyEndDate)
          : existing.warrantyEndDate;
      assertValidWarrantyDates(nextWarrantyStartDate, nextWarrantyEndDate);

      try {
        return await tx.asset.update({
          where: { id: assetId },
          data: {
            ...(dto.name !== undefined
              ? { name: assertTrimmedNonEmpty(dto.name, 'Asset name') }
              : {}),
            ...(dto.description !== undefined
              ? { description: dto.description?.trim() || null }
              : {}),
            ...(dto.serialNumber !== undefined
              ? { serialNumber: this.normalizeOptionalString(dto.serialNumber) ?? null }
              : {}),
            ...(dto.barcode !== undefined
              ? { barcode: this.normalizeOptionalString(dto.barcode) ?? null }
              : {}),
            ...(dto.qrCode !== undefined
              ? { qrCode: this.normalizeOptionalString(dto.qrCode) ?? null }
              : {}),
            ...(dto.purchaseDate !== undefined
              ? { purchaseDate: parseOptionalAssetDate(dto.purchaseDate) ?? null }
              : {}),
            ...(dto.purchaseCost !== undefined
              ? { purchaseCost: this.mapPurchaseCost(dto.purchaseCost) ?? null }
              : {}),
            ...(dto.warrantyStartDate !== undefined
              ? { warrantyStartDate: parseOptionalAssetDate(dto.warrantyStartDate) ?? null }
              : {}),
            ...(dto.warrantyEndDate !== undefined
              ? { warrantyEndDate: parseOptionalAssetDate(dto.warrantyEndDate) ?? null }
              : {}),
            ...(dto.location !== undefined ? { location: dto.location?.trim() || null } : {}),
          },
          include: assetInclude,
        });
      } catch (error: unknown) {
        this.handleUniqueViolation(error);
        throw error;
      }
    });
  }

  async listHistory(organizationId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException({
        code: ASSET_ERROR_CODES.ASSET_NOT_FOUND,
        message: 'Asset not found',
      });
    }

    const history = await this.prisma.assetHistory.findMany({
      where: { organizationId, assetId },
      include: {
        actorUser: { select: userSummarySelect },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: history.map((entry) => this.toHistoryDto(entry)),
    };
  }

  async assign(
    organizationId: string,
    assetId: string,
    actor: AuthenticatedUser,
    dto: AssignAssetDto,
  ): Promise<AssetDetail> {
    const hasStaff = Boolean(dto.staffId);
    const hasStudent = Boolean(dto.studentId);
    if (hasStaff === hasStudent) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_VALIDATION_FAILED,
        message: 'Provide exactly one of staffId or studentId',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const asset = await this.lockAssetForMutation(tx, organizationId, assetId, {
        blockedStatuses: [AssetStatus.RETIRED, AssetStatus.UNDER_MAINTENANCE],
      });

      if (dto.staffId) {
        await this.assertActiveStaff(tx, organizationId, dto.staffId);
      } else if (dto.studentId) {
        await this.assertActiveStudent(tx, organizationId, dto.studentId);
      }

      const isReassignment = dto.staffId
        ? asset.assignedStaffId !== null && asset.assignedStaffId !== dto.staffId
        : asset.assignedStudentId !== null && asset.assignedStudentId !== dto.studentId;

      await tx.asset.update({
        where: { id: assetId },
        data: {
          assignedStaffId: dto.staffId ?? null,
          assignedStudentId: dto.studentId ?? null,
          status: AssetStatus.ASSIGNED,
        },
      });

      await this.recordHistory(tx, {
        organizationId,
        assetId,
        eventType: AssetHistoryEvent.ASSIGNED,
        actorUserId: actor.userId,
        comment: isReassignment
          ? 'Asset reassigned'
          : dto.studentId
            ? 'Asset assigned to student'
            : 'Asset assigned',
      });

      return this.reloadAssetDetail(tx, organizationId, assetId);
    });
  }

  async unassign(
    organizationId: string,
    assetId: string,
    actor: AuthenticatedUser,
  ): Promise<AssetDetail> {
    return this.prisma.$transaction(async (tx) => {
      const asset = await this.lockAssetForMutation(tx, organizationId, assetId, {
        allowedStatuses: [AssetStatus.ASSIGNED],
      });

      if (!asset.assignedStaffId && !asset.assignedStudentId) {
        throw new ConflictException({
          code: ASSET_ERROR_CODES.ASSET_NOT_ASSIGNED,
          message: 'Asset is not assigned',
        });
      }

      await tx.asset.update({
        where: { id: assetId },
        data: {
          assignedStaffId: null,
          assignedStudentId: null,
          status: AssetStatus.AVAILABLE,
        },
      });

      await this.recordHistory(tx, {
        organizationId,
        assetId,
        eventType: AssetHistoryEvent.UNASSIGNED,
        actorUserId: actor.userId,
        comment: 'Asset unassigned',
      });

      return this.reloadAssetDetail(tx, organizationId, assetId);
    });
  }

  async transfer(
    organizationId: string,
    assetId: string,
    actor: AuthenticatedUser,
    dto: TransferAssetDto,
  ): Promise<AssetDetail> {
    if (
      dto.departmentId === undefined &&
      dto.location === undefined &&
      dto.staffId === undefined
    ) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_TRANSFER_INVALID,
        message: 'Transfer requires at least one destination field',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const asset = await this.lockAssetForMutation(tx, organizationId, assetId, {
        blockedStatuses: [AssetStatus.RETIRED, AssetStatus.UNDER_MAINTENANCE],
      });

      const updateData: Prisma.AssetUpdateInput = {};
      let toDepartmentId = asset.departmentId;
      let toLocation = asset.location;
      let toStaffId = asset.assignedStaffId;

      if (dto.departmentId !== undefined) {
        if (dto.departmentId !== null) {
          await this.assertActiveDepartment(tx, organizationId, dto.departmentId);
          updateData.department = { connect: { id: dto.departmentId } };
        } else {
          updateData.department = { disconnect: true };
        }
        toDepartmentId = dto.departmentId;
      }

      if (dto.location !== undefined) {
        toLocation = dto.location?.trim() || null;
        updateData.location = toLocation;
      }

      if (dto.staffId !== undefined) {
        if (dto.staffId !== null) {
          await this.assertActiveStaff(tx, organizationId, dto.staffId);
          updateData.assignedStaff = { connect: { id: dto.staffId } };
          updateData.status = AssetStatus.ASSIGNED;
          toStaffId = dto.staffId;
        } else {
          updateData.assignedStaff = { disconnect: true };
          updateData.status = AssetStatus.AVAILABLE;
          toStaffId = null;
        }
      }

      await tx.asset.update({
        where: { id: assetId },
        data: updateData,
      });

      await tx.assetTransfer.create({
        data: {
          organizationId,
          assetId,
          fromDepartmentId: asset.departmentId,
          toDepartmentId,
          fromLocation: asset.location,
          toLocation,
          fromStaffId: asset.assignedStaffId,
          toStaffId,
          reason: dto.reason?.trim() || null,
          transferredByUserId: actor.userId,
          transferredAt: new Date(),
        },
      });

      await this.recordHistory(tx, {
        organizationId,
        assetId,
        eventType: AssetHistoryEvent.TRANSFERRED,
        actorUserId: actor.userId,
        comment: dto.reason?.trim() || 'Asset transferred',
      });

      return this.reloadAssetDetail(tx, organizationId, assetId);
    });
  }

  async startMaintenance(
    organizationId: string,
    assetId: string,
    actor: AuthenticatedUser,
    dto: StartMaintenanceDto,
  ): Promise<AssetDetail> {
    return this.prisma.$transaction(async (tx) => {
      const asset = await this.lockAssetForMutation(tx, organizationId, assetId, {
        blockedStatuses: [AssetStatus.RETIRED, AssetStatus.UNDER_MAINTENANCE],
      });

      const hadAssignment = asset.assignedStaffId !== null;

      await tx.assetMaintenance.create({
        data: {
          organizationId,
          assetId,
          maintenanceType: dto.maintenanceType,
          description: assertTrimmedNonEmpty(dto.description, 'Maintenance description'),
          startedAt: new Date(),
          cost: this.mapPurchaseCost(dto.cost) ?? null,
          vendorName: dto.vendorName?.trim() || null,
          remarks: dto.remarks?.trim() || null,
          createdByUserId: actor.userId,
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.UNDER_MAINTENANCE,
          assignedStaffId: null,
        },
      });

      await this.recordHistory(tx, {
        organizationId,
        assetId,
        eventType: AssetHistoryEvent.MAINTENANCE_STARTED,
        actorUserId: actor.userId,
        comment: hadAssignment
          ? 'Maintenance started; assignment cleared'
          : 'Maintenance started',
      });

      return this.reloadAssetDetail(tx, organizationId, assetId);
    });
  }

  async completeMaintenance(
    organizationId: string,
    assetId: string,
    maintenanceId: string,
    actor: AuthenticatedUser,
  ): Promise<AssetDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAssetForMutation(tx, organizationId, assetId, {
        allowedStatuses: [AssetStatus.UNDER_MAINTENANCE],
      });

      const maintenance = await tx.assetMaintenance.findFirst({
        where: { id: maintenanceId, organizationId, assetId },
      });

      if (!maintenance) {
        throw new NotFoundException({
          code: ASSET_ERROR_CODES.ASSET_MAINTENANCE_NOT_FOUND,
          message: 'Maintenance record not found',
        });
      }

      if (maintenance.completedAt) {
        throw new ConflictException({
          code: ASSET_ERROR_CODES.ASSET_MAINTENANCE_ALREADY_COMPLETED,
          message: 'Maintenance is already completed',
        });
      }

      await tx.assetMaintenance.update({
        where: { id: maintenanceId },
        data: { completedAt: new Date() },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.AVAILABLE },
      });

      await this.recordHistory(tx, {
        organizationId,
        assetId,
        eventType: AssetHistoryEvent.MAINTENANCE_COMPLETED,
        actorUserId: actor.userId,
        comment: 'Maintenance completed',
      });

      return this.reloadAssetDetail(tx, organizationId, assetId);
    });
  }

  async retire(
    organizationId: string,
    assetId: string,
    actor: AuthenticatedUser,
    dto: RetireAssetDto,
  ): Promise<AssetDetail> {
    return this.prisma.$transaction(async (tx) => {
      const asset = await this.lockAssetForMutation(tx, organizationId, assetId);

      if (asset.status === AssetStatus.RETIRED) {
        throw new ConflictException({
          code: ASSET_ERROR_CODES.ASSET_ALREADY_RETIRED,
          message: 'Asset is already retired',
        });
      }

      const retiredAt = new Date();

      const retirementReason = assertTrimmedNonEmpty(dto.reason, 'Retirement reason');

      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.RETIRED,
          assignedStaffId: null,
          retiredAt,
          retirementReason,
        },
      });

      await this.recordHistory(tx, {
        organizationId,
        assetId,
        eventType: AssetHistoryEvent.RETIRED,
        actorUserId: actor.userId,
        comment: retirementReason,
      });

      return this.reloadAssetDetail(tx, organizationId, assetId);
    });
  }

  toDto(asset: AssetWithRelations | AssetDetail, options?: { includeHistory?: boolean }) {
    const includeHistory = options?.includeHistory ?? 'history' in asset;

    return {
      id: asset.id,
      organizationId: asset.organizationId,
      assetCode: asset.assetCode,
      categoryId: asset.categoryId,
      name: asset.name,
      description: asset.description,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      qrCode: asset.qrCode,
      purchaseDate: asset.purchaseDate?.toISOString() ?? null,
      purchaseCost: this.mapPurchaseCostToNumber(asset.purchaseCost),
      warrantyStartDate: asset.warrantyStartDate?.toISOString() ?? null,
      warrantyEndDate: asset.warrantyEndDate?.toISOString() ?? null,
      departmentId: asset.departmentId,
      location: asset.location,
      assignedStaffId: asset.assignedStaffId,
      assignedStudentId: asset.assignedStudentId,
      status: asset.status,
      retiredAt: asset.retiredAt?.toISOString() ?? null,
      retirementReason: asset.retirementReason,
      createdByUserId: asset.createdByUserId,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
      category: asset.category,
      department: asset.department,
      assignedStaff: asset.assignedStaff,
      assignedStudent: asset.assignedStudent,
      ...('createdBy' in asset ? { createdBy: asset.createdBy } : {}),
      ...('maintenances' in asset
        ? {
            maintenances: asset.maintenances.map((maintenance) =>
              this.toMaintenanceDto(maintenance),
            ),
          }
        : {}),
      ...('transfers' in asset
        ? {
            transfers: asset.transfers.map((transfer) => this.toTransferDto(transfer)),
          }
        : {}),
      ...(includeHistory && 'history' in asset
        ? {
            history: asset.history.map((entry) => this.toHistoryDto(entry)),
          }
        : {}),
    };
  }

  private toCategoryDto(category: AssetCategory) {
    return {
      id: category.id,
      organizationId: category.organizationId,
      name: category.name,
      code: category.code,
      status: category.status,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private toHistoryDto(
    entry: AssetHistory & { actorUser?: UserSummary },
  ) {
    return {
      id: entry.id,
      eventType: entry.eventType,
      comment: entry.comment,
      createdAt: entry.createdAt.toISOString(),
      ...(entry.actorUser ? { actorUser: entry.actorUser } : {}),
    };
  }

  private toMaintenanceDto(maintenance: AssetMaintenanceWithRelations) {
    return {
      id: maintenance.id,
      maintenanceType: maintenance.maintenanceType,
      description: maintenance.description,
      startedAt: maintenance.startedAt.toISOString(),
      completedAt: maintenance.completedAt?.toISOString() ?? null,
      cost: this.mapPurchaseCostToNumber(maintenance.cost),
      vendorName: maintenance.vendorName,
      remarks: maintenance.remarks,
      createdByUserId: maintenance.createdByUserId,
      createdAt: maintenance.createdAt.toISOString(),
      updatedAt: maintenance.updatedAt.toISOString(),
      createdBy: maintenance.createdBy,
    };
  }

  private toTransferDto(transfer: AssetTransferWithRelations) {
    return {
      id: transfer.id,
      fromDepartmentId: transfer.fromDepartmentId,
      toDepartmentId: transfer.toDepartmentId,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      fromStaffId: transfer.fromStaffId,
      toStaffId: transfer.toStaffId,
      reason: transfer.reason,
      transferredByUserId: transfer.transferredByUserId,
      transferredAt: transfer.transferredAt.toISOString(),
      transferredBy: transfer.transferredBy,
    };
  }

  private async generateAssetCode(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':asset'))`;

    const existingCodes = await tx.asset.findMany({
      where: {
        organizationId,
        assetCode: { startsWith: ASSET_CODE_PREFIX },
      },
      select: { assetCode: true },
    });

    const maxSequence = existingCodes.reduce((max, item) => {
      const sequence = parseAssetCodeSequence(item.assetCode);
      return sequence !== null && sequence > max ? sequence : max;
    }, 0);

    return formatAssetCode(maxSequence + 1);
  }

  private async reloadAssetDetail(
    tx: Prisma.TransactionClient,
    organizationId: string,
    assetId: string,
  ): Promise<AssetDetail> {
    return tx.asset.findFirstOrThrow({
      where: { id: assetId, organizationId },
      include: assetDetailInclude,
    });
  }

  private async lockAssetForMutation(
    tx: Prisma.TransactionClient,
    organizationId: string,
    assetId: string,
    options?: {
      allowedStatuses?: AssetStatus[];
      blockedStatuses?: AssetStatus[];
    },
  ): Promise<Asset> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Asset"
      WHERE id = ${assetId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new NotFoundException({
        code: ASSET_ERROR_CODES.ASSET_NOT_FOUND,
        message: 'Asset not found',
      });
    }

    const asset = await tx.asset.findFirstOrThrow({
      where: { id: assetId, organizationId },
    });

    if (asset.status === AssetStatus.RETIRED && !options?.allowedStatuses?.includes(AssetStatus.RETIRED)) {
      throw new ConflictException({
        code: ASSET_ERROR_CODES.ASSET_ALREADY_RETIRED,
        message: 'Asset is retired and cannot be modified',
      });
    }

    if (options?.allowedStatuses && !options.allowedStatuses.includes(asset.status)) {
      throw new ConflictException({
        code: ASSET_ERROR_CODES.ASSET_INVALID_STATE,
        message: `Asset cannot be modified in ${asset.status} status`,
      });
    }

    if (options?.blockedStatuses?.includes(asset.status)) {
      throw new ConflictException({
        code: ASSET_ERROR_CODES.ASSET_INVALID_STATE,
        message: `Asset cannot be modified in ${asset.status} status`,
      });
    }

    return asset;
  }

  private async assertActiveCategory(
    tx: Prisma.TransactionClient,
    organizationId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await tx.assetCategory.findFirst({
      where: { id: categoryId, organizationId },
    });

    if (!category) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_CATEGORY_INVALID,
        message: 'Asset category does not belong to this organization',
      });
    }

    if (category.status !== AssetCategoryStatus.ACTIVE) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_CATEGORY_INACTIVE,
        message: 'Asset category is not active',
      });
    }
  }

  private async assertActiveDepartment(
    tx: Prisma.TransactionClient,
    organizationId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await tx.department.findFirst({
      where: { id: departmentId, organizationId },
    });

    if (!department) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_DEPARTMENT_INVALID,
        message: 'Department does not belong to this organization',
      });
    }

    if (department.status !== DepartmentStatus.ACTIVE) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_DEPARTMENT_INVALID,
        message: 'Department is not active',
      });
    }
  }

  private async assertActiveStudent(
    tx: Prisma.TransactionClient,
    organizationId: string,
    studentId: string,
  ): Promise<void> {
    const student = await tx.student.findFirst({
      where: { id: studentId, organizationId },
    });

    if (!student || student.status !== StudentStatus.ACTIVE) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_STUDENT_INVALID,
        message: 'Active student not found in this organization',
      });
    }
  }

  private async assertActiveStaff(
    tx: Prisma.TransactionClient,
    organizationId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await tx.staff.findFirst({
      where: { id: staffId, organizationId },
    });

    if (!staff) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_STAFF_INVALID,
        message: 'Staff member does not belong to this organization',
      });
    }

    if (staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_STAFF_INVALID,
        message: 'Offboarded staff cannot be assigned to assets',
      });
    }

    if (staff.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new BadRequestException({
        code: ASSET_ERROR_CODES.ASSET_STAFF_INACTIVE,
        message: 'Inactive staff cannot be assigned to assets',
      });
    }
  }

  private async recordHistory(
    tx: Prisma.TransactionClient,
    data: {
      organizationId: string;
      assetId: string;
      eventType: AssetHistoryEvent;
      actorUserId: string;
      comment?: string | null;
    },
  ): Promise<void> {
    await tx.assetHistory.create({
      data: {
        organizationId: data.organizationId,
        assetId: data.assetId,
        eventType: data.eventType,
        actorUserId: data.actorUserId,
        comment: data.comment ?? null,
      },
    });
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target ?? '');

      if (
        target.includes('serialNumber') ||
        target.includes('barcode') ||
        target.includes('qrCode') ||
        target.includes('assetCode')
      ) {
        throw new ConflictException({
          code: ASSET_ERROR_CODES.ASSET_DUPLICATE_IDENTIFIER,
          message: 'An asset with this identifier already exists',
        });
      }
    }
  }

  private normalizeOptionalString(value?: string | null): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private mapPurchaseCost(value?: number | null): Decimal | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return new Decimal(value);
  }

  private mapPurchaseCostToNumber(value: Decimal | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return typeof value === 'number' ? value : value.toNumber();
  }
}

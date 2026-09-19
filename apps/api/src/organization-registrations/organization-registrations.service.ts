import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UserStatus, OrganizationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
import { ensureDefaultAssetCategories } from '../assets/utils/asset-category-seed.util';
import { ensureDefaultDocumentTemplates } from '../documents/utils/document-template-seed.util';
import { ensureDefaultLeaveApprovalWorkflow } from '../approvals/utils/approval-workflow-seed.util';
import { normalizeEmail } from '../auth/utils/email.util';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';
import { OrganizationRegistrationResponseDto } from './dto/organization-registration-response.dto';

@Injectable()
export class OrganizationRegistrationsService {
  constructor(private readonly prisma: PrismaService, private readonly passwordService: PasswordService) {}

  async submitRegistrationRequest(
    dto: CreateOrganizationRegistrationRequestDto,
  ): Promise<OrganizationRegistrationResponseDto> {
    const normalizedEmail = dto.contactEmail.trim().toLowerCase();

    // Check if email is already registered as a user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'This email is already registered in an organization',
      });
    }

    // Check if a pending registration request already exists for this email
    const existingRequest = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { contactEmail: normalizedEmail },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new ConflictException({
        code: 'REGISTRATION_ALREADY_PENDING',
        message: 'A registration request already exists for this email. Check your email for updates.',
      });
    }

    // If a previous request was rejected, allow resubmission by creating a new one
    // (but we need to handle the unique constraint - delete the old one)
    if (existingRequest && (existingRequest.status === 'REJECTED' || existingRequest.status === 'APPROVED')) {
      await this.prisma.organizationRegistrationRequest.delete({
        where: { id: existingRequest.id },
      });
    }

    // Create new registration request
    try {
      const request = await this.prisma.organizationRegistrationRequest.create({
        data: {
          organizationName: dto.organizationName,
          contactEmail: normalizedEmail,
          contactFirstName: dto.contactFirstName,
          contactLastName: dto.contactLastName,
          contactPhone: dto.contactPhone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country || 'India',
          status: 'PENDING',
        },
      });

      return {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        message: 'Registration request submitted successfully. We will review and contact you within 1-2 business days.',
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to submit registration request');
    }
  }

  async findById(id: string) {
    return this.prisma.organizationRegistrationRequest.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.organizationRegistrationRequest.findUnique({
      where: { contactEmail: email.toLowerCase().trim() },
    });
  }

  async findPending() {
    return this.prisma.organizationRegistrationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRegistration(registrationId: string, approvedByUserId: string) {
    const registration = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration request not found');
    }

    if (registration.status !== 'PENDING') {
      throw new ConflictException('Can only approve pending requests');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create organization with generated code
      const code = `school-${Math.random().toString(36).substring(2, 10)}`.toLowerCase();
      const organization = await tx.organization.create({
        data: {
          name: registration.organizationName,
          code,
          status: OrganizationStatus.ACTIVE,
        },
      });

      // Create org settings
      await tx.organizationSettings.create({
        data: { organizationId: organization.id },
      });

      // Create school admin user (password to be set later)
      const adminUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: registration.contactEmail,
          passwordHash: null,
          status: UserStatus.ACTIVE,
        },
      });

      // Seed default role
      const schoolAdminRole = await ensureSchoolAdminRole(tx, organization.id);
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: schoolAdminRole.id,
        },
      });

      // Seed default data structures
      await ensureDefaultAssetCategories(tx, organization.id);
      await ensureDefaultDocumentTemplates(tx, organization.id);
      await ensureDefaultLeaveApprovalWorkflow(tx, organization.id);

      // Update registration record
      await tx.organizationRegistrationRequest.update({
        where: { id: registrationId },
        data: {
          status: 'APPROVED',
          organizationId: organization.id,
          approvedAt: new Date(),
          approvedByUserId,
        },
      });

      return { organization, adminUser };
    });
  }

  async rejectRegistration(registrationId: string, rejectionReason: string) {
    const registration = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration request not found');
    }

    if (registration.status !== 'PENDING') {
      throw new ConflictException('Can only reject pending requests');
    }

    return await this.prisma.organizationRegistrationRequest.update({
      where: { id: registrationId },
      data: {
        status: 'REJECTED',
        rejectionReason,
      },
    });
  }
}

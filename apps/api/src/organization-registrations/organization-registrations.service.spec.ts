import { InstitutionType } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER } from '../notifications/providers/email-provider.interface';
import { PasswordService } from '../auth/services/password.service';
import { OrganizationRegistrationsService } from './organization-registrations.service';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';

describe('OrganizationRegistrationsService', () => {
  let service: OrganizationRegistrationsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationRegistrationsService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
            },
            organization: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            organizationRegistrationRequest: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            record: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({ corsOrigin: 'http://localhost:3000' }),
          },
        },
        {
          provide: EMAIL_PROVIDER,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hash: jest.fn().mockResolvedValue('hashed-admin-password'),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationRegistrationsService>(OrganizationRegistrationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitRegistrationRequest', () => {
    const validDto: CreateOrganizationRegistrationRequestDto = {
      organizationName: 'Test School',
      contactEmail: 'principal@test.edu',
      contactFirstName: 'John',
      contactLastName: 'Doe',
      contactPhone: '9876543210',
      password: 'SchoolAdmin123!',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
    };

    it('should create a pending registration request successfully', async () => {
      const now = new Date();
      const mockRequest = {
        id: 'test-id',
        organizationName: 'Test School',
        preferredOrganizationCode: null,
        contactEmail: 'principal@test.edu',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactPhone: null,
        address: null,
        city: null,
        state: null,
        country: 'India',
        institutionType: InstitutionType.SCHOOL,
        adminPasswordHash: null,
        status: 'PENDING',
        rejectionReason: null,
        approvedAt: null,
        approvedByUserId: null,
        organizationId: null,
        createdAt: now,
        updatedAt: now,
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'create').mockResolvedValue(mockRequest);

      const result = await service.submitRegistrationRequest(validDto);

      expect(result.id).toBe('test-id');
      expect(result.status).toBe('PENDING');
      expect(result.message).toContain('submitted successfully');
      expect(prismaService.organizationRegistrationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationName: validDto.organizationName,
            contactEmail: validDto.contactEmail.toLowerCase(),
            adminPasswordHash: 'hashed-admin-password',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should reject if email is already registered as a user', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({ id: 'user-id' } as never);

      await expect(service.submitRegistrationRequest(validDto)).rejects.toThrow(ConflictException);
    });

    it('should reject if a pending registration request already exists for this email', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue({
        id: 'request-id',
        status: 'PENDING',
      } as never);

      await expect(service.submitRegistrationRequest(validDto)).rejects.toThrow(ConflictException);
    });

    it('should reject if a pending registration request already exists for this phone', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.organizationRegistrationRequest, 'findUnique')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'phone-request-id', status: 'PENDING' } as never);

      await expect(service.submitRegistrationRequest(validDto)).rejects.toMatchObject({
        response: { code: 'REGISTRATION_PHONE_ALREADY_PENDING' },
      });
    });

    it('should remove a prior approved request with the same phone when submitting a new email', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.organizationRegistrationRequest, 'findUnique')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'old-phone-request', status: 'APPROVED' } as never);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'delete').mockResolvedValue({} as never);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'create').mockResolvedValue({
        id: 'new-id',
        status: 'PENDING',
        createdAt: new Date(),
      } as never);

      await service.submitRegistrationRequest(validDto);

      expect(prismaService.organizationRegistrationRequest.delete).toHaveBeenCalledWith({
        where: { id: 'old-phone-request' },
      });
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      const dtoWithWhitespace = {
        ...validDto,
        contactEmail: '  PRINCIPAL@TEST.EDU  ',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'create').mockResolvedValue({
        id: 'test-id',
        organizationName: 'Test School',
        preferredOrganizationCode: null,
        contactEmail: 'principal@test.edu',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactPhone: null,
        address: null,
        city: null,
        state: null,
        country: 'India',
        status: 'PENDING',
        rejectionReason: null,
        approvedAt: null,
        approvedByUserId: null,
        organizationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await service.submitRegistrationRequest(dtoWithWhitespace);

      expect(prismaService.organizationRegistrationRequest.findUnique).toHaveBeenCalledWith({
        where: { contactEmail: 'principal@test.edu' },
      });

      expect(prismaService.organizationRegistrationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactEmail: 'principal@test.edu',
          }),
        }),
      );
    });

    it('should set default country to India if not provided', async () => {
      const dtoWithoutCountry = { ...validDto, country: undefined };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'create').mockResolvedValue({
        id: 'test-id',
        organizationName: 'Test School',
        preferredOrganizationCode: null,
        contactEmail: 'principal@test.edu',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactPhone: null,
        address: null,
        city: null,
        state: null,
        country: 'India',
        status: 'PENDING',
        rejectionReason: null,
        approvedAt: null,
        approvedByUserId: null,
        organizationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await service.submitRegistrationRequest(dtoWithoutCountry);

      expect(prismaService.organizationRegistrationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'India',
          }),
        }),
      );
    });

    it('should delete rejected request and create new one for same email', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue({
        id: 'old-request-id',
        status: 'REJECTED',
      } as never);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'delete').mockResolvedValue({} as never);
      jest.spyOn(prismaService.organizationRegistrationRequest, 'create').mockResolvedValue({
        id: 'new-request-id',
        status: 'PENDING',
        createdAt: new Date(),
      } as never);

      const result = await service.submitRegistrationRequest(validDto);

      expect(prismaService.organizationRegistrationRequest.delete).toHaveBeenCalledWith({
        where: { id: 'old-request-id' },
      });
      expect(result.id).toBe('new-request-id');
    });
  });

  describe('findById', () => {
    it('should find a registration request by ID', async () => {
      const mockRequest = { id: 'test-id', status: 'PENDING' };
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue(mockRequest as never);

      const result = await service.findById('test-id');

      expect(result).toEqual(mockRequest);
      expect(prismaService.organizationRegistrationRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should find a registration request by email', async () => {
      const mockRequest = { id: 'test-id', contactEmail: 'principal@test.edu' };
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue(mockRequest as never);

      const result = await service.findByEmail('PRINCIPAL@TEST.EDU');

      expect(result).toEqual(mockRequest);
      expect(prismaService.organizationRegistrationRequest.findUnique).toHaveBeenCalledWith({
        where: { contactEmail: 'principal@test.edu' },
      });
    });
  });

  describe('findPending', () => {
    it('should find all pending registration requests', async () => {
      const mockRequests = [
        { id: '1', status: 'PENDING' },
        { id: '2', status: 'PENDING' },
      ];
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findMany').mockResolvedValue(mockRequests as never);

      const result = await service.findPending();

      expect(result).toEqual(mockRequests);
      expect(prismaService.organizationRegistrationRequest.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getSignupContext', () => {
    it('should return signup context for approved registration', async () => {
      jest.spyOn(prismaService.organizationRegistrationRequest, 'findUnique').mockResolvedValue({
        id: 'request-id',
        status: 'APPROVED',
        organizationId: 'org-id',
        organizationName: 'Test School',
        preferredOrganizationCode: null,
        contactEmail: 'principal@test.edu',
        organization: { code: 'school-abc123' },
      } as never);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        passwordHash: null,
      } as never);

      const result = await service.getSignupContext('request-id');

      expect(result).toEqual({
        registrationRequestId: 'request-id',
        organizationName: 'Test School',
        contactEmail: 'principal@test.edu',
        organizationCode: 'school-abc123',
        signupCompleted: false,
      });
    });
  });
});

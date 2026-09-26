import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { OrganizationRegistrationsController } from './organization-registrations.controller';
import { OrganizationRegistrationsService } from './organization-registrations.service';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';

describe('OrganizationRegistrationsController', () => {
  let controller: OrganizationRegistrationsController;
  let service: OrganizationRegistrationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationRegistrationsController],
      providers: [
        {
          provide: OrganizationRegistrationsService,
          useValue: {
            submitRegistrationRequest: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationRegistrationsController>(OrganizationRegistrationsController);
    service = module.get<OrganizationRegistrationsService>(OrganizationRegistrationsService);
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
    };

    it('should return 201 with registration response on valid submission', async () => {
      const mockResponse = {
        id: 'test-id',
        status: 'PENDING',
        createdAt: new Date(),
        message: 'Registration request submitted successfully',
      };

      jest.spyOn(service, 'submitRegistrationRequest').mockResolvedValue(mockResponse);

      const result = await controller.submitRegistrationRequest(validDto);

      expect(result).toEqual(mockResponse);
      expect(service.submitRegistrationRequest).toHaveBeenCalledWith(validDto);
    });

    it('should throw ConflictException if email already registered', async () => {
      jest
        .spyOn(service, 'submitRegistrationRequest')
        .mockRejectedValue(new ConflictException('EMAIL_ALREADY_REGISTERED'));

      await expect(controller.submitRegistrationRequest(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending request exists', async () => {
      jest
        .spyOn(service, 'submitRegistrationRequest')
        .mockRejectedValue(new ConflictException('REGISTRATION_ALREADY_PENDING'));

      await expect(controller.submitRegistrationRequest(validDto)).rejects.toThrow(ConflictException);
    });

    it('should handle optional fields', async () => {
      const dtoWithOptionalFields: CreateOrganizationRegistrationRequestDto = {
        organizationName: 'Test School',
        contactEmail: 'principal@test.edu',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactPhone: '9876543210',
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
      };

      const mockResponse = {
        id: 'test-id',
        status: 'PENDING',
        createdAt: new Date(),
        message: 'Registration request submitted successfully',
      };

      jest.spyOn(service, 'submitRegistrationRequest').mockResolvedValue(mockResponse);

      const result = await controller.submitRegistrationRequest(dtoWithOptionalFields);

      expect(result).toEqual(mockResponse);
      expect(service.submitRegistrationRequest).toHaveBeenCalledWith(dtoWithOptionalFields);
    });
  });
});

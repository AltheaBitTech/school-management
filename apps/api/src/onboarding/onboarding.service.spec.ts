import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: {
    organization: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    organizationSettings: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationSettings: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<void>) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(OnboardingService);
  });

  it('returns onboarding state for a school organization', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Test School',
      code: 'school-abc',
      settings: {
        onboardingCompleted: false,
        timezone: 'Asia/Kolkata',
      },
    });

    const state = await service.getState('org-1');

    expect(state).toEqual({
      onboardingCompleted: false,
      organizationId: 'org-1',
      organizationName: 'Test School',
      organizationCode: 'school-abc',
      timezone: 'Asia/Kolkata',
    });
  });

  it('rejects platform organization onboarding', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'platform-1',
      name: 'CampusOps Platform',
      code: PLATFORM_ORGANIZATION_CODE,
      settings: {
        onboardingCompleted: true,
        timezone: 'UTC',
      },
    });

    await expect(service.getState('platform-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates organization setup with valid timezone', async () => {
    prisma.organization.findUnique
      .mockResolvedValueOnce({
        id: 'org-1',
        name: 'Old Name',
        code: 'school-abc',
        settings: {
          onboardingCompleted: false,
          timezone: 'UTC',
        },
      })
      .mockResolvedValueOnce({
        id: 'org-1',
        name: 'New Name',
        code: 'school-abc',
        settings: {
          onboardingCompleted: false,
          timezone: 'Asia/Kolkata',
        },
      });

    const state = await service.updateSetup('org-1', {
      organizationName: 'New Name',
      timezone: 'Asia/Kolkata',
    });

    expect(state.organizationName).toBe('New Name');
    expect(state.timezone).toBe('Asia/Kolkata');
    expect(prisma.organization.update).toHaveBeenCalled();
    expect(prisma.organizationSettings.update).toHaveBeenCalled();
  });

  it('rejects invalid timezone', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Test School',
      code: 'school-abc',
      settings: {
        onboardingCompleted: false,
        timezone: 'UTC',
      },
    });

    await expect(
      service.updateSetup('org-1', { timezone: 'Not/A_Timezone' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finishes onboarding idempotently', async () => {
    prisma.organization.findUnique
      .mockResolvedValueOnce({
        id: 'org-1',
        name: 'Test School',
        code: 'school-abc',
        settings: {
          onboardingCompleted: false,
          timezone: 'UTC',
        },
      })
      .mockResolvedValueOnce({
        id: 'org-1',
        name: 'Test School',
        code: 'school-abc',
        settings: {
          onboardingCompleted: true,
          timezone: 'UTC',
        },
      });

    const state = await service.finish('org-1');

    expect(state.onboardingCompleted).toBe(true);
    expect(prisma.organizationSettings.update).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      data: { onboardingCompleted: true },
    });
  });

  it('does not rewrite onboarding completion when already finished', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Test School',
      code: 'school-abc',
      settings: {
        onboardingCompleted: true,
        timezone: 'UTC',
      },
    });

    const state = await service.finish('org-1');

    expect(state.onboardingCompleted).toBe(true);
    expect(prisma.organizationSettings.update).not.toHaveBeenCalled();
  });

  it('throws when organization is missing', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.getState('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

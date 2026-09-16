import { AssetCategoryStatus, Prisma } from '@prisma/client';
import { DEFAULT_ASSET_CATEGORY_DEFINITIONS } from '../constants/asset.constants';

type PrismaClientLike = Prisma.TransactionClient | {
  assetCategory: Prisma.TransactionClient['assetCategory'];
};

export async function ensureDefaultAssetCategories(
  client: PrismaClientLike,
  organizationId: string,
): Promise<void> {
  for (const definition of DEFAULT_ASSET_CATEGORY_DEFINITIONS) {
    await client.assetCategory.upsert({
      where: {
        organizationId_code: {
          organizationId,
          code: definition.code,
        },
      },
      update: {
        name: definition.name,
      },
      create: {
        organizationId,
        code: definition.code,
        name: definition.name,
        status: AssetCategoryStatus.ACTIVE,
      },
    });
  }
}

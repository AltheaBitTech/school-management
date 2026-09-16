import { ASSET_CODE_PREFIX } from '../constants/asset.constants';

export function formatAssetCode(sequence: number): string {
  return `${ASSET_CODE_PREFIX}${String(sequence).padStart(6, '0')}`;
}

export function parseAssetCodeSequence(code: string): number | null {
  if (!code.startsWith(ASSET_CODE_PREFIX)) {
    return null;
  }

  const suffix = code.slice(ASSET_CODE_PREFIX.length);
  if (!/^[0-9]+$/.test(suffix)) {
    return null;
  }

  const sequence = Number.parseInt(suffix, 10);
  return Number.isNaN(sequence) ? null : sequence;
}

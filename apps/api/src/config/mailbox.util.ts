const ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedMailbox {
  address: string;
  formatted: string;
}

/** Accepts `user@domain` or `Display Name <user@domain>`. */
export function parseMailbox(value: string | undefined | null): ParsedMailbox | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  const wrapped = trimmed.match(/^(?:"[^"]+"|[^<>"]+?)\s*<([^<>\s]+)>$/);
  const address = (wrapped ? wrapped[1] : trimmed).trim();
  if (!ADDRESS_PATTERN.test(address)) {
    return null;
  }

  return { address, formatted: trimmed };
}

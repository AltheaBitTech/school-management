let accessToken: string | null = null;
let accessExpiresAt = 0;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (!token) {
    accessExpiresAt = 0;
  }
}

export function setAccessExpiry(expiresInSeconds: number): void {
  accessExpiresAt = Date.now() + expiresInSeconds * 1000;
}

export function getAccessExpiresAt(): number {
  return accessExpiresAt;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

import { Response } from 'express';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../constants/auth.constants';

export function setRefreshTokenCookie(
  response: Response,
  refreshToken: string,
  maxAgeSeconds: number,
  isProduction: boolean,
): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    // Production hosts the frontend and API as separate origins (two Vercel projects), so the
    // refresh cookie must be sent cross-site. SameSite=None requires Secure, which is only true
    // in production; local dev stays same-site over http, so Lax there is correct and safer.
    sameSite: isProduction ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearRefreshTokenCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
  });
}

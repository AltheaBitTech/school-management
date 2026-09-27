import {
  isCorsOriginAllowed,
  parseCorsOrigins,
  primaryFrontendOrigin,
} from './cors.util';

describe('cors.util', () => {
  it('parses comma-separated origins without trailing slashes', () => {
    expect(
      parseCorsOrigins(
        'https://app.example.com, https://preview.example.com/',
      ),
    ).toEqual(['https://app.example.com', 'https://preview.example.com']);
  });

  it('uses the first non-wildcard origin as primary frontend URL', () => {
    expect(
      primaryFrontendOrigin(
        'https://school-management-ui-ivory.vercel.app,https://school-management-ui-*.vercel.app',
      ),
    ).toBe('https://school-management-ui-ivory.vercel.app');
  });

  it('allows exact and wildcard Vercel preview origins', () => {
    const config =
      'https://school-management-ui-ivory.vercel.app,https://school-management-ui-*.vercel.app';

    expect(isCorsOriginAllowed('https://school-management-ui-ivory.vercel.app', config)).toBe(
      true,
    );
    expect(
      isCorsOriginAllowed('https://school-management-ui-git-main-altheabit1.vercel.app', config),
    ).toBe(true);
    expect(isCorsOriginAllowed('https://evil-school-management-ui-foo.vercel.app', config)).toBe(
      false,
    );
  });

  it('allows web previews when project name is school-management (no -ui- suffix)', () => {
    const config =
      'https://school-management-ui-ivory.vercel.app,https://school-management-*.vercel.app';

    expect(
      isCorsOriginAllowed('https://school-management-8nj1x7pr7-altheabit1.vercel.app', config),
    ).toBe(true);
    expect(isCorsOriginAllowed('https://school-management-ui-ivory.vercel.app', config)).toBe(
      true,
    );
  });
});

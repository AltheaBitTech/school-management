function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface EmailLayoutInput {
  preheader: string;
  heading: string;
  /** Already escaped HTML fragments, such as paragraphs. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}

export function escapeEmailHtml(value: string): string {
  return escapeHtml(value);
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const preheader = escapeHtml(input.preheader);
  const heading = escapeHtml(input.heading);
  const cta = input.cta
    ? `<tr><td style="padding:8px 32px 24px;">
        <a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:12px 22px;background:#0f2044;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(input.cta.label)}</a>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#5c6b7a;">If the button does not open, copy this link into your browser:<br /><span style="word-break:break-all;">${escapeHtml(input.cta.url)}</span></p>
      </td></tr>`
    : '';
  const footer = escapeHtml(
    input.footerNote ?? 'You received this email because of activity on a CampusOps account.',
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1c2430;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f2044;padding:20px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">CampusOps</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f2044;">${heading}</h1>
              ${input.bodyHtml}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:8px 32px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#5c6b7a;">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#1c2430;">${escapeHtml(text)}</p>`;
}

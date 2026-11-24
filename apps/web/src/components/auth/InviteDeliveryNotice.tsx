'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

export interface InviteDelivery {
  loginEmail?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  emailError?: { code: string; message: string } | null;
  deliveryNote?: string;
}

export function InviteDeliveryNotice({
  delivery,
  audience,
}: {
  delivery: InviteDelivery;
  audience: 'staff member' | 'student';
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = delivery.inviteUrl?.trim() ?? '';
  const email = delivery.loginEmail?.trim();

  async function copyLink(): Promise<void> {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Stack spacing={2}>
      {delivery.emailSent && !delivery.emailError ? (
        <Alert severity="success">
          {inviteUrl
            ? `The invite for ${email ?? `this ${audience}`} was logged on the server. Copy the link below. It is valid for 7 days.`
            : `Invite emailed to ${email ?? `this ${audience}`}. The link is valid for 7 days.`}
        </Alert>
      ) : null}

      {delivery.emailError ? (
        <Alert severity="error">
          The account was created, but the email could not be sent. {delivery.emailError.message}
        </Alert>
      ) : null}

      {!delivery.emailSent && !delivery.emailError && delivery.deliveryNote ? (
        <Alert severity="info">{delivery.deliveryNote}</Alert>
      ) : null}

      {inviteUrl ? (
        <>
          <Alert severity={delivery.emailError ? 'warning' : 'info'}>
            Share this link directly if the email did not arrive. It is valid for 7 days.
          </Alert>
          <TextField value={inviteUrl} fullWidth InputProps={{ readOnly: true }} />
          <Button variant="outlined" onClick={() => void copyLink()}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </>
      ) : null}

      <Typography variant="body2" color="text.secondary">
        The {audience} sets their own password from the link. If it expires, they can use Forgot password with the same email.
      </Typography>
    </Stack>
  );
}

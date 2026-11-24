'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PrintPreviewFrame } from '@/components/ui/PrintPreviewFrame';
import { ApiError } from '@/lib/api/client';
import { formatDateTime, getVisitorPass, type VisitorPass } from '@/lib/visitors/visitors-client';

export default function VisitorPassPage() {
  const theme = useTheme();
  const params = useParams<{ id: string }>();
  const [pass, setPass] = useState<VisitorPass | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const data = await getVisitorPass(params.id);
        if (!cancelled) {
          setPass(data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load visitor pass');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading visitor pass" />
      </Box>
    );
  }

  if (errorMessage || !pass) {
    return <Alert severity="error">{errorMessage ?? 'Visitor pass is unavailable'}</Alert>;
  }

  const validDate = new Date(pass.passGeneratedAt).toLocaleDateString();
  const headerBg = theme.palette.brand?.navy ?? theme.palette.primary.dark;
  const accentColor = theme.palette.brand?.navy ?? theme.palette.primary.dark;

  const passContent = (
    <>
      <Box sx={{ bgcolor: headerBg, color: '#fff', px: 3, py: 2 }}>
        <Typography variant="overline" sx={{ opacity: 0.85 }}>
          CampusOps
        </Typography>
        <Typography variant="h6">{pass.organization.name}</Typography>
        {pass.organization.city ? (
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {pass.organization.city}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ px: 3, py: 2, bgcolor: 'primary.light' }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" color={accentColor}>
          VISITOR PASS
        </Typography>
        <Typography variant="subtitle1" textAlign="center" fontWeight={600} sx={{ mt: 0.5 }}>
          {pass.visitor.visitorCode}
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        sx={{ px: 3, py: 3 }}
        alignItems={{ sm: 'center' }}
      >
        <Stack spacing={1.5} flex={1}>
          <Typography variant="h5" fontWeight={700}>
            {pass.visitor.name}
          </Typography>
          <Typography>
            <strong>Host:</strong> {pass.visitor.host}
          </Typography>
          <Typography>
            <strong>Purpose:</strong> {pass.visitor.purpose}
          </Typography>
          <Typography>
            <strong>Mobile:</strong> {pass.visitor.mobile}
          </Typography>
          <Typography>
            <strong>Check-in:</strong> {formatDateTime(pass.visitor.checkInTime)}
          </Typography>
          <Typography>
            <strong>Vehicle:</strong> {pass.visitor.vehicleNumber || '—'}
          </Typography>
        </Stack>

        <Box
          component="img"
          src={pass.qrCodeDataUrl}
          alt="Visitor QR code"
          sx={{ width: 120, height: 120, flexShrink: 0 }}
        />
      </Stack>

      <Box sx={{ px: 3, py: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Valid for today only · {validDate}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {pass.organization.name}
        </Typography>
      </Box>
    </>
  );

  return (
    <PrintPreviewFrame backHref={`/visitors/${params.id}`} backLabel="Visitor details">
      {passContent}
      <Box sx={{ px: 3, pb: 2 }}>
        <Typography component="a" href={`/visitors/${params.id}/badge`} color="primary">
          Print visitor badge
        </Typography>
      </Box>
    </PrintPreviewFrame>
  );
}

'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';
import { getVisitorPass, type VisitorPass } from '@/lib/visitors/visitors-client';

export default function VisitorBadgePage() {
  const params = useParams<{ id: string }>();
  const [pass, setPass] = useState<VisitorPass | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        const data = await getVisitorPass(params.id);
        if (cancelled) {
          return;
        }
        setPass(data);
        if (data.visitor.photoFileId) {
          const token = getAccessToken();
          const response = await fetch(`${getApiV1BaseUrl()}/files/${data.visitor.photoFileId}`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            objectUrl = URL.createObjectURL(await response.blob());
            if (!cancelled) {
              setPhotoUrl(objectUrl);
            }
          }
        }
      } catch (error) {
        if (!cancelled && error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load badge');
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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [params.id]);

  if (isForbidden) {
    return <ForbiddenState />;
  }
  if (isLoading) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Visitor badge" description="Printable badge for the front desk." />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading visitor badge" />
        </Box>
      </Stack>
    );
  }
  if (!pass) {
    return <Alert severity="error">{errorMessage ?? 'Badge is unavailable'}</Alert>;
  }

  const validDate = new Date(pass.passGeneratedAt).toLocaleDateString();

  return (
    <Stack spacing={2} alignItems="flex-start">
      <PageHeader
        title="Visitor badge"
        description="Print this card for the visitor to wear on campus."
        actions={
          <>
            <Button component={Link} href={`/visitors/${params.id}/pass`}>
              Back to pass
            </Button>
            <Button variant="contained" onClick={() => window.print()}>
              Print badge
            </Button>
          </>
        }
      />
      <Box
        sx={{
          width: 340,
          border: '2px solid #0f2044',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#fff',
          '@media print': { boxShadow: 'none' },
        }}
      >
        <Box sx={{ bgcolor: '#0f2044', color: '#fff', px: 2, py: 1 }}>
          <Typography variant="caption">{pass.organization.name}</Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            VISITOR BADGE
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ p: 2 }} alignItems="center">
          {photoUrl ? (
            <Box
              component="img"
              src={photoUrl}
              alt=""
              sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1 }}
            />
          ) : (
            <Box
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'grey.200',
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Typography variant="caption">No photo</Typography>
            </Box>
          )}
          <Stack spacing={0.25}>
            <Typography fontWeight={700}>{pass.visitor.name}</Typography>
            <Typography variant="body2">{pass.visitor.visitorCode}</Typography>
            <Typography variant="body2">Host: {pass.visitor.host}</Typography>
            <Typography variant="caption" color="text.secondary">
              Valid {validDate}
            </Typography>
          </Stack>
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 2 }}>
          <Box component="img" src={pass.qrCodeDataUrl} alt="Visitor QR code" sx={{ width: 96, height: 96 }} />
        </Box>
      </Box>
    </Stack>
  );
}

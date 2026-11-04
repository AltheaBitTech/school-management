'use client';

import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

const PRINT_HIDE_CLASS = 'print-preview-no-print';

interface PrintPreviewFrameProps {
  children: React.ReactNode;
  onPrint?: () => void;
  printLabel?: string;
  previewLabel?: string;
  backHref?: string;
  backLabel?: string;
}

export function PrintPreviewFrame({
  children,
  onPrint,
  printLabel = 'Print',
  previewLabel = 'Print preview',
  backHref,
  backLabel = 'Back',
}: PrintPreviewFrameProps) {
  function handlePrint(): void {
    if (onPrint) {
      onPrint();
      return;
    }
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          .MuiDrawer-root,
          .MuiAppBar-root,
          .${PRINT_HIDE_CLASS} {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>

      <Stack spacing={2} alignItems="stretch" sx={{ py: 1 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          className={PRINT_HIDE_CLASS}
        >
          {backHref ? (
            <Button
              component={Link}
              href={backHref}
              startIcon={<ArrowBackOutlined />}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, mr: { sm: 'auto' } }}
            >
              {backLabel}
            </Button>
          ) : null}
          <Button
            variant="contained"
            startIcon={<PrintOutlined />}
            onClick={() => handlePrint()}
            sx={{ alignSelf: { xs: 'stretch', sm: backHref ? undefined : 'center' }, mx: backHref ? undefined : 'auto' }}
          >
            {printLabel}
          </Button>
        </Stack>

        <Box className={PRINT_HIDE_CLASS}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1, letterSpacing: '0.1em' }}>
            {previewLabel}
          </Typography>
          <Box
            sx={{
              mx: 'auto',
              maxWidth: 720,
              p: { xs: 1.5, sm: 2.5 },
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: 2,
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'none',
            '@media print': {
              display: 'block',
            },
          }}
        >
          {children}
        </Box>
      </Stack>
    </>
  );
}

'use client';

import CloseOutlined from '@mui/icons-material/CloseOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface ImageAttachmentPreviewItem {
  id: string;
  label: string;
  previewUrl: string;
}

interface ImageAttachmentPreviewListProps {
  items: ImageAttachmentPreviewItem[];
  onRemove: (id: string) => void;
}

export function ImageAttachmentPreviewList({ items, onRemove }: ImageAttachmentPreviewListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <Box
          key={item.id}
          sx={{
            position: 'relative',
            width: 88,
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            component="img"
            src={item.previewUrl}
            alt={item.label}
            sx={{ display: 'block', width: 88, height: 88, objectFit: 'cover' }}
          />
          <IconButton
            size="small"
            aria-label={`Remove ${item.label}`}
            onClick={() => onRemove(item.id)}
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <CloseOutlined fontSize="small" />
          </IconButton>
          <Typography
            variant="caption"
            noWrap
            sx={{
              display: 'block',
              px: 0.5,
              py: 0.25,
              bgcolor: 'background.paper',
            }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

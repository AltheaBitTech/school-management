'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChangeEvent, useRef, useState } from 'react';
import { ImageAttachmentPreviewList } from '@/components/ui/ImageAttachmentPreviewList';
import { MAX_UPLOAD_LABEL, uploadFile, type UploadedFile } from '@/lib/files/files-client';

export interface AttachedFileItem {
  id: string;
  label: string;
  previewUrl?: string;
  mimeType: string;
}

interface FileAttachmentUploadFieldProps {
  label: string;
  helperText?: string;
  accept: string;
  maxFiles: number;
  fileIds: string[];
  onChange: (fileIds: string[]) => void;
  allowImagesPreview?: boolean;
}

export function FileAttachmentUploadField({
  label,
  helperText,
  accept,
  maxFiles,
  fileIds,
  onChange,
  allowImagesPreview = true,
}: FileAttachmentUploadFieldProps) {
  const [items, setItems] = useState<AttachedFileItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const itemsRef = useRef(items);
  const uploadingRef = useRef(false);
  itemsRef.current = items;

  function syncIds(nextItems: AttachedFileItem[]): void {
    setItems(nextItems);
    onChange(nextItems.map((item) => item.id));
  }

  function removeFile(id: string): void {
    const removed = items.find((item) => item.id === id);
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    syncIds(items.filter((item) => item.id !== id));
  }

  const imagePreviews = items
    .filter((item) => allowImagesPreview && item.mimeType.startsWith('image/') && item.previewUrl)
    .map((item) => ({
      id: item.id,
      label: item.label,
      previewUrl: item.previewUrl!,
    }));

  const nonImageItems = items.filter((item) => !item.mimeType.startsWith('image/'));

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {helperText ? `${helperText} ` : ''}Maximum file size is {MAX_UPLOAD_LABEL}.
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          component="label"
          variant="outlined"
          size="small"
          disabled={isUploading || fileIds.length >= maxFiles}
          startIcon={isUploading ? <CircularProgress size={16} /> : undefined}
        >
          {isUploading ? 'Uploading…' : 'Add file'}
          <input
            type="file"
            hidden
            accept={accept}
            disabled={isUploading}
            onChange={async (event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file || uploadingRef.current) return;
              uploadingRef.current = true;
              setIsUploading(true);
              setUploadError(null);
              try {
                const uploaded: UploadedFile = await uploadFile(file);
                const previewUrl =
                  allowImagesPreview && uploaded.mimeType.startsWith('image/')
                    ? URL.createObjectURL(file)
                    : undefined;
                syncIds([
                  ...itemsRef.current,
                  {
                    id: uploaded.id,
                    label: uploaded.originalName,
                    previewUrl,
                    mimeType: uploaded.mimeType,
                  },
                ]);
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : 'Upload failed');
              } finally {
                uploadingRef.current = false;
                setIsUploading(false);
              }
            }}
          />
        </Button>
        <Typography variant="caption" color="text.secondary">
          {fileIds.length}/{maxFiles}
        </Typography>
      </Stack>
      {imagePreviews.length > 0 ? (
        <ImageAttachmentPreviewList items={imagePreviews} onRemove={removeFile} />
      ) : null}
      {nonImageItems.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {nonImageItems.map((item) => (
            <Chip key={item.id} label={item.label} onDelete={() => removeFile(item.id)} />
          ))}
        </Stack>
      ) : null}
      {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
    </Stack>
  );
}

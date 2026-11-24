'use client';

import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';
import { MAX_UPLOAD_LABEL, uploadFile } from '@/lib/files/files-client';

interface VisitorPhotoCaptureProps {
  photoFileId?: string;
  onChange: (photoFileId?: string) => void;
}

export function VisitorPhotoCapture({ photoFileId, onChange }: VisitorPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  function stopCamera(): void {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    async function start(): Promise<void> {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('This browser cannot use the camera. Upload a photo instead.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError('Camera access was blocked. You can still upload a photo.');
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen]);

  async function storeFile(file: File, previewUrl: string): Promise<void> {
    if (uploadingRef.current) {
      URL.revokeObjectURL(previewUrl);
      return;
    }
    uploadingRef.current = true;
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadFile(file);
      setLocalPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return previewUrl;
      });
      onChange(uploaded.id);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setUploadError(error instanceof Error ? error.message : 'Could not save the photo.');
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }

  async function captureFrame(): Promise<void> {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setCameraError('The camera is not ready yet. Wait a moment and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Could not capture a frame from the camera.');
      return;
    }
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      setCameraError('Could not capture a frame from the camera.');
      return;
    }
    const file = new File([blob], 'visitor-photo.jpg', { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(blob);
    setCameraOpen(false);
    await storeFile(file, previewUrl);
  }

  function clearPhoto(): void {
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    onChange(undefined);
  }

  const previewSrc = localPreview;

  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        Photo
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Optional. A clear face photo prints on the visitor badge. Upload a file if the camera is unavailable.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        PNG or JPEG, up to {MAX_UPLOAD_LABEL}.
      </Typography>
      {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          src={previewSrc ?? undefined}
          variant="rounded"
          sx={{ width: 72, height: 72, bgcolor: 'action.hover' }}
        >
          {photoFileId && !previewSrc ? 'On file' : null}
        </Avatar>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            type="button"
            variant="outlined"
            size="small"
            startIcon={<PhotoCameraOutlined />}
            disabled={isUploading}
            onClick={() => setCameraOpen(true)}
          >
            Use camera
          </Button>
          <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={isUploading ? <CircularProgress size={16} /> : <UploadFileOutlined />}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading…' : 'Upload photo'}
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void storeFile(file, URL.createObjectURL(file));
              }}
            />
          </Button>
          {photoFileId ? (
            <Button type="button" size="small" color="inherit" onClick={clearPhoto} disabled={isUploading}>
              Remove
            </Button>
          ) : null}
        </Stack>
      </Stack>
      {photoFileId && !previewSrc ? (
        <ExistingPhotoHint fileId={photoFileId} />
      ) : null}

      <Dialog open={cameraOpen} onClose={() => setCameraOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Take a photo</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {cameraError ? <Alert severity="warning">{cameraError}</Alert> : null}
            <Box
              sx={{
                bgcolor: 'grey.900',
                borderRadius: 1,
                overflow: 'hidden',
                aspectRatio: '4 / 3',
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCameraOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void captureFrame()} disabled={Boolean(cameraError) || isUploading}>
            Capture
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ExistingPhotoHint({ fileId }: { fileId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const token = getAccessToken();
    void fetch(`${getApiV1BaseUrl()}/files/${fileId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.blob();
      })
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!src) {
    return (
      <Typography variant="caption" color="text.secondary">
        A photo from an earlier visit is attached.
      </Typography>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt="Visitor"
      sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }}
    />
  );
}

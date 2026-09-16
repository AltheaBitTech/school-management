'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { getAsset, updateAsset, type Asset } from '@/lib/assets/assets-client';
import { ApiError } from '@/lib/api/client';

export default function EditAssetPage() {
  const params = useParams<{ id: string }>();
  const assetId = params.id;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      setIsNotFound(false);

      try {
        const data = await getAsset(assetId);
        if (cancelled) {
          return;
        }
        setAsset(data);
        setName(data.name);
        setDescription(data.description ?? '');
        setSerialNumber(data.serialNumber ?? '');
        setBarcode(data.barcode ?? '');
        setQrCode(data.qrCode ?? '');
        setPurchaseDate(data.purchaseDate ?? '');
        setPurchaseCost(data.purchaseCost != null ? String(data.purchaseCost) : '');
        setWarrantyStartDate(data.warrantyStartDate ?? '');
        setWarrantyEndDate(data.warrantyEndDate ?? '');
        setLocation(data.location ?? '');
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else if (error instanceof ApiError && error.statusCode === 404) {
          setIsNotFound(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load asset');
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
  }, [assetId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!asset || asset.status === 'RETIRED') {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const updated = await updateAsset(assetId, {
        name,
        description: description || null,
        serialNumber: serialNumber || null,
        barcode: barcode || null,
        qrCode: qrCode || null,
        purchaseDate: purchaseDate || null,
        purchaseCost: purchaseCost ? Number(purchaseCost) : null,
        warrantyStartDate: warrantyStartDate || null,
        warrantyEndDate: warrantyEndDate || null,
        location: location || null,
      });
      setAsset(updated);
      setSuccessMessage('Asset updated.');
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else if (error instanceof ApiError && error.statusCode === 409) {
        setErrorMessage(error.message || 'Asset cannot be updated in its current state.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to update asset');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isNotFound) {
    return <Alert severity="warning">Asset not found.</Alert>;
  }

  if (isLoading || !asset) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading asset" />
      </Box>
    );
  }

  if (asset.status === 'RETIRED') {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">Retired assets cannot be edited.</Alert>
        <Button component={Link} href={`/assets/${asset.id}`} variant="outlined">
          Back to asset
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Box>
        <Typography variant="h4" component="h1">
          Edit asset
        </Typography>
        <Typography color="text.secondary">
          {asset.assetCode} · Update metadata only. Use lifecycle actions on the detail page for
          assignment, transfer, maintenance, and retirement.
        </Typography>
      </Box>

      <Stack spacing={2} maxWidth="sm">
        <TextField
          label="Asset name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <TextField
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          multiline
          minRows={2}
        />
        <TextField
          label="Serial number"
          value={serialNumber}
          onChange={(event) => setSerialNumber(event.target.value)}
        />
        <TextField
          label="Barcode"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
        />
        <TextField
          label="QR code"
          value={qrCode}
          onChange={(event) => setQrCode(event.target.value)}
        />
        <TextField
          label="Purchase date"
          type="date"
          value={purchaseDate}
          onChange={(event) => setPurchaseDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Purchase cost"
          type="number"
          value={purchaseCost}
          onChange={(event) => setPurchaseCost(event.target.value)}
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="Warranty start"
          type="date"
          value={warrantyStartDate}
          onChange={(event) => setWarrantyStartDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Warranty end"
          type="date"
          value={warrantyEndDate}
          onChange={(event) => setWarrantyEndDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />

        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
          <Button component={Link} href={`/assets/${asset.id}`}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

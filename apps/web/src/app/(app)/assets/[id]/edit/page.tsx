'use client';

import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { getAsset, updateAsset, type Asset } from '@/lib/assets/assets-client';
import { ApiError } from '@/lib/api/client';

export default function EditAssetPage() {
  const params = useParams<{ id: string }>();
  const assetId = params.id;
  const { showSuccess } = useAppSnackbar();

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

  const warrantyError =
    warrantyStartDate && warrantyEndDate && warrantyEndDate < warrantyStartDate
      ? 'Warranty end must be on or after the warranty start.'
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!asset || asset.status === 'RETIRED' || warrantyError) {
      return;
    }

    setErrorMessage(null);
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
      showSuccess('Asset updated');
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
    return (
      <FormPageShell title="Edit asset" description="This asset is not in your school." icon={Inventory2Outlined}>
        <Alert severity="warning">Asset not found.</Alert>
        <Button component={Link} href="/assets" variant="outlined">
          Back to assets
        </Button>
      </FormPageShell>
    );
  }

  if (isLoading || !asset) {
    return (
      <FormPageShell title="Edit asset" description="Loading asset details." icon={Inventory2Outlined} maxWidth={840}>
        <Skeleton variant="rounded" height={280} />
      </FormPageShell>
    );
  }

  if (asset.status === 'RETIRED') {
    return (
      <FormPageShell
        title="Edit asset"
        description={`${asset.assetCode} is retired.`}
        icon={Inventory2Outlined}
        maxWidth={840}
      >
        <Alert severity="warning">Retired assets cannot be edited.</Alert>
        <Button component={Link} href={`/assets/${asset.id}`} variant="outlined">
          Back to asset
        </Button>
      </FormPageShell>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Edit asset"
        description={`${asset.assetCode}. Update the record here. Assignment, transfer, and retirement stay on the asset page.`}
        icon={Inventory2Outlined}
        maxWidth={840}
        footer={
          <FormPageFooter
            cancelHref={`/assets/${asset.id}`}
            submitLabel="Save changes"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
            submitDisabled={!name.trim() || Boolean(warrantyError)}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <FormSection title="Identity" description="Name and how the item is identified." maxWidth="100%">
          <TextField label="Asset name" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Serial number"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            fullWidth
          />
          <TextField label="Barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} fullWidth />
          <TextField label="QR code" value={qrCode} onChange={(event) => setQrCode(event.target.value)} fullWidth />
        </FormSection>

        <FormSection title="Purchase and warranty" maxWidth="100%">
          <TextField
            label="Purchase date"
            type="date"
            value={purchaseDate}
            onChange={(event) => setPurchaseDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Purchase cost"
            type="number"
            value={purchaseCost}
            onChange={(event) => setPurchaseCost(event.target.value)}
            inputProps={{ min: 0, step: '0.01' }}
            fullWidth
          />
          <TextField
            label="Warranty start"
            type="date"
            value={warrantyStartDate}
            onChange={(event) => setWarrantyStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Warranty end"
            type="date"
            value={warrantyEndDate}
            onChange={(event) => setWarrantyEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(warrantyError)}
            helperText={warrantyError ?? 'Leave both dates empty if there is no warranty.'}
            fullWidth
          />
        </FormSection>

        <FormSection title="Location" maxWidth="100%">
          <TextField label="Location" value={location} onChange={(event) => setLocation(event.target.value)} fullWidth />
        </FormSection>
      </FormPageShell>
    </Box>
  );
}

'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { createAsset, listAssetCategories, type AssetCategory } from '@/lib/assets/assets-client';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';

export default function NewAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [location, setLocation] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions(): Promise<void> {
      setIsLoadingOptions(true);
      setErrorMessage(null);

      try {
        const [categoryData, departmentResponse, staffResponse] = await Promise.all([
          listAssetCategories(),
          listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
          listStaff({
            page: 1,
            pageSize: 100,
            sortBy: 'firstName',
            sortOrder: 'asc',
            employmentStatus: 'ACTIVE',
          }),
        ]);
        if (!cancelled) {
          setCategories(categoryData.filter((category) => category.status === 'ACTIVE'));
          setDepartments(departmentResponse.data);
          setStaff(staffResponse.data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load form options');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const asset = await createAsset({
        categoryId,
        name,
        description: description || undefined,
        serialNumber: serialNumber || undefined,
        barcode: barcode || undefined,
        qrCode: qrCode || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
        warrantyStartDate: warrantyStartDate || undefined,
        warrantyEndDate: warrantyEndDate || undefined,
        departmentId: departmentId || undefined,
        location: location || undefined,
        assignedStaffId: assignedStaffId || undefined,
      });
      router.push(`/assets/${asset.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to register asset');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Box>
        <Typography variant="h4" component="h1">
          Register asset
        </Typography>
        <Typography color="text.secondary">
          Add a new asset with category, identifiers, and optional assignment.
        </Typography>
      </Box>

      <Stack spacing={2} maxWidth="sm">
        <TextField
          select
          label="Category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          disabled={isLoadingOptions}
          helperText={isLoadingOptions ? 'Loading categories…' : undefined}
        >
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
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
          select
          label="Department"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={department.id}>
              {department.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
        <TextField
          select
          label="Assigned staff"
          value={assignedStaffId}
          onChange={(event) => setAssignedStaffId(event.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {staff.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              {getStaffDisplayName(member)}
            </MenuItem>
          ))}
        </TextField>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Register asset'}
          </Button>
          <Button component={Link} href="/assets">
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

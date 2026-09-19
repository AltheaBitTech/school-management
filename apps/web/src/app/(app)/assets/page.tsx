'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  ASSET_STATUSES,
  formatAssetStatus,
  getAssetStaffDisplayName,
  isWarrantyActive,
  listAssetCategories,
  listAssets,
  type Asset,
  type AssetCategory,
  type AssetStatus,
} from '@/lib/assets/assets-client';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters(): Promise<void> {
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
      } catch {
        // Filters are optional UX; list still works without options.
      }
    }

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listAssets({
          page: 1,
          pageSize: 25,
          status: statusFilter || undefined,
          categoryId: categoryId || undefined,
          departmentId: departmentId || undefined,
          assignedStaffId: assignedStaffId || undefined,
          search: search || undefined,
        });
        if (!cancelled) {
          setAssets(response.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load assets');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryId, departmentId, assignedStaffId, search]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Assets"
        description="Track school assets, assignments, maintenance, and lifecycle status."
        actions={
          <Button component={Link} href="/assets/new" variant="contained">
            Register asset
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as AssetStatus | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {ASSET_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatAssetStatus(status)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Department"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All departments</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={department.id}>
              {department.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Assigned staff"
          value={assignedStaffId}
          onChange={(event) => setAssignedStaffId(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All staff</MenuItem>
          {staff.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              {getStaffDisplayName(member)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, code, or serial number"
          sx={{ minWidth: 240 }}
        />
      </Stack>

      {isLoading ? <LoadingState label="Loading assets" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && assets.length === 0 ? (
        <EmptyState message="No assets found for the selected filters." />
      ) : null}

      {!isLoading && assets.length > 0 ? (
        <AppTable minWidth={1080} aria-label="Assets">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Assigned staff</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Warranty</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id} hover>
                  <TableCell>{asset.assetCode}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.category?.name ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={asset.status} label={formatAssetStatus(asset.status)} />
                  </TableCell>
                  <TableCell>{asset.department?.name ?? '—'}</TableCell>
                  <TableCell>
                    {asset.assignedStaff
                      ? getAssetStaffDisplayName(asset.assignedStaff)
                      : '—'}
                  </TableCell>
                  <TableCell>{asset.location || '—'}</TableCell>
                  <TableCell>
                    {isWarrantyActive(asset) ? (
                      <Tooltip title="Warranty active">
                        <StatusChip status="ACTIVE" label="Active" />
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/assets/${asset.id}`} size="small">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </AppTable>
      ) : null}
    </Stack>
  );
}

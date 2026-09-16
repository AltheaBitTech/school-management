'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
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

function statusColor(
  status: AssetStatus,
): 'success' | 'primary' | 'warning' | 'default' {
  switch (status) {
    case 'AVAILABLE':
      return 'success';
    case 'ASSIGNED':
      return 'primary';
    case 'UNDER_MAINTENANCE':
      return 'warning';
    case 'RETIRED':
      return 'default';
    default:
      return 'default';
  }
}

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
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Assets
          </Typography>
          <Typography color="text.secondary">
            Track school assets, assignments, maintenance, and lifecycle status.
          </Typography>
        </Box>
        <Button component={Link} href="/assets/new" variant="contained">
          Register asset
        </Button>
      </Stack>

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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading assets" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && assets.length === 0 ? (
        <Alert severity="info">No assets found for the selected filters.</Alert>
      ) : null}

      {!isLoading && assets.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
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
                <TableRow key={asset.id}>
                  <TableCell>{asset.assetCode}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.category?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatAssetStatus(asset.status)}
                      color={statusColor(asset.status)}
                      size="small"
                    />
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
                        <Chip label="Active" color="success" size="small" variant="outlined" />
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
          </Table>
        </Box>
      ) : null}
    </Stack>
  );
}

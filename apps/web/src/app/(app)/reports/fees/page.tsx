'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { formatCurrency, listFeeStructures, type FeeStructure } from '@/lib/fees/fees-client';
import { isFeeReportForbiddenError } from '@/lib/reports/fee-report-errors';
import {
  formatFeeReportStatus,
  formatPaymentMethod,
  getFeesReport,
  type FeePaymentMethod,
  type FeeReport,
  type FeeReportDateScope,
  type StudentFeeStatus,
} from '@/lib/reports/fees-reports-client';

const FEE_STATUSES: StudentFeeStatus[] = ['PENDING', 'PARTIALLY_PAID', 'PAID'];
const PAYMENT_METHODS: FeePaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER'];

export default function FeesReportPage() {
  const [report, setReport] = useState<FeeReport | null>(null);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateScope, setDateScope] = useState<FeeReportDateScope>('ASSIGNED');
  const [feeStructureId, setFeeStructureId] = useState('');
  const [status, setStatus] = useState<StudentFeeStatus | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<FeePaymentMethod | ''>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dateScope,
      feeStructureId: feeStructureId || undefined,
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
      page,
      pageSize: 25,
    }),
    [dateScope, endDate, feeStructureId, page, paymentMethod, startDate, status],
  );

  useEffect(() => {
    void listFeeStructures({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((response) => setFeeStructures(response.data))
      .catch((error) =>
        setFilterError(error instanceof Error ? error.message : 'Failed to load fee structures'),
      );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      try {
        const response = await getFeesReport(queryParams);
        if (!cancelled) {
          setReport(response);
        }
      } catch (error) {
        if (cancelled) return;
        if (isFeeReportForbiddenError(error)) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load fees report');
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
  }, [queryParams]);

  function updateFilter(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const summary = report?.summary;
  const isEmpty = !isLoading && report && report.data.length === 0;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Fees report"
        description={
          dateScope === 'ASSIGNED'
            ? 'Date filters apply to student fee assignment (createdAt) in the organization timezone. Amounts use the same outstanding rules as Fees.'
            : 'Date filters apply to fee payment dates (FeePayment.paymentDate). Collection metrics count payments recorded in the selected period.'
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
        <TextField
          select
          label="Date scope"
          value={dateScope}
          onChange={(event) => {
            setDateScope(event.target.value as FeeReportDateScope);
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="ASSIGNED">Assigned in period</MenuItem>
          <MenuItem value="COLLECTED">Collected in period</MenuItem>
        </TextField>
        <TextField
          label="From"
          type="date"
          value={startDate}
          onChange={updateFilter(setStartDate)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          value={endDate}
          onChange={updateFilter(setEndDate)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Fee structure"
          value={feeStructureId}
          onChange={updateFilter(setFeeStructureId)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All structures</MenuItem>
          {feeStructures.map((structure) => (
            <MenuItem key={structure.id} value={structure.id}>
              {structure.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={status}
          onChange={updateFilter((value) => setStatus(value as StudentFeeStatus | ''))}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {FEE_STATUSES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatFeeReportStatus(item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Payment method"
          value={paymentMethod}
          onChange={updateFilter((value) => setPaymentMethod(value as FeePaymentMethod | ''))}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All methods</MenuItem>
          {PAYMENT_METHODS.map((method) => (
            <MenuItem key={method} value={method}>
              {formatPaymentMethod(method)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filterError ? <Alert severity="warning">{filterError}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {summary ? (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
              <SummaryCard label="Assigned" value={formatCurrency(summary.totalAssigned)} />
              <SummaryCard label="Collected" value={formatCurrency(summary.totalCollected)} />
              <SummaryCard label="Outstanding" value={formatCurrency(summary.totalOutstanding)} />
              <SummaryCard
                label="Pending fees"
                value={String(summary.pendingFeeCount)}
                helper={formatCurrency(summary.pendingAmount)}
              />
              <SummaryCard
                label="Partial fees"
                value={String(summary.partiallyPaidFeeCount)}
                helper={formatCurrency(summary.partiallyPaidAmount)}
              />
            </Stack>
          ) : null}

          {report && report.breakdown.byPaymentMethod.length > 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Collections by payment method</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">Payments</TableCell>
                      <TableCell align="right">Collected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.breakdown.byPaymentMethod.map((row) => (
                      <TableRow key={row.method}>
                        <TableCell>{formatPaymentMethod(row.method)}</TableCell>
                        <TableCell align="right">{row.paymentCount}</TableCell>
                        <TableCell align="right">{formatCurrency(row.collectedAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {report && report.breakdown.byFeeStructure.length > 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>By fee structure</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Structure</TableCell>
                      <TableCell align="right">Fees</TableCell>
                      <TableCell align="right">Assigned</TableCell>
                      <TableCell align="right">Collected</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.breakdown.byFeeStructure.map((row) => (
                      <TableRow key={row.feeStructureId}>
                        <TableCell>{row.feeStructureName}</TableCell>
                        <TableCell align="right">{row.feeCount}</TableCell>
                        <TableCell align="right">{formatCurrency(row.assignedAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.collectedAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.outstandingAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {isEmpty ? (
            <Alert severity="info">No student fees match the selected filters.</Alert>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Fee structure</TableCell>
                    <TableCell align="right">Assigned</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Latest payment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report?.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.studentName}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.studentCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.feeStructureName}</TableCell>
                      <TableCell align="right">{formatCurrency(row.assignedAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.paidAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.outstandingAmount)}</TableCell>
                      <TableCell>
                        <StatusChip status={row.status} label={formatFeeReportStatus(row.status)} />
                      </TableCell>
                      <TableCell>
                        {row.latestPaymentDate
                          ? `${row.latestPaymentDate}${row.latestPaymentMethod ? ` · ${formatPaymentMethod(row.latestPaymentMethod)}` : ''}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {report && report.meta.totalPages > 1 ? (
                <Pagination
                  page={page}
                  count={report.meta.totalPages}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              ) : null}
            </>
          )}
        </>
      )}
    </Stack>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card variant="outlined" sx={{ minWidth: 160, flex: 1 }}>
      <CardContent>
        <Typography color="text.secondary" variant="body2">{label}</Typography>
        <Typography variant="h6">{value}</Typography>
        {helper ? (
          <Typography variant="caption" color="text.secondary">{helper}</Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

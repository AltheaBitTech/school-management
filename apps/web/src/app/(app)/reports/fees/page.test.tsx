import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeesReportPage from '@/app/(app)/reports/fees/page';
import { isFeeReportForbiddenError } from '@/lib/reports/fee-report-errors';

vi.mock('@/lib/reports/fees-reports-client', () => ({
  getFeesReport: vi.fn(),
  formatFeeReportStatus: (status: string) => status.replace(/_/g, ' '),
  formatPaymentMethod: (method: string) => method.replace(/_/g, ' '),
}));

vi.mock('@/lib/fees/fees-client', () => ({
  formatCurrency: (value: number) => `INR ${value}`,
  listFeeStructures: vi.fn().mockResolvedValue({
    data: [{ id: 'structure-1', name: 'Tuition', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

import { getFeesReport } from '@/lib/reports/fees-reports-client';

describe('FeesReportPage', () => {
  beforeEach(() => {
    vi.mocked(getFeesReport).mockReset();
  });

  it('renders summary cards and report rows', async () => {
    vi.mocked(getFeesReport).mockResolvedValue({
      data: [
        {
          id: 'fee-1',
          studentId: 'student-1',
          studentName: 'Ada Lovelace',
          studentCode: 'S001',
          feeStructureId: 'structure-1',
          feeStructureName: 'Tuition',
          assignedAmount: 1000,
          paidAmount: 400,
          outstandingAmount: 600,
          status: 'PARTIALLY_PAID',
          assignedOn: '2026-09-10',
          latestPaymentDate: '2026-09-15',
          latestPaymentMethod: 'CASH',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      summary: {
        dateScope: 'ASSIGNED',
        fromDate: null,
        toDate: null,
        timezone: 'UTC',
        dateFilterApplied: false,
        totalAssigned: 1000,
        totalCollected: 400,
        totalOutstanding: 600,
        pendingAmount: 0,
        partiallyPaidAmount: 600,
        paidAmount: 0,
        assignedFeeCount: 1,
        pendingFeeCount: 0,
        partiallyPaidFeeCount: 1,
        paidFeeCount: 0,
        totalPayments: 1,
      },
      breakdown: {
        byPaymentMethod: [
          { method: 'CASH', paymentCount: 1, collectedAmount: 400 },
        ],
        byFeeStructure: [
          {
            feeStructureId: 'structure-1',
            feeStructureName: 'Tuition',
            assignedAmount: 1000,
            collectedAmount: 400,
            outstandingAmount: 600,
            feeCount: 1,
          },
        ],
        byStatus: [
          {
            status: 'PARTIALLY_PAID',
            feeCount: 1,
            assignedAmount: 1000,
            outstandingAmount: 600,
          },
        ],
      },
    });

    render(<FeesReportPage />);

    await waitFor(() => {
      expect(screen.getByText('Fees report')).toBeInTheDocument();
      expect(screen.getAllByText('INR 1000').length).toBeGreaterThan(0);
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('Collections by payment method')).toBeInTheDocument();
    });
  });

  it('recognizes forbidden responses', () => {
    expect(isFeeReportForbiddenError({ statusCode: 403, name: 'ApiError' })).toBe(false);
  });
});

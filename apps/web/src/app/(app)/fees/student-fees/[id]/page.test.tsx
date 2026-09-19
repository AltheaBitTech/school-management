import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import StudentFeeDetailPage from '@/app/(app)/fees/student-fees/[id]/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'student-fee-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/fees/fees-client', () => ({
  getStudentFee: vi.fn(),
  recordStudentFeePayment: vi.fn(),
  formatCurrency: (value: number) => `₹${value.toFixed(2)}`,
  formatFeeDate: (value: string) => value,
  formatFeePaymentMethod: (method: string) => method,
  formatStudentFeeStatus: (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PARTIALLY_PAID':
        return 'Partially paid';
      case 'PAID':
        return 'Paid';
      default:
        return status;
    }
  },
  getStudentDisplayNameFromFee: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
  FEE_PAYMENT_METHODS: ['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER'],
}));

import { getStudentFee, recordStudentFeePayment } from '@/lib/fees/fees-client';

const baseStudentFee = {
  id: 'student-fee-1',
  studentId: 'student-1',
  feeStructureId: 'structure-1',
  assignedAmount: 50000,
  paidAmount: 10000,
  outstandingAmount: 40000,
  dueDate: '2026-06-15',
  status: 'PARTIALLY_PAID' as const,
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  student: {
    id: 'student-1',
    studentCode: 'ADM-001',
    firstName: 'Ravi',
    lastName: 'Kumar',
  },
  feeStructure: {
    id: 'structure-1',
    name: 'Annual Tuition 2026',
  },
  payments: [
    {
      id: 'payment-1',
      amount: 10000,
      paymentDate: '2026-05-01',
      paymentMethod: 'CASH' as const,
      reference: null,
      notes: null,
      createdByUserId: 'user-1',
      createdAt: '2026-05-01T10:00:00.000Z',
    },
  ],
};

describe('StudentFeeDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getStudentFee).mockReset();
    vi.mocked(recordStudentFeePayment).mockReset();
  });

  it('shows a loading state while student fee detail is fetched', () => {
    vi.mocked(getStudentFee).mockReturnValue(new Promise(() => undefined));
    render(<StudentFeeDetailPage />);
    expect(screen.getByLabelText('Loading student fee details')).toBeInTheDocument();
  });

  it('renders student fee detail and payment history', async () => {
    vi.mocked(getStudentFee).mockResolvedValue(baseStudentFee);
    render(<StudentFeeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Annual Tuition 2026')).toBeInTheDocument();
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
      expect(screen.getByText(/Partially paid/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Record payment/i })).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(getStudentFee).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<StudentFeeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('shows a not found state on 404 responses', async () => {
    vi.mocked(getStudentFee).mockRejectedValue(new ApiError('Not found', 404));
    render(<StudentFeeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Student fee not found/i)).toBeInTheDocument();
    });
  });

  it('records a payment and refreshes balances', async () => {
    vi.mocked(getStudentFee).mockResolvedValue(baseStudentFee);
    vi.mocked(recordStudentFeePayment).mockResolvedValue({
      payment: {
        id: 'payment-2',
        amount: 40000,
        paymentDate: '2026-09-19',
        paymentMethod: 'UPI',
        reference: 'TXN-123',
        notes: null,
        createdByUserId: 'user-1',
        createdAt: '2026-09-19T10:00:00.000Z',
      },
      studentFee: {
        ...baseStudentFee,
        paidAmount: 50000,
        outstandingAmount: 0,
        status: 'PAID',
        payments: [
          ...baseStudentFee.payments,
          {
            id: 'payment-2',
            amount: 40000,
            paymentDate: '2026-09-19',
            paymentMethod: 'UPI' as const,
            reference: 'TXN-123',
            notes: null,
            createdByUserId: 'user-1',
            createdAt: '2026-09-19T10:00:00.000Z',
          },
        ],
      },
    });

    render(<StudentFeeDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record payment/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Amount' }), {
      target: { value: '40000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Record payment/i }));

    await waitFor(() => {
      expect(recordStudentFeePayment).toHaveBeenCalledWith('student-fee-1', expect.objectContaining({
        amount: 40000,
      }));
      expect(screen.getByRole('alert')).toHaveTextContent('Payment recorded successfully.');
    });
  });
});

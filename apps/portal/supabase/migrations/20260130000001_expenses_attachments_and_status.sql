-- Migration: Add support for Expense Status (Paid/Pending), Due Dates, and Attachments
-- Date: 2026-01-30

-- 1. Add new columns to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS invoice_date date DEFAULT CURRENT_DATE;

-- 2. Add index for faster queries on status and dates
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON public.expenses(due_date);

-- 3. Comment on columns
COMMENT ON COLUMN public.expenses.status IS 'Payment status: paid (complete) or pending (accounts payable)';
COMMENT ON COLUMN public.expenses.due_date IS 'Deadline for payment if status is pending';
COMMENT ON COLUMN public.expenses.voucher_url IS 'URL to the Invoice/Bill/Factura';
COMMENT ON COLUMN public.expenses.payment_proof_url IS 'URL to the proof of payment (Comprobante de Egreso)';

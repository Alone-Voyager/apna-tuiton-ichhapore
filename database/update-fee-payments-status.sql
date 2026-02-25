-- Update fee_payments table to add 'Unpaid' status
-- This status is used when a fee entry is first created for a student

alter table public.fee_payments 
drop constraint if exists fee_payments_status_check;

alter table public.fee_payments
add constraint fee_payments_status_check check (
  (status)::text = any (
    array[
      'Unpaid'::character varying,      -- New: Initial status when fee entry is created
      'Pending'::character varying,     -- When month ends and fee needs to be paid
      'Paid'::character varying,        -- When fee is collected
      'Overdue'::character varying,     -- When pending fee is past due date
      'Partial'::character varying,     -- When partial payment is made
      'Cancelled'::character varying    -- When fee is cancelled
    ]::text[]
  )
);

-- Update default status to 'Unpaid' instead of 'Paid'
alter table public.fee_payments 
alter column status set default 'Unpaid'::character varying;

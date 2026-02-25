-- Fee Payment History Table
-- This table stores the complete history of all fee payments made by students
-- When a fee is collected, the record is moved here and a new pending entry is created in fee_payments

create table public.fee_payment_history (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  organization_id uuid not null,
  amount numeric(10, 2) not null,
  payment_month character varying(20) not null,
  payment_date date not null,
  due_date date not null,
  payment_method character varying(50) not null,
  receipt_number character varying(100) not null,
  paid_amount numeric(10, 2) not null,
  discount numeric(10, 2) null default 0.00,
  late_fee numeric(10, 2) null default 0.00,
  notes text null,
  collected_by uuid null,
  collected_at timestamp with time zone not null default now(),
  created_at timestamp with time zone null default now(),
  constraint fee_payment_history_pkey primary key (id),
  constraint fee_payment_history_organization_id_fkey foreign key (organization_id) references organizations (id),
  constraint fee_payment_history_collected_by_fkey foreign key (collected_by) references admin_profiles (id),
  constraint fee_payment_history_student_id_fkey foreign key (student_id) references students (id) on delete cascade,
  constraint fee_payment_history_payment_method_check check (
    (
      (payment_method)::text = any (
        (
          array[
            'Cash'::character varying,
            'UPI'::character varying,
            'Bank Transfer'::character varying,
            'Cheque'::character varying,
            'Card'::character varying,
            'Online'::character varying
          ]
        )::text[]
      )
    )
  )
) tablespace pg_default;

-- Indexes for better query performance
create index if not exists idx_fee_payment_history_organization_id on public.fee_payment_history using btree (organization_id) tablespace pg_default;
create index if not exists idx_fee_payment_history_student_id on public.fee_payment_history using btree (student_id) tablespace pg_default;
create index if not exists idx_fee_payment_history_payment_month on public.fee_payment_history using btree (payment_month) tablespace pg_default;
create index if not exists idx_fee_payment_history_collected_at on public.fee_payment_history using btree (collected_at) tablespace pg_default;

-- Enable RLS
alter table public.fee_payment_history enable row level security;

-- RLS Policies
create policy "Users can view their organization's payment history"
  on public.fee_payment_history
  for select
  using (
    organization_id in (
      select organization_id 
      from admin_profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert payment history for their organization"
  on public.fee_payment_history
  for insert
  with check (
    organization_id in (
      select organization_id 
      from admin_profiles 
      where user_id = auth.uid()
    )
  );

-- Add updated_at trigger
create trigger update_fee_payment_history_updated_at 
  before update on fee_payment_history 
  for each row
  execute function update_updated_at_column();

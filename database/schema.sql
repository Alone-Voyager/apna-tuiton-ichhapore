-- ============================================
-- TUITION MANAGEMENT SYSTEM - POSTGRESQL DATABASE SCHEMA
-- For Supabase Integration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ADMIN AUTHENTICATION TABLE
-- ============================================
-- Note: Supabase handles auth via auth.users table
-- We'll create an admin profile table linked to auth.users

-- ============================================
-- ORGANIZATIONS TABLE
-- Represents individual client organizations (schools)
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    state VARCHAR(100),
    city VARCHAR(100),
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 1. ADMIN AUTHENTICATION TABLE
-- ============================================
-- Note: Supabase handles auth via auth.users table
-- We'll create an admin profile table linked to auth.users

CREATE TABLE admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    -- Organization the admin belongs to (nullable for global super-admins)
    organization_id UUID REFERENCES organizations(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'staff')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CLASSES TABLE
-- ============================================
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this class
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., 'Nursery', 'LKG', 'Class 1'
    monthly_fee DECIMAL(10, 2) NOT NULL,
    total_students INTEGER DEFAULT 0,
    avg_attendance DECIMAL(5, 2) DEFAULT 0.00, -- Percentage
    fee_collection_rate DECIMAL(5, 2) DEFAULT 0.00, -- Percentage
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure class names are unique per organization
CREATE UNIQUE INDEX uq_classes_org_name ON classes (organization_id, name);

-- ============================================
-- 3. SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this subject (nullable)
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CLASS-SUBJECT MAPPING
-- ============================================
CREATE TABLE class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this mapping (nullable)
    organization_id UUID REFERENCES organizations(id),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, subject_id)
);

-- ============================================
-- 5. STUDENTS TABLE
-- ============================================
create table public.students (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  organization_id uuid not null,
  class_id uuid null,
  roll_number character varying(50) null,
  admission_date date not null,
  date_of_birth date null,
  gender character varying(10) null,
  parent_name character varying(255) null,
  phone character varying(20) null,
  email character varying(255) null,
  whatsapp character varying(20) null,
  address text null,
  monthly_fee numeric(10, 2) not null,
  attendance_rate numeric(5, 2) null default 0.00,
  status character varying(20) null default 'active'::character varying,
  is_active boolean null default true,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint students_pkey primary key (id),
  constraint students_class_id_fkey foreign KEY (class_id) references classes (id) on delete set null,
  constraint students_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint students_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'Male'::character varying,
            'Female'::character varying,
            'Other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint students_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'alumni'::character varying,
            'suspended'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_students_class_id on public.students using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_students_roll_number on public.students using btree (roll_number) TABLESPACE pg_default;

create index IF not exists idx_students_status on public.students using btree (status) TABLESPACE pg_default;

create index IF not exists idx_students_name on public.students using btree (name) TABLESPACE pg_default;

create index IF not exists idx_students_organization_id on public.students using btree (organization_id) TABLESPACE pg_default;

create trigger update_students_updated_at BEFORE
update on students for EACH row
execute FUNCTION update_updated_at_column ();

-- ============================================
-- 6. ATTENDANCE TABLE
-- ============================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this attendance record
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day', 'Leave')),
    check_in_time TIME,
    -- check_out_time TIME,
    notes TEXT,
    marked_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, attendance_date)
);

-- ============================================
-- 7. FEE PAYMENTS TABLE
-- ============================================
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    -- Organization for quick scoping (redundant but useful for RLS/performance)
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_month VARCHAR(20) NOT NULL, -- e.g., 'September 2024'
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Online')),
    -- transaction_id VARCHAR(255),
    receipt_number VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Overdue', 'Partial', 'Cancelled')),
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    late_fee DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    collected_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. STUDENT PERFORMANCE TABLE
-- ============================================
CREATE TABLE student_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this performance record (nullable)
    organization_id UUID REFERENCES organizations(id),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_name VARCHAR(255),
    exam_date DATE,
    score DECIMAL(5, 2),
    max_score DECIMAL(5, 2) DEFAULT 100.00,
    grade VARCHAR(5),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. DOCUMENTS TABLE
-- ============================================
CREATE TABLE student_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this document (nullable)
    organization_id UUID REFERENCES organizations(id),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100), -- e.g., 'PDF', 'Image', 'DOC'
    file_url TEXT NOT NULL,
    file_size VARCHAR(50),
    uploaded_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. NOTIFICATIONS TABLE
-- ============================================
create table public.notifications (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  type character varying(50) null,
  title character varying(255) not null,
  message text not null,
  target_type character varying(50) null,
  target_id uuid null,
  status character varying(20) null default 'pending'::character varying,
  scheduled_at timestamp with time zone null,
  sent_at timestamp with time zone null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  recipient_count integer null default 0,
  delivered_count integer null default 0,
  failed_count integer null default 0,
  updated_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_created_by_fkey foreign KEY (created_by) references admin_profiles (id),
  constraint notifications_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint notifications_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'sent'::character varying,
            'failed'::character varying,
            'scheduled'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint notifications_target_type_check check (
    (
      (target_type)::text = any (
        (
          array[
            'all'::character varying,
            'class'::character varying,
            'student'::character varying,
            'parent'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint notifications_type_check check (
    (
      (type)::text = any (
        (
          array[
            'fee_reminder'::character varying,
            'admission'::character varying,
            'attendance'::character varying,
            'announcement'::character varying,
            'alert'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_notifications_organization_id on public.notifications using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_notifications_type on public.notifications using btree (type) TABLESPACE pg_default;

create index IF not exists idx_notifications_status on public.notifications using btree (status) TABLESPACE pg_default;

create index IF not exists idx_notifications_created_at on public.notifications using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_notifications_scheduled_at on public.notifications using btree (scheduled_at) TABLESPACE pg_default;

create trigger update_notifications_updated_at BEFORE
update on notifications for EACH row
execute FUNCTION update_updated_at_column ();

-- ============================================
-- 11. REMINDER SETTINGS TABLE
-- ============================================
create table public.reminder_settings (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  reminder_type character varying(50) null,
  is_enabled boolean null default true,
  days_before integer null default 3,
  notification_method character varying(50) null,
  template_message text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  template_id uuid null,
  target_type character varying(50) null default 'all'::character varying,
  target_id uuid null,
  trigger_condition character varying(100) null,
  constraint reminder_settings_pkey primary key (id),
  constraint reminder_settings_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint reminder_settings_notification_method_check check (
    (
      (notification_method)::text = any (
        (
          array[
            'SMS'::character varying,
            'Email'::character varying,
            'WhatsApp'::character varying,
            'All'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint reminder_settings_reminder_type_check check (
    (
      (reminder_type)::text = any (
        (
          array[
            'fee_due'::character varying,
            'fee_overdue'::character varying,
            'attendance_low'::character varying,
            'admission_followup'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint reminder_settings_target_type_check check (
    (
      (target_type)::text = any (
        (
          array[
            'all'::character varying,
            'class'::character varying,
            'student'::character varying,
            'pending_fees'::character varying,
            'low_attendance'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_reminder_settings_organization_id on public.reminder_settings using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_reminder_settings_enabled on public.reminder_settings using btree (is_enabled) TABLESPACE pg_default;

create trigger update_reminder_settings_updated_at BEFORE
update on reminder_settings for EACH row
execute FUNCTION update_updated_at_column ();
-- ============================================
-- 12. INQUIRIES/LEADS TABLE
-- ============================================
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization owning this inquiry (nullable)
    organization_id UUID REFERENCES organizations(id),
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    class_interested VARCHAR(100),
    inquiry_date DATE DEFAULT CURRENT_DATE,
    follow_up_date DATE,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'converted', 'not_interested', 'lost')),
    notes TEXT,
    assigned_to UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization context for activity (nullable)
    organization_id UUID REFERENCES organizations(id),
    activity_type VARCHAR(100) NOT NULL, -- e.g., 'admission', 'payment', 'attendance', 'reminder'
    description TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- e.g., 'student', 'class', 'fee'
    related_entity_id UUID,
    performed_by UUID REFERENCES admin_profiles(id),
    metadata JSONB, -- Additional data in JSON format
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization-scoped setting (nullable)
    organization_id UUID REFERENCES organizations(id),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. TEACHERS TABLE (Optional)
-- ============================================
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization the teacher belongs to (nullable)
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(10) NOT NULL DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other'));
    subject_specialization VARCHAR(255),
    qualification TEXT,
    experience_years INTEGER,
    joining_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    address TEXT,
    salary DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. CLASS-TEACHER MAPPING
-- ============================================
CREATE TABLE class_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization context (nullable)
    organization_id UUID REFERENCES organizations(id),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_class_teacher BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, teacher_id)
);

-- ============================================
-- 17. TEACHER ATTENDANCE TABLE
-- ============================================
CREATE TABLE teacher_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization context (nullable)
    organization_id UUID REFERENCES organizations(id),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day', 'Leave', 'Cancelled')),
    check_in_time TIME,
    check_out_time TIME,
    class_duration INTEGER, -- Duration in minutes
    subject_taught VARCHAR(255),
    notes TEXT,
    marked_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, attendance_date)
);

-- ============================================
-- 18. TEACHER SCHEDULE TABLE
-- ============================================
CREATE TABLE teacher_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Organization context (nullable)
    organization_id UUID REFERENCES organizations(id),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject VARCHAR(255),
    room_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Students indexes
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_roll_number ON students(roll_number);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_name ON students(name);
-- Organization indexes
CREATE INDEX idx_students_organization_id ON students(organization_id);
CREATE INDEX idx_classes_organization_id ON classes(organization_id);
CREATE INDEX idx_fee_payments_organization_id ON fee_payments(organization_id);
CREATE INDEX idx_subjects_organization_id ON subjects(organization_id);
CREATE INDEX idx_class_subjects_organization_id ON class_subjects(organization_id);
CREATE INDEX idx_student_performance_organization_id ON student_performance(organization_id);
CREATE INDEX idx_student_documents_organization_id ON student_documents(organization_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_reminder_settings_organization_id ON reminder_settings(organization_id);
CREATE INDEX idx_inquiries_organization_id ON inquiries(organization_id);
CREATE INDEX idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX idx_system_settings_organization_id ON system_settings(organization_id);
CREATE INDEX idx_teachers_organization_id ON teachers(organization_id);
CREATE INDEX idx_class_teachers_organization_id ON class_teachers(organization_id);
CREATE INDEX idx_teacher_attendance_organization_id ON teacher_attendance(organization_id);
CREATE INDEX idx_teacher_schedule_organization_id ON teacher_schedule(organization_id);

-- Attendance indexes
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_organization_id ON attendance(organization_id);

-- Fee Payments indexes
CREATE INDEX idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_status ON fee_payments(status);
CREATE INDEX idx_fee_payments_payment_date ON fee_payments(payment_date);
CREATE INDEX idx_fee_payments_payment_month ON fee_payments(payment_month);

-- Performance indexes
CREATE INDEX idx_performance_student_id ON student_performance(student_id);
CREATE INDEX idx_performance_subject_id ON student_performance(subject_id);

-- Notifications indexes
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Teacher attendance indexes
CREATE INDEX idx_teacher_attendance_teacher_id ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_class_id ON teacher_attendance(class_id);
CREATE INDEX idx_teacher_attendance_date ON teacher_attendance(attendance_date);
CREATE INDEX idx_teacher_attendance_status ON teacher_attendance(status);

-- Teacher schedule indexes
CREATE INDEX idx_teacher_schedule_teacher_id ON teacher_schedule(teacher_id);
CREATE INDEX idx_teacher_schedule_class_id ON teacher_schedule(class_id);
CREATE INDEX idx_teacher_schedule_day ON teacher_schedule(day_of_week);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at BEFORE UPDATE ON fee_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_performance_updated_at BEFORE UPDATE ON student_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON reminder_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_attendance_updated_at BEFORE UPDATE ON teacher_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_schedule_updated_at BEFORE UPDATE ON teacher_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_schedule ENABLE ROW LEVEL SECURITY;

-- Admin access policies (admins can do everything)
CREATE POLICY "Admins have full access to admin_profiles" ON admin_profiles
    FOR ALL USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM admin_profiles ap WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = admin_profiles.organization_id)
    ));

CREATE POLICY "Admins have full access to classes" ON classes
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles ap WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = classes.organization_id)
    ));

CREATE POLICY "Admins have full access to subjects" ON subjects
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to class_subjects" ON class_subjects
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to students" ON students
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles ap WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = students.organization_id)
    ));

CREATE POLICY "Admins have full access to attendance" ON attendance
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles ap WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
            AND (
                ap.role = 'super_admin' OR
                ap.organization_id = (
                    SELECT organization_id FROM students WHERE id = attendance.student_id
                )
            )
    ));

CREATE POLICY "Admins have full access to fee_payments" ON fee_payments
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles ap WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = fee_payments.organization_id)
    ));

CREATE POLICY "Admins have full access to student_performance" ON student_performance
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to student_documents" ON student_documents
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to notifications" ON notifications
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to reminder_settings" ON reminder_settings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to inquiries" ON inquiries
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to activity_logs" ON activity_logs
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to system_settings" ON system_settings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to teachers" ON teachers
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to class_teachers" ON class_teachers
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to teacher_attendance" ON teacher_attendance
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

CREATE POLICY "Admins have full access to teacher_schedule" ON teacher_schedule
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles WHERE user_id = auth.uid() AND is_active = TRUE
    ));

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Student Details with Class Information
CREATE VIEW vw_student_details AS
SELECT 
    s.id,
    s.name,
    s.roll_number,
    c.name AS class_name,
    s.admission_date,
    s.parent_name,
    s.phone,
    s.email,
    s.address,
    s.monthly_fee,
    s.attendance_rate,
    s.status,
    s.created_at
FROM students s
LEFT JOIN classes c ON s.class_id = c.id;

-- View: Fee Collection Summary by Class
CREATE VIEW vw_fee_collection_by_class AS
SELECT 
    c.name AS class_name,
    COUNT(DISTINCT s.id) AS total_students,
    SUM(s.monthly_fee) AS total_expected,
    SUM(CASE WHEN fp.status = 'Paid' THEN fp.amount ELSE 0 END) AS total_collected,
    SUM(CASE WHEN fp.status = 'Pending' THEN fp.amount ELSE 0 END) AS total_pending,
    SUM(CASE WHEN fp.status = 'Overdue' THEN fp.amount ELSE 0 END) AS total_overdue
FROM classes c
LEFT JOIN students s ON c.id = s.class_id
LEFT JOIN fee_payments fp ON s.id = fp.student_id
GROUP BY c.id, c.name;

-- View: Attendance Summary
CREATE VIEW vw_attendance_summary AS
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    c.name AS class_name,
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) AS days_present,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) AS days_absent,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) AS days_late,
    COUNT(*) AS total_days,
    ROUND((COUNT(CASE WHEN a.status = 'Present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) AS attendance_percentage
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN attendance a ON s.id = a.student_id
GROUP BY s.id, s.name, c.name;

-- View: Teacher Attendance Summary
CREATE VIEW vw_teacher_attendance_summary AS
SELECT 
    t.id AS teacher_id,
    t.name AS teacher_name,
    c.name AS class_name,
    COUNT(CASE WHEN ta.status = 'Present' THEN 1 END) AS classes_attended,
    COUNT(CASE WHEN ta.status = 'Absent' THEN 1 END) AS classes_missed,
    COUNT(CASE WHEN ta.status = 'Late' THEN 1 END) AS classes_late,
    COUNT(*) AS total_classes,
    ROUND((COUNT(CASE WHEN ta.status = 'Present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) AS attendance_percentage,
    SUM(ta.class_duration) AS total_minutes_taught
FROM teachers t
LEFT JOIN teacher_attendance ta ON t.id = ta.teacher_id
LEFT JOIN classes c ON ta.class_id = c.id
GROUP BY t.id, t.name, c.name;

-- View: Teacher Schedule Overview
CREATE VIEW vw_teacher_schedule_overview AS
SELECT 
    t.id AS teacher_id,
    t.name AS teacher_name,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    c.name AS class_name,
    ts.subject,
    ts.room_number,
    ts.is_active
FROM teachers t
JOIN teacher_schedule ts ON t.id = ts.teacher_id
JOIN classes c ON ts.class_id = c.id
WHERE ts.is_active = TRUE
ORDER BY t.name, 
    CASE ts.day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
    END,
    ts.start_time;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate student attendance rate
CREATE OR REPLACE FUNCTION calculate_attendance_rate(student_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    attendance_rate DECIMAL(5,2);
BEGIN
    SELECT ROUND((COUNT(CASE WHEN status = 'Present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
    INTO attendance_rate
    FROM attendance
    WHERE student_id = student_uuid;
    
    RETURN COALESCE(attendance_rate, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function to update class statistics
CREATE OR REPLACE FUNCTION update_class_statistics(class_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE classes
    SET 
        total_students = (
            SELECT COUNT(*) FROM students WHERE class_id = class_uuid AND is_active = TRUE
        ),
        avg_attendance = (
            SELECT COALESCE(AVG(attendance_rate), 0.00) FROM students WHERE class_id = class_uuid AND is_active = TRUE
        )
    WHERE id = class_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate teacher attendance rate
CREATE OR REPLACE FUNCTION calculate_teacher_attendance_rate(teacher_uuid UUID, class_uuid UUID DEFAULT NULL)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    attendance_rate DECIMAL(5,2);
BEGIN
    IF class_uuid IS NULL THEN
        -- Calculate overall attendance for teacher across all classes
        SELECT ROUND((COUNT(CASE WHEN status = 'Present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
        INTO attendance_rate
        FROM teacher_attendance
        WHERE teacher_id = teacher_uuid;
    ELSE
        -- Calculate attendance for specific class
        SELECT ROUND((COUNT(CASE WHEN status = 'Present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
        INTO attendance_rate
        FROM teacher_attendance
        WHERE teacher_id = teacher_uuid AND class_id = class_uuid;
    END IF;
    
    RETURN COALESCE(attendance_rate, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher's today's schedule
CREATE OR REPLACE FUNCTION get_teacher_today_schedule(teacher_uuid UUID)
RETURNS TABLE (
    class_name VARCHAR,
    subject VARCHAR,
    start_time TIME,
    end_time TIME,
    room_number VARCHAR,
    has_attended BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name,
        ts.subject,
        ts.start_time,
        ts.end_time,
        ts.room_number,
        EXISTS (
            SELECT 1 FROM teacher_attendance ta
            WHERE ta.teacher_id = teacher_uuid 
            AND ta.class_id = ts.class_id
            AND ta.attendance_date = CURRENT_DATE
        ) AS has_attended
    FROM teacher_schedule ts
    JOIN classes c ON ts.class_id = c.id
    WHERE ts.teacher_id = teacher_uuid
    AND ts.day_of_week = TO_CHAR(CURRENT_DATE, 'Day')
    AND ts.is_active = TRUE
    ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE admin_profiles IS 'Stores admin user profiles linked to Supabase auth.users';
COMMENT ON TABLE students IS 'Core student information and enrollment details';
COMMENT ON TABLE classes IS 'Class/grade definitions with fee structure';
COMMENT ON TABLE attendance IS 'Daily attendance records for students';
COMMENT ON TABLE fee_payments IS 'Fee payment transactions and history';
COMMENT ON TABLE notifications IS 'System notifications and reminders';
COMMENT ON TABLE activity_logs IS 'Audit trail of all system activities';
COMMENT ON TABLE teacher_attendance IS 'Daily attendance records for teachers attending classes';
COMMENT ON TABLE teacher_schedule IS 'Weekly schedule defining which teacher teaches which class and when';

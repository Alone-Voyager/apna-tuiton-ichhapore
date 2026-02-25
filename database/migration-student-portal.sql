-- ============================================
-- MIGRATION: STUDENT PORTAL & ROLE-BASED ACCESS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: STUDENT PROFILES TABLE
-- Links auth.users → students table for student login
-- ============================================
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_org ON student_profiles(organization_id);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: RLS FOR student_profiles
-- ============================================
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Students can read their own profile
DROP POLICY IF EXISTS "Students view own profile" ON student_profiles;
CREATE POLICY "Students view own profile" ON student_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all student profiles in their org
DROP POLICY IF EXISTS "Admins manage student profiles" ON student_profiles;
CREATE POLICY "Admins manage student profiles" ON student_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = student_profiles.organization_id)
        )
    );

-- ============================================
-- STEP 3: RLS ADDITIONS — Students can view their own data
-- ============================================

-- Students can view their own student record
DROP POLICY IF EXISTS "Students can view own student data" ON students;
CREATE POLICY "Students can view own student data" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = students.id
        )
    );

-- Students can view their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
CREATE POLICY "Students can view own attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = attendance.student_id
        )
    );

-- Students can view their own fee payments
DROP POLICY IF EXISTS "Students can view own fee payments" ON fee_payments;
CREATE POLICY "Students can view own fee payments" ON fee_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = fee_payments.student_id
        )
    );

-- Students can view their own test results
DROP POLICY IF EXISTS "Students can view own test results" ON test_results;
CREATE POLICY "Students can view own test results" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = test_results.student_id
        )
    );

-- Students can view tests linked to their class
DROP POLICY IF EXISTS "Students can view tests" ON tests;
CREATE POLICY "Students can view tests" ON tests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            JOIN students s ON sp.student_id = s.id
            WHERE sp.user_id = auth.uid()
            AND (tests.class_id = s.class_id OR tests.class_id IS NULL)
        )
    );

-- Students can view assignment submissions
DROP POLICY IF EXISTS "Students can view own assignment submissions" ON assignment_submissions;
CREATE POLICY "Students can view own assignment submissions" ON assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = assignment_submissions.student_id
        )
    );

-- Students can view assignments linked to their class
DROP POLICY IF EXISTS "Students can view assignments" ON assignments;
CREATE POLICY "Students can view assignments" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            JOIN students s ON sp.student_id = s.id
            WHERE sp.user_id = auth.uid()
            AND (assignments.class_id = s.class_id OR assignments.class_id IS NULL)
        )
    );

-- ============================================
-- STEP 4: FUNCTION — Get student role for a user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    admin_role TEXT;
    is_student BOOLEAN;
BEGIN
    -- Check admin_profiles
    SELECT role INTO admin_role FROM admin_profiles
    WHERE user_id = user_uuid AND is_active = TRUE
    LIMIT 1;

    IF admin_role IS NOT NULL THEN
        RETURN admin_role;
    END IF;

    -- Check student_profiles
    SELECT TRUE INTO is_student FROM student_profiles
    WHERE user_id = user_uuid AND is_active = TRUE
    LIMIT 1;

    IF is_student THEN
        RETURN 'student';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: VIEW — Student portal data view
-- ============================================
CREATE OR REPLACE VIEW vw_student_portal AS
SELECT
    s.id AS student_id,
    s.name,
    s.roll_number,
    s.batch,
    s.email,
    s.phone,
    s.gender,
    s.date_of_birth,
    s.parent_name,
    s.address,
    s.monthly_fee,
    s.attendance_rate,
    s.status,
    s.admission_date,
    s.notes,
    c.name AS class_name,
    o.name AS organization_name,
    sp.user_id,
    sp.must_change_password
FROM students s
JOIN student_profiles sp ON sp.student_id = s.id
JOIN organizations o ON s.organization_id = o.id
LEFT JOIN classes c ON s.class_id = c.id;

-- ============================================
-- DONE!
-- New tables: student_profiles
-- New RLS policies: students, attendance, fee_payments, tests, assignments, test_results, assignment_submissions  
-- New function: get_user_role
-- New view: vw_student_portal
-- ============================================

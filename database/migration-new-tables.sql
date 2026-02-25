-- ============================================
-- MIGRATION: NEW TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (already exists, but safe to re-run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Add 'batch' column to existing students table
-- (full_name already exists as 'name', status + parent_phone + class already exist)
-- ============================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (name) STORED;

-- ============================================
-- STEP 2: TESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('weekly', 'monthly', 'unit', 'annual', 'practice')),
    total_marks INTEGER NOT NULL DEFAULT 100,
    subject VARCHAR(255) NOT NULL,
    test_date DATE NOT NULL,
    batch VARCHAR(100),
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_organization_id ON tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_tests_batch ON tests(batch);
CREATE INDEX IF NOT EXISTS idx_tests_type ON tests(type);
CREATE INDEX IF NOT EXISTS idx_tests_date ON tests(test_date);
CREATE INDEX IF NOT EXISTS idx_tests_class_id ON tests(class_id);

-- ============================================
-- STEP 3: TEST_RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    marks_obtained INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN marks_obtained IS NOT NULL THEN (marks_obtained::DECIMAL / 1) * 1 ELSE 0 END
    ) STORED,
    weak_topics TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_organization_id ON test_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_test_results_rank ON test_results(rank);

-- ============================================
-- STEP 4: ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    given_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    batch VARCHAR(100),
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_organization_id ON assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_batch ON assignments(batch);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);

-- ============================================
-- STEP 5: ASSIGNMENT_SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (submission_status IN ('pending', 'submitted', 'late', 'missing', 'graded')),
    completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 10),
    submitted_at TIMESTAMPTZ,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_organization_id ON assignment_submissions(organization_id);

-- ============================================
-- STEP 6: AUTO-UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tests trigger
DROP TRIGGER IF EXISTS update_tests_updated_at ON tests;
CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Test Results trigger
DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at
    BEFORE UPDATE ON test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Assignments trigger
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Assignment Submissions trigger
DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Tests RLS: Admins have full access
DROP POLICY IF EXISTS "Admins have full access to tests" ON tests;
CREATE POLICY "Admins have full access to tests" ON tests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = tests.organization_id)
        )
    );

-- Test Results RLS: Admins have full access
DROP POLICY IF EXISTS "Admins have full access to test_results" ON test_results;
CREATE POLICY "Admins have full access to test_results" ON test_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = test_results.organization_id)
        )
    );

-- Assignments RLS: Admins have full access
DROP POLICY IF EXISTS "Admins have full access to assignments" ON assignments;
CREATE POLICY "Admins have full access to assignments" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = assignments.organization_id)
        )
    );

-- Assignment Submissions RLS: Admins have full access
DROP POLICY IF EXISTS "Admins have full access to assignment_submissions" ON assignment_submissions;
CREATE POLICY "Admins have full access to assignment_submissions" ON assignment_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = assignment_submissions.organization_id)
        )
    );

-- ============================================
-- STEP 8: HELPFUL VIEWS
-- ============================================

-- View: Test results with student and test details
CREATE OR REPLACE VIEW vw_test_results_detailed AS
SELECT
    tr.id,
    tr.organization_id,
    s.name AS student_name,
    s.batch,
    c.name AS class_name,
    t.test_name,
    t.type AS test_type,
    t.subject,
    t.test_date,
    t.total_marks,
    tr.marks_obtained,
    ROUND((tr.marks_obtained::DECIMAL / t.total_marks) * 100, 2) AS percentage,
    tr.rank,
    tr.weak_topics,
    tr.remarks,
    tr.created_at
FROM test_results tr
JOIN students s ON tr.student_id = s.id
JOIN tests t ON tr.test_id = t.id
LEFT JOIN classes c ON s.class_id = c.id;

-- View: Assignment submissions with student and assignment details
CREATE OR REPLACE VIEW vw_assignment_submissions_detailed AS
SELECT
    asub.id,
    asub.organization_id,
    s.name AS student_name,
    s.batch,
    c.name AS class_name,
    a.title AS assignment_title,
    a.subject,
    a.given_date,
    a.due_date,
    a.batch AS assignment_batch,
    asub.submission_status,
    asub.completion_rating,
    asub.submitted_at,
    asub.feedback,
    asub.created_at
FROM assignment_submissions asub
JOIN students s ON asub.student_id = s.id
JOIN assignments a ON asub.assignment_id = a.id
LEFT JOIN classes c ON s.class_id = c.id;

-- ============================================
-- DONE! All new tables created successfully.
-- Tables created:
--   ✅ tests
--   ✅ test_results
--   ✅ assignments
--   ✅ assignment_submissions
-- Columns added:
--   ✅ students.batch
-- ============================================

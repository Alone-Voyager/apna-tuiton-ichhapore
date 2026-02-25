-- ============================================================
-- MIGRATION: Tests, Test Results, Assignments, Submissions
-- Apna Tuition Management System
-- Run against: Supabase project gvhguudtztutbxwolsxd
-- ============================================================

-- Enable UUID extension (safe to re-run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PATCH students table
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch VARCHAR(100);

-- full_name as an alias computed column (uses the existing `name` column)
-- NOTE: PostgreSQL does not allow GENERATED columns to reference a non-IMMUTABLE
-- expression on another column type in certain cases; we use a simple alias here.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE students ADD COLUMN full_name TEXT GENERATED ALWAYS AS (name) STORED;
  END IF;
END $$;

-- ============================================================
-- TESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tests (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
    test_name         VARCHAR(255) NOT NULL,
    type              VARCHAR(50)  NOT NULL
                        CHECK (type IN ('weekly', 'monthly', 'unit', 'annual', 'practice')),
    total_marks       INTEGER      NOT NULL DEFAULT 100,
    subject           VARCHAR(255) NOT NULL,
    test_date         DATE         NOT NULL,
    batch             VARCHAR(100),
    class_id          UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_by        UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- TEST_RESULTS TABLE
-- Percentage is computed as a GENERATED column using total_marks
-- stored on the same row (populated by trigger from tests table).
-- ============================================================
CREATE TABLE IF NOT EXISTS test_results (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID    REFERENCES organizations(id)  ON DELETE CASCADE,
    student_id       UUID    NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
    test_id          UUID    NOT NULL REFERENCES tests(id)     ON DELETE CASCADE,
    marks_obtained   INTEGER NOT NULL DEFAULT 0,
    total_marks      INTEGER NOT NULL DEFAULT 100,   -- denormalised; set by trigger
    percentage       DECIMAL(5, 2) GENERATED ALWAYS AS (
                       CASE
                         WHEN total_marks > 0
                         THEN ROUND((marks_obtained::DECIMAL / total_marks::DECIMAL) * 100, 2)
                         ELSE 0
                       END
                     ) STORED,
    rank             INTEGER,
    weak_topics      TEXT,
    remarks          TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, test_id)
);

-- Trigger: auto-copy total_marks from tests into test_results on INSERT
CREATE OR REPLACE FUNCTION fn_set_test_result_total_marks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    SELECT total_marks INTO NEW.total_marks
    FROM   tests
    WHERE  id = NEW.test_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_test_result_total_marks ON test_results;
CREATE TRIGGER trg_set_test_result_total_marks
    BEFORE INSERT ON test_results
    FOR EACH ROW EXECUTE FUNCTION fn_set_test_result_total_marks();

-- ============================================================
-- ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID    REFERENCES organizations(id)  ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    description     TEXT,
    given_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE         NOT NULL,
    batch           VARCHAR(100),
    class_id        UUID REFERENCES classes(id)         ON DELETE SET NULL,
    created_by      UUID REFERENCES admin_profiles(id)  ON DELETE SET NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENT_SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID    REFERENCES organizations(id)   ON DELETE CASCADE,
    student_id        UUID    NOT NULL REFERENCES students(id)     ON DELETE CASCADE,
    assignment_id     UUID    NOT NULL REFERENCES assignments(id)  ON DELETE CASCADE,
    submission_status VARCHAR(50) NOT NULL DEFAULT 'pending'
                        CHECK (submission_status IN
                               ('pending', 'submitted', 'late', 'missing', 'graded')),
    completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 10),
    submitted_at      TIMESTAMPTZ,
    feedback          TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, assignment_id)
);

-- ============================================================
-- updated_at TRIGGERS (keep rows fresh on every UPDATE)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['tests','test_results','assignments','assignment_submissions']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_updated_at ON %I;
            CREATE TRIGGER trg_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
        ', t, t);
    END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tests                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "Admins have full access to tests"                  ON tests;
DROP POLICY IF EXISTS "Admins have full access to test_results"           ON test_results;
DROP POLICY IF EXISTS "Admins have full access to assignments"            ON assignments;
DROP POLICY IF EXISTS "Admins have full access to assignment_submissions" ON assignment_submissions;

CREATE POLICY "Admins have full access to tests"
    ON tests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE  ap.user_id = auth.uid()
            AND    ap.is_active = TRUE
            AND   (ap.role = 'super_admin' OR ap.organization_id = tests.organization_id)
        )
    );

CREATE POLICY "Admins have full access to test_results"
    ON test_results FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE  ap.user_id = auth.uid()
            AND    ap.is_active = TRUE
            AND   (ap.role = 'super_admin' OR ap.organization_id = test_results.organization_id)
        )
    );

CREATE POLICY "Admins have full access to assignments"
    ON assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE  ap.user_id = auth.uid()
            AND    ap.is_active = TRUE
            AND   (ap.role = 'super_admin' OR ap.organization_id = assignments.organization_id)
        )
    );

CREATE POLICY "Admins have full access to assignment_submissions"
    ON assignment_submissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE  ap.user_id = auth.uid()
            AND    ap.is_active = TRUE
            AND   (ap.role = 'super_admin' OR ap.organization_id = assignment_submissions.organization_id)
        )
    );

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tests_organization_id    ON tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_tests_class_id           ON tests(class_id);
CREATE INDEX IF NOT EXISTS idx_tests_test_date          ON tests(test_date);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id  ON test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id     ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_assignments_organization ON assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id     ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date     ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id   ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions(assignment_id);

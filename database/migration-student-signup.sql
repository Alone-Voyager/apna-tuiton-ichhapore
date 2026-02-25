-- Add new columns for Student Signup Form

-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS subjects_enrolled TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS previous_percentage DECIMAL(5,2);

-- Update student status to include 'pending_approval' if it's not already in the check constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'inactive', 'alumni', 'suspended', 'pending_approval'));

-- Add organization RLS for batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for batches" ON batches;
CREATE POLICY "Public read access for batches" ON batches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage batches" ON batches;
CREATE POLICY "Admins manage batches" ON batches 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM admin_profiles ap WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = batches.organization_id)
    ));

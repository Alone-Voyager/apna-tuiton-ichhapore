-- ============================================================
-- MIGRATION: Homework File uploads & Assignments Statuses
-- Add file attachment fields to assignments & submissions
-- ============================================================

-- Add assignment_file_url for Admins to upload question documents
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Add submission_file_url for Students to submit their homework
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS submission_file_url TEXT;

-- Add marks_obtained constraint
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS marks_obtained INTEGER;

-- Add eval_file_url for Admins to optionally upload corrected submissions Let's add it silently
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS eval_file_url TEXT;

-- Fix the status check constraint safely
ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_submission_status_check;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_submission_status_check 
CHECK (submission_status IN ('pending', 'submitted', 'late', 'missing', 'graded', 'reviewed'));

-- Update default submission status to 'pending' if it was null
UPDATE assignment_submissions SET submission_status = 'pending' WHERE submission_status IS NULL;

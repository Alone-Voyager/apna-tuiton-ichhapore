-- ============================================
-- MIGRATION: COMPREHENSIVE TEST MANAGEMENT
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create 'test_papers' storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('test_papers', 'test_papers', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Admin can upload and read all, Students can only read
-- Enable RLS for storage.objects if not already enabled (usually is, but good to be safe)
-- Note: Setting up policies for storage requires permissions on storage.objects

-- Admin Policy: Full access to test_papers bucket
DROP POLICY IF EXISTS "Admins have full access to test_papers" ON storage.objects;
CREATE POLICY "Admins have full access to test_papers" ON storage.objects
    FOR ALL USING (
        bucket_id = 'test_papers' 
        AND EXISTS (
            SELECT 1 FROM public.admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = TRUE
        )
    );

-- Student Policy: Select (read) access to test_papers bucket
DROP POLICY IF EXISTS "Students can view test_papers" ON storage.objects;
CREATE POLICY "Students can view test_papers" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'test_papers'
        AND EXISTS (
             SELECT 1 FROM public.student_profiles sp
             WHERE sp.user_id = auth.uid()
        )
    );

-- 2. Add paper_path to tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS paper_path TEXT;

-- 3. Add qualitative feedback columns to test_results
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS strong_areas TEXT;
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS teacher_suggestions TEXT;
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS improvement_plan TEXT;

-- ============================================
-- DONE
-- ============================================

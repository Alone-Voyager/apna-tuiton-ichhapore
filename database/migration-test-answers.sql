-- Migration to add file upload for evaluated answer sheets to test_results
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS answer_sheet_path TEXT;

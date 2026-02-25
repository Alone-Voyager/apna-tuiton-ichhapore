-- ============================================
-- PREVENT DUPLICATE FEE ENTRIES
-- Add unique constraint to prevent duplicate monthly fee entries
-- ============================================

-- First, let's check if there are any existing duplicates
-- Run this query to find duplicates:
-- SELECT student_id, payment_month, organization_id, COUNT(*) as count
-- FROM fee_payments
-- GROUP BY student_id, payment_month, organization_id
-- HAVING COUNT(*) > 1;

-- If duplicates exist, you need to clean them up first before adding the constraint
-- You can keep the most recent one and delete older duplicates:
-- DELETE FROM fee_payments
-- WHERE id IN (
--   SELECT id
--   FROM (
--     SELECT id,
--            ROW_NUMBER() OVER (
--              PARTITION BY student_id, payment_month, organization_id 
--              ORDER BY created_at DESC
--            ) as rn
--     FROM fee_payments
--   ) t
--   WHERE rn > 1
-- );

-- Add unique constraint to prevent duplicate entries for same student, month, and organization
-- This will ensure that a student cannot have multiple fee_payment entries for the same month
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_payments_student_month 
ON fee_payments (student_id, payment_month, organization_id);

-- Add comment to explain the constraint
COMMENT ON INDEX uq_fee_payments_student_month IS 
'Ensures each student has only one fee payment entry per month per organization';

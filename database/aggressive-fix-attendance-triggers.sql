-- AGGRESSIVE FIX: Drop ALL triggers and functions related to attendance
-- Then recreate only the necessary ones WITHOUT any activity_logs

-- Step 1: Drop ALL triggers on attendance table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'attendance') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON attendance CASCADE';
    END LOOP;
END $$;

-- Step 2: Drop all related functions
DROP FUNCTION IF EXISTS check_consecutive_leave_and_suspend() CASCADE;
DROP FUNCTION IF EXISTS reactivate_student(UUID, UUID, TEXT) CASCADE;

-- Step 3: Recreate ONLY the consecutive leave function WITHOUT activity logging
CREATE OR REPLACE FUNCTION check_consecutive_leave_and_suspend()
RETURNS TRIGGER AS $$
DECLARE
    consecutive_leave_count INT;
    suspension_threshold INT := 7;
BEGIN
    -- Only process if the new status is 'Absent'
    IF NEW.status = 'Absent' THEN
        -- Count consecutive leave days for this student
        SELECT COUNT(*)
        INTO consecutive_leave_count
        FROM attendance
        WHERE student_id = NEW.student_id
          AND attendance_date >= (
              SELECT MAX(attendance_date)
              FROM attendance
              WHERE student_id = NEW.student_id
                AND status = 'Present'
          )
          AND status = 'Absent';
        
        -- Check if threshold is reached
        IF consecutive_leave_count >= suspension_threshold THEN
            -- Update student status to suspended (NO activity logging)
            UPDATE students
            SET status = 'suspended',
                notes = COALESCE(notes || E'\n\n', '') || 
                        'Auto-suspended on ' || CURRENT_DATE || 
                        ' due to ' || consecutive_leave_count || ' consecutive leave days.',
                updated_at = NOW()
            WHERE id = NEW.student_id
            AND status != 'suspended';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER auto_suspend_on_consecutive_leave
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION check_consecutive_leave_and_suspend();

-- Step 5: Recreate reactivate function WITHOUT activity logging
CREATE OR REPLACE FUNCTION reactivate_student(
    p_student_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_organization_id UUID;
    v_student_name TEXT;
BEGIN
    SELECT organization_id, name
    INTO v_organization_id, v_student_name
    FROM students
    WHERE id = p_student_id;
    
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Student not found';
    END IF;
    
    -- Reactivate the student (NO activity logging)
    UPDATE students
    SET status = 'active',
        notes = COALESCE(notes || E'\n\n', '') || 
                'Reactivated on ' || CURRENT_DATE || 
                ' by admin. Reason: ' || COALESCE(p_reason, 'Manual reactivation'),
        updated_at = NOW()
    WHERE id = p_student_id
    AND status = 'suspended';
    
    IF FOUND THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reactivate_student(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_student(UUID, UUID, TEXT) TO service_role;

-- Verify the changes
SELECT 'Triggers on attendance table:' as info;
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'attendance';

SELECT 'Functions created:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('check_consecutive_leave_and_suspend', 'reactivate_student');

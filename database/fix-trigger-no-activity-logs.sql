-- Fix: Remove activity logging from consecutive leave trigger
-- This completely removes activity_logs insertion to avoid column errors

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS auto_suspend_on_consecutive_leave ON attendance;
DROP FUNCTION IF EXISTS check_consecutive_leave_and_suspend();

-- Recreate the function WITHOUT activity logging
CREATE OR REPLACE FUNCTION check_consecutive_leave_and_suspend()
RETURNS TRIGGER AS $$
DECLARE
    consecutive_leave_count INT;
    suspension_threshold INT := 7; -- Default: 7 consecutive leave days
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
            -- Update student status to suspended
            UPDATE students
            SET status = 'suspended',
                notes = COALESCE(notes || E'\n\n', '') || 
                        'Auto-suspended on ' || CURRENT_DATE || 
                        ' due to ' || consecutive_leave_count || ' consecutive leave days.',
                updated_at = NOW()
            WHERE id = NEW.student_id
            AND status != 'suspended'; -- Only update if not already suspended
            
            -- Activity logging removed - not needed
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER auto_suspend_on_consecutive_leave
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION check_consecutive_leave_and_suspend();

-- Drop and recreate the reactivate function WITHOUT activity logging
DROP FUNCTION IF EXISTS reactivate_student(UUID, UUID, TEXT);

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
    -- Get student's organization and name
    SELECT organization_id, name
    INTO v_organization_id, v_student_name
    FROM students
    WHERE id = p_student_id;
    
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Student not found';
    END IF;
    
    -- Reactivate the student
    UPDATE students
    SET status = 'active',
        notes = COALESCE(notes || E'\n\n', '') || 
                'Reactivated on ' || CURRENT_DATE || 
                ' by admin. Reason: ' || COALESCE(p_reason, 'Manual reactivation'),
        updated_at = NOW()
    WHERE id = p_student_id
    AND status = 'suspended';
    
    -- Activity logging removed - not needed
    
    IF FOUND THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reactivate_student(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_student(UUID, UUID, TEXT) TO service_role;

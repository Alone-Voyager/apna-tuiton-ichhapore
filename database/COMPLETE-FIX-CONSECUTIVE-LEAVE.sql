-- ============================================
-- COMPLETE FIX FOR CONSECUTIVE LEAVE SUSPENSION
-- This restores the original feature with all functions
-- ============================================

-- Step 1: Drop all existing related triggers and functions
DROP TRIGGER IF EXISTS auto_suspend_on_consecutive_leave ON attendance;
DROP TRIGGER IF EXISTS trigger_suspend_on_consecutive_leave ON attendance;
DROP FUNCTION IF EXISTS check_consecutive_leave_and_suspend() CASCADE;
DROP FUNCTION IF EXISTS suspend_student_on_consecutive_leave() CASCADE;
DROP FUNCTION IF EXISTS check_consecutive_leave_days(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_student_consecutive_leave_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_students_at_risk_of_suspension(UUID) CASCADE;
DROP FUNCTION IF EXISTS reactivate_suspended_student(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS reactivate_student(UUID, UUID, TEXT) CASCADE;

-- ============================================
-- RESTORE ORIGINAL FUNCTIONS
-- ============================================

-- Function 1: Check consecutive leave days for a student
CREATE OR REPLACE FUNCTION check_consecutive_leave_days(p_student_id UUID, p_current_date DATE)
RETURNS INTEGER AS $$
DECLARE
    consecutive_days INTEGER := 0;
    check_date DATE := p_current_date;
    attendance_status VARCHAR(20);
BEGIN
    -- Count backwards from current date to find consecutive leave days
    FOR i IN 1..7 LOOP
        SELECT status INTO attendance_status
        FROM attendance
        WHERE student_id = p_student_id
        AND attendance_date = check_date
        LIMIT 1;
        
        -- If no record found for that date, break the streak
        IF attendance_status IS NULL THEN
            EXIT;
        END IF;
        
        -- If status is 'Leave', increment counter
        IF attendance_status = 'Leave' THEN
            consecutive_days := consecutive_days + 1;
        ELSE
            -- Any other status breaks the streak
            EXIT;
        END IF;
        
        -- Move to previous day
        check_date := check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN consecutive_days;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Trigger function to suspend student after 7 consecutive leave days
CREATE OR REPLACE FUNCTION suspend_student_on_consecutive_leave()
RETURNS TRIGGER AS $$
DECLARE
    consecutive_leave_count INTEGER;
BEGIN
    -- Only process if the new status is 'Leave' (NOT 'Absent')
    IF NEW.status = 'Leave' THEN
        -- Check consecutive leave days
        consecutive_leave_count := check_consecutive_leave_days(NEW.student_id, NEW.attendance_date);
        
        -- If 7 or more consecutive leave days, suspend the student
        IF consecutive_leave_count >= 7 THEN
            UPDATE students
            SET 
                status = 'suspended',
                is_active = FALSE,
                notes = COALESCE(notes || E'\n\n', '') || 
                        'Auto-suspended on ' || CURRENT_DATE || 
                        ' due to ' || consecutive_leave_count || ' consecutive leave days.',
                updated_at = NOW()
            WHERE id = NEW.student_id
            AND status != 'suspended'; -- Only update if not already suspended
            
            -- Try to log activity - but don't fail if activity_logs has issues
            BEGIN
                INSERT INTO activity_logs (
                    organization_id,
                    performed_by,
                    activity_type,
                    description,
                    metadata,
                    created_at
                )
                VALUES (
                    NEW.organization_id,
                    NEW.marked_by,
                    'student_suspension',
                    'Student automatically suspended due to consecutive leave',
                    jsonb_build_object(
                        'student_id', NEW.student_id,
                        'consecutive_leave_days', consecutive_leave_count,
                        'suspension_date', CURRENT_DATE
                    ),
                    NOW()
                );
            EXCEPTION 
                WHEN OTHERS THEN
                    -- Silently ignore activity log errors
                    NULL;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get student's consecutive leave status
CREATE OR REPLACE FUNCTION get_student_consecutive_leave_status(p_student_id UUID)
RETURNS TABLE(
    student_id UUID,
    student_name VARCHAR(255),
    current_consecutive_leaves INTEGER,
    last_leave_date DATE,
    should_be_suspended BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_leave AS (
        SELECT 
            a.student_id,
            MAX(a.attendance_date) as last_leave_date
        FROM attendance a
        WHERE a.student_id = p_student_id
        AND a.status = 'Leave'
        GROUP BY a.student_id
    )
    SELECT 
        s.id as student_id,
        s.name as student_name,
        check_consecutive_leave_days(s.id, COALESCE(ll.last_leave_date, CURRENT_DATE)) as current_consecutive_leaves,
        ll.last_leave_date,
        (check_consecutive_leave_days(s.id, COALESCE(ll.last_leave_date, CURRENT_DATE)) >= 7) as should_be_suspended
    FROM students s
    LEFT JOIN latest_leave ll ON s.id = ll.student_id
    WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get all students at risk of suspension (5-6 consecutive leaves)
CREATE OR REPLACE FUNCTION get_students_at_risk_of_suspension(p_organization_id UUID)
RETURNS TABLE(
    student_id UUID,
    student_name VARCHAR(255),
    consecutive_leaves INTEGER,
    last_leave_date DATE,
    days_until_suspension INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_leaves AS (
        SELECT DISTINCT
            a.student_id,
            MAX(a.attendance_date) as last_leave_date
        FROM attendance a
        INNER JOIN students s ON a.student_id = s.id
        WHERE a.status = 'Leave'
        AND s.organization_id = p_organization_id
        AND s.status != 'suspended'
        AND a.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY a.student_id
    )
    SELECT 
        s.id as student_id,
        s.name as student_name,
        check_consecutive_leave_days(s.id, rl.last_leave_date) as consecutive_leaves,
        rl.last_leave_date,
        (7 - check_consecutive_leave_days(s.id, rl.last_leave_date)) as days_until_suspension
    FROM students s
    INNER JOIN recent_leaves rl ON s.id = rl.student_id
    WHERE check_consecutive_leave_days(s.id, rl.last_leave_date) BETWEEN 5 AND 6
    ORDER BY consecutive_leaves DESC, s.name;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Reactivate a suspended student
CREATE OR REPLACE FUNCTION reactivate_suspended_student(
    p_student_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_organization_id UUID;
    v_student_name VARCHAR(255);
BEGIN
    -- Get student details
    SELECT organization_id, name INTO v_organization_id, v_student_name
    FROM students
    WHERE id = p_student_id;
    
    -- Update student status
    UPDATE students
    SET 
        status = 'active',
        is_active = TRUE,
        notes = COALESCE(notes || E'\n\n', '') || 
                'Reactivated on ' || CURRENT_DATE || 
                ' by admin. Reason: ' || COALESCE(p_reason, 'Manual reactivation'),
        updated_at = NOW()
    WHERE id = p_student_id
    AND status = 'suspended';
    
    -- Try to log activity - but don't fail if activity_logs has issues
    IF FOUND THEN
        BEGIN
            INSERT INTO activity_logs (
                organization_id,
                performed_by,
                activity_type,
                description,
                metadata,
                created_at
            )
            VALUES (
                v_organization_id,
                p_admin_id,
                'student_reactivation',
                'Student reactivated after suspension',
                jsonb_build_object(
                    'student_id', p_student_id,
                    'student_name', v_student_name,
                    'reason', COALESCE(p_reason, 'Manual reactivation'),
                    'reactivation_date', CURRENT_DATE
                ),
                NOW()
            );
        EXCEPTION 
            WHEN OTHERS THEN
                -- Silently ignore activity log errors
                NULL;
        END;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGER
-- ============================================

CREATE TRIGGER trigger_suspend_on_consecutive_leave
    AFTER INSERT OR UPDATE OF status
    ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION suspend_student_on_consecutive_leave();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION check_consecutive_leave_days(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION suspend_student_on_consecutive_leave() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_student_consecutive_leave_status(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_students_at_risk_of_suspension(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reactivate_suspended_student(UUID, UUID, TEXT) TO authenticated, service_role;

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON FUNCTION check_consecutive_leave_days IS 'Counts consecutive LEAVE days (not Absent) for a student from a given date backwards';
COMMENT ON FUNCTION suspend_student_on_consecutive_leave IS 'Trigger function to automatically suspend students with 7 consecutive LEAVE days';
COMMENT ON FUNCTION get_student_consecutive_leave_status IS 'Get the current consecutive leave status for a specific student';
COMMENT ON FUNCTION get_students_at_risk_of_suspension IS 'Get all students with 5-6 consecutive leaves who are at risk of suspension';
COMMENT ON FUNCTION reactivate_suspended_student IS 'Manually reactivate a suspended student with reason logging';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify all functions are created:
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%consecutive%' OR routine_name LIKE '%suspend%' OR routine_name LIKE '%reactivate%')
ORDER BY routine_name;

-- Expected results:
-- 1. check_consecutive_leave_days
-- 2. get_student_consecutive_leave_status
-- 3. get_students_at_risk_of_suspension
-- 4. reactivate_suspended_student
-- 5. suspend_student_on_consecutive_leave

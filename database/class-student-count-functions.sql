-- Function to increment class student count
CREATE OR REPLACE FUNCTION increment_class_student_count(class_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE classes
    SET total_students = total_students + 1,
        updated_at = NOW()
    WHERE id = class_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement class student count
CREATE OR REPLACE FUNCTION decrement_class_student_count(class_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE classes
    SET total_students = GREATEST(total_students - 1, 0),
        updated_at = NOW()
    WHERE id = class_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_class_student_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_class_student_count(UUID) TO authenticated;

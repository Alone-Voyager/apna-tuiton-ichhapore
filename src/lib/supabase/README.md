# Supabase Setup Guide

This guide will help you set up and use Supabase in your tuition management application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
# or
bun add @supabase/supabase-js
```

### 2. Configure Environment Variables

Your `.env` file is already configured with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://gvhguudtztutbxwolsxd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL from `database/schema.sql`
4. Run the seed data from `database/seed-data.sql` (optional)

### 4. Verify Setup

Run this query in Supabase SQL Editor to verify:

```sql
SELECT * FROM admin_profiles LIMIT 1;
SELECT * FROM classes LIMIT 5;
SELECT * FROM students LIMIT 5;
```

## 📚 Usage Examples

### Authentication

```typescript
import { signIn, signUp, signOut, getAdminProfile } from '@/lib/supabase/auth';

// Sign up a new admin
const { data, error } = await signUp(
  'admin@example.com',
  'securePassword123',
  'John Doe'
);

// Sign in
const { data, error } = await signIn('admin@example.com', 'securePassword123');

// Get current admin profile
const { data: profile, error } = await getAdminProfile();

// Sign out
await signOut();
```

### Student Operations

```typescript
import { getStudents, createStudent, updateStudent } from '@/lib/supabase/queries';

// Get all students
const { data: students, error } = await getStudents();

// Get students by class
const { data: students, error } = await getStudents({ classId: 'class-uuid' });

// Search students
const { data: students, error } = await getStudents({ search: 'John' });

// Create a new student
const { data: student, error } = await createStudent({
  name: 'John Doe',
  roll_number: 'STU001',
  admission_date: '2024-01-01',
  parent_name: 'Jane Doe',
  phone: '9876543210',
  monthly_fee: 5000,
  class_id: 'class-uuid',
});

// Update student
const { data: student, error } = await updateStudent('student-uuid', {
  phone: '9876543211',
  address: 'New Address',
});
```

### Attendance Management

```typescript
import { markAttendance, getAttendanceByDate, getStudentAttendance } from '@/lib/supabase/queries';

// Mark attendance for multiple students
const { data, error } = await markAttendance([
  {
    student_id: 'student-uuid-1',
    attendance_date: '2024-10-04',
    status: 'Present',
    check_in_time: '09:00:00',
  },
  {
    student_id: 'student-uuid-2',
    attendance_date: '2024-10-04',
    status: 'Absent',
  },
]);

// Get attendance for a specific date
const { data, error } = await getAttendanceByDate('2024-10-04');

// Get attendance for a student
const { data, error } = await getStudentAttendance('student-uuid', '2024-09-01', '2024-09-30');
```

### Fee Payment Operations

```typescript
import { createFeePayment, getFeePayments, getFeeCollectionByClass } from '@/lib/supabase/queries';

// Create a fee payment
const { data, error } = await createFeePayment({
  student_id: 'student-uuid',
  amount: 5000,
  payment_month: 'October 2024',
  payment_date: '2024-10-04',
  due_date: '2024-10-05',
  payment_method: 'UPI',
  status: 'Paid',
  receipt_number: 'RCP001',
});

// Get all fee payments
const { data, error } = await getFeePayments();

// Get pending payments
const { data, error } = await getFeePayments({ status: 'Pending' });

// Get fee collection summary by class
const { data, error } = await getFeeCollectionByClass();
```

### Teacher Operations

```typescript
import {
  getTeachers,
  createTeacher,
  markTeacherAttendance,
  getTeacherTodaySchedule,
} from '@/lib/supabase/queries';

// Get all active teachers
const { data, error } = await getTeachers('active');

// Create a teacher
const { data, error } = await createTeacher({
  name: 'Dr. Smith',
  email: 'smith@example.com',
  phone: '9876543210',
  subject_specialization: 'Mathematics',
  qualification: 'PhD in Mathematics',
  experience_years: 10,
  status: 'active',
});

// Mark teacher attendance
const { data, error } = await markTeacherAttendance([
  {
    teacher_id: 'teacher-uuid',
    class_id: 'class-uuid',
    attendance_date: '2024-10-04',
    status: 'Present',
    check_in_time: '09:00:00',
    check_out_time: '10:00:00',
    class_duration: 60,
    subject_taught: 'Mathematics',
  },
]);

// Get teacher's today schedule
const { data, error } = await getTeacherTodaySchedule('teacher-uuid');
```

### Dashboard Stats

```typescript
import { getDashboardStats } from '@/lib/supabase/queries';

const stats = await getDashboardStats();
// Returns: { totalStudents, totalClasses, avgAttendance, totalFeesCollected }
```

## 🔐 Row Level Security (RLS)

All tables have RLS enabled. Only authenticated admin users can access the data.

To access data, users must:
1. Be authenticated via Supabase Auth
2. Have a corresponding entry in `admin_profiles` table
3. Have `is_active = true` in their profile

## 🛠️ Direct Supabase Client Usage

For custom queries not covered by the helper functions:

```typescript
import { supabase } from '@/lib/supabase/client';

// Custom query
const { data, error } = await supabase
  .from('students')
  .select('*, classes(*)')
  .eq('status', 'active')
  .order('name');

// Using views
const { data, error } = await supabase
  .from('vw_student_details')
  .select('*');

// Calling functions
const { data, error } = await supabase.rpc('calculate_attendance_rate', {
  student_uuid: 'student-uuid',
});
```

## 📊 Available Views

- `vw_student_details` - Student info with class details
- `vw_fee_collection_by_class` - Fee collection summary per class
- `vw_attendance_summary` - Attendance summary per student
- `vw_teacher_attendance_summary` - Teacher attendance summary
- `vw_teacher_schedule_overview` - Teacher weekly schedule

## 🔧 Available Functions

- `calculate_attendance_rate(student_uuid)` - Returns student attendance percentage
- `update_class_statistics(class_uuid)` - Updates class statistics
- `calculate_teacher_attendance_rate(teacher_uuid, class_uuid?)` - Returns teacher attendance rate
- `get_teacher_today_schedule(teacher_uuid)` - Returns today's schedule for a teacher

## 🔄 Real-time Subscriptions

```typescript
import { supabase } from '@/lib/supabase/client';

// Subscribe to new students
const channel = supabase
  .channel('students-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'students',
    },
    (payload) => {
      console.log('New student added:', payload.new);
    }
  )
  .subscribe();

// Unsubscribe when done
channel.unsubscribe();
```

## 📝 Type Safety

All queries are fully typed using the generated `Database` type from `types.ts`. TypeScript will provide autocomplete and type checking for all database operations.

## 🆘 Troubleshooting

### Authentication Issues
- Ensure your Supabase project has email auth enabled
- Check that RLS policies are properly set up
- Verify admin_profiles entry exists for the authenticated user

### Query Errors
- Check that you've run the schema.sql in your Supabase project
- Verify table names and column names match the schema
- Ensure RLS policies allow the operation

### Type Errors
- Make sure `@supabase/supabase-js` is installed
- Check that import paths are correct
- Verify types.ts is up to date with your schema

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Database Schema Reference](../database/README.md)
- [Teacher Attendance Guide](../database/TEACHER-ATTENDANCE.md)

# Tuition Management System - Database Setup Guide

## 📋 Overview
This guide will help you set up the PostgreSQL database for the Tuition Management System on Supabase with admin authentication.

---

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: Tuition Management
   - **Database Password**: (choose a strong password)
   - **Region**: (select closest to you)
4. Click **"Create new project"** and wait for setup to complete

---

### 2. Run Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `database/schema.sql`
4. Paste into the SQL Editor
5. Click **"Run"** or press `Ctrl + Enter`
6. Wait for execution to complete (you should see "Success" message)

---

### 3. Create Admin User

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **"Add user"** → **"Create new user"**
3. Fill in admin details:
   ```
   Email: admin@tuition.com
   Password: Admin@123456  (or your preferred password)
   ```
4. Click **"Create user"**
5. The user will be automatically created in `auth.users` table

> Note: Organization-scoped RLS

The schema is organization-centric. Most data access is scoped by `organization_id`.
When creating an admin, ensure the `admin_profiles` row includes the correct
`organization_id` (or create the organization first). To avoid RLS/foreign-key
timing issues during signup, prefer a server-side (service-role) onboarding
flow that creates the organization, creates the auth user, and inserts the
`admin_profiles` row in an atomic sequence.

Recommended atomic onboarding example (server-side):

```sql
-- 1) Create organization (server side)
INSERT INTO organizations (name /*, other fields */)
VALUES ('Acme Tuition')
RETURNING id;

-- 2) After creating the auth user via the admin/service API, insert admin profile
INSERT INTO admin_profiles (user_id, full_name, email, role, phone, is_active, organization_id)
VALUES ('<AUTH_USER_UUID>', 'Super Admin', 'admin@tuition.com', 'super_admin', '+91 9876543210', TRUE, '<ORGANIZATION_UUID>');
```

If you prefer to use the dashboard to create the auth user, run the `admin_profiles`
insert only after the auth user exists and you have the `organization_id` available.

#### Option B: Using SQL (Alternative)

Run this SQL in the SQL Editor:

```sql
-- This will be done automatically by Supabase Auth API
-- Just use the Dashboard method above
```

---

### 4. Create Admin Profile

After creating the user in Authentication, link it to admin_profiles:

1. In SQL Editor, run this query to get the user ID:

```sql
-- Get the user ID of the admin you just created
SELECT id, email FROM auth.users WHERE email = 'admin@tuition.com';
```

2. Copy the `id` (UUID) from the result

3. Run this query to create admin profile (replace `YOUR_USER_ID` with the copied UUID):

```sql
-- Create admin profile
INSERT INTO admin_profiles (user_id, full_name, email, role, phone, is_active)
VALUES (
    'YOUR_USER_ID',  -- Replace with actual UUID from step 1
    'Super Admin',
    'admin@tuition.com',
    'super_admin',
    '+91 9876543210',
    TRUE
);
```

#### Quick One-Step Alternative:

```sql
-- Create admin profile using subquery (easier method)
INSERT INTO admin_profiles (user_id, full_name, email, role, phone, is_active)
SELECT 
    id,
    'Super Admin',
    email,
    'super_admin',
    '+91 9876543210',
    TRUE
FROM auth.users 
WHERE email = 'admin@tuition.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

### 5. Load Sample Data (Optional)

1. In SQL Editor, create a new query
2. Copy contents of `database/seed-data.sql`
3. Paste and run the query
4. This will populate:
   - 15 Classes (Nursery to Class 12)
   - 18 Subjects
   - 12 Sample Students
   - Sample fee payments and attendance records
   - 4 Sample Teachers
   - System settings and reminder configurations

---

### 6. Verify Installation

Run these queries to verify everything is set up correctly:

```sql
-- Check if admin profile exists
SELECT * FROM admin_profiles WHERE role = 'super_admin';

-- Check classes count
SELECT COUNT(*) as total_classes FROM classes;

-- Check students count
SELECT COUNT(*) as total_students FROM students;

-- Check if RLS policies are active
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

---

## 🔐 Admin Login Credentials

After setup, use these credentials to log in:

```
Email: admin@tuition.com
Password: Admin@123456  (or whatever you set during user creation)
```

⚠️ **IMPORTANT**: Change the default password after first login!

---

## 📊 Database Structure

### Core Tables
- **admin_profiles** - Admin users and staff
- **classes** - Class/grade definitions (Nursery to Class 12)
- **subjects** - Subject catalog
- **students** - Student records
- **attendance** - Daily attendance tracking
- **fee_payments** - Fee collection records
- **notifications** - System notifications
- **inquiries** - Admission inquiries/leads

### Supporting Tables
- **class_subjects** - Class-subject mapping
- **student_performance** - Exam scores and grades
- **student_documents** - Document storage metadata
- **reminder_settings** - Automated reminder configuration
- **teachers** - Teacher information
- **class_teachers** - Teacher-class assignments
- **activity_logs** - Audit trail
- **system_settings** - Application configuration

---

## 🔒 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Allow full access to authenticated admin users
- Require admin_profiles entry to be active
- Prevent unauthorized access to data

### Policies Applied
- Admins can view, insert, update, and delete all records
- All operations require valid authentication
- User must exist in `admin_profiles` with `is_active = TRUE`

---

## 🛠️ Environment Setup for Next.js

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
# or
bun add @supabase/supabase-js
```

### 2. Get Supabase Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 3. Create Environment File

Create `.env.local` in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 📝 Common SQL Queries

### Get All Students with Class Info
```sql
SELECT * FROM vw_student_details ORDER BY class_name, roll_number;
```

### Get Fee Collection Summary
```sql
SELECT * FROM vw_fee_collection_by_class;
```

### Get Attendance Summary for a Student
```sql
SELECT * FROM vw_attendance_summary WHERE student_id = 'student-uuid-here';
```

### Get Pending Fees
```sql
SELECT 
    s.name,
    s.roll_number,
    c.name as class,
    fp.amount,
    fp.due_date,
    fp.status
FROM fee_payments fp
JOIN students s ON fp.student_id = s.id
JOIN classes c ON s.class_id = c.id
WHERE fp.status IN ('Pending', 'Overdue')
ORDER BY fp.due_date;
```

### Get Today's Attendance
```sql
SELECT 
    s.name,
    c.name as class,
    a.status,
    a.check_in_time
FROM attendance a
JOIN students s ON a.student_id = s.id
JOIN classes c ON s.class_id = c.id
WHERE a.attendance_date = CURRENT_DATE
ORDER BY c.name, s.roll_number;
```

---

## 🔄 Useful Functions

### Calculate Student Attendance
```sql
SELECT calculate_attendance_rate('student-uuid-here');
```

### Update Class Statistics
```sql
SELECT update_class_statistics('class-uuid-here');
```

---

## 🎯 Next Steps

1. ✅ Set up Supabase project
2. ✅ Run schema.sql
3. ✅ Create admin user
4. ✅ Create admin profile
5. ✅ Load seed data (optional)
6. ✅ Configure environment variables
7. ✅ Create Supabase client in Next.js
8. 🔨 Build authentication pages
9. 🔨 Build student management UI
10. 🔨 Build fee collection UI
11. 🔨 Build attendance tracking UI

---

## 🆘 Troubleshooting

### Issue: Cannot create admin profile
**Solution**: Make sure the user exists in `auth.users` first. Check with:
```sql
SELECT * FROM auth.users WHERE email = 'admin@tuition.com';
```

### Issue: RLS policies blocking access
**Solution**: Verify admin profile exists and is active:
```sql
SELECT * FROM admin_profiles WHERE email = 'admin@tuition.com';
```

### Issue: Foreign key constraints failing
**Solution**: Ensure parent records exist before inserting child records. For example, create classes before students.

### Issue: Trigger not firing
**Solution**: Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE 'update_%';
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

## 📞 Support

For issues or questions:
- Check Supabase Dashboard logs
- Review SQL execution results
- Verify RLS policies are correctly configured
- Ensure admin user is properly linked to admin_profiles table

---

**Last Updated**: October 2024  
**Database Version**: 1.0  
**Compatible with**: Supabase PostgreSQL 15+

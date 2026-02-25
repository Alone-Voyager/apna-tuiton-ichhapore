# Database Documentation

This folder contains all database-related files for the Tuition Management System.

## 📁 Files
### 1. `schema.sql`
The complete PostgreSQL database schema including:
- 16 tables covering all aspects of tuition management
- Row Level Security (RLS) policies for data protection
- Indexes for optimal query performance
- Triggers for automatic timestamp updates
- Views for common queries
- Helper functions for calculations

**Tables Created:**
- `admin_profiles` - Admin user management
- `classes` - Class/grade definitions
- `subjects` - Subject catalog
- `class_subjects` - Class-subject relationships
- `students` - Student records
- `attendance` - Attendance tracking
- `fee_payments` - Fee collection records
- `student_performance` - Academic performance
- `student_documents` - Document metadata
- `notifications` - System notifications
- `reminder_settings` - Reminder configuration
- `inquiries` - Lead management
- `activity_logs` - Audit trail
- `system_settings` - App configuration
- `teachers` - Teacher information
- `class_teachers` - Teacher assignments
- `teacher_attendance` - **NEW** Teacher class attendance tracking
- `teacher_schedule` - **NEW** Teacher weekly schedule

### 2. `seed-data.sql`
Sample data for testing and development:
- 15 classes (Nursery to Class 12)
- 18 subjects across all grades
- 12 sample students
- Fee payment records
- Attendance records
- 4 sample teachers
- System settings
- Reminder configurations

### 3. `SETUP-GUIDE.md`
Step-by-step instructions for:
- Creating Supabase project
- Running database schema
- Creating admin user
- Loading sample data
- Configuring Next.js environment
- Troubleshooting common issues

### 4. `API-REFERENCE.md`
Code examples and API documentation for:
- Authentication queries
- Student CRUD operations
- Fee payment management
- Attendance tracking
- **Teacher attendance & scheduling** ⭐ NEW
- Reports and analytics
- Real-time subscriptions
- Batch operations

### 5. `TEACHER-ATTENDANCE.md` ⭐ NEW
Complete guide for teacher attendance system:
- Teacher schedule management
- Daily attendance tracking
- Multiple class assignments
- Code examples and queries

## 🚀 Quick Start

1. **Set up Supabase Project**
   ```bash
   # Go to https://app.supabase.com/
   # Create new project
   ```

2. **Run Schema**
   ```sql
   -- In Supabase SQL Editor, run:
   -- Copy & paste entire schema.sql
   ```

3. **Create Admin User**
   - Go to Authentication → Users in Supabase
   - Add user with email: `admin@tuition.com`
   - Then link to admin_profiles table (see SETUP-GUIDE.md)

4. **Load Sample Data** (Optional)
   ```sql
   -- Run seed-data.sql in SQL Editor
   ```

## 🔐 Admin Credentials

After setup:
```
Email: admin@tuition.com
Password: [Set during user creation]
```

## 📊 Database Schema Overview

```
┌─────────────────┐
│  auth.users     │ (Supabase Auth)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ admin_profiles  │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    classes      │────▶│  class_subjects │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │    subjects     │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐
│    students     │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │attendance│  │fee_      │  │student_  │  │student_  │
  │          │  │payments  │  │performance│ │documents │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ notifications   │  │   inquiries     │  │ activity_logs   │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│reminder_settings│  │system_settings  │
└─────────────────┘  └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    teachers     │────▶│ class_teachers  │
└─────────────────┘     └─────────────────┘
```

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- Admin-only access policies
- Secure authentication via Supabase Auth
- Audit trail via activity_logs
- Automatic timestamp tracking

## 📝 Common Tasks

### Add New Student
```typescript
const { data } = await supabase
  .from('students')
  .insert({ name: 'New Student', class_id: classId, ... })
```

### Record Fee Payment
```typescript
const { data } = await supabase
  .from('fee_payments')
  .insert({ student_id: id, amount: 3500, ... })
```

### Mark Attendance
```typescript
const { data } = await supabase
  .from('attendance')
  .insert({ student_id: id, status: 'Present', ... })
```

See `API-REFERENCE.md` for complete examples.

## 🛠️ Maintenance

### Update Class Statistics
```sql
SELECT update_class_statistics('class-uuid');
```

### Calculate Student Attendance
```sql
SELECT calculate_attendance_rate('student-uuid');
```

### Backup Database
```bash
# In Supabase Dashboard:
# Settings → Database → Backups
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Support

For setup issues, see `SETUP-GUIDE.md` troubleshooting section.

For API usage, see `API-REFERENCE.md` with code examples.

---

**Version**: 1.0  
**Last Updated**: October 2024  
**Compatible with**: Supabase PostgreSQL 15+

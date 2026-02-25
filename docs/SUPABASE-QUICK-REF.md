# 🚀 Supabase Quick Reference
## Common Operations

### Login
```typescript
const { data, error } = await signIn('email@example.com', 'password');
```

### Get Current User Profile
```typescript
const { data: profile } = await getAdminProfile();
```

### Fetch Students
```typescript
// All students
const { data } = await getStudents();

// By class
const { data } = await getStudents({ classId: 'uuid' });

// Search
const { data } = await getStudents({ search: 'John' });
```

### Mark Attendance
```typescript
await markAttendance([
  { student_id: 'uuid', attendance_date: '2024-10-04', status: 'Present' }
]);
```

### Record Fee Payment
```typescript
await createFeePayment({
  student_id: 'uuid',
  amount: 5000,
  payment_month: 'October 2024',
  payment_date: '2024-10-04',
  due_date: '2024-10-05',
  status: 'Paid',
});
```

## Direct Supabase Queries

```typescript
// Custom query
const { data, error } = await supabase
  .from('students')
  .select('*, classes(*)')
  .eq('status', 'active');

// Call function
const { data } = await supabase.rpc('calculate_attendance_rate', {
  student_uuid: 'uuid'
});
```

## Documentation

- 📖 Full Guide: `src/lib/supabase/README.md`
- ⚡ Quick Start: `SUPABASE-SETUP.md`
- 📊 Summary: `SUPABASE-INTEGRATION-SUMMARY.md`

# Database API Quick Reference

## 🔐 Authentication Queries

### Login Admin

import { supabase } from '@/lib/supabase'

// Sign in admin
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@tuition.com',
  password: 'Admin@123456'
})

// Get current admin profile
const { data: profile } = await supabase
  .from('admin_profiles')
  .select('*')
  .eq('user_id', data.user?.id)
  .single()
```

### Logout
```typescript
await supabase.auth.signOut()
```

### Check Auth State
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

---

## 👨‍🎓 Student Operations

### Get All Students
```typescript
const { data: students } = await supabase
  .from('students')
  .select(`
    *,
    classes (name, monthly_fee)
  `)
  .eq('is_active', true)
  .order('name')
```

### Get Students by Class
```typescript
const { data: students } = await supabase
  .from('students')
  .select('*, classes(name)')
  .eq('class_id', classId)
  .eq('is_active', true)
```

### Add New Student
```typescript
const { data, error } = await supabase
  .from('students')
  .insert({
    name: 'John Doe',
    class_id: classId,
    roll_number: '10A001',
    admission_date: '2024-10-01',
    parent_name: 'Mr. Doe',
    phone: '+91 9876543210',
    email: 'john.doe@email.com',
    address: '123 Street, City',
    monthly_fee: 3500.00,
    status: 'active'
  })
  .select()
  .single()
```

### Update Student
```typescript
const { data, error } = await supabase
  .from('students')
  .update({
    phone: '+91 9876543211',
    address: 'New Address'
  })
  .eq('id', studentId)
```

### Delete Student (Soft Delete)
```typescript
const { error } = await supabase
  .from('students')
  .update({ is_active: false, status: 'inactive' })
  .eq('id', studentId)
```

### Search Students
```typescript
const { data: students } = await supabase
  .from('students')
  .select('*, classes(name)')
  .or(`name.ilike.%${searchTerm}%,roll_number.ilike.%${searchTerm}%`)
  .eq('is_active', true)
```

---

## 📚 Class Operations

### Get All Classes
```typescript
const { data: classes } = await supabase
  .from('classes')
  .select('*')
  .eq('is_active', true)
  .order('name')
```

### Get Class with Students Count
```typescript
const { data: classData } = await supabase
  .from('classes')
  .select(`
    *,
    students:students(count)
  `)
  .eq('id', classId)
  .single()
```

### Add New Class
```typescript
const { data, error } = await supabase
  .from('classes')
  .insert({
    name: 'Class 11',
    monthly_fee: 3800.00
  })
  .select()
  .single()
```

---

## 💰 Fee Payment Operations

### Get All Payments
```typescript
const { data: payments } = await supabase
  .from('fee_payments')
  .select(`
    *,
    students (
      name,
      roll_number,
      classes (name)
    )
  `)
  .order('payment_date', { ascending: false })
```

### Get Pending Fees
```typescript
const { data: pendingFees } = await supabase
  .from('fee_payments')
  .select(`
    *,
    students (name, roll_number, phone, classes(name))
  `)
  .in('status', ['Pending', 'Overdue'])
  .order('due_date')
```

### Record Fee Payment
```typescript
const { data, error } = await supabase
  .from('fee_payments')
  .insert({
    student_id: studentId,
    amount: 3500.00,
    payment_month: 'October 2024',
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '2024-10-05',
    payment_method: 'UPI',
    transaction_id: 'TXN123456789',
    receipt_number: 'REC001',
    status: 'Paid',
    paid_amount: 3500.00,
    collected_by: adminProfileId
  })
  .select()
  .single()
```

### Update Payment Status
```typescript
const { error } = await supabase
  .from('fee_payments')
  .update({
    status: 'Paid',
    paid_amount: amount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash'
  })
  .eq('id', paymentId)
```

### Get Fee Summary by Class
```typescript
const { data } = await supabase
  .rpc('get_fee_summary_by_class', { class_uuid: classId })
```

---

## 📅 Attendance Operations

### Mark Daily Attendance
```typescript
const { data, error } = await supabase
  .from('attendance')
  .insert({
    student_id: studentId,
    attendance_date: new Date().toISOString().split('T')[0],
    status: 'Present',
    check_in_time: '09:15:00',
    marked_by: adminProfileId
  })
  .select()
```

### Mark Multiple Students Attendance
```typescript
const attendanceRecords = students.map(student => ({
  student_id: student.id,
  attendance_date: new Date().toISOString().split('T')[0],
  status: student.status, // 'Present', 'Absent', 'Late'
  check_in_time: student.checkInTime,
  marked_by: adminProfileId
}))

const { data, error } = await supabase
  .from('attendance')
  .insert(attendanceRecords)
```

### Get Today's Attendance
```typescript
const { data: attendance } = await supabase
  .from('attendance')
  .select(`
    *,
    students (
      name,
      roll_number,
      classes (name)
    )
  `)
  .eq('attendance_date', new Date().toISOString().split('T')[0])
```

### Get Student Attendance History
```typescript
const { data: history } = await supabase
  .from('attendance')
  .select('*')
  .eq('student_id', studentId)
  .order('attendance_date', { ascending: false })
  .limit(30)
```

### Get Attendance Summary
```typescript
const { data: summary } = await supabase
  .from('vw_attendance_summary')
  .select('*')
  .eq('student_id', studentId)
  .single()
```

---

## 📊 Reports & Analytics

### Dashboard Statistics
```typescript
// Total students
const { count: totalStudents } = await supabase
  .from('students')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)

// Total revenue this month
const { data: revenue } = await supabase
  .from('fee_payments')
  .select('paid_amount.sum()')
  .eq('status', 'Paid')
  .gte('payment_date', startOfMonth)
  .lte('payment_date', endOfMonth)

// Today's attendance
const { count: presentToday } = await supabase
  .from('attendance')
  .select('*', { count: 'exact', head: true })
  .eq('attendance_date', new Date().toISOString().split('T')[0])
  .eq('status', 'Present')
```

### Fee Collection Report
```typescript
const { data: feeReport } = await supabase
  .from('vw_fee_collection_by_class')
  .select('*')
  .order('class_name')
```

### Attendance Report by Class
```typescript
const { data: report } = await supabase
  .from('attendance')
  .select(`
    status,
    students!inner (
      class_id,
      classes (name)
    )
  `)
  .eq('attendance_date', date)
  .eq('students.classes.id', classId)
```

---

## 🔔 Notification Operations

### Create Notification
```typescript
const { data, error } = await supabase
  .from('notifications')
  .insert({
    type: 'fee_reminder',
    title: 'Fee Payment Reminder',
    message: 'Your fee payment is due in 3 days',
    target_type: 'student',
    target_id: studentId,
    status: 'pending',
    created_by: adminProfileId
  })
  .select()
```

### Get All Notifications
```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50)
```

### Send Bulk Notifications
```typescript
const notifications = students.map(student => ({
  type: 'fee_reminder',
  title: 'Fee Payment Reminder',
  message: `Dear ${student.parent_name}, fee payment of ₹${student.monthly_fee} is due`,
  target_type: 'student',
  target_id: student.id,
  status: 'pending',
  created_by: adminProfileId
}))

const { data, error } = await supabase
  .from('notifications')
  .insert(notifications)
```

---

## 📝 Inquiry/Lead Management

### Get All Inquiries
```typescript
const { data: inquiries } = await supabase
  .from('inquiries')
  .select('*')
  .order('inquiry_date', { ascending: false })
```

### Add New Inquiry
```typescript
const { data, error } = await supabase
  .from('inquiries')
  .insert({
    student_name: 'New Student',
    parent_name: 'Parent Name',
    phone: '+91 9876543210',
    email: 'parent@email.com',
    class_interested: 'Class 10',
    status: 'new',
    notes: 'Interested in science coaching',
    assigned_to: adminProfileId
  })
  .select()
```

### Update Inquiry Status
```typescript
const { error } = await supabase
  .from('inquiries')
  .update({
    status: 'converted',
    follow_up_date: null
  })
  .eq('id', inquiryId)
```

---

## 🏫 Teacher Operations

### Get All Teachers
```typescript
const { data: teachers } = await supabase
  .from('teachers')
  .select('*')
  .eq('status', 'active')
  .order('name')
```

### Assign Teacher to Class
```typescript
const { data, error } = await supabase
  .from('class_teachers')
  .insert({
    class_id: classId,
    teacher_id: teacherId,
    is_class_teacher: true
  })
```

---

## 📈 Performance Tracking

### Add Performance Record
```typescript
const { data, error } = await supabase
  .from('student_performance')
  .insert({
    student_id: studentId,
    subject_id: subjectId,
    exam_name: 'Mid Term Exam',
    exam_date: '2024-10-15',
    score: 85.5,
    max_score: 100,
    grade: 'A',
    remarks: 'Excellent performance'
  })
```

### Get Student Performance
```typescript
const { data: performance } = await supabase
  .from('student_performance')
  .select(`
    *,
    subjects (name)
  `)
  .eq('student_id', studentId)
  .order('exam_date', { ascending: false })
```

---

## 🔍 Advanced Queries

### Full Text Search
```typescript
const { data } = await supabase
  .from('students')
  .select('*, classes(name)')
  .textSearch('name', searchTerm)
```

### Aggregate Queries
```typescript
// Count students per class
const { data } = await supabase
  .from('students')
  .select('class_id, classes(name)')
  .eq('is_active', true)

// Group by class
const grouped = data.reduce((acc, student) => {
  const className = student.classes.name
  acc[className] = (acc[className] || 0) + 1
  return acc
}, {})
```

---

## 🛠️ Utility Functions

### Calculate Attendance Percentage
```typescript
const { data } = await supabase
  .rpc('calculate_attendance_rate', { student_uuid: studentId })
```

### Update Class Statistics
```typescript
const { data } = await supabase
  .rpc('update_class_statistics', { class_uuid: classId })
```

---

## 🎯 Real-time Subscriptions

### Subscribe to New Students
```typescript
const subscription = supabase
  .channel('students_channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'students' },
    (payload) => {
      console.log('New student added:', payload.new)
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

### Subscribe to Fee Payments
```typescript
const subscription = supabase
  .channel('payments_channel')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'fee_payments' },
    (payload) => {
      console.log('Payment update:', payload)
    }
  )
  .subscribe()
```

---

## 📦 Batch Operations

### Bulk Insert
```typescript
const students = [
  { name: 'Student 1', class_id: classId, /* ... */ },
  { name: 'Student 2', class_id: classId, /* ... */ },
]

const { data, error } = await supabase
  .from('students')
  .insert(students)
  .select()
```

### Bulk Update
```typescript
// Update multiple records with same values
const { error } = await supabase
  .from('students')
  .update({ status: 'active' })
  .in('id', [id1, id2, id3])
```

---

## 🔒 Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('students')
    .select('*')
  
  if (error) throw error
  
  return data
} catch (error) {
  console.error('Database error:', error.message)
  // Handle error appropriately
}
```

---

**Tip**: Always use `.select()` after INSERT/UPDATE to get the modified records back.

**Tip**: Use `.single()` when expecting exactly one record.

**Tip**: Enable RLS and ensure admin authentication before all queries.

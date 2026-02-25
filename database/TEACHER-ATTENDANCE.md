# Teacher Attendance - Quick Reference

## 📚 Teacher Attendance & Schedule Management

### Overview
The system now tracks:
- **Teacher Schedules**: Weekly recurring class schedules
- **Teacher Attendance**: Daily attendance for each class a teacher conducts
- **Multiple Classes**: One teacher can teach multiple classes

---

## 🗄️ New Tables

### 1. `teacher_attendance`
Records daily attendance for teachers attending classes.

**Key Fields:**
- `teacher_id` - Which teacher
- `class_id` - Which class they taught
- `attendance_date` - Date of class
- `status` - Present, Absent, Late, Half Day, Leave, Cancelled
- `check_in_time` / `check_out_time` - Actual times
- `class_duration` - Duration in minutes
- `subject_taught` - Subject covered
- `notes` - Additional notes (e.g., "sick leave")

**Unique Constraint:** One record per teacher per class per day

### 2. `teacher_schedule`
Defines weekly recurring schedule for teachers.

**Key Fields:**
- `teacher_id` - Which teacher
- `class_id` - Which class
- `day_of_week` - Monday, Tuesday, etc.
- `start_time` / `end_time` - Class timings
- `subject` - Subject to be taught
- `room_number` - Classroom location
- `is_active` - Enable/disable schedule

---

## 📊 New Views

### `vw_teacher_attendance_summary`
Get attendance statistics for each teacher per class:
- Total classes attended/missed/late
- Attendance percentage
- Total teaching hours

### `vw_teacher_schedule_overview`
Complete weekly schedule overview for all active teachers.

---

## 🔧 New Functions

### 1. `calculate_teacher_attendance_rate(teacher_uuid, class_uuid?)`
Calculate attendance percentage for a teacher.

**Usage:**
```sql
-- Overall attendance across all classes
SELECT calculate_teacher_attendance_rate('teacher-id');

-- Attendance for specific class
SELECT calculate_teacher_attendance_rate('teacher-id', 'class-id');
```

### 2. `get_teacher_today_schedule(teacher_uuid)`
Get today's schedule for a teacher with attendance status.

**Returns:**
- Class name
- Subject
- Start/end time
- Room number
- Whether attendance has been marked

---

## 💻 Code Examples

### Mark Teacher Attendance

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('teacher_attendance')
  .insert({
    teacher_id: teacherId,
    class_id: classId,
    attendance_date: new Date().toISOString().split('T')[0],
    status: 'Present',
    check_in_time: '09:00:00',
    check_out_time: '10:30:00',
    class_duration: 90, // minutes
    subject_taught: 'Mathematics',
    notes: 'Covered chapters 5-6',
    marked_by: adminProfileId
  })
  .select()
```

### Get Teacher's Today Schedule

```typescript
const { data: todaySchedule } = await supabase
  .rpc('get_teacher_today_schedule', { 
    teacher_uuid: teacherId 
  })

// Returns:
// [
//   {
//     class_name: 'Class 10',
//     subject: 'Mathematics',
//     start_time: '09:00:00',
//     end_time: '10:30:00',
//     room_number: 'Room 101',
//     has_attended: true
//   }
// ]
```

### Create Teacher Schedule

```typescript
const { data, error } = await supabase
  .from('teacher_schedule')
  .insert({
    teacher_id: teacherId,
    class_id: classId,
    day_of_week: 'Monday',
    start_time: '09:00:00',
    end_time: '10:30:00',
    subject: 'Physics',
    room_number: 'Lab 1',
    is_active: true
  })
```

### Get Teacher's Weekly Schedule

```typescript
const { data: schedule } = await supabase
  .from('vw_teacher_schedule_overview')
  .select('*')
  .eq('teacher_id', teacherId)
```

### Get All Teachers for a Class

```typescript
const { data: teachers } = await supabase
  .from('teacher_schedule')
  .select(`
    teachers (
      id,
      name,
      phone,
      subject_specialization
    ),
    day_of_week,
    start_time,
    end_time,
    subject,
    room_number
  `)
  .eq('class_id', classId)
  .eq('is_active', true)
  .order('day_of_week')
```

### Get Teacher Attendance History

```typescript
const { data: history } = await supabase
  .from('teacher_attendance')
  .select(`
    *,
    classes (name),
    teachers (name)
  `)
  .eq('teacher_id', teacherId)
  .gte('attendance_date', startDate)
  .lte('attendance_date', endDate)
  .order('attendance_date', { ascending: false })
```

### Mark Multiple Teachers' Attendance

```typescript
const attendanceRecords = [
  {
    teacher_id: teacher1Id,
    class_id: class1Id,
    attendance_date: '2024-10-04',
    status: 'Present',
    check_in_time: '09:00:00',
    check_out_time: '10:30:00',
    class_duration: 90,
    subject_taught: 'Mathematics'
  },
  {
    teacher_id: teacher2Id,
    class_id: class2Id,
    attendance_date: '2024-10-04',
    status: 'Present',
    check_in_time: '11:00:00',
    check_out_time: '12:00:00',
    class_duration: 60,
    subject_taught: 'English'
  }
]

const { data, error } = await supabase
  .from('teacher_attendance')
  .insert(attendanceRecords)
```

### Get Teacher Attendance Summary

```typescript
const { data: summary } = await supabase
  .from('vw_teacher_attendance_summary')
  .select('*')
  .eq('teacher_id', teacherId)
  .single()

// Returns:
// {
//   teacher_name: 'Dr. Rajesh Sharma',
//   class_name: 'Class 10',
//   classes_attended: 45,
//   classes_missed: 2,
//   classes_late: 1,
//   total_classes: 48,
//   attendance_percentage: 93.75,
//   total_minutes_taught: 4050
// }
```

### Check If Teacher Has Attended Today's Class

```typescript
const { data: hasAttended } = await supabase
  .from('teacher_attendance')
  .select('id')
  .eq('teacher_id', teacherId)
  .eq('class_id', classId)
  .eq('attendance_date', new Date().toISOString().split('T')[0])
  .single()

if (hasAttended) {
  console.log('Already marked present')
} else {
  // Mark attendance
}
```

### Update Teacher Attendance (if marked wrong)

```typescript
const { error } = await supabase
  .from('teacher_attendance')
  .update({
    status: 'Late',
    check_in_time: '09:15:00',
    notes: 'Traffic delay'
  })
  .eq('id', attendanceId)
```

### Get Classes Where Teacher Was Absent

```typescript
const { data: absences } = await supabase
  .from('teacher_attendance')
  .select(`
    *,
    classes (name),
    teachers (name)
  `)
  .eq('teacher_id', teacherId)
  .in('status', ['Absent', 'Leave'])
  .order('attendance_date', { ascending: false })
```

### Disable/Update Teacher Schedule

```typescript
// Disable a schedule
const { error } = await supabase
  .from('teacher_schedule')
  .update({ is_active: false })
  .eq('id', scheduleId)

// Change timing
const { error } = await supabase
  .from('teacher_schedule')
  .update({
    start_time: '10:00:00',
    end_time: '11:30:00'
  })
  .eq('id', scheduleId)
```

---

## 📈 Reports & Analytics

### Monthly Teacher Report

```typescript
const startOfMonth = new Date(2024, 9, 1).toISOString().split('T')[0]
const endOfMonth = new Date(2024, 9, 31).toISOString().split('T')[0]

const { data: report } = await supabase
  .from('teacher_attendance')
  .select(`
    teacher_id,
    teachers (name),
    status,
    class_duration
  `)
  .gte('attendance_date', startOfMonth)
  .lte('attendance_date', endOfMonth)

// Group by teacher and calculate stats
const teacherStats = report.reduce((acc, record) => {
  const teacherId = record.teacher_id
  if (!acc[teacherId]) {
    acc[teacherId] = {
      name: record.teachers.name,
      present: 0,
      absent: 0,
      totalMinutes: 0
    }
  }
  if (record.status === 'Present') {
    acc[teacherId].present++
    acc[teacherId].totalMinutes += record.class_duration || 0
  } else if (record.status === 'Absent') {
    acc[teacherId].absent++
  }
  return acc
}, {})
```

### Class Coverage Report (Which classes have enough teacher attendance)

```typescript
const { data: classCoverage } = await supabase
  .from('teacher_attendance')
  .select(`
    class_id,
    classes (name),
    status
  `)
  .eq('attendance_date', todayDate)
  .eq('status', 'Present')
```

---

## 🎯 Use Cases

### Daily Teacher Check-in System
1. Teacher arrives
2. Mark attendance with check-in time
3. Update check-out time when leaving
4. Calculate duration automatically

### Schedule Management
1. Create weekly recurring schedules
2. Assign teachers to multiple classes
3. View conflicts and overlaps
4. Track room allocations

### Performance Monitoring
1. Track teacher attendance rates
2. Identify frequently absent teachers
3. Calculate total teaching hours
4. Generate payroll reports based on hours

### Substitute Teacher Management
1. View teachers who are absent
2. Find available teachers during that time slot
3. Assign substitute
4. Mark as substitution in notes

---

## 🔍 Sample Queries

### Find Teachers Available at Specific Time

```sql
SELECT DISTINCT t.id, t.name
FROM teachers t
WHERE t.id NOT IN (
    SELECT teacher_id 
    FROM teacher_schedule 
    WHERE day_of_week = 'Monday' 
    AND start_time <= '10:00:00' 
    AND end_time >= '09:00:00'
    AND is_active = TRUE
)
AND t.status = 'active';
```

### Classes Without Teacher Attendance Today

```sql
SELECT c.name AS class_name
FROM classes c
WHERE NOT EXISTS (
    SELECT 1 
    FROM teacher_attendance ta
    WHERE ta.class_id = c.id 
    AND ta.attendance_date = CURRENT_DATE
);
```

### Teacher Workload (Total Classes Per Week)

```sql
SELECT 
    t.name,
    COUNT(*) AS classes_per_week,
    SUM(EXTRACT(EPOCH FROM (ts.end_time - ts.start_time)) / 60) AS total_weekly_minutes
FROM teachers t
JOIN teacher_schedule ts ON t.id = ts.teacher_id
WHERE ts.is_active = TRUE
GROUP BY t.id, t.name
ORDER BY classes_per_week DESC;
```

---

**✅ Teacher attendance system is now fully integrated and ready to use!**

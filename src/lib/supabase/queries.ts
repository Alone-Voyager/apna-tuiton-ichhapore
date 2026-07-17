import { supabase } from './client';
import type { Database } from './types';

type Student = Database['public']['Tables']['students']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];
type FeePayment = Database['public']['Tables']['fee_payments']['Row'];
type Teacher = Database['public']['Tables']['teachers']['Row'];

// ============================================
// STUDENTS
// ============================================

export async function getStudents(filters?: {
  classId?: string;
  status?: 'active' | 'inactive' | 'alumni' | 'suspended';
  search?: string;
}) {
  let query = supabase
    .from('students')
    .select('*, classes(name)')
    .order('created_at', { ascending: false });

  if (filters?.classId) {
    query = query.eq('class_id', filters.classId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,roll_number.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  return await query;
}

export async function getStudentById(id: string) {
  return await supabase
    .from('students')
    .select('*, classes(name)')
    .eq('id', id)
    .single();
}

export async function getStudentDetailsWithFees(id: string) {
  // Fetch student data
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*, classes(name)')
    .eq('id', id)
    .single();

  if (studentError || !student) {
    return { data: null, error: studentError };
  }

  // Fetch pending/overdue fee payments (pending months) from fee_payments table
  const { data: overduePayments, error: overdueError } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('student_id', id)
    .in('status', ['Unpaid', 'Pending', 'Overdue', 'Partial'])
    .order('due_date', { ascending: true });

  if (overdueError) {
    console.error('Error fetching overdue payments:', overdueError);
  }

  // Fetch payment history (total paid) from fee_payment_history table
  const { data: paymentHistory, error: historyError } = await supabase
    .from('fee_payment_history')
    .select('paid_amount, discount, late_fee')
    .eq('student_id', id);

  if (historyError) {
    console.error('Error fetching payment history:', historyError);
  }

  // Calculate fee statistics
  const totalPaid = paymentHistory?.reduce(
    (sum: number, p: { paid_amount: any; late_fee: any; discount: any; }) => sum + Number(p.paid_amount || 0) + Number(p.late_fee || 0) - Number(p.discount || 0),
    0
  ) || 0;

  const pendingPayments = overduePayments || [];
  const totalPendingMonths = pendingPayments.length;
  const pendingAmount = pendingPayments.reduce((sum: number, p: { amount: any; paid_amount?: any; }) => sum + Number(p.amount || 0) - Number(p.paid_amount || 0), 0);
  const pendingMonths = pendingPayments.map((p: { payment_month: any; }) => p.payment_month);

  return {
    data: {
      ...student,
      totalPaid,
      totalPendingMonths,
      pendingAmount,
      pendingMonths,
      feePayments: overduePayments || [],
      paymentHistory: paymentHistory || []
    },
    error: null
  };
}

export async function createStudent(student: Database['public']['Tables']['students']['Insert']) {
  return await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
}

export async function updateStudent(id: string, updates: Database['public']['Tables']['students']['Update']) {
  return await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteStudent(id: string) {
  return await supabase
    .from('students')
    .delete()
    .eq('id', id);
}

// ============================================
// CLASSES
// ============================================

export async function getClasses() {
  return await supabase
    .from('classes')
    .select('*')
    .eq('is_active', true)
    .order('name');
}

export async function getClassById(id: string) {
  return await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single();
}

export async function createClass(classData: Database['public']['Tables']['classes']['Insert']) {
  return await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single();
}

export async function updateClass(id: string, updates: Database['public']['Tables']['classes']['Update']) {
  return await supabase
    .from('classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

// ============================================
// ATTENDANCE
// ============================================

export async function getAttendanceByDate(date: string, classId?: string) {
  let query = supabase
    .from('attendance')
    .select('*, students(name, roll_number, class_id, classes(name))')
    .eq('attendance_date', date);

  if (classId) {
    query = query.eq('students.class_id', classId);
  }

  return await query;
}

export async function getStudentAttendance(studentId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false });

  if (startDate) {
    query = query.gte('attendance_date', startDate);
  }

  if (endDate) {
    query = query.lte('attendance_date', endDate);
  }

  return await query;
}

export async function markAttendance(records: Database['public']['Tables']['attendance']['Insert'][]) {
  return await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,attendance_date' })
    .select();
}

export async function getAttendanceSummary(studentId?: string) {
  let query = supabase.from('vw_attendance_summary').select('*');

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  return await query;
}

// ============================================
// FEE PAYMENTS
// ============================================

export async function getFeePayments(filters?: {
  studentId?: string;
  status?: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled';
  month?: string;
}) {
  let query = supabase
    .from('fee_payments')
    .select('*, students(name, roll_number, class_id, classes(name))')
    .order('payment_date', { ascending: false });

  if (filters?.studentId) {
    query = query.eq('student_id', filters.studentId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.month) {
    query = query.eq('payment_month', filters.month);
  }

  return await query;
}

export async function createFeePayment(payment: Database['public']['Tables']['fee_payments']['Insert']) {
  return await supabase
    .from('fee_payments')
    .insert(payment)
    .select()
    .single();
}

export async function updateFeePayment(id: string, updates: Database['public']['Tables']['fee_payments']['Update']) {
  return await supabase
    .from('fee_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

export async function getFeeCollectionByClass() {
  return await supabase
    .from('vw_fee_collection_by_class')
    .select('*');
}

// ============================================
// FEE PAYMENT HISTORY
// ============================================

export async function getFeePaymentHistory(filters?: {
  studentId?: string;
  month?: string;
}) {
  let query = supabase
    .from('fee_payment_history')
    .select('*, students(name, roll_number, class_id, classes(name))')
    .order('collected_at', { ascending: false });

  if (filters?.studentId) {
    query = query.eq('student_id', filters.studentId);
  }

  if (filters?.month) {
    query = query.eq('payment_month', filters.month);
  }

  return await query;
}

export async function createFeePaymentHistory(payment: Database['public']['Tables']['fee_payment_history']['Insert']) {
  return await supabase
    .from('fee_payment_history')
    .insert(payment)
    .select()
    .single();
}

// ============================================
// TEACHERS
// ============================================

export async function getTeachers(status?: 'active' | 'inactive' | 'on_leave') {
  let query = supabase
    .from('teachers')
    .select('*')
    .order('name');

  if (status) {
    query = query.eq('status', status);
  }

  return await query;
}

export async function getTeacherById(id: string) {
  return await supabase
    .from('teachers')
    .select('*')
    .eq('id', id)
    .single();
}

export async function createTeacher(teacher: Database['public']['Tables']['teachers']['Insert']) {
  return await supabase
    .from('teachers')
    .insert(teacher)
    .select()
    .single();
}

export async function updateTeacher(id: string, updates: Database['public']['Tables']['teachers']['Update']) {
  return await supabase
    .from('teachers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

// ============================================
// TEACHER ATTENDANCE
// ============================================

export async function getTeacherAttendance(teacherId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('teacher_attendance')
    .select('*, classes(name), teachers(name)')
    .eq('teacher_id', teacherId)
    .order('attendance_date', { ascending: false });

  if (startDate) {
    query = query.gte('attendance_date', startDate);
  }

  if (endDate) {
    query = query.lte('attendance_date', endDate);
  }

  return await query;
}

export async function markTeacherAttendance(records: Database['public']['Tables']['teacher_attendance']['Insert'][]) {
  return await supabase
    .from('teacher_attendance')
    .upsert(records, { onConflict: 'teacher_id,class_id,attendance_date' })
    .select();
}

export async function getTeacherSchedule(teacherId: string, dayOfWeek?: string) {
  let query = supabase
    .from('teacher_schedule')
    .select('*, classes(name), teachers(name)')
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
    .order('start_time');

  if (dayOfWeek) {
    query = query.eq('day_of_week', dayOfWeek);
  }

  return await query;
}

export async function getTeacherTodaySchedule(teacherId: string) {
  return await supabase.rpc('get_teacher_today_schedule', {
    teacher_uuid: teacherId,
  });
}

export async function calculateTeacherAttendanceRate(teacherId: string, classId?: string) {
  return await supabase.rpc('calculate_teacher_attendance_rate', {
    teacher_uuid: teacherId,
    class_uuid: classId,
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotifications(status?: 'pending' | 'sent' | 'failed' | 'scheduled') {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  return await query;
}

export async function createNotification(notification: Database['public']['Tables']['notifications']['Insert']) {
  return await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();
}

// ============================================
// INQUIRIES
// ============================================

export async function getInquiries(status?: string) {
  let query = supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  return await query;
}

export async function createInquiry(inquiry: Database['public']['Tables']['inquiries']['Insert']) {
  return await supabase
    .from('inquiries')
    .insert(inquiry)
    .select()
    .single();
}

export async function updateInquiry(id: string, updates: Database['public']['Tables']['inquiries']['Update']) {
  return await supabase
    .from('inquiries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
  const [
    studentsResult,
    classesResult,
    attendanceResult,
    feesResult,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('vw_attendance_summary').select('attendance_percentage'),
    supabase.from('fee_payments').select('status, amount').eq('status', 'Paid'),
  ]);

  return {
    totalStudents: studentsResult.count || 0,
    totalClasses: classesResult.count || 0,
    avgAttendance: attendanceResult.data
      ? attendanceResult.data.reduce((sum: number, item: any) => sum + (item.attendance_percentage || 0), 0) / attendanceResult.data.length
      : 0,
    totalFeesCollected: feesResult.data
      ? feesResult.data.reduce((sum: number, item: any) => sum + item.amount, 0)
      : 0,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get classes for an organization
 */
export async function getClassesByOrganization(organizationId: string) {
  return await supabase
    .from('classes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, getRequestOrgContext } from '../../../lib/supabase/server';
import { supabaseAdmin } from '../../../lib/supabase/client';
import { sendAdmissionWelcome } from '../../../lib/admission-notification-service';
import { syncStudentFeePayments } from '../../../lib/fees-service';

// GET /api/students - Fetch students for the organization
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, organizationId } = await getRequestOrgContext(request);

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const status = searchParams.get('status');
    const includeInactive = searchParams.get('include_inactive'); // New parameter to include inactive students
    const feeStatus = searchParams.get('fee_status'); // 'paid' or 'overdue'
    const missingInfo = searchParams.get('missing_info'); // 'true' to filter students with missing parent_name or whatsapp

    // Build query
    let query = supabase
      .from('students')
      .select('*, classes(id, name, monthly_fee)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (classId) {
      query = query.eq('class_id', classId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Filter by active/inactive status
    if (includeInactive === 'only') {
      // Fetch only inactive students (suspended or is_active=false)
      query = query.eq('is_active', false);
    } else if (!includeInactive || includeInactive === 'false') {
      // Default: fetch only active students
      query = query.eq('is_active', true);
    }
    // If includeInactive === 'true', fetch all students regardless of is_active

    // Filter by missing information (parent_name or whatsapp)
    if (missingInfo === 'true') {
      query = query.or('parent_name.is.null,whatsapp.is.null');
    }

    const { data: students, error: studentsError } = await query;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    // If fee_status filter is applied, fetch payment information
    let enrichedStudents = students || [];

    if (feeStatus === 'paid') {
      // Fetch students who have paid fees from fee_payment_history
      const { data: paidPayments, error: paidError } = await supabase
        .from('fee_payment_history')
        .select('student_id, payment_month')
        .eq('organization_id', organizationId)
        .in('student_id', enrichedStudents.map(s => s.id));

      if (!paidError && paidPayments) {
        // Group payment months by student
        const paymentsByStudent = paidPayments.reduce((acc: any, payment) => {
          if (!acc[payment.student_id]) {
            acc[payment.student_id] = [];
          }
          acc[payment.student_id].push(payment.payment_month);
          return acc;
        }, {});

        // Filter students who have at least one paid payment and add payment months
        enrichedStudents = enrichedStudents
          .filter(student => paymentsByStudent[student.id])
          .map(student => ({
            ...student,
            fee_status: 'paid' as const,
            payment_months: paymentsByStudent[student.id] || []
          }));
      }
    } else if (feeStatus === 'overdue') {
      // Fetch students with overdue fees from fee_payments
      const { data: overduePayments, error: overdueError } = await supabase
        .from('fee_payments')
        .select('student_id, payment_month, status')
        .eq('organization_id', organizationId)
        .eq('status', 'Overdue')
        .in('student_id', enrichedStudents.map(s => s.id));

      if (!overdueError && overduePayments) {
        // Group overdue months by student
        const overdueByStudent = overduePayments.reduce((acc: any, payment) => {
          if (!acc[payment.student_id]) {
            acc[payment.student_id] = [];
          }
          acc[payment.student_id].push(payment.payment_month);
          return acc;
        }, {});

        // Filter students who have at least one overdue payment and add overdue months
        enrichedStudents = enrichedStudents
          .filter(student => overdueByStudent[student.id])
          .map(student => ({
            ...student,
            fee_status: 'overdue' as const,
            overdue_months: overdueByStudent[student.id] || []
          }));
      }
    }

    return NextResponse.json({ students: enrichedStudents }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabaseClient(request);
    const { user, organizationId } = await getRequestOrgContext(request);

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      class_id,
      admission_date,
      gender,
      parent_name,
      whatsapp,
      monthly_fee,
      notes,
      password,
      status = 'active'
    } = body;

    // Validate required fields
    if (!name || !admission_date || !parent_name || !whatsapp || !monthly_fee || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, admission_date, parent_name, whatsapp, monthly_fee, password' },
        { status: 400 }
      );
    }

    // Auto-generate roll number
    // Get the count of students in the organization to generate a unique roll number
    const { count, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (countError) {
      console.error('Error counting students:', countError);
      return NextResponse.json(
        { error: 'Failed to generate roll number' },
        { status: 500 }
      );
    }

    // Hash the password for the custom Users table
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const currentYear = new Date().getFullYear();
    let studentNumber = (count || 0) + 1;
    let roll_number = `AT-${currentYear}-${studentNumber.toString().padStart(3, '0')}`;
    let customUser = null;
    let customUserError = null;

    // Retry loop to guarantee a UNIQUE username entry into the Users table
    while (true) {
      const result = await (supabaseAdmin as any)
        .from('users')
        .insert({
          username: roll_number,
          password_hash: passwordHash,
          role: 'student',
          status: status
        })
        .select('id')
        .single();

      if (result.error && result.error.code === '23505') {
        // Unique violation, increment and retry
        studentNumber++;
        roll_number = `AT-${currentYear}-${studentNumber.toString().padStart(3, '0')}`;
        continue;
      }

      customUser = result.data;
      customUserError = result.error;
      break;
    }

    if (customUserError) {
      console.error('Error creating custom user:', customUserError);
      return NextResponse.json({ error: `Failed to create student account credentials: ${customUserError.message}` }, { status: 500 });
    }

    // Attempt to create the user in Supabase Auth (for sessions)
    // We use a safe dummy email based on the generated Student ID
    const studentEmail = `${roll_number.toLowerCase()}@apnatuition.local`;

    // Create Supabase Auth User
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'student', username: roll_number, name: name }
    });

    let authUserId = authUser?.user?.id;

    if (createUserError) {
      console.error('Failed to create Supabase Auth user (may already exist or configuration error):', createUserError.message);
      // Even if this fails (e.g. edge case), we'll gracefully continue so the student is admitted 
      // They can login via custom users table if we configure login accurately.
    }

    // Validate class_id if provided
    if (class_id) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('id', class_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (classError || !classData) {
        return NextResponse.json(
          { error: 'Invalid class selected or class does not belong to your organization' },
          { status: 400 }
        );
      }
    }

    // Insert new student
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert({
        organization_id: organizationId,
        name,
        class_id: class_id || null,
        roll_number,
        admission_date,
        gender: gender || null,
        parent_name,
        whatsapp: whatsapp || null,
        monthly_fee: Number(monthly_fee),
        status: status,
        notes: notes || null,
        is_active: status === 'active',
        user_id: customUser.id,
        temp_password_used: false
      })
      .select('*, classes(name)')
      .single();

    if (insertError) {
      console.error('Error creating student:', insertError);

      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: `A student with this roll number already exists (${roll_number})` },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Failed to create student: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Create student_profiles link if Auth user was created (to maintain existing dashboards)
    if (authUserId) {
      const { error: profileError } = await (supabaseAdmin as any).from('student_profiles').insert({
        user_id: authUserId,
        student_id: newStudent.id,
        organization_id: organizationId,
        email: studentEmail,
        is_active: status === 'active',
        must_change_password: true
      });
      if (profileError) {
        console.error('Error creating student profile:', profileError);
      }
    }

    // Update class student count if class_id is provided
    if (class_id) {
      // Get current student count
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('total_students')
        .eq('id', class_id)
        .single();

      if (!classError && classData) {
        // Increment the count
        const { error: updateError } = await supabase
          .from('classes')
          .update({
            total_students: (classData.total_students || 0) + 1
          })
          .eq('id', class_id);

        if (updateError) {
          console.error('Error updating class student count:', updateError);
          // Don't fail the request if count update fails
        }
      }
    }

    // Get admin profile ID for activity log
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Sync fee payments starting from the custom admission date up to the current month using calendar logic
    await syncStudentFeePayments(supabase, newStudent.id);

    // Log activity
    const activityDescription = class_id
      ? `New student "${name}" admitted to ${(newStudent as any).classes?.name || 'class'}`
      : `New student "${name}" admitted`;

    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        organization_id: organizationId,
        activity_type: 'admission',
        description: activityDescription,
        related_entity_type: 'student',
        related_entity_id: newStudent.id,
        performed_by: adminProfile?.id || null,
        metadata: {
          student_name: name,
          class_id,
          admission_date,
          monthly_fee: Number(monthly_fee)
        }
      });

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the request if logging fails
    }

    // Send admission welcome WhatsApp message
    sendAdmissionWelcome({
      studentId: newStudent.id,
      studentName: name,
      organizationId,
      classId: class_id,
      admissionDate: admission_date,
      parentName: parent_name,
      rollNumber: roll_number,
      monthlyFee: Number(monthly_fee),
      whatsappNumber: whatsapp,
    }).catch((error) => {
      console.error('Admission welcome notification failed:', error);
      // Don't fail the request if notification fails
    });

    return NextResponse.json(
      { student: newStudent, message: 'Student admitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email, password, fullName, dateOfBirth, gender,
            organizationId, classId, schoolName,
            studentMobile, parentMobile,
            subjectsEnrolled, admissionDate, previousPercentage
        } = body;

        // Validate required fields
        if (!password || !fullName || !dateOfBirth || !gender || !classId || !studentMobile || !parentMobile || !subjectsEnrolled || !admissionDate || !organizationId) {
            return NextResponse.json(
                { error: 'Please fill all required fields' },
                { status: 400 }
            );
        }

        // 1. To match auto-generated roll numbers, we fetch the current count first
        const { count } = await supabaseAdmin
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId);

        const roll_number = `AT-${new Date().getFullYear()}-${((count || 0) + 1).toString().padStart(3, '0')}`;

        // 2. Define the login-bound dummy email based on the generated Student ID
        const studentEmail = `${roll_number.toLowerCase()}@apnatuition.local`;

        // 3. Create auth user in Supabase Auth using Admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: studentEmail,
            email_confirm: true,
            password,
            user_metadata: {
                role: 'student',
                username: roll_number,
                name: fullName,
            },
        });

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'User creation failed' },
                { status: 500 }
            );
        }

        // 4. Insert into students table (status = pending_approval)
        const { data: studentData, error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
                organization_id: organizationId,
                class_id: classId,
                name: fullName,
                roll_number,
                admission_date: admissionDate,
                date_of_birth: dateOfBirth,
                gender: gender,
                parent_name: 'Parent of ' + fullName, // Default parent name, maybe omitted if not asked
                phone: studentMobile,
                whatsapp: parentMobile, // Often used for parents
                email: email || null, // Store actual email here
                monthly_fee: 0, // Admin updates this
                school_name: schoolName || null,
                subjects_enrolled: subjectsEnrolled,
                previous_percentage: previousPercentage ? Number(previousPercentage) : null,
                status: 'pending_approval',
                is_active: false
            })
            .select()
            .single();

        if (studentError) {
            // Rollback Auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: studentError.message }, { status: 500 });
        }

        // 5. Insert into student_profiles with the email column
        const { error: profileError } = await supabaseAdmin
            .from('student_profiles')
            .insert({
                user_id: authData.user.id,
                student_id: studentData.id,
                organization_id: organizationId,
                email: studentEmail
            });

        if (profileError) {
            // Rollback student and Auth user
            await supabaseAdmin.from('students').delete().eq('id', studentData.id);
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        // 6. Create users table entry for login (same as admin-created students)
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 10);
        await supabaseAdmin.from('users').insert({
            username: roll_number,
            password_hash: passwordHash,
            role: 'student',
            status: 'pending_approval',
        }).catch((err: any) => {
            console.error('Failed to create users table entry for student signup:', err.message);
            // Don't fail the request if this alone fails - student can still use email login
        });

        return NextResponse.json(
            { success: true, message: 'Student account created and pending admin approval.' },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

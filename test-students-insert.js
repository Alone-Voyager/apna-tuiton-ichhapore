const { createClient } = require('@supabase/supabase-js');

async function run() {
    const supabase = createClient(
        'https://gvhguudtztutbxwolsxd.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGd1dWR0enR1dGJ4d29sc3hkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3Nzk3NCwiZXhwIjoyMDc1MTUzOTc0fQ.2sDnbsk9Te1bsZ5rN3tOyx83Zl5RsJgVz2N5O_EHXsc' // service role key
    );

    const { data: userData } = await supabase.from('organizations').select('id').limit(1).single();
    const orgId = userData?.id;

    const { data: clsData } = await supabase.from('classes').select('id').limit(1).single();

    // mock custom user
    const { data: customUser } = await supabase.from('users').insert({
        username: 'AT-2026-TEST',
        password_hash: '123',
        role: 'student'
    }).select('id').single();

    const { data, error } = await supabase.from('students').insert({
        organization_id: orgId,
        name: "Test Insert",
        class_id: clsData?.id || null,
        batch_id: clsData?.id || null,
        roll_number: "AT-2026-TEST",
        admission_date: new Date().toISOString().split('T')[0],
        gender: 'Male',
        parent_name: 'Parent Test',
        whatsapp: '9876543210',
        monthly_fee: 1000,
        status: 'active',
        is_active: true,
        user_id: customUser.id,
        temp_password_used: false
    }).select('*, classes(name)').single();

    console.log('Result:', data);
    if (error) {
        console.error('Error:', error);
    } else {
        // cleanup
        await supabase.from('students').delete().eq('id', data.id);
    }
    await supabase.from('users').delete().eq('id', customUser.id);
}
run();

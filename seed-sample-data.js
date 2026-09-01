const { createClient } = require('@supabase/supabase-js');

const url = 'https://cgbwcayquqpgbnyxnyzw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI';

const supabase = createClient(url, serviceRoleKey);

async function seedData() {
  console.log('🌱 Starting database seeding...');

  // 1. Get or create classes
  const { data: existingClasses } = await supabase.from('classes').select('id, name');
  let classIds = existingClasses?.map(c => c.id) || [];

  if (classIds.length === 0) {
    const sampleClasses = [
      { name: 'Class 9th (Science)', monthly_fee: 1500, is_active: true },
      { name: 'Class 10th (Board Prep)', monthly_fee: 2000, is_active: true },
      { name: 'Class 11th (Physics/Maths)', monthly_fee: 2500, is_active: true },
      { name: 'Class 12th (Board & Entrance)', monthly_fee: 3000, is_active: true },
    ];
    const { data: insertedClasses } = await supabase.from('classes').insert(sampleClasses).select();
    classIds = insertedClasses?.map(c => c.id) || [];
  }

  // 2. Create sample students with all required fields
  const todayStr = new Date().toISOString().split('T')[0];
  const sampleStudents = [
    { name: 'Aarav Sharma', roll_number: '101', class_id: classIds[0], admission_date: todayStr, monthly_fee: 1500, status: 'active', is_active: true, whatsapp: '9876543210', parent_name: 'Rajesh Sharma', gender: 'male' },
    { name: 'Riya Patel', roll_number: '102', class_id: classIds[0], admission_date: todayStr, monthly_fee: 1500, status: 'active', is_active: true, whatsapp: '9876543211', parent_name: 'Suresh Patel', gender: 'female' },
    { name: 'Rohan Gupta', roll_number: '103', class_id: classIds[1], admission_date: todayStr, monthly_fee: 2000, status: 'active', is_active: true, whatsapp: '9876543212', parent_name: 'Vikram Gupta', gender: 'male' },
    { name: 'Ananya Verma', roll_number: '104', class_id: classIds[1], admission_date: todayStr, monthly_fee: 2000, status: 'active', is_active: true, whatsapp: '9876543213', parent_name: 'Manoj Verma', gender: 'female' },
    { name: 'Kavir Singh', roll_number: '105', class_id: classIds[2], admission_date: todayStr, monthly_fee: 2500, status: 'active', is_active: true, whatsapp: '9876543214', parent_name: 'Harpreet Singh', gender: 'male' },
    { name: 'Priya Joshi', roll_number: '106', class_id: classIds[3], admission_date: todayStr, monthly_fee: 3000, status: 'active', is_active: true, whatsapp: '9876543215', parent_name: 'Ramesh Joshi', gender: 'female' },
  ];

  const { data: insertedStudents, error: studentErr } = await supabase
    .from('students')
    .insert(sampleStudents)
    .select();

  if (studentErr) {
    console.error('Student insert error:', studentErr);
    return;
  }

  console.log(`✅ Successfully inserted ${insertedStudents.length} sample students.`);

  // 3. Create fee records
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const sampleFees = insertedStudents.map((s, idx) => ({
    student_id: s.id,
    amount: s.monthly_fee,
    paid_amount: idx % 2 === 0 ? s.monthly_fee : 0,
    status: idx % 2 === 0 ? 'Paid' : 'Unpaid',
    payment_month: currentMonth,
    payment_date: idx % 2 === 0 ? todayStr : null,
  }));

  const { error: feeErr } = await supabase.from('fee_payments').insert(sampleFees);
  if (feeErr) console.error('Fee insert error:', feeErr);
  else console.log('✅ Generated initial fee payment records.');

  console.log('🎉 Seeding finished successfully!');
}

seedData();

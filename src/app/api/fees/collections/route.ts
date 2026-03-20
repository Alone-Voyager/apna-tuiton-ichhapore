import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface FeePaymentHistory {
  id: string;
  student_id: string;
  organization_id: string;
  amount: number;
  payment_month: string;
  payment_date: string;
  due_date: string;
  payment_method: string;
  receipt_number: string;
  paid_amount: number;
  discount: number;
  late_fee: number;
  notes: string | null;
  collected_by: string | null;
  collected_at: string;
  students?: {
    id: string;
    name: string;
    roll_number: string;
    classes?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const classFilter = searchParams.get('class');
    const monthFilter = searchParams.get('month');
    const searchTerm = searchParams.get('search');
    const timeRange = searchParams.get('timeRange') || 'month'; // day, week, month, year, overall, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get the current user's organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !adminProfile) {
      console.error('Admin profile error:', profileError);
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    console.log('Organization ID:', adminProfile.organization_id);

    // Build query for fee payment history with student details
    let query = supabase
      .from('fee_payment_history')
      .select(`
        *,
        students (
          id,
          name,
          roll_number,
          class_id,
          classes (
            id,
            name
          )
        )
      `)
      .eq('organization_id', adminProfile.organization_id)
      .order('collected_at', { ascending: false });

    // Apply filters
    if (monthFilter && monthFilter !== 'all') {
      query = query.eq('payment_month', monthFilter);
    }

    if (searchTerm) {
      // Note: This is a simplified search. For better performance, consider using PostgreSQL full-text search
      query = query.or(`receipt_number.ilike.%${searchTerm}%`);
    }

    const { data: allPayments, error } = await query;

    if (error) {
      console.error('Error fetching fee collections:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error,
        success: false 
      }, { status: 500 });
    }

    console.log('Fetched payments count:', allPayments?.length || 0);
    if (allPayments && allPayments.length > 0) {
      console.log('Sample payment:', {
        id: allPayments[0].id,
        amount: allPayments[0].amount,
        paid_amount: allPayments[0].paid_amount,
        payment_method: allPayments[0].payment_method,
        student: allPayments[0].students
      });
    }

    // If no payments found, return empty but successful response
    if (!allPayments || allPayments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          transactions: [],
          stats: {
            totalCollected: 0,
            totalTransactions: 0,
            averageAmount: 0,
            thisMonthCollection: 0
          },
          paymentMethodStats: {
            cash: 0,
            upi: 0,
            card: 0,
            bank: 0,
            cheque: 0,
            online: 0
          },
          chartData: []
        }
      });
    }

    // Filter by class and search term (since Supabase doesn't support nested filtering easily)
    let filteredPayments: FeePaymentHistory[] = allPayments || [];
    
    if (classFilter && classFilter !== 'all') {
      filteredPayments = filteredPayments.filter((payment: FeePaymentHistory) => 
        payment.students?.classes?.name === classFilter
      );
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredPayments = filteredPayments.filter((payment: FeePaymentHistory) => 
        payment.students?.name?.toLowerCase().includes(lowerSearch) ||
        payment.students?.roll_number?.toLowerCase().includes(lowerSearch) ||
        payment.receipt_number?.toLowerCase().includes(lowerSearch)
      );
    }

    // Calculate stats based on time range
    const now = new Date();
    let rangeStart: Date;
    
    switch (timeRange) {
      case 'day':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        rangeStart = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          rangeStart = new Date(startDate);
          const rangeEnd = new Date(endDate);
          filteredPayments = filteredPayments.filter((payment: FeePaymentHistory) => {
            const paymentDate = new Date(payment.collected_at);
            return paymentDate >= rangeStart && paymentDate <= rangeEnd;
          });
        }
        break;
      case 'overall':
      default:
        rangeStart = new Date(0); // Beginning of time
        break;
    }

    // Filter by time range (except for custom which is handled above)
    if (timeRange !== 'custom' && timeRange !== 'overall') {
      filteredPayments = filteredPayments.filter((payment: FeePaymentHistory) => {
        const paymentDate = new Date(payment.collected_at);
        return paymentDate >= rangeStart;
      });
    }

    // Calculate stats
    const totalCollected = filteredPayments.reduce((sum: number, payment: FeePaymentHistory) => sum + Number(payment.paid_amount), 0);
    const totalTransactions = filteredPayments.length;
    const averageAmount = totalTransactions > 0 ? totalCollected / totalTransactions : 0;

    // Calculate this month's collection
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthPayments = (allPayments || []).filter((payment: FeePaymentHistory) => {
      const paymentDate = new Date(payment.collected_at);
      return paymentDate >= thisMonthStart;
    });
    const thisMonthCollection = thisMonthPayments.reduce((sum: number, payment: FeePaymentHistory) => sum + Number(payment.paid_amount), 0);

    // Calculate payment method distribution
    const paymentMethodStats = {
      cash: filteredPayments.filter((p: FeePaymentHistory) => p.payment_method === 'Cash').reduce((sum: number, p: FeePaymentHistory) => sum + Number(p.paid_amount), 0),
      upi: filteredPayments.filter((p: FeePaymentHistory) => p.payment_method === 'UPI').reduce((sum: number, p: FeePaymentHistory) => sum + Number(p.paid_amount), 0),
      card: filteredPayments.filter((p: FeePaymentHistory) => p.payment_method === 'Card').reduce((sum: number, p: FeePaymentHistory) => sum + Number(p.paid_amount), 0),
      bank: filteredPayments.filter((p: FeePaymentHistory) => p.payment_method === 'Bank Transfer').reduce((sum: number, p: FeePaymentHistory) => sum + Number(p.paid_amount), 0),
      cheque: filteredPayments.filter((p: FeePaymentHistory) => p.payment_method === 'Cheque').reduce((sum: number, p: FeePaymentHistory) => sum + Number(p.paid_amount), 0),
      online: filteredPayments.filter((p: FeePaymentHistory) => p.payment_method === 'Online').reduce((sum: number, p: FeePaymentHistory) => sum + Number(p.paid_amount), 0),
    };

    // Format transactions for frontend
    const transactions = filteredPayments.map((payment: FeePaymentHistory) => ({
      id: payment.id,
      studentName: payment.students?.name || 'Unknown Student',
      rollNumber: payment.students?.roll_number || 'N/A',
      class: payment.students?.classes?.name || 'N/A',
      amount: Number(payment.amount),
      paidAmount: Number(payment.paid_amount),
      discount: Number(payment.discount || 0),
      lateFee: Number(payment.late_fee || 0),
      paymentMethod: payment.payment_method,
      paymentDate: payment.payment_date,
      collectedAt: payment.collected_at,
      receiptNumber: payment.receipt_number,
      paymentMonth: payment.payment_month,
      notes: payment.notes,
      collectedBy: 'Admin',
      status: 'completed' as const
    }));

    // Calculate chart data based on time range
    const chartData = calculateChartData(filteredPayments, timeRange, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        stats: {
          totalCollected,
          totalTransactions,
          averageAmount,
          thisMonthCollection
        },
        paymentMethodStats,
        chartData
      }
    });

  } catch (error) {
    console.error('Error in collections route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate chart data
function calculateChartData(payments: FeePaymentHistory[], timeRange: string, startDate?: string | null, endDate?: string | null) {
  if (!payments || payments.length === 0) {
    return [];
  }

  const dataPoints: { [key: string]: number } = {};

  payments.forEach((payment: FeePaymentHistory) => {
    const date = new Date(payment.collected_at);
    let key: string;

    switch (timeRange) {
      case 'day':
        // Group by hour
        key = `${date.getHours()}:00`;
        break;
      case 'week':
        // Group by day of week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        key = days[date.getDay()];
        break;
      case 'month':
        // Group by day of month
        key = date.getDate().toString();
        break;
      case 'year':
        // Group by month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        key = months[date.getMonth()];
        break;
      case 'overall':
        // Group by month-year
        key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        break;
      case 'custom':
        // Group by date
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        break;
      default:
        key = date.toLocaleDateString();
    }

    dataPoints[key] = (dataPoints[key] || 0) + Number(payment.paid_amount);
  });

  return Object.entries(dataPoints).map(([label, amount]) => ({
    label,
    amount
  }));
}

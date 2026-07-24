"use client"
import { useState, useEffect } from 'react';
import { Users2, CheckCircle, Clock, AlertTriangle, PieChart, ArrowRight, ArrowLeft, DollarSign, X, Check, Loader2, Search } from 'lucide-react';
import RevenueAnalytics from '../../../components/RevenueAnalytics';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../components/ui/pagination";

interface FeePayment {
  id: string;
  amount: number;
  paidAmount: number;
  status: string;
  paymentMonth: string;
  paymentDate: string;
  dueDate: string;
  paymentMethod?: string;
  receiptNumber?: string;
  discount: number;
  lateFee: number;
  notes?: string;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  admissionDate: string;
  monthlyFee: number;
  status?: string;
  whatsapp?: string;
  feePayments: FeePayment[];
}

interface ClassData {
  id: string | null;
  name: string;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  overdueStudents: number;
  partialStudents: number;
  totalFees: number;
  collectedFees: number;
  students: Student[];
}

interface StatsData {
  totalStudents: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  partialCount: number;
  totalFees: number;
  collectedFees: number;
  currentMonth: string;
}

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FeesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const classParam = searchParams.get('class');
  const tabParam = searchParams.get('tab');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Empty means current month
  const [testDate, setTestDate] = useState<string>(''); // Empty means current date
  const [searchQuery, setSearchQuery] = useState<string>(''); // Search query for students
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [classesData, setClassesData] = useState<ClassData[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthsGenerated, setMonthsGenerated] = useState<Set<string>>(new Set());
  const [activeSubView, setActiveSubView] = useState<'overview' | 'analytics'>('overview');
  const [analyticsRefreshTrigger, setAnalyticsRefreshTrigger] = useState(0);

  useEffect(() => {
    if (tabParam === 'analytics') {
      setActiveSubView('analytics');
    } else {
      setActiveSubView('overview');
    }
    if (classParam) {
      setSelectedClass(classParam);
    } else {
      setSelectedClass(null);
    }
  }, [classParam, tabParam]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const studentsPerPage = 10;

  // Calculate the effective current date (testDate or actual current date)
  const getCurrentDate = () => {
    return testDate ? new Date(testDate) : new Date();
  };

  // Fetch fee payment stats
  useEffect(() => {
    fetchFeeStats();

    const handleFocus = () => {
      fetchFeeStats();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedClass, selectedMonth, testDate]); // Re-fetch when class, month, or test date changes

  const fetchFeeStats = async () => {
    try {
      setLoading(true);
      setError('');

      // Generate monthly entries for the selected/current month (only once per month)
      const monthToGenerate = selectedMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

      // Only generate if we haven't generated for this month yet in this session
      if (!monthsGenerated.has(monthToGenerate)) {
        try {
          const generateResponse = await fetch('/api/fees/generate-monthly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: monthToGenerate })
          });

          if (generateResponse.ok) {
            const result = await generateResponse.json();
            console.log('Monthly entries generated:', result);
            // Mark this month as generated
            setMonthsGenerated(prev => new Set(prev).add(monthToGenerate));
          }
        } catch (genError) {
          console.error('Error generating monthly entries:', genError);
          // Continue to fetch stats even if generation fails
        }
      }

      // Build URL with query params
      const params = new URLSearchParams();
      if (selectedClass) params.append('class', selectedClass);
      if (selectedMonth) params.append('month', selectedMonth);
      if (testDate) params.append('testDate', testDate);

      const url = `/api/fees/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch fee statistics');
      }

      setStats(data.stats);
      setClassesData(data.classes || []);

      // Debug: Log student data to check if whatsapp is present
      console.log('Classes data received:', data.classes);
      console.log('Sample student:', data.classes?.[0]?.students?.[0]);
    } catch (err: any) {
      console.error('Error fetching fee stats:', err);
      setError(err.message || 'Failed to load fee statistics');
    } finally {
      setLoading(false);
    }
  };

  const totalStats = stats || {
    totalStudents: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
    partialCount: 0,
    totalFees: 0,
    collectedFees: 0
  };

  const selectedClassData = classesData.find(cls => cls.name === selectedClass);

  const handleClassSelect = (className: string) => {
    router.push(`/dashboard/fees?class=${encodeURIComponent(className)}`);
    setSelectedTab('all'); // Reset tab when switching classes
    setSearchQuery(''); // Reset search when switching classes
  };

  const handlePayment = (student: Student, payment: FeePayment) => {
    setSelectedStudent(student);
    setSelectedPayment(payment);
    const pendingAmount = Number(payment.amount) - Number(payment.paidAmount);
    setPaymentData({
      amount: pendingAmount.toString(),
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPayment || !selectedStudent) return;

    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/fees/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: selectedPayment.id,
          student_id: selectedStudent.id,
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.date,
          discount: 0,
          late_fee: 0,
          notes: paymentData.notes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to collect payment');
      }

      // Show success message
      alert(`Payment collected successfully! Receipt Number: ${data.receipt_number}`);

      setShowPaymentModal(false);
      setSelectedStudent(null);
      setSelectedPayment(null);

      // Refresh data after payment
      fetchFeeStats();
      setAnalyticsRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Error collecting payment:', err);
      alert(err.message || 'Failed to collect payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentStatus = (feePayments: FeePayment[]) => {
    if (!feePayments || feePayments.length === 0) return 'pending';
    const latestPayment = feePayments[0];
    return latestPayment.status.toLowerCase();
  };

  const getStudentLatestPayment = (feePayments: FeePayment[]) => {
    return feePayments && feePayments.length > 0 ? feePayments[0] : null;
  };

  // Calculate the actual status based on current/test date
  const calculateActualStatus = (payment: FeePayment): string => {
    if (!payment) return 'unpaid';

    // Use the status from backend directly (backend already handles overdue logic)
    // Backend updates status based on the testDate parameter
    return payment.status.toLowerCase();
  };

  const filterStudentsByTab = (students: Student[]) => {
    if (selectedTab === 'all') return students;

    return students.filter((student) => {
      // Check if student has ANY payment matching the selected tab status
      return student.feePayments.some((payment) => {
        const actualStatus = calculateActualStatus(payment);
        return actualStatus === selectedTab;
      });
    });
  };

  // Get all payments for a student that match the current tab filter
  const getFilteredPayments = (student: Student): FeePayment[] => {
    if (selectedTab === 'all') {
      return student.feePayments;
    }

    return student.feePayments.filter((payment) => {
      const actualStatus = calculateActualStatus(payment);
      return actualStatus === selectedTab;
    });
  };

  // Filter students by search query
  const filterStudentsBySearch = (students: Student[]) => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase().trim();
    return students.filter((student) => {
      return student.name.toLowerCase().includes(query);
    });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedTab, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading fee statistics...</p>
            </div>
          </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-50">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchFeeStats}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
          {/* Month Selector for Testing - COMMENTED OUT FOR PRODUCTION */}

          {/* <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-yellow-800">🧪 Test Mode</span>
                <span className="text-xs text-yellow-600">(Remove in production)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-yellow-700">
                    Select Month to View:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
                  >
                    <option value="">Current Month (November 2025)</option>
                    <option value="November 2025">November 2025</option>
                    <option value="December 2025">December 2025</option>
                    <option value="January 2026">January 2026</option>
                    <option value="February 2026">February 2026</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-yellow-700">
                    Simulate Date (for status testing):
                  </label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
                    placeholder="Leave empty for today"
                  />
                </div>
              </div>

              <div className="text-xs text-yellow-700 bg-yellow-100 rounded p-2">
                <strong>How Status Changes Work:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>Unpaid → Overdue:</strong> When payment month ends (e.g., Nov 30 → Dec 1)</li>
                  <li><strong>Overdue Days:</strong> Counted from the 1st day of next month (Dec 1, Dec 2, etc.)</li>
                  <li><strong>Example:</strong> Set date to "2025-12-01" to see November fees become "Overdue"</li>
                  <li><strong>Note:</strong> All overdue payments from any month are displayed, not just current month</li>
                </ul>
              </div>

              {(selectedMonth || testDate) && (
                <div className="text-xs text-yellow-800 font-medium">
                  📅 Testing with: 
                  {selectedMonth && <span className="ml-1">Month: <strong>{selectedMonth}</strong></span>}
                  {testDate && <span className="ml-2">Date: <strong>{new Date(testDate).toLocaleDateString()}</strong></span>}
                </div>
              )}
            </div>
          </div> */}


          {/* Sub View Toggle Tabs */}
          <div className="flex border border-slate-200 mb-6 bg-slate-100/50 p-1 rounded-xl shadow-inner max-w-md">
            <button
              onClick={() => {
                router.push(selectedClass ? `/dashboard/fees?class=${encodeURIComponent(selectedClass)}` : '/dashboard/fees');
              }}
              className={`flex-1 py-2.5 px-4 text-center rounded-lg font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeSubView === 'overview'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fees List Overview
            </button>
            <button
              onClick={() => {
                router.push('/dashboard/fees?tab=analytics');
                setAnalyticsRefreshTrigger(prev => prev + 1);
              }}
              className={`flex-1 py-2.5 px-4 text-center rounded-lg font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeSubView === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Revenue Analytics
            </button>
          </div>

          {activeSubView === 'overview' ? (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-indigo-600/80 uppercase tracking-wider mb-1">Total Students</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{totalStats.totalStudents}</p>
                </div>
                <div className="bg-indigo-100 p-2 sm:p-3 rounded-full">
                  <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Paid</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{totalStats.paidCount}</p>
                </div>
                <div className="bg-emerald-100 p-2 sm:p-3 rounded-full">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unpaid</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-700">{totalStats.unpaidCount}</p>
                </div>
                <div className="bg-slate-200 p-2 sm:p-3 rounded-full">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-red-100 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-rose-600/80 uppercase tracking-wider mb-1">Overdue</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-700">{totalStats.overdueCount}</p>
                </div>
                <div className="bg-red-100 p-2 sm:p-3 rounded-full">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {!selectedClass ? (
            <>
              {/* Class Cards */}
              <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4 px-1">Select Class to View Students</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {classesData.map((classData, index) => (
                    <div
                      key={index}
                      onClick={() => handleClassSelect(classData.name)}
                      className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-blue-600">{classData.name}</h3>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-slate-500">Total</p>
                          <p className="text-sm sm:text-lg font-bold text-slate-800">{classData.totalStudents}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-green-600">Paid</p>
                          <p className="text-sm sm:text-lg font-bold text-green-600">{classData.paidStudents}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-slate-600">Unpaid</p>
                          <p className="text-sm sm:text-lg font-bold text-slate-600">{classData.unpaidStudents}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-red-600">Overdue</p>
                          <p className="text-sm sm:text-lg font-bold text-red-600">{classData.overdueStudents}</p>
                        </div>
                      </div>

                      <div className="pt-3 sm:pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-slate-500">Collection</span>
                          <span className="text-sm sm:text-base font-bold text-slate-800">
                            {Math.round((classData.collectedFees / classData.totalFees) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 sm:h-2 mt-1 sm:mt-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((classData.collectedFees / classData.totalFees) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Selected Class View */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 px-1">
                  <div>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.history.length > 1) {
                          router.back();
                        } else {
                          router.push('/dashboard/fees');
                        }
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-2 sm:mb-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span className="text-sm sm:text-base">Back to Classes</span>
                    </button>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">{selectedClass} - Student Fee Status</h2>
                  </div>
                </div>

                {selectedClassData && (
                  <>
                    {/* Class Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500">Total Students</p>
                            <p className="text-sm sm:text-lg font-bold text-slate-800">{selectedClassData.totalStudents}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500">Fees Paid</p>
                            <p className="text-sm sm:text-lg font-bold text-green-600">{selectedClassData.paidStudents}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500">Unpaid</p>
                            <p className="text-sm sm:text-lg font-bold text-slate-600">{selectedClassData.unpaidStudents}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500">Overdue</p>
                            <p className="text-sm sm:text-lg font-bold text-red-600">{selectedClassData.overdueStudents}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide">
                      <div className="flex flex-nowrap sm:flex-wrap gap-2 w-max sm:w-auto">
                        <button
                          onClick={() => setSelectedTab('all')}
                          className={`px-5 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${selectedTab === 'all'
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-indigo-200/50 scale-105'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                          All ({selectedClassData.totalStudents})
                        </button>
                        <button
                          onClick={() => setSelectedTab('paid')}
                          className={`px-5 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${selectedTab === 'paid'
                              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md shadow-emerald-200/50 scale-105'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                          Paid ({selectedClassData.paidStudents})
                        </button>
                        <button
                          onClick={() => setSelectedTab('unpaid')}
                          className={`px-5 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${selectedTab === 'unpaid'
                              ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md shadow-slate-200/50 scale-105'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                          Unpaid ({selectedClassData.unpaidStudents || 0})
                        </button>
                        <button
                          onClick={() => setSelectedTab('overdue')}
                          className={`px-5 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${selectedTab === 'overdue'
                              ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md shadow-rose-200/50 scale-105'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                          Overdue ({selectedClassData.overdueStudents})
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-4 sm:mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by student name..."
                          className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-slate-400 transition-all"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        )}
                      </div>
                      {searchQuery && (
                        <p className="mt-2 text-xs sm:text-sm text-slate-600 px-1">
                          {filterStudentsBySearch(filterStudentsByTab(selectedClassData.students)).length} student(s) found
                        </p>
                      )}
                    </div>

                    {/* Students List */}
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 px-1">
                        Students List
                        {selectedTab !== 'all' && (
                          <span className="text-sm font-normal text-slate-600 ml-2">
                            (Showing {selectedTab} fees)
                          </span>
                        )}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(() => {
                          // Get all student-payment cards
                          const allCards = filterStudentsBySearch(filterStudentsByTab(selectedClassData.students))
                            .flatMap((student) => {
                              const filteredPayments = getFilteredPayments(student);
                              return filteredPayments.map((payment) => ({ student, payment }));
                            });

                          // Calculate pagination
                          const totalPages = Math.ceil(allCards.length / studentsPerPage);
                          const startIndex = (currentPage - 1) * studentsPerPage;
                          const endIndex = startIndex + studentsPerPage;
                          const paginatedCards = allCards.slice(startIndex, endIndex);

                          return paginatedCards.map(({ student, payment }) => {
                            const actualStatus = calculateActualStatus(payment);
                            const isPaid = actualStatus === 'paid';
                            const isUnpaid = actualStatus === 'unpaid';
                            const isOverdue = actualStatus === 'overdue';

                            return (
                              <div key={`${student.id}-${payment.id}`} className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-slate-800">{student.name}</h3>
                                      {student.status === 'suspended' && (
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full border border-orange-300">
                                          ⚠ Suspended
                                        </span>
                                      )}
                                    </div>
                                    {/* Roll number intentionally omitted from UI */}
                                    <p className="text-sm text-slate-600">Admission: {new Date(student.admissionDate).toLocaleDateString()}</p>
                                    {student.whatsapp && (
                                      <p className="text-sm text-slate-600">WhatsApp: {student.whatsapp}</p>
                                    )}
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-sm ${isPaid ? 'bg-green-100 text-green-700' :
                                      isOverdue ? 'bg-red-100 text-red-700' :
                                        isUnpaid ? 'bg-blue-100 text-blue-700' :
                                          'bg-slate-100 text-slate-700'
                                    }`}>
                                    {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                                  </div>
                                </div>

                                <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Monthly Fee:</span>
                                    <span className="font-medium text-slate-800">₹{student.monthlyFee.toLocaleString()}</span>
                                  </div>

                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Amount Due:</span>
                                      <span className="font-medium text-slate-800">₹{Number(payment.amount).toLocaleString()}</span>
                                    </div>

                                    {isPaid ? (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">Paid Amount:</span>
                                          <span className="font-medium text-green-600">₹{Number(payment.paidAmount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">Payment Date:</span>
                                          <span className="font-medium text-slate-800">{new Date(payment.paymentDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="mt-2">
                                          <span className="text-slate-600 block mb-1">Paid for:</span>
                                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                            {payment.paymentMonth}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">Pending Amount:</span>
                                          <span className="font-medium text-red-600">₹{(Number(payment.amount) - Number(payment.paidAmount)).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">Due Date:</span>
                                          <span className="font-medium text-slate-800">
                                            {(() => {
                                              // Due date is the 1st of next month from payment month string
                                              // Parse "November 2025" -> get first day of December 2025
                                              const paymentMonthDate = new Date(payment.paymentMonth + ' 1');
                                              const dueDate = new Date(paymentMonthDate.getFullYear(), paymentMonthDate.getMonth() + 1, 1);
                                              return dueDate.toLocaleDateString();
                                            })()}
                                          </span>
                                        </div>
                                        {isOverdue && (
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Overdue By:</span>
                                            <span className="font-medium text-red-600">
                                              {(() => {
                                                // Calculate overdue days from the 1st of next month
                                                // Parse "November 2025" -> Dec 1, 2025 is when it becomes overdue
                                                const paymentMonthDate = new Date(payment.paymentMonth + ' 1');
                                                const nextMonthStart = new Date(paymentMonthDate.getFullYear(), paymentMonthDate.getMonth() + 1, 1);
                                                const today = getCurrentDate(); // Use test date if set
                                                const overdueDays = Math.floor((today.getTime() - nextMonthStart.getTime()) / (1000 * 60 * 60 * 24));
                                                return overdueDays > 0 ? overdueDays : 0;
                                              })()} days
                                            </span>
                                          </div>
                                        )}
                                        <div className="mt-2">
                                          <span className="text-slate-600 block mb-1">
                                            {isOverdue ? 'Overdue Month:' : 'Pending Month:'}
                                          </span>
                                          <span className={`px-2 py-1 rounded text-xs ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-red-50 text-red-700'
                                            }`}>
                                            {payment.paymentMonth}
                                            {isOverdue && payment.paymentMonth !== selectedMonth && selectedMonth && (
                                              <span className="ml-1 text-red-800 font-semibold">⚠ Old</span>
                                            )}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </>
                                </div>

                                {!isPaid && (
                                  <button
                                    onClick={() => handlePayment(student, payment)}
                                    className="mt-4 w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm flex items-center justify-center space-x-2"
                                  >
                                    <DollarSign className="w-5 h-5" />
                                    <span>Collect Payment</span>
                                  </button>
                                )}
                              </div>
                            );
                          });
                        })()}

                        {/* Empty State */}
                        {filterStudentsBySearch(filterStudentsByTab(selectedClassData.students)).length === 0 && (
                          <div className="col-span-full text-center py-12">
                            <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-600 text-lg font-medium">No students found</p>
                            <p className="text-slate-500 text-sm">
                              {searchQuery
                                ? `No students matching "${searchQuery}"`
                                : selectedTab === 'all'
                                  ? 'No students in this class yet.'
                                  : `No students with ${selectedTab} fees in this class.`
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Pagination */}
                      {(() => {
                        const allCards = filterStudentsBySearch(filterStudentsByTab(selectedClassData.students))
                          .flatMap((student) => {
                            const filteredPayments = getFilteredPayments(student);
                            return filteredPayments.map((payment) => ({ student, payment }));
                          });
                        const totalPages = Math.ceil(allCards.length / studentsPerPage);
                        const startIndex = (currentPage - 1) * studentsPerPage;
                        const endIndex = startIndex + studentsPerPage;

                        if (allCards.length > studentsPerPage && totalPages > 1) {
                          return (
                            <div className="mt-6 pt-4 border-t border-slate-200">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                                      }}
                                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>

                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    if (
                                      page === 1 ||
                                      page === totalPages ||
                                      (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                      return (
                                        <PaginationItem key={page}>
                                          <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setCurrentPage(page);
                                            }}
                                            isActive={currentPage === page}
                                            className="cursor-pointer"
                                          >
                                            {page}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                      return (
                                        <PaginationItem key={page}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    return null;
                                  })}

                                  <PaginationItem>
                                    <PaginationNext
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                      }}
                                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                              <div className="text-center mt-2 text-sm text-slate-600">
                                Showing {startIndex + 1} to {Math.min(endIndex, allCards.length)} of {allCards.length} records
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          </>
          ) : (
            <RevenueAnalytics refreshTrigger={analyticsRefreshTrigger} />
          )}
        </main>

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">Collect Fees</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-800 text-sm sm:text-base">{selectedStudent.name}</h4>
                {/* Roll number intentionally omitted from payment modal */}
                <p className="text-xs sm:text-sm text-slate-600">Month: {selectedPayment.paymentMonth}</p>
                <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">
                  Amount Due: ₹{(Number(selectedPayment.amount) - Number(selectedPayment.paidAmount)).toLocaleString()}
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base pr-8"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={paymentData.date}
                    onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm sm:text-base whitespace-nowrap"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Collecting...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 w-4 h-4" />
                        Collect Payment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-slate-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <FeesPageContent />
    </Suspense>
  );
}
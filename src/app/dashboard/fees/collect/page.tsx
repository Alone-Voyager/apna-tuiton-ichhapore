"use client"

import { useState, useEffect, useCallback } from 'react';
import { Users2, DollarSign, AlertTriangle, Clock, Search, User, HandCoins, FileText, X, Check, RefreshCw } from 'lucide-react';

interface FeePayment {
  id: string;
  payment_month: string;
  amount: number;
  due_date: string;
  status: string;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_name: string;
  phone?: string;
  monthly_fee: number;
  fee_payments: FeePayment[];
}

export default function CollectFeesPage() {
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPendingFees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fees/stats?include_students=true');
      if (!res.ok) throw new Error('Failed to load pending fees');
      const data = await res.json();
      
      // Build student list from fee_payments with Unpaid/Overdue status
      const studentsMap = new Map<string, Student>();
      for (const payment of (data.unpaidPayments || [])) {
        const sid = payment.student_id || payment.students?.id;
        if (!sid) continue;
        if (!studentsMap.has(sid)) {
          studentsMap.set(sid, {
            id: sid,
            name: payment.students?.name || 'Unknown',
            roll_number: payment.students?.roll_number || '',
            class_name: payment.students?.classes?.name || '',
            phone: payment.students?.phone || '',
            monthly_fee: payment.amount || 0,
            fee_payments: [],
          });
        }
        studentsMap.get(sid)!.fee_payments.push({
          id: payment.id,
          payment_month: payment.payment_month,
          amount: payment.amount,
          due_date: payment.due_date,
          status: payment.status,
        });
      }
      
      const studentList = Array.from(studentsMap.values());
      setStudents(studentList);
      
      // Build unique class list
      const uniqueClasses = ['all', ...new Set(studentList.map(s => s.class_name).filter(Boolean))];
      setClasses(uniqueClasses);
    } catch (err: any) {
      // Fallback: try fetching students with unpaid fees directly
      try {
        const res2 = await fetch('/api/students?fee_status=unpaid&limit=200');
        if (!res2.ok) throw new Error('Failed to load students');
        const data2 = await res2.json();
        const studentList = (data2.students || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          roll_number: s.roll_number || '',
          class_name: s.class_name || s.classes?.name || '',
          phone: s.phone || s.guardian_phone || '',
          monthly_fee: s.monthly_fee || 0,
          fee_payments: s.fee_payments || [],
        }));
        setStudents(studentList);
        const uniqueClasses: string[] = ['all', ...Array.from(new Set<string>(studentList.map((s: any) => String(s.class_name)).filter(Boolean)))];
        setClasses(uniqueClasses);
      } catch {
        setError(err.message || 'Failed to load pending fees data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingFees();
  }, [fetchPendingFees]);

  const filteredStudents = students.filter(student => {
    const matchesClass = selectedClass === 'all' || student.class_name === selectedClass;
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (student.phone || '').includes(searchTerm);
    return matchesClass && matchesSearch;
  });

  const handlePayment = (student: Student, payment: FeePayment) => {
    setSelectedStudent(student);
    setSelectedPayment(payment);
    setPaymentData({
      amount: String(payment.amount),
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPayment) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/fees/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          payment_id: selectedPayment.id,
          amount: Number(paymentData.amount),
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.date,
          notes: paymentData.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setSuccessMsg(`✅ Payment of ₹${Number(paymentData.amount).toLocaleString()} recorded! Receipt: ${data.receipt_number}`);
      setShowPaymentModal(false);
      setSelectedStudent(null);
      setSelectedPayment(null);
      // Refresh the list
      await fetchPendingFees();
    } catch (err: any) {
      setError(err.message || 'Payment submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDue = filteredStudents.reduce((sum, s) =>
    sum + s.fee_payments.reduce((fSum, p) => fSum + (p.amount || 0), 0), 0);
  const overdueStudents = filteredStudents.filter(s => s.fee_payments.some(p => p.status === 'Overdue'));
  const pendingStudents = filteredStudents.filter(s => s.fee_payments.some(p => p.status === 'Unpaid'));

  return (
    <div className="min-h-full bg-slate-50">
      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Fee Collection Center</h1>
            <p className="text-sm sm:text-base text-orange-100">Manage pending payments and collect fees efficiently</p>
          </div>
        </div>

        <div className="p-2 sm:p-4 lg:p-6">
          {/* Success message */}
          {successMsg && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="ml-4 text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Unpaid Students</p>
                  <p className="text-sm sm:text-lg font-bold text-slate-800">{loading ? '...' : filteredStudents.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Amount Due</p>
                  <p className="text-sm sm:text-lg font-bold text-slate-800">₹{(totalDue ?? 0).toLocaleString()}</p>
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
                  <p className="text-sm sm:text-lg font-bold text-red-600">{loading ? '...' : overdueStudents.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Pending</p>
                  <p className="text-sm sm:text-lg font-bold text-blue-600">{loading ? '...' : pendingStudents.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, roll number, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="sm:w-48">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls}>
                      {cls === 'all' ? 'All Classes' : cls}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchPendingFees}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200">
            <div className="p-3 sm:p-4 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Students with Pending Fees ({filteredStudents.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500">Loading pending fees...</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-3 sm:p-4 hover:bg-slate-50">
                    <div className="flex items-start sm:items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{student.name}</h4>
                          <div className="flex flex-wrap gap-x-3 text-xs sm:text-sm text-slate-500">
                            <span>Roll: {student.roll_number || 'N/A'}</span>
                            <span>Class: {student.class_name || 'N/A'}</span>
                            {student.phone && <span>{student.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex-shrink-0">
                        <div className="text-right mb-2">
                          <p className="text-xs text-slate-500">Total Due</p>
                          <p className="text-sm font-bold text-slate-800">
                            ₹{student.fee_payments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Individual payment months */}
                    <div className="mt-3 space-y-2">
                      {student.fee_payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              payment.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status}
                            </span>
                            <span className="text-sm text-slate-700">{payment.payment_month}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-800">₹{(payment.amount || 0).toLocaleString()}</span>
                            <button
                              onClick={() => handlePayment(student, payment)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                payment.status === 'Overdue'
                                  ? 'bg-red-500 hover:bg-red-600 text-white'
                                  : 'bg-orange-500 hover:bg-orange-600 text-white'
                              }`}
                            >
                              <HandCoins className="w-3 h-3" />
                              Collect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredStudents.length === 0 && !loading && (
                  <div className="p-8 text-center">
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No students found with pending fees</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
                <p className="text-xs sm:text-sm text-slate-600">
                  Roll: {selectedStudent.roll_number} | Class: {selectedStudent.class_name}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Month: <strong>{selectedPayment.payment_month}</strong>
                </p>
                <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">
                  Amount Due: ₹{(selectedPayment.amount || 0).toLocaleString()}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base pr-8"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={paymentData.date}
                    onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm sm:text-base"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 text-sm sm:text-base disabled:opacity-60"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {submitting ? 'Processing...' : 'Collect Payment'}
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

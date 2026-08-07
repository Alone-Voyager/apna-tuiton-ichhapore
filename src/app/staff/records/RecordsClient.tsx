"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Users2, 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Printer, 
  Download, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  RefreshCw,
  Phone,
  MapPin,
  GraduationCap
} from 'lucide-react';
import RoleGuard from '../../../components/RoleGuard';

interface ClassData {
  id: string;
  name: string;
  monthly_fee: number;
}

interface StudentRecord {
  id: string;
  name: string;
  roll_number: string;
  class_id?: string | null;
  admission_date?: string;
  monthly_fee?: number;
  status?: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
  gender?: string;
  classes?: {
    id: string;
    name: string;
  };
}

interface FeeRecord {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  class_name: string;
  payment_month: string;
  amount: number;
  paid_amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number?: string;
  status: string;
  notes?: string;
}

export default function RecordsClient() {
  const [activeTab, setActiveTab] = useState<'admissions' | 'fees'>('admissions');
  
  // Data states
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [showAddAdmission, setShowAddAdmission] = useState<boolean>(false);
  const [showEditAdmission, setShowEditAdmission] = useState<boolean>(false);
  const [showViewStudent, setShowViewStudent] = useState<boolean>(false);
  const [showAdmissionPreview, setShowAdmissionPreview] = useState<boolean>(false);
  
  const [showAddFee, setShowAddFee] = useState<boolean>(false);
  const [showFeePreview, setShowFeePreview] = useState<boolean>(false);

  // Selected Item states
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);

  // Admission Form State
  const [admissionForm, setAdmissionForm] = useState({
    name: '',
    roll_number: '',
    class_id: '',
    monthly_fee: '',
    parent_name: '',
    parent_phone: '',
    address: '',
    gender: 'Male',
    admission_date: new Date().toISOString().split('T')[0],
  });

  // Fee Collection Form State
  const [feeForm, setFeeForm] = useState({
    student_id: '',
    payment_month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    amount: '',
    paid_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    notes: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [resClasses, resStudents, resFees] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/students'),
        fetch('/api/fees/collections')
      ]);

      const dataClasses = await resClasses.json();
      const dataStudents = await resStudents.json();
      const dataFees = await resFees.json();

      if (dataClasses.data) setClasses(dataClasses.data);
      if (dataStudents.data) setStudents(dataStudents.data);
      if (dataFees.data) {
        // Map backend collection records
        const mappedFees: FeeRecord[] = (dataFees.data || []).map((f: any) => ({
          id: f.id,
          student_id: f.student_id,
          student_name: f.students?.name || f.student_name || 'Unknown Student',
          roll_number: f.students?.roll_number || f.roll_number || 'N/A',
          class_name: f.students?.classes?.name || f.class_name || 'Unassigned',
          payment_month: f.payment_month || 'Current Month',
          amount: Number(f.amount || 0),
          paid_amount: Number(f.paid_amount || f.amount || 0),
          payment_date: f.payment_date || new Date().toISOString().split('T')[0],
          payment_method: f.payment_method || 'Cash',
          receipt_number: f.receipt_number || `REC-${f.id.slice(0, 8).toUpperCase()}`,
          status: f.status || 'Paid',
          notes: f.notes || ''
        }));
        setFeeRecords(mappedFees);
      }
    } catch (err: any) {
      console.error('Error fetching staff records data:', err);
      setError('Failed to load records data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Add Admission Submit
  const handleAddAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionForm.name || !admissionForm.class_id) {
      alert('Please fill out student name and class.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: admissionForm.name,
          roll_number: admissionForm.roll_number,
          class_id: admissionForm.class_id,
          monthly_fee: parseFloat(admissionForm.monthly_fee || '0'),
          parent_name: admissionForm.parent_name,
          parent_phone: admissionForm.parent_phone,
          address: admissionForm.address,
          gender: admissionForm.gender,
          admission_date: admissionForm.admission_date,
          status: 'active'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student admission');

      alert('Student admission created successfully!');
      setShowAddAdmission(false);
      setAdmissionForm({
        name: '',
        roll_number: '',
        class_id: '',
        monthly_fee: '',
        parent_name: '',
        parent_phone: '',
        address: '',
        gender: 'Male',
        admission_date: new Date().toISOString().split('T')[0],
      });
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Error creating student admission');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Admission Submit
  const handleEditAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedStudent.name,
          roll_number: selectedStudent.roll_number,
          class_id: selectedStudent.class_id,
          monthly_fee: Number(selectedStudent.monthly_fee || 0),
          parent_name: selectedStudent.parent_name,
          parent_phone: selectedStudent.parent_phone,
          address: selectedStudent.address,
          gender: selectedStudent.gender,
          status: selectedStudent.status || 'active'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student details');

      alert('Student record updated successfully!');
      setShowEditAdmission(false);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Error updating student record');
    } finally {
      setSubmitting(false);
    }
  };

  // Fee Entry Submit
  const handleAddFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.student_id || !feeForm.paid_amount) {
      alert('Please select a student and enter the fee amount paid.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/fees/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: feeForm.student_id,
          payment_month: feeForm.payment_month,
          amount: parseFloat(feeForm.paid_amount || '0'),
          paid_amount: parseFloat(feeForm.paid_amount || '0'),
          payment_date: feeForm.payment_date,
          payment_method: feeForm.payment_method,
          notes: feeForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record fee payment');

      alert(`Fee payment recorded successfully! Receipt No: ${data.receipt_number || 'Generated'}`);
      setShowAddFee(false);
      setFeeForm({
        student_id: '',
        payment_month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        amount: '',
        paid_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        notes: '',
      });
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Error recording fee payment');
    } finally {
      setSubmitting(false);
    }
  };

  // When student is selected in Fee Form, auto-fill monthly_fee
  const handleFeeStudentChange = (stId: string) => {
    const st = students.find(s => s.id === stId);
    setFeeForm(prev => ({
      ...prev,
      student_id: stId,
      amount: st?.monthly_fee?.toString() || '',
      paid_amount: st?.monthly_fee?.toString() || ''
    }));
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Filtered Students
  const filteredStudents = students.filter((st) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      st.name.toLowerCase().includes(q) || 
      (st.roll_number && st.roll_number.toLowerCase().includes(q)) ||
      (st.parent_name && st.parent_name.toLowerCase().includes(q));

    const matchesClass = selectedClass === 'all' || st.class_id === selectedClass || st.classes?.id === selectedClass;
    const matchesStatus = selectedStatus === 'all' || (st.status || 'active').toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Filtered Fee Records
  const filteredFees = feeRecords.filter((fee) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      fee.student_name.toLowerCase().includes(q) || 
      fee.roll_number.toLowerCase().includes(q) ||
      (fee.receipt_number && fee.receipt_number.toLowerCase().includes(q));

    const matchesClass = selectedClass === 'all' || fee.class_name.toLowerCase().includes(selectedClass.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || fee.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesMonth = selectedMonth === 'all' || fee.payment_month.toLowerCase() === selectedMonth.toLowerCase();

    let matchesDateRange = true;
    if (startDate) {
      matchesDateRange = matchesDateRange && new Date(fee.payment_date) >= new Date(startDate);
    }
    if (endDate) {
      matchesDateRange = matchesDateRange && new Date(fee.payment_date) <= new Date(endDate);
    }

    return matchesSearch && matchesClass && matchesStatus && matchesMonth && matchesDateRange;
  });

  // Unique billing months list
  const availableMonths = Array.from(new Set(feeRecords.map(f => f.payment_month)));

  return (
    <RoleGuard allowedRoles={['staff', 'admin', 'super_admin']}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7 text-purple-600" />
              Admission &amp; Fee Records
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Staff Portal — Create and view student admissions and fee entries cleanly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInitialData}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'admissions' ? (
              <button
                onClick={() => setShowAddAdmission(true)}
                className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-500/20 transition-all shrink-0 active:scale-95 text-sm min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>New Admission</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddFee(true)}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0 active:scale-95 text-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Record Fee Payment</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border border-slate-200 bg-slate-100/70 p-1.5 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab('admissions')}
            className={`flex-1 py-3 px-4 text-center rounded-xl font-bold text-sm transition-all duration-200 min-h-[44px] ${
              activeTab === 'admissions'
                ? 'bg-white text-purple-700 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Admissions
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex-1 py-3 px-4 text-center rounded-xl font-bold text-sm transition-all duration-200 min-h-[44px] ${
              activeTab === 'fees'
                ? 'bg-white text-emerald-700 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fee Records
          </button>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'admissions' ? "Search student or parent..." : "Search student, roll or receipt..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
              />
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-white min-h-[44px]"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-white min-h-[44px]"
              >
                <option value="all">All Statuses</option>
                {activeTab === 'admissions' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </>
                ) : (
                  <>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                  </>
                )}
              </select>
            </div>

            {/* Month Filter (for Fee Tab) */}
            {activeTab === 'fees' && (
              <div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none bg-white min-h-[44px]"
                >
                  <option value="all">All Billing Months</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date Range Filter (Fees Tab) */}
          {activeTab === 'fees' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-xs text-rose-600 font-bold hover:underline ml-auto"
                >
                  Clear Dates
                </button>
              )}
            </div>
          )}
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'admissions' ? (
          /* ADMISSIONS TAB CONTENT */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Student Admission Records</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Showing {filteredStudents.length} of {students.length} student entries
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 font-medium">Loading admissions records...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">No admission records found matching filters</div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <th className="py-3.5 px-4">Admission / Roll No.</th>
                        <th className="py-3.5 px-4">Student Name</th>
                        <th className="py-3.5 px-4">Parent Name</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4">Admission Date</th>
                        <th className="py-3.5 px-4">Monthly Fee</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono text-xs font-bold text-slate-700">
                            {st.roll_number || 'N/A'}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-800">
                            {st.name}
                          </td>
                          <td className="py-4 px-4 text-slate-600 font-medium">
                            {st.parent_name || 'N/A'}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {st.classes?.name || 'Unassigned'}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500">
                            {st.admission_date ? new Date(st.admission_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-4 font-bold text-purple-700">
                            ₹{(st.monthly_fee || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              (st.status || 'active').toLowerCase() === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {st.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                            {/* View */}
                            <button
                              onClick={() => { setSelectedStudent(st); setShowViewStudent(true); }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => { setSelectedStudent(st); setShowEditAdmission(true); }}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {/* Preview */}
                            <button
                              onClick={() => { setSelectedStudent(st); setShowAdmissionPreview(true); }}
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                              title="Admission Preview & Certificate"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredStudents.map((st) => (
                    <div key={st.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base">{st.name}</h4>
                          <p className="text-xs font-mono text-slate-500">Roll No: {st.roll_number || 'N/A'}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          (st.status || 'active').toLowerCase() === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {st.status || 'Active'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">Class:</span>
                          <span className="font-semibold text-slate-700">{st.classes?.name || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Monthly Fee:</span>
                          <span className="font-bold text-purple-700">₹{(st.monthly_fee || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Parent Name:</span>
                          <span className="font-medium text-slate-700">{st.parent_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Admission Date:</span>
                          <span className="text-slate-600">{st.admission_date ? new Date(st.admission_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                        <button
                          onClick={() => { setSelectedStudent(st); setShowViewStudent(true); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => { setSelectedStudent(st); setShowEditAdmission(true); }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center space-x-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => { setSelectedStudent(st); setShowAdmissionPreview(true); }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* FEE RECORDS TAB CONTENT */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Fee Entry Records</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Showing {filteredFees.length} of {feeRecords.length} fee transactions
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 font-medium">Loading fee records...</div>
            ) : filteredFees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">No fee records found matching filters</div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <th className="py-3.5 px-4">Receipt No.</th>
                        <th className="py-3.5 px-4">Student Name</th>
                        <th className="py-3.5 px-4">Roll No.</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4">Fee Month</th>
                        <th className="py-3.5 px-4">Amount Paid</th>
                        <th className="py-3.5 px-4">Payment Date</th>
                        <th className="py-3.5 px-4">Method</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono text-xs font-bold text-slate-700">
                            {fee.receipt_number}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-800">
                            {fee.student_name}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-slate-600">
                            {fee.roll_number}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {fee.class_name}
                          </td>
                          <td className="py-4 px-4 text-slate-600 font-medium">
                            {fee.payment_month}
                          </td>
                          <td className="py-4 px-4 font-extrabold text-emerald-700">
                            ₹{fee.paid_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500">
                            {new Date(fee.payment_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700 text-xs">
                            {fee.payment_method}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              Paid
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => { setSelectedFee(fee); setShowFeePreview(true); }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt Preview</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredFees.map((fee) => (
                    <div key={fee.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base">{fee.student_name}</h4>
                          <p className="text-xs font-mono text-slate-500">Receipt: {fee.receipt_number}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          Paid
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">Class &amp; Roll:</span>
                          <span className="font-semibold text-slate-700">{fee.class_name} ({fee.roll_number})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Fee Month:</span>
                          <span className="font-semibold text-slate-700">{fee.payment_month}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Amount Paid:</span>
                          <span className="font-extrabold text-emerald-700 text-sm">₹{fee.paid_amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Payment Method:</span>
                          <span className="font-semibold text-slate-700">{fee.payment_method}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                        <button
                          onClick={() => { setSelectedFee(fee); setShowFeePreview(true); }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95 min-h-[44px]"
                        >
                          <Printer className="w-4 h-4" />
                          <span>View Receipt Preview</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* MODAL 1: ADD NEW ADMISSION */}
        {showAddAdmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 relative animate-in fade-in zoom-in duration-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                  New Student Admission
                </h3>
                <button
                  onClick={() => setShowAddAdmission(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAdmissionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={admissionForm.name}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Roll / Admission Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 101"
                      value={admissionForm.roll_number}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, roll_number: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Class *
                    </label>
                    <select
                      required
                      value={admissionForm.class_id}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const cls = classes.find(c => c.id === cid);
                        setAdmissionForm({
                          ...admissionForm,
                          class_id: cid,
                          monthly_fee: cls?.monthly_fee?.toString() || admissionForm.monthly_fee
                        });
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Monthly Fee (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={admissionForm.monthly_fee}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, monthly_fee: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suresh Sharma"
                      value={admissionForm.parent_name}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, parent_name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Parent Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={admissionForm.parent_phone}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, parent_phone: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={admissionForm.gender}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, gender: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admission Date
                    </label>
                    <input
                      type="date"
                      value={admissionForm.admission_date}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, admission_date: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter complete residential address..."
                    value={admissionForm.address}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, address: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAdmission(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-500/20"
                  >
                    {submitting ? 'Creating Admission...' : 'Save Admission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT ADMISSION */}
        {showEditAdmission && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 relative animate-in fade-in zoom-in duration-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Edit className="w-6 h-6 text-blue-600" />
                  Edit Student Admission Details
                </h3>
                <button
                  onClick={() => setShowEditAdmission(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditAdmissionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedStudent.name}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Roll / Admission Number
                    </label>
                    <input
                      type="text"
                      value={selectedStudent.roll_number || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, roll_number: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Class
                    </label>
                    <select
                      value={selectedStudent.class_id || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, class_id: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Monthly Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={selectedStudent.monthly_fee || 0}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, monthly_fee: parseFloat(e.target.value || '0') })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      value={selectedStudent.parent_name || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, parent_name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Parent Phone Number
                    </label>
                    <input
                      type="tel"
                      value={selectedStudent.parent_phone || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, parent_phone: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={selectedStudent.address || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, address: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditAdmission(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20"
                  >
                    {submitting ? 'Updating...' : 'Update Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: VIEW STUDENT DETAILS */}
        {showViewStudent && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  Student Details
                </h3>
                <button
                  onClick={() => setShowViewStudent(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Name:</span>
                    <span className="font-extrabold text-slate-800">{selectedStudent.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Roll Number:</span>
                    <span className="font-mono font-bold text-slate-700">{selectedStudent.roll_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Class:</span>
                    <span className="font-bold text-indigo-600">{selectedStudent.classes?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Monthly Fee:</span>
                    <span className="font-bold text-purple-700">₹{(selectedStudent.monthly_fee || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Parent Name:</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.parent_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Parent Phone:</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.parent_phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Admission Date:</span>
                    <span className="text-slate-700">{selectedStudent.admission_date ? new Date(selectedStudent.admission_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Address:</span>
                    <span className="text-slate-700 text-xs text-right max-w-[200px]">{selectedStudent.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowViewStudent(false)}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: PRINTABLE ADMISSION PREVIEW & CERTIFICATE */}
        {showAdmissionPreview && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 relative my-6 printable-preview">
              
              {/* Top Controls (No-Print) */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6 no-print">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-purple-600" />
                  Admission Record Preview
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save PDF</span>
                  </button>
                  <button
                    onClick={() => setShowAdmissionPreview(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* OFFICIAL PRINTABLE ADMISSION CERTIFICATE */}
              <div className="border-4 border-slate-900 p-6 sm:p-8 rounded-2xl space-y-6 bg-white text-slate-900">
                {/* Certificate Header */}
                <div className="text-center pb-6 border-b-2 border-slate-900">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-2xl">
                    <GraduationCap className="w-8 h-8 text-purple-400" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
                    ACADEMIC TUITION CENTER
                  </h1>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Official Student Admission Certificate &amp; Record
                  </p>
                </div>

                {/* Admission Meta Badge */}
                <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl text-xs font-bold text-slate-800">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Admission Roll No:</span>
                    <span className="text-base font-mono font-extrabold">{selectedStudent.roll_number || 'N/A'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Date of Admission:</span>
                    <span className="text-sm font-extrabold">
                      {selectedStudent.admission_date ? new Date(selectedStudent.admission_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Main Student Information Grid */}
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Student Name</span>
                      <span className="text-lg font-extrabold text-slate-900">{selectedStudent.name}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assigned Class</span>
                      <span className="text-base font-bold text-purple-800">{selectedStudent.classes?.name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                      <span className="font-semibold text-slate-800">{selectedStudent.gender || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Parent / Guardian Name</span>
                      <span className="text-base font-bold text-slate-900">{selectedStudent.parent_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contact Number</span>
                      <span className="text-base font-mono font-bold text-slate-800">{selectedStudent.parent_phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Agreed Monthly Fee</span>
                      <span className="text-base font-black text-emerald-700">₹{(selectedStudent.monthly_fee || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</span>
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedStudent.address || 'Address record not provided'}
                  </p>
                </div>

                {/* Signatures Footer */}
                <div className="pt-12 flex justify-between items-end text-xs font-bold text-slate-700">
                  <div className="text-center">
                    <div className="w-36 border-b-2 border-slate-900 mb-1" />
                    <span>Parent / Guardian Signature</span>
                  </div>
                  <div className="text-center">
                    <div className="w-36 border-b-2 border-slate-900 mb-1" />
                    <span>Authorized Staff Signature</span>
                  </div>
                </div>
              </div>

              {/* Bottom Close Button (No-Print) */}
              <div className="mt-6 flex justify-end no-print">
                <button
                  onClick={() => setShowAdmissionPreview(false)}
                  className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: RECORD FEE PAYMENT */}
        {showAddFee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Plus className="w-6 h-6 text-emerald-600" />
                  Record Student Fee Entry
                </h3>
                <button
                  onClick={() => setShowAddFee(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddFeeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Student *
                  </label>
                  <select
                    required
                    value={feeForm.student_id}
                    onChange={(e) => handleFeeStudentChange(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                  >
                    <option value="">Select Active Student</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.classes?.name || 'Unassigned'} - Roll: {st.roll_number || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Fee Month *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. August 2026"
                      value={feeForm.payment_month}
                      onChange={(e) => setFeeForm({ ...feeForm, payment_month: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Fee Amount Paid (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Enter amount paid"
                      value={feeForm.paid_amount}
                      onChange={(e) => setFeeForm({ ...feeForm, paid_amount: e.target.value, amount: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={feeForm.payment_date}
                      onChange={(e) => setFeeForm({ ...feeForm, payment_date: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Method
                    </label>
                    <select
                      value={feeForm.payment_method}
                      onChange={(e) => setFeeForm({ ...feeForm, payment_method: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / Google Pay</option>
                      <option value="Online">Online Transfer</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional payment notes or transaction ID..."
                    value={feeForm.notes}
                    onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddFee(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20"
                  >
                    {submitting ? 'Recording Payment...' : 'Save Fee Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: PRINTABLE FEE RECEIPT PREVIEW */}
        {showFeePreview && selectedFee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 relative my-6 printable-preview">
              
              {/* Top Controls (No-Print) */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6 no-print">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  Fee Receipt Preview
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save PDF</span>
                  </button>
                  <button
                    onClick={() => setShowFeePreview(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* OFFICIAL RECEIPT LAYOUT */}
              <div className="border-2 border-slate-300 p-6 sm:p-8 rounded-2xl space-y-6 bg-white text-slate-900">
                {/* Receipt Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-300">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">ACADEMIC TUITION CENTER</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Official Fee Payment Receipt</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-500 block">RECEIPT NO.</span>
                    <span className="text-sm font-mono font-black text-emerald-700">{selectedFee.receipt_number}</span>
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs font-bold text-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Student Name:</span>
                    <span className="text-sm text-slate-900">{selectedFee.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Roll / Admission No:</span>
                    <span className="text-sm font-mono text-slate-900">{selectedFee.roll_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Class:</span>
                    <span className="text-slate-900">{selectedFee.class_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Payment Date:</span>
                    <span className="text-slate-900">{new Date(selectedFee.payment_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Fee Breakdown Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3">Fee Month</th>
                        <th className="p-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 font-semibold text-slate-800">
                        <td className="p-3">Tuition Monthly Fee</td>
                        <td className="p-3">{selectedFee.payment_month}</td>
                        <td className="p-3 text-right font-black text-emerald-700 text-sm">
                          ₹{selectedFee.paid_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment Meta Info */}
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Payment Method:</span>
                    <span className="font-extrabold text-slate-800">{selectedFee.payment_method}</span>
                  </div>
                  {selectedFee.notes && (
                    <div className="text-right max-w-[200px]">
                      <span className="text-slate-400 font-semibold block">Remarks:</span>
                      <span className="text-slate-700 font-medium">{selectedFee.notes}</span>
                    </div>
                  )}
                </div>

                {/* Stamp & Sign Footer */}
                <div className="pt-8 flex justify-between items-end text-xs font-bold text-slate-700">
                  <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-4 h-4" />
                    <span>STATUS: FULLY PAID</span>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-1" />
                    <span>Staff Collector Sign</span>
                  </div>
                </div>
              </div>

              {/* Bottom Close Button (No-Print) */}
              <div className="mt-6 flex justify-end no-print">
                <button
                  onClick={() => setShowFeePreview(false)}
                  className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </RoleGuard>
  );
}

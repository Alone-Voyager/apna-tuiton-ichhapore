"use client"
import { useState } from 'react';
import { Users2, DollarSign, AlertTriangle, Clock, Search, User, HandCoins, FileText, X, Check } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  phone: string;
  fees: number;
  paidAmount: number;
  status: 'pending' | 'overdue';
  dueDate: string;
  overdueBy?: number;
  parentName: string;
}

export default function PendingFeesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Mock data for pending students organized by class
  const pendingStudentsByClass = {
    'Nursery': [
      {
        id: '1',
        name: 'Diya Patel',
        rollNumber: 'N002',
        class: 'Nursery',
        phone: '+91 98765 43210',
        fees: 10000,
        paidAmount: 0,
        status: 'pending' as const,
        dueDate: '2024-01-15',
        parentName: 'Rajesh Patel'
      },
      {
        id: '2',
        name: 'Arjun Kumar',
        rollNumber: 'N003',
        class: 'Nursery',
        phone: '+91 98765 43211',
        fees: 10000,
        paidAmount: 0,
        status: 'overdue' as const,
        dueDate: '2024-01-15',
        overdueBy: 15,
        parentName: 'Suresh Kumar'
      }
    ],
    'LKG': [
      {
        id: '3',
        name: 'Rohan Gupta',
        rollNumber: 'L002',
        class: 'LKG',
        phone: '+91 98765 43212',
        fees: 11000,
        paidAmount: 0,
        status: 'pending' as const,
        dueDate: '2024-01-20',
        parentName: 'Amit Gupta'
      }
    ],
    'UKG': [
      {
        id: '4',
        name: 'Kavya Singh',
        rollNumber: 'U003',
        class: 'UKG',
        phone: '+91 98765 43213',
        fees: 12000,
        paidAmount: 0,
        status: 'overdue' as const,
        dueDate: '2024-01-10',
        overdueBy: 8,
        parentName: 'Vikram Singh'
      }
    ],
    'Class 1': [
      {
        id: '5',
        name: 'Aaditya Sharma',
        rollNumber: 'C1001',
        class: 'Class 1',
        phone: '+91 98765 43214',
        fees: 13000,
        paidAmount: 0,
        status: 'pending' as const,
        dueDate: '2024-01-25',
        parentName: 'Manish Sharma'
      }
    ]
  };

  const classes = ['all', ...Object.keys(pendingStudentsByClass)];
  const filterOptions = [
    { value: 'all', label: 'All Pending' },
    { value: 'overdue', label: 'Overdue Only' },
    { value: 'due_soon', label: 'Due Soon' },
    { value: 'pending_only', label: 'Pending Only' }
  ];

  const getAllStudents = () => {
    return Object.values(pendingStudentsByClass).flat();
  };

  const getFilteredStudents = () => {
    let students = getAllStudents();
    
    // Filter by class
    if (selectedClass !== 'all') {
      students = students.filter(student => student.class === selectedClass);
    }
    
    // Filter by status
    if (filterStatus === 'overdue') {
      students = students.filter(student => student.status === 'overdue');
    } else if (filterStatus === 'pending_only') {
      students = students.filter(student => student.status === 'pending');
    } else if (filterStatus === 'due_soon') {
      // Mock logic for due soon
      students = students.filter(student => student.status === 'pending');
    }
    
    // Filter by search
    if (searchTerm) {
      students = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm) ||
        student.parentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return students;
  };

  const filteredStudents = getFilteredStudents();

  const handlePayment = (student: Student) => {
    setSelectedStudent(student);
    setPaymentData({
      amount: (student.fees - student.paidAmount).toString(),
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Payment submitted:', paymentData, selectedStudent);
    setShowPaymentModal(false);
    setSelectedStudent(null);
  };

  const stats = {
    totalPending: getAllStudents().length,
    totalAmount: getAllStudents().reduce((sum, student) => sum + (student.fees - student.paidAmount), 0),
    overdue: getAllStudents().filter(s => s.status === 'overdue').length,
    pending: getAllStudents().filter(s => s.status === 'pending').length
  };

  return (
    <div className="min-h-full bg-slate-50">
        <main className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Pending Fees Management</h1>
              <p className="text-sm sm:text-base text-red-100">Monitor overdue payments and follow up with students</p>
            </div>
          </div>

          <div className="p-2 sm:p-4 lg:p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Total Pending</p>
                    <p className="text-sm sm:text-lg font-bold text-slate-800">{stats.totalPending}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Pending Amount</p>
                    <p className="text-sm sm:text-lg font-bold text-slate-800">₹{stats.totalAmount.toLocaleString()}</p>
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
                    <p className="text-sm sm:text-lg font-bold text-red-600">{stats.overdue}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Due Soon</p>
                    <p className="text-sm sm:text-lg font-bold text-orange-600">{stats.pending}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200 mb-4 sm:mb-6">
              <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, roll number, phone, or parent name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm pr-8"
                  >
                    {classes.map(cls => (
                      <option key={cls} value={cls}>
                        {cls === 'all' ? 'All Classes' : cls}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm pr-8"
                  >
                    {filterOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Class-wise Organization */}
            {selectedClass === 'all' ? (
              // Show all classes
              <div className="space-y-4 sm:space-y-6">
                {Object.entries(pendingStudentsByClass).map(([className, students]) => {
                  const classFilteredStudents = students.filter(student => {
                    let matches = true;
                    
                    if (filterStatus === 'overdue') {
                      matches = student.status === 'overdue';
                    } else if (filterStatus === 'pending_only') {
                      matches = student.status === 'pending';
                    } else if (filterStatus === 'due_soon') {
                      matches = student.status === 'pending';
                    }
                    
                    if (searchTerm) {
                      matches = matches && (
                        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        student.phone.includes(searchTerm) ||
                        student.parentName.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }
                    
                    return matches;
                  });
                  
                  if (classFilteredStudents.length === 0) return null;
                  
                  return (
                    <div key={className} className="bg-white rounded-lg sm:rounded-xl border border-slate-200">
                      <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 rounded-t-lg sm:rounded-t-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-base sm:text-lg font-bold text-slate-800">{className}</h3>
                          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                            <span className="text-xs sm:text-sm text-slate-500">
                              Pending: {classFilteredStudents.length}
                            </span>
                            <span className="text-xs sm:text-sm text-red-600">
                              Overdue: {classFilteredStudents.filter(s => s.status === 'overdue').length}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-slate-200">
                        {classFilteredStudents.map((student) => (
                          <div key={student.id} className="p-3 sm:p-4 hover:bg-slate-50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex-1">
                                <div className="flex items-start sm:items-center space-x-3 mb-3 sm:mb-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-slate-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{student.name}</h4>
                                    <div className="flex flex-col md:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-slate-500">
                                      <p className="truncate">Roll: {student.rollNumber}</p>
                                      <p className="truncate">Parent: {student.parentName}</p>
                                      <p className="truncate">{student.phone}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-3 sm:mt-0 w-full sm:w-auto">
                                {/* Overdue badge first */}
                                <div className="mb-2 sm:mb-0 w-full sm:w-auto flex items-start sm:items-center">
                                  {student.status === 'overdue' && (
                                    <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium mr-0 sm:mr-3">
                                      {student.overdueBy}d overdue
                                    </span>
                                  )}
                                </div>

                                {/* Amount */}
                                <div className="text-left sm:text-left mb-3 sm:mb-0 w-full sm:w-auto">
                                  <p className="text-xs sm:text-sm text-slate-500">Amount Due</p>
                                  <p className="text-sm sm:text-base font-bold text-slate-800">
                                    ₹{(student.fees - student.paidAmount).toLocaleString()}
                                  </p>
                                </div>
                                
                                {/* Action button */}
                                <div className="w-full sm:w-auto">
                                  <button
                                    onClick={() => handlePayment(student)}
                                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                      student.status === 'overdue'
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                                    }`}
                                  >
                                    <HandCoins className="w-4 h-4" />
                                    <span className="hidden sm:inline">Collect Now</span>
                                    <span className="sm:hidden">Collect</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Show single class
              <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200">
                <div className="p-3 sm:p-4 border-b border-slate-200">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    {selectedClass} - Pending Fees ({filteredStudents.length})
                  </h3>
                </div>
                
                <div className="divide-y divide-slate-200">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="p-3 sm:p-4 hover:bg-slate-50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start sm:items-center space-x-3 mb-3 sm:mb-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{student.name}</h4>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-slate-500">
                                <p className="truncate">Roll: {student.rollNumber}</p>
                                <p className="truncate">Parent: {student.parentName}</p>
                                <p className="truncate">{student.phone}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-3 sm:mt-0 w-full sm:w-auto">
                          {/* Overdue badge first */}
                          <div className="mb-2 sm:mb-0 w-full sm:w-auto flex items-start sm:items-center">
                            {student.status === 'overdue' && (
                              <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium mr-0 sm:mr-3">
                                {student.overdueBy}d overdue
                              </span>
                            )}
                          </div>

                          {/* Amount */}
                          <div className="text-left sm:text-left mb-3 sm:mb-0 w-full sm:w-auto">
                            <p className="text-xs sm:text-sm text-slate-500">Amount Due</p>
                            <p className="text-sm sm:text-base font-bold text-slate-800">
                              ₹{(student.fees - student.paidAmount).toLocaleString()}
                            </p>
                          </div>
                          
                          {/* Action button */}
                          <div className="w-full sm:w-auto">
                            <button
                              onClick={() => handlePayment(student)}
                              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                student.status === 'overdue'
                                  ? 'bg-red-500 hover:bg-red-600 text-white'
                                  : 'bg-orange-500 hover:bg-orange-600 text-white'
                              }`}
                            >
                              <HandCoins className="w-4 h-4" />
                              <span className="hidden sm:inline">Collect Now</span>
                              <span className="sm:hidden">Collect</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center">
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
                    <p className="text-slate-500">No pending fees found for the selected filters</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
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
                <p className="text-xs sm:text-sm text-slate-600">Roll: {selectedStudent.rollNumber} | Class: {selectedStudent.class}</p>
                <p className="text-xs sm:text-sm text-slate-600">Parent: {selectedStudent.parentName}</p>
                <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">
                  Amount Due: ₹{(selectedStudent.fees - selectedStudent.paidAmount).toLocaleString()}
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base pr-8"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={paymentData.date}
                    onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm sm:text-base whitespace-nowrap"
                  >
                    Cancel
                  </button>
                    <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 text-sm sm:text-base whitespace-nowrap"
                  >
                    <Check className="mr-2 w-4 h-4" />
                    Collect Payment
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

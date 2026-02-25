"use client"
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import { Button } from '../../../../components/ui/button';
import { History, Save, CheckCircle, XCircle, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

type AttendanceStatus = 'Present' | 'Absent' | 'Leave';
type AttendanceMap = Record<string, AttendanceStatus>;

interface Class {
  id: string;
  name: string;
  monthly_fee: number;
  total_students: number;
}

interface StudentWithAttendance {
  id: string;
  name: string;
  roll_number: string;
  class_id: string | null;
  classes?: {
    id: string;
    name: string;
  };
  attendance?: {
    status: AttendanceStatus;
    check_in_time?: string;
  } | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  leave: number;
  unmarked: number;
}

export default function AttendanceClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>(searchParams.get('class_id') || 'all');
  const [attendanceData, setAttendanceData] = useState<AttendanceMap>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    absent: 0,
    leave: 0,
    unmarked: 0,
  });
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch students when date or class changes
  useEffect(() => {
    if (classes.length > 0 || selectedClassId === 'all') {
      fetchStudents();
    }
  }, [selectedDate, selectedClassId, classes]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes');
      }

      setClasses(data.data || []);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError(err.message || 'Failed to load classes');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedClassId && selectedClassId !== 'all') {
        params.append('class_id', selectedClassId);
      }

      const response = await fetch(`/api/attendance/daily?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }

      setStudents(data.students || []);
      setSummary(data.summary || {
        total: 0,
        present: 0,
        absent: 0,
        leave: 0,
        unmarked: 0,
      });

      const initialAttendance: AttendanceMap = {};
      data.students?.forEach((student: StudentWithAttendance) => {
        if (student.attendance) {
          initialAttendance[student.id] = student.attendance.status;
        }
      });
      setAttendanceData(initialAttendance);

    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const getAttendanceStatus = (studentId: string): AttendanceStatus | null => {
    return attendanceData[studentId] || null;
  };

  const handleSaveAttendance = async () => {
    if (Object.keys(attendanceData).length === 0) {
      alert('Please mark attendance for at least one student');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        status,
        check_in_time: null,
      }));

      const response = await fetch('/api/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      alert(data.message || 'Attendance saved successfully!');
      await fetchStudents();

    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err.message || 'Failed to save attendance');
      alert('Error: ' + (err.message || 'Failed to save attendance'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = () => {
    const newData: AttendanceMap = {};
    students.forEach(student => {
      newData[student.id] = 'Present';
    });
    setAttendanceData(newData);
  };

  const handleMarkAllAbsent = () => {
    const newData: AttendanceMap = {};
    students.forEach(student => {
      newData[student.id] = 'Absent';
    });
    setAttendanceData(newData);
  };

  const handleResetAll = () => {
    setAttendanceData({});
  };

  const presentCount = Object.values(attendanceData).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'Absent').length;
  const leaveCount = Object.values(attendanceData).filter(s => s === 'Leave').length;
  const unmarkedCount = students.length - Object.keys(attendanceData).length;

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64">
          <Header 
            title="Daily Attendance" 
            subtitle="Mark and manage daily student attendance"
            onMobileMenuToggle={() => setSidebarOpen(true)}
          />
          <div className="p-4 lg:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading students...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
              {/* Search and Filter Section */}
              <div className="bg-white rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Search and Filter</h2>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search student name.."
                      className="w-full p-2 border rounded-lg"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="p-2 border rounded-lg"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="p-2 border rounded-lg min-w-[150px]">
                      <option value="all">All Classes</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.total_students})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Attendance Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h2 className="text-3xl font-bold text-blue-600 mb-1">{students.length}</h2>
                  <p className="text-sm text-slate-600">Total Students</p>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <h2 className="text-3xl font-bold text-green-600 mb-1">{presentCount}</h2>
                  <p className="text-sm text-slate-600">Present</p>
                </div>

                <div className="bg-red-50 rounded-lg p-6">
                  <h2 className="text-3xl font-bold text-red-600 mb-1">{absentCount}</h2>
                  <p className="text-sm text-slate-600">Absent</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h2 className="text-3xl font-bold text-orange-600 mb-1">{leaveCount}</h2>
                  <p className="text-sm text-slate-600">Leave</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={handleMarkAllPresent}
                  disabled={students.length === 0}
                  className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 lg:p-6 text-white hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-base lg:text-lg font-semibold mb-2">Mark All Present</h3>
                      <p className="text-green-100 text-sm">Quick mark all students as present</p>
                    </div>
                    <CheckCircle className="w-10 h-10 lg:w-12 lg:h-12 text-green-200" />
                  </div>
                </button>
                
                <button
                  onClick={handleMarkAllAbsent}
                  disabled={students.length === 0}
                  className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 lg:p-6 text-white hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-base lg:text-lg font-semibold mb-2">Mark All Absent</h3>
                      <p className="text-red-100 text-sm">Quick mark all students as absent</p>
                    </div>
                    <XCircle className="w-10 h-10 lg:w-12 lg:h-12 text-red-200" />
                  </div>
                </button>
                
                <button
                  onClick={handleResetAll}
                  disabled={Object.keys(attendanceData).length === 0}
                  className="bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg p-4 lg:p-6 text-white hover:from-slate-600 hover:to-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-base lg:text-lg font-semibold mb-2">Reset All</h3>
                      <p className="text-slate-100 text-sm">Clear all attendance marks</p>
                    </div>
                    <RefreshCw className="w-10 h-10 lg:w-12 lg:h-12 text-slate-200" />
                  </div>
                </button>
              </div>

              {/* Student Attendance List */}
              <div className="bg-white rounded-lg p-4">
                {students.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Students Found</h3>
                      <p className="text-slate-600 mb-4">
                        {selectedClassId !== 'all' 
                          ? 'No students in the selected class.' 
                          : 'No students found for the selected date and filters.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredStudents.map((student) => {
                        const currentStatus = getAttendanceStatus(student.id);
                        return (
                          <div key={student.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{student.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {student.roll_number}
                                  {student.classes && (
                                    <span className="ml-2 text-slate-500">• {student.classes.name}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAttendanceChange(student.id, 'Present')}
                                className={`px-4 py-1 rounded-full transition-colors ${
                                  currentStatus === 'Present' 
                                    ? 'bg-green-500 text-white' 
                                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                P
                              </button>
                              <button 
                                onClick={() => handleAttendanceChange(student.id, 'Absent')}
                                className={`px-4 py-1 rounded-full transition-colors ${
                                  currentStatus === 'Absent' 
                                    ? 'bg-red-500 text-white' 
                                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                A
                              </button>
                              <button 
                                onClick={() => handleAttendanceChange(student.id, 'Leave')}
                                className={`px-4 py-1 rounded-full transition-colors ${
                                  currentStatus === 'Leave' 
                                    ? 'bg-yellow-500 text-white' 
                                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                L
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* Save Attendance */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Save className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">Save Attendance</h4>
                      <p className="text-sm text-slate-600">
                        {selectedDate} - {selectedClassId === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClassId)?.name || 'Selected Class'}
                      </p>
                      {unmarkedCount > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {unmarkedCount} student{unmarkedCount !== 1 ? 's' : ''} unmarked
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      onClick={handleSaveAttendance}
                      disabled={saving || Object.keys(attendanceData).length === 0}
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 w-4 h-4" />
                          Save Attendance
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

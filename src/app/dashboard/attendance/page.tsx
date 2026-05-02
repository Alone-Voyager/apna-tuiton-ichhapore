"use client"
import { useState, useEffect } from 'react';
import ConsecutiveLeaveMonitor from '../../../components/ConsecutiveLeaveMonitor';
import { Button } from '../../../components/ui/button';
import { Download, UserPlus, UserCheck, UserX, PieChart, Clock, Eye, RefreshCw, Filter, Search, Edit, Trash2, BookOpen, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../components/ui/pagination";

interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  attendanceRate: number;
}

interface ClassAttendance {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendanceRate: number;
}

interface RecentRecord {
  id: string;
  studentName: string;
  className: string;
  rollNumber: string;
  status: string;
  checkInTime: string | null;
  attendanceDate: string;
}

interface WeeklyTrend {
  date: string;
  present: number;
  absent: number;
  leave: number;
}

interface Class {
  id: string;
  name: string;
  total_students: number;
}

export default function Attendance() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  
  // Data states
  const [stats, setStats] = useState<AttendanceStats>({
    totalPresent: 0,
    totalAbsent: 0,
    totalLeave: 0,
    attendanceRate: 0
  });
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 10;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [selectedDate, selectedClass]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes');
      }

      // API returns classes in 'data' property
      setClasses(data.data || []);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedClass && selectedClass !== 'all') {
        params.append('class_id', selectedClass);
      }

      const response = await fetch(`/api/attendance/overview?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch overview data');
      }

      setStats(data.stats || {
        totalPresent: 0,
        totalAbsent: 0,
        totalLeave: 0,
        attendanceRate: 0
      });
      setClassAttendance(data.classwiseAttendance || []);
      setRecentRecords(data.recentRecords || []);
      setWeeklyTrend(data.weeklyTrend || []);

    } catch (err: any) {
      console.error('Error fetching overview data:', err);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    // Convert 24h format to 12h format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'leave':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'half day':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Calculate pagination for recent records
  const totalPages = Math.ceil(recentRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = recentRecords.slice(startIndex, endIndex);

  const attendanceStatsData = [
    { 
      title: 'Total Present', 
      value: stats.totalPresent, 
      icon: <UserCheck />, 
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    { 
      title: 'Total Absent', 
      value: stats.totalAbsent, 
      icon: <UserX />, 
      bgColor: 'bg-red-100',
      textColor: 'text-red-600'
    },
    { 
      title: 'Attendance Rate', 
      value: `${stats.attendanceRate}%`, 
      icon: <PieChart />, 
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    { 
      title: 'On Leave', 
      value: stats.totalLeave, 
      icon: <Clock />, 
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
  ];

  return (
    <div className="min-h-full bg-gray-50">
          <main className="p-4 lg:p-6">
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
                  <p className="text-slate-600">Loading attendance data...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date and Class Selector */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                      >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button variant="outline" size="sm" onClick={fetchOverviewData}>
                      <RefreshCw className="mr-2 w-4 h-4" />
                      Refresh
                    </Button>
                    <Link href="/dashboard/attendance/daily">
                      <Button size="sm">
                        <UserPlus className="mr-2 w-4 h-4" />
                        Mark Attendance
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {attendanceStatsData.map((stat, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg lg:text-2xl font-bold text-slate-800">{stat.value}</p>
                        <p className="text-xs lg:text-sm text-slate-600">{stat.title}</p>
                      </div>
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                        <div className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.textColor}`}>{stat.icon}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consecutive Leave Monitoring */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg shadow-sm border border-orange-200 p-4 lg:p-6">
                <div className="mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-2">
                    Consecutive Leave Monitoring
                  </h3>
                  <p className="text-xs lg:text-sm text-slate-600">
                    Students with 7 consecutive leave days are automatically suspended
                  </p>
                </div>
                <ConsecutiveLeaveMonitor />
              </div>

              {/* Class-wise Attendance */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Class-wise Attendance</h3>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Refresh
                  </Button>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Total Students</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Present</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Absent</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Percentage</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classAttendance.length > 0 ? (
                        classAttendance.map((item, index) => (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium text-slate-800">{item.className}</td>
                            <td className="py-3 px-4 text-slate-600">{item.totalStudents}</td>
                            <td className="py-3 px-4 text-green-600 font-medium">{item.presentCount}</td>
                            <td className="py-3 px-4 text-red-600 font-medium">{item.absentCount}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${item.attendanceRate >= 90 ? 'bg-green-500' : item.attendanceRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${item.attendanceRate}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-slate-800">{item.attendanceRate}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Link href={`/dashboard/attendance/daily?date=${selectedDate}&class_id=${item.classId}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="mr-1 w-4 h-4" />
                                  View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                            No attendance data available for selected date/class
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {classAttendance.length > 0 ? (
                    classAttendance.map((item, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-800">{item.className}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.attendanceRate >= 90 ? 'bg-green-100 text-green-800' : 
                            item.attendanceRate >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.attendanceRate}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                          <div className="text-center">
                            <p className="text-slate-600">Total</p>
                            <p className="font-medium text-slate-800">{item.totalStudents}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-600">Present</p>
                            <p className="font-medium text-green-600">{item.presentCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-600">Absent</p>
                            <p className="font-medium text-red-600">{item.absentCount}</p>
                          </div>
                        </div>
                        <Link href={`/dashboard/attendance/daily?date=${selectedDate}&class_id=${item.classId}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="mr-1 w-4 h-4" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                      No attendance data available
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Attendance Records */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Recent Attendance Records</h3>
                  <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 w-4 h-4" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Search className="mr-2 w-4 h-4" />
                        Search
                      </Button>
                  </div>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Class</th>
                        {/* Roll No removed from UI intentionally */}
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Time</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Date</th>
                        {/* <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Actions</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.length > 0 ? (
                        paginatedRecords.map((record) => (
                          <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium text-slate-800">{record.studentName}</td>
                            <td className="py-3 px-4 text-slate-600">{record.className}</td>
                            {/* rollNumber intentionally omitted from recent records display */}
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{formatTime(record.checkInTime)}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(record.attendanceDate)}</td>
                            {/* <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <button className="p-1 hover:bg-blue-100 rounded text-blue-600">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="p-1 hover:bg-red-100 rounded text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td> */}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                            No recent attendance records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record) => (
                      <div key={record.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-800">{record.studentName}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 mb-3">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            <span>{record.className}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{formatTime(record.checkInTime)} • {formatDate(record.attendanceDate)}</span>
                          </div>
                        </div>
                        {/* <div className="flex items-center justify-end space-x-3">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                            <Edit className="mr-1 w-4 h-4" />
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center">
                            <Trash2 className="mr-1 w-4 h-4" />
                            Delete
                          </button>
                        </div> */}
                      </div>
                    ))
                  ) : (
                    <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                      No recent attendance records found
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {recentRecords.length > 0 && totalPages > 1 && (
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
                          // Show first page, last page, current page, and pages around current
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
                      Showing {startIndex + 1} to {Math.min(endIndex, recentRecords.length)} of {recentRecords.length} records
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Weekly Attendance Trend</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-10 h-10 lg:w-12 lg:h-12 text-blue-400 mb-2 mx-auto" />
                      <p className="text-slate-600">Weekly Trend Chart</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Attendance Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">Total Present</p>
                          <p className="text-sm text-slate-600">Students present</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-green-600">{stats.totalPresent}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <UserX className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">Total Absent</p>
                          <p className="text-sm text-slate-600">Students absent</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-red-600">{stats.totalAbsent}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">On Leave</p>
                          <p className="text-sm text-slate-600">Students on leave</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-yellow-600">{stats.totalLeave}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </main>
    </div>
  );
}

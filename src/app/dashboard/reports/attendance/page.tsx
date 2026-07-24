"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Download, FileSpreadsheet, Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart2, RefreshCw, Mail, Phone, Eye, Trophy, Calendar, AlertTriangle, Heart, Home, HelpCircle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface AttendanceStats {
  overallAttendance: string;
  totalPresentDays: number;
  totalAbsentDays: number;
  lateArrivals: number;
}

interface ClassWiseData {
  class: string;
  students: number;
  avgAttendance: number;
  presentToday: number;
  absentToday: number;
}

interface MonthlyTrendData {
  month: string;
  attendance: number;
}

interface DayWisePattern {
  bestDay: string;
  bestRate: number;
  lowestDay: string;
  lowestRate: number;
}

interface LowAttendanceStudent {
  id?: string;
  name: string;
  class: string;
  phone: string | null;
  attendance: number;
  absents: number;
  reasons: string[];
}

interface AbsenceReason {
  reason: string;
  percentage: number;
  count: number;
}

interface ReportData {
  stats: AttendanceStats;
  classWiseAttendance: ClassWiseData[];
  monthlyTrend: MonthlyTrendData[];
  dayWisePattern: DayWisePattern;
  lowAttendanceStudents: LowAttendanceStudent[];
  absenceReasons: AbsenceReason[];
  insights: {
    bestClass: { name: string; rate: number } | null;
    actionRequired: number;
  };
}

export default function AttendanceReport() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedClass, setSelectedClass] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  
  // Data states
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const router = useRouter();
  const [resolvingStudentId, setResolvingStudentId] = useState<string | null>(null);

  const handleDetailsClick = async (student: LowAttendanceStudent) => {
    // If id already present, navigate directly
    if (student.id) {
      router.push(`/dashboard/students/details?id=${student.id}`);
      return;
    }

    // Otherwise try to resolve the student id by querying students API
    try {
      setResolvingStudentId(student.name);

      // Fetch students (include inactive to be safe). Limit large enough for orgs with many students.
      const params = new URLSearchParams();
      params.append('include_inactive', 'true');
      params.append('limit', '1000');

      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch students for lookup');
      }

      const data = await res.json();
      const students: any[] = data.students || [];

      // Try matching by phone (preferred) then by name + class
      let matched = null;
      if (student.phone) {
        matched = students.find(s => s.whatsapp === student.phone || s.phone === student.phone || s.whatsapp === `+${student.phone}`);
      }

      if (!matched) {
        matched = students.find(s => (
          String(s.name).trim().toLowerCase() === String(student.name).trim().toLowerCase() &&
          ((s.classes && s.classes.name && String(s.classes.name).trim().toLowerCase() === String(student.class).trim().toLowerCase()) ||
            String(s.class_id || '').trim() === String(student.class).trim())
        ));
      }

      if (matched && matched.id) {
        router.push(`/dashboard/students/details?id=${matched.id}`);
      } else {
        // If still not found, show a user-friendly message
        alert('Could not resolve student record. Please open the Students list and search for the student manually.');
      }
    } catch (err: any) {
      console.error('Error resolving student id:', err);
      alert('Failed to resolve student details: ' + (err.message || err));
    } finally {
      setResolvingStudentId(null);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (response.ok) {
        // API returns classes in 'data' property
        setClasses(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.append('period', selectedPeriod);
      if (selectedClass && selectedClass !== 'all') {
        params.append('class_id', selectedClass);
      }

      const response = await fetch(`/api/reports/attendance?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report data');
      }

      setReportData(data);
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) return;

    try {
      setExporting('pdf');
      
      const params = new URLSearchParams();
      params.append('period', selectedPeriod);
      if (selectedClass && selectedClass !== 'all') {
        params.append('class_id', selectedClass);
      }
      params.append('format', 'pdf');

      const response = await fetch(`/api/reports/attendance/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // If popup blocked, download the file instead
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setError(err.message || 'Failed to export PDF');
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) return;

    try {
      setExporting('excel');
      
      const params = new URLSearchParams();
      params.append('period', selectedPeriod);
      if (selectedClass && selectedClass !== 'all') {
        params.append('class_id', selectedClass);
      }
      params.append('format', 'excel');

      const response = await fetch(`/api/reports/attendance/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      setError(err.message || 'Failed to export Excel');
      alert('Failed to export Excel: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const attendanceStatsData = reportData ? [
    { title: 'Overall Attendance', value: `${reportData.stats.overallAttendance}%`, icon: Users, bgColor: 'bg-green-100', textColor: 'text-green-600' },
    { title: 'Total Present Days', value: reportData.stats.totalPresentDays.toLocaleString(), icon: CheckCircle, bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
    { title: 'Total Absent Days', value: reportData.stats.totalAbsentDays.toLocaleString(), icon: XCircle, bgColor: 'bg-red-100', textColor: 'text-red-600' },
    { title: 'Late Arrivals', value: reportData.stats.lateArrivals.toString(), icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
  ] : [];

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/reports');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <main className="p-4 lg:p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </Button>
        </div>
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
                  <p className="text-slate-600">Loading report data...</p>
                </div>
              </div>
            ) : reportData ? (
            <div className="space-y-6">
              {/* Filter Controls */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                      <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                      >
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="this_quarter">This Quarter</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
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
                    <Button variant="outline" size="sm" onClick={fetchReportData}>
                      <RefreshCw className="mr-2 w-4 h-4" />
                      Refresh
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportPDF}
                      disabled={exporting === 'pdf' || !reportData}
                    >
                      {exporting === 'pdf' ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 w-4 h-4" />
                          Export PDF
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleExportExcel}
                      disabled={exporting === 'excel' || !reportData}
                    >
                      {exporting === 'excel' ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="mr-2 w-4 h-4" />
                          Export Excel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {attendanceStatsData.map((stat, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                        <stat.icon className={`${stat.textColor} w-5 h-5 lg:w-6 lg:h-6`} />
                      </div>
                    </div>
                    <p className="text-lg lg:text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs lg:text-sm text-slate-600">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Attendance Trend */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Monthly Attendance Trend</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="text-blue-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                      <p className="text-slate-600">Monthly Trend Chart</p>
                      <div className="mt-4 text-sm">
                        <div className="font-semibold text-blue-600">Current Period Average</div>
                        <div className="text-slate-600">{reportData.stats.overallAttendance}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day-wise Attendance Pattern */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Day-wise Pattern</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart2 className="text-green-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                      <p className="text-slate-600">Weekly Pattern Chart</p>
                      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-green-600">Best Day</div>
                          <div className="text-slate-600">{reportData.dayWisePattern.bestDay} ({reportData.dayWisePattern.bestRate}%)</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600">Lowest Day</div>
                          <div className="text-slate-600">{reportData.dayWisePattern.lowestDay} ({reportData.dayWisePattern.lowestRate}%)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Class-wise Attendance */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Class-wise Attendance Analysis</h3>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Refresh Data
                  </Button>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Total Students</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Avg Attendance</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Present Today</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Absent Today</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.classWiseAttendance.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{item.class}</td>
                          <td className="py-3 px-4 text-slate-600">{item.students}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{item.avgAttendance}%</td>
                          <td className="py-3 px-4 text-green-600 font-medium">{item.presentToday}</td>
                          <td className="py-3 px-4 text-red-600 font-medium">{item.absentToday}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${item.avgAttendance >= 90 ? 'bg-green-500' : item.avgAttendance >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${item.avgAttendance}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                item.avgAttendance >= 90 ? 'bg-green-100 text-green-800' : 
                                item.avgAttendance >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.avgAttendance >= 90 ? 'Excellent' : item.avgAttendance >= 80 ? 'Good' : 'Poor'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {reportData.classWiseAttendance.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800">{item.class}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.avgAttendance >= 90 ? 'bg-green-100 text-green-800' : 
                          item.avgAttendance >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.avgAttendance}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                        <div className="text-center">
                          <p className="text-slate-600">Students</p>
                          <p className="font-medium text-slate-800">{item.students}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600">Present</p>
                          <p className="font-medium text-green-600">{item.presentToday}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600">Absent</p>
                          <p className="font-medium text-red-600">{item.absentToday}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.avgAttendance >= 90 ? 'bg-green-500' : item.avgAttendance >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.avgAttendance}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Attendance Students */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Students Needing Attention</h3>
                  {/* <Button variant="outline" size="sm">
                    <Mail className="mr-2 w-4 h-4" />
                    Send Reminders
                  </Button> */}
                </div>
                
                {reportData.lowAttendanceStudents.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.lowAttendanceStudents.map((student, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-slate-800">{student.name}</h4>
                              <span className="text-sm text-slate-600">{student.class}</span>
                              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                                {student.attendance}%
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                              <span className="flex items-center space-x-1">
                                <XCircle className="text-red-500 w-4 h-4" />
                                <span>{student.absents} absents</span>
                              </span>
                              {student.reasons.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Reasons: {student.reasons.join(', ')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {student.phone ? (
                              <a href={`tel:${student.phone}`}>
                                <Button variant="outline" size="sm">
                                  <Phone className="mr-1 w-4 h-4" />
                                  Call
                                </Button>
                              </a>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                <Phone className="mr-1 w-4 h-4" />
                                Call
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDetailsClick(student)}
                              disabled={!!resolvingStudentId}
                            >
                              {resolvingStudentId === student.name ? (
                                <>
                                  <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                                  Resolving...
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-1 w-4 h-4" />
                                  Details
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No students with low attendance in the selected period
                  </div>
                )}
              </div>

              {/* Additional Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Attendance Insights</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Trophy className="text-green-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Best Performing Class</h4>
                        <p className="text-sm text-slate-600">
                          {reportData.insights.bestClass 
                            ? `${reportData.insights.bestClass.name} maintains highest attendance at ${reportData.insights.bestClass.rate}%`
                            : 'No data available'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="text-blue-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Period Analysis</h4>
                        <p className="text-sm text-slate-600">
                          Overall attendance rate: {reportData.stats.overallAttendance}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-yellow-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Action Required</h4>
                        <p className="text-sm text-slate-600">
                          {reportData.insights.actionRequired} {reportData.insights.actionRequired === 1 ? 'student' : 'students'} with attendance below 75% need intervention
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Absence Reasons card commented out per request - not needed now
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Absence Reasons</h3>
                    <div className="space-y-3">
                      {reportData.absenceReasons.map((reason, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              index === 0 ? 'bg-red-100' : index === 1 ? 'bg-blue-100' : 'bg-yellow-100'
                            }`}>
                              {index === 0 ? <Heart className="text-red-600 w-5 h-5" /> :
                               index === 1 ? <Home className="text-blue-600 w-5 h-5" /> :
                               <HelpCircle className="text-yellow-600 w-5 h-5" />}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{reason.reason}</div>
                              <div className="text-sm text-slate-600">
                                {reason.reason === 'Medical Issues' ? 'Health related absences' :
                                 reason.reason === 'Family Events' ? 'Personal/family reasons' :
                                 'Miscellaneous absences'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-800">{reason.percentage}%</div>
                            <div className="text-sm text-slate-600">{reason.count} cases</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                */}
              </div>
            </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No data available
              </div>
            )}
          </main>
    </div>
  );
}

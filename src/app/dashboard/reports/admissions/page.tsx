"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Download, FileSpreadsheet, FileText, CheckCircle, Clock, XCircle, TrendingUp, BarChart2, RefreshCw, ArrowUp, Trophy, AlertTriangle, Globe, User, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Class {
  id: string;
  name: string;
  total_students: number;
}

interface ClassWiseData {
  class: string;
  totalAdmissions: number;
}

export default function AdmissionsReport() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [totalAdmissions, setTotalAdmissions] = useState<number>(0);
  const [newAdmissions, setNewAdmissions] = useState<number>(0);
  const [classWiseData, setClassWiseData] = useState<ClassWiseData[]>([]);
  const [studentDetails, setStudentDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/reports');
    }
  };

  const admissionStats = [
    { title: 'Total Admissions', value: totalAdmissions, icon: FileText, color: 'blue', change: '+12%' },
    { title: 'New Admissions', value: newAdmissions, icon: CheckCircle, color: 'green', change: '+8.5%' },
    /* { title: 'Pending Review', value: 34, icon: Clock, color: 'yellow', change: '-5%' }, */
    /* { title: 'Rejected Applications', value: 23, icon: XCircle, color: 'red', change: '+2%' }, */
  ];

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [selectedPeriod, selectedClass, customStartDate, customEndDate]);

  // Helper function to get date range based on selected period
  function getDateRange(): { startDate: string; endDate: string } | null {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (selectedPeriod) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'this_week':
        // Get the start of the week (Sunday)
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate
          };
        }
        return null;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchClasses(),
        fetchTotalAdmissions(),
        fetchNewAdmissions(),
        fetchClassWiseData(),
        fetchStudentDetails()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, total_students')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching classes:', error);
      return;
    }

    setClasses(data || []);
  }

  async function fetchTotalAdmissions() {
    let query = supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Apply class filter
    if (selectedClass !== 'all') {
      query = query.eq('class_id', selectedClass);
    }

    // Apply date filter
    const dateRange = getDateRange();
    if (dateRange) {
      query = query
        .gte('admission_date', dateRange.startDate)
        .lte('admission_date', dateRange.endDate);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching total admissions:', error);
      return;
    }

    setTotalAdmissions(count || 0);
  }

  async function fetchNewAdmissions() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);

    let query = supabase
      .from('students')
      .select('*')
      .eq('status', 'active')
      .gte('admission_date', firstDay.toISOString().split('T')[0])
      .lte('admission_date', lastDay.toISOString().split('T')[0]);

    // Apply class filter
    if (selectedClass !== 'all') {
      query = query.eq('class_id', selectedClass);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching new admissions:', error);
      return;
    }

    setNewAdmissions(data?.length || 0);
  }

  async function fetchClassWiseData() {
    // Fetch all students grouped by class
    let query = supabase
      .from('students')
      .select('class_id, classes(name)')
      .eq('status', 'active');

    // Apply class filter
    if (selectedClass !== 'all') {
      query = query.eq('class_id', selectedClass);
    }

    // Apply date filter
    const dateRange = getDateRange();
    if (dateRange) {
      query = query
        .gte('admission_date', dateRange.startDate)
        .lte('admission_date', dateRange.endDate);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Error fetching class-wise data:', error);
      return;
    }

    // Group students by class
    const classMap = new Map<string, { name: string; count: number }>();
    
    students?.forEach((student: any) => {
      if (student.classes?.name) {
        const className = student.classes.name;
        if (classMap.has(className)) {
          classMap.get(className)!.count++;
        } else {
          classMap.set(className, { name: className, count: 1 });
        }
      }
    });

    // Convert to array format for display
    const classDataArray: ClassWiseData[] = Array.from(classMap.entries()).map(([_, value]) => ({
      class: value.name,
      totalAdmissions: value.count
    }));

    setClassWiseData(classDataArray);
  }

  async function fetchStudentDetails() {
    console.log('Fetching student details...');
    // Fetch detailed student information with filters
    let query = supabase
      .from('students')
      .select('id, name, roll_number, admission_date, phone, email, parent_name, classes(name)')
      .eq('status', 'active')
      .order('admission_date', { ascending: false });

    // Apply class filter
    if (selectedClass !== 'all') {
      query = query.eq('class_id', selectedClass);
      console.log('Filtering by class:', selectedClass);
    }

    // Apply date filter
    const dateRange = getDateRange();
    if (dateRange) {
      console.log('Date range:', dateRange);
      query = query
        .gte('admission_date', dateRange.startDate)
        .lte('admission_date', dateRange.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching student details:', error);
      return;
    }

    console.log('Fetched students:', data);
    console.log('Number of students:', data?.length || 0);
    setStudentDetails(data || []);
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Admissions Report', 14, 20);
    
    // Add date and filters
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Period: ${selectedPeriod === 'custom' ? `${customStartDate} to ${customEndDate}` : selectedPeriod.replace('_', ' ')}`, 14, 37);
    doc.text(`Class: ${selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name || 'All'}`, 14, 44);
    
    // Add stats summary
    doc.setFontSize(12);
    doc.text('Summary Statistics', 14, 58);
    doc.setFontSize(10);
    doc.text(`Total Admissions: ${totalAdmissions}`, 14, 68);
    doc.text(`New Admissions (This Month): ${newAdmissions}`, 14, 75);
    
    // Add class-wise breakdown table
    const classTableData = classWiseData.map(item => [
      item.class,
      item.totalAdmissions.toString()
    ]);
    
    autoTable(doc, {
      head: [['Class', 'Total Admissions']],
      body: classTableData,
      startY: 85,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 }
    });
    
    // Add student details table
    const finalY = (doc as any).lastAutoTable.finalY || 85;
    
    doc.setFontSize(12);
    doc.text('Student Details', 14, finalY + 15);
    
    const studentTableData = studentDetails.map(student => [
      student.roll_number || 'N/A',
      student.name || 'N/A',
      (student.classes as any)?.name || 'N/A',
      student.phone || 'N/A',
      student.parent_name || 'N/A',
      student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['Roll No.', 'Student Name', 'Class', 'Phone', 'Parent Name', 'Admission Date']],
      body: studentTableData,
      startY: finalY + 20,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 35 },
        5: { cellWidth: 30 }
      }
    });
    
    // Save the PDF
    doc.save(`admissions-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Excel
  const exportToExcel = () => {
    console.log('Student Details:', studentDetails);
    console.log('Student Details Length:', studentDetails.length);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary and Class-wise breakdown
    const summaryData = [
      ['Admissions Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Period:', selectedPeriod === 'custom' ? `${customStartDate} to ${customEndDate}` : selectedPeriod.replace('_', ' ')],
      ['Class Filter:', selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name || 'All'],
      [],
      ['Summary Statistics'],
      ['Total Admissions', totalAdmissions],
      ['New Admissions (This Month)', newAdmissions],
      [],
      ['Class-wise Admission Breakdown'],
      ['Class', 'Total Admissions']
    ];
    
    // Add class-wise data
    classWiseData.forEach(item => {
      summaryData.push([item.class, item.totalAdmissions]);
    });
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Sheet 2: Student Details
    if (studentDetails && studentDetails.length > 0) {
      const studentData = [
        ['Student Details'],
        [],
        ['Roll No.', 'Student Name', 'Class', 'Phone', 'Email', 'Parent Name', 'Admission Date']
      ];
      
      studentDetails.forEach(student => {
        studentData.push([
          student.roll_number || 'N/A',
          student.name || 'N/A',
          (student.classes as any)?.name || 'N/A',
          student.phone || 'N/A',
          student.email || 'N/A',
          student.parent_name || 'N/A',
          student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'
        ]);
      });
      
      const wsStudents = XLSX.utils.aoa_to_sheet(studentData);
      wsStudents['!cols'] = [
        { wch: 12 },  // Roll No
        { wch: 25 },  // Student Name
        { wch: 15 },  // Class
        { wch: 15 },  // Phone
        { wch: 25 },  // Email
        { wch: 25 },  // Parent Name
        { wch: 15 }   // Admission Date
      ];
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Student Details');
    } else {
      // Add empty student details sheet with message
      const noDataSheet = XLSX.utils.aoa_to_sheet([
        ['No student data available for the selected filters']
      ]);
      XLSX.utils.book_append_sheet(wb, noDataSheet, 'Student Details');
    }
    
    // Save the file
    XLSX.writeFile(wb, `admissions-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const monthlyTrend = [
    { month: 'Jan', applications: 45, approved: 32 },
    { month: 'Feb', applications: 38, approved: 28 },
    { month: 'Mar', applications: 52, approved: 41 },
    { month: 'Apr', applications: 67, approved: 52 },
    { month: 'May', applications: 43, approved: 35 },
    { month: 'Jun', applications: 58, approved: 46 },
    { month: 'Jul', applications: 61, approved: 48 },
    { month: 'Aug', applications: 55, approved: 42 },
    { month: 'Sep', applications: 49, approved: 38 },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <main className="p-4 lg:p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </Button>
        </div>
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
                        <option value="custom">Custom Date</option>
                      </select>
                    </div>
                    
                    {/* Custom Date Range Inputs */}
                    {selectedPeriod === 'custom' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm min-w-[140px]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm min-w-[140px]"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                      >
                        <option value="all">All Classes</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading}>
                      <Download className="mr-2 w-4 h-4" />
                      Export PDF
                    </Button>
                    <Button size="sm" onClick={exportToExcel} disabled={loading}>
                      <FileSpreadsheet className="mr-2 w-4 h-4" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {admissionStats.map((stat, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 lg:w-12 lg:h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 text-${stat.color}-600`} />
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        stat.change.startsWith('+') ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-lg lg:text-2xl font-bold text-slate-800">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className="text-xs lg:text-sm text-slate-600">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Admission Trend - commented out */}
                {/*
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Monthly Admission Trend</h3>
                      <div className="h-48 lg:h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 lg:w-16 lg:h-16 text-blue-400 mb-2 mx-auto" />
                      <p className="text-slate-600">Monthly Trend Chart</p>
                      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>Applications</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Approved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                */}

                {/* Approval Rate by Class - commented out */}
                {/*
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Approval Rate by Class</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                      <BarChart2 className="w-12 h-12 lg:w-16 lg:h-16 text-green-400 mb-2 mx-auto" />
                      <p className="text-slate-600">Class-wise Approval Chart</p>
                      <div className="mt-4 text-sm">
                        <div className="font-semibold text-green-600">Overall Approval Rate</div>
                        <div className="text-slate-600">57.1% (89/156)</div>
                      </div>
                    </div>
                  </div>
                </div>
                */}
              </div>

              {/* Class-wise Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Class-wise Admission Breakdown</h3>
                  <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  {loading ? (
                    <div className="text-center py-8 text-slate-600">Loading data...</div>
                  ) : classWiseData.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">No admission data available</div>
                  ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Total Admissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classWiseData.map((item, index) => {
                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium text-slate-800">{item.class}</td>
                            <td className="py-3 px-4 text-slate-600">{item.totalAdmissions}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  )}
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-slate-600">Loading data...</div>
                  ) : classWiseData.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">No admission data available</div>
                  ) : (
                  <>
                  {classWiseData.map((item, index) => {
                    return (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800">{item.class}</h4>
                            <p className="text-sm text-slate-600 mt-1">Total Admissions</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">{item.totalAdmissions}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </>
                  )}
                </div>
              </div>

              {/* Key Insights & Application Sources - commented out */}
              {/*
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Key Insights</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ArrowUp className="text-blue-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Peak Application Period</h4>
                        <p className="text-sm text-slate-600">April saw the highest applications (67) with 52 approvals</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Trophy className="text-green-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Best Performing Class</h4>
                        <p className="text-sm text-slate-600">Class 9 has the highest approval rate at 83.3%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-yellow-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Attention Needed</h4>
                        <p className="text-sm text-slate-600">34 applications pending review - immediate action required</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Application Sources</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Globe className="text-blue-600 w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">Online Applications</div>
                          <div className="text-sm text-slate-600">Through website</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">89</div>
                        <div className="text-sm text-slate-600">57.1%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <User className="text-green-600 w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">Walk-in Applications</div>
                          <div className="text-sm text-slate-600">Direct visit</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">45</div>
                        <div className="text-sm text-slate-600">28.8%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users className="text-purple-600 w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">Referrals</div>
                          <div className="text-sm text-slate-600">From existing parents</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">22</div>
                        <div className="text-sm text-slate-600">14.1%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              */}
            </div>
          </main>
    </div>
  );
}

"use client"
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { User, DollarSign, Users, BookOpen, UserPlus, CalendarCheck, Coins, BarChart2, Users2, TrendingUp, Calendar, FileBarChart, Download, Eye, Share2, FileText, RefreshCw, Filter, Plus, MoreVertical } from 'lucide-react';

export default function Reports() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedReport, setSelectedReport] = useState('overview');

  const getIconComponent = (iconName: string, className?: string) => {
    const iconMap: Record<string, any> = {
      User, DollarSign, Users, BookOpen, UserPlus, CalendarCheck, Coins, BarChart2, 
      Users2, TrendingUp, Calendar, FileBarChart, Download, Eye, Share2, FileText, 
      RefreshCw, Filter, Plus, MoreVertical
    };
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  const reportStats = [
    { title: 'Total Students', value: 523, icon: 'User', color: 'blue', change: '+12' },
    { title: 'Revenue Generated', value: '₹2,45,600', icon: 'DollarSign', color: 'green', change: '+8.5%' },
    { title: 'Attendance Rate', value: '87.2%', icon: 'Users', color: 'purple', change: '+2.1%' },
    { title: 'Active Classes', value: 15, icon: 'BookOpen', color: 'orange', change: '+2' },
  ];

  const quickReports = [
    {
      title: 'Student Admissions',
      description: 'Track new admissions and application status',
      icon: 'UserPlus',
      color: 'blue',
      link: '/reports/admissions'
    },
    {
      title: 'Attendance Reports',
      description: 'Detailed attendance analysis and trends',
      icon: 'CalendarCheck',
      color: 'green',
      link: '/reports/attendance'
    },
    {
      title: 'Fee Collections',
      description: 'Revenue reports and payment analytics',
      icon: 'Coins',
      color: 'yellow',
      link: '/reports/collections'
    },
    {
      title: 'Performance Analytics',
      description: 'Student performance and academic reports',
      icon: 'BarChart2',
      color: 'purple',
      link: '/reports/performance'
    },
    {
      title: 'Staff Reports',
      description: 'Teacher performance and salary reports',
      icon: 'Users2',
      color: 'red',
      link: '/reports/staff'
    },
    {
      title: 'Financial Summary',
      description: 'Complete financial overview and projections',
      icon: 'TrendingUp',
      color: 'indigo',
      link: '/reports/financial'
    }
  ];

  const recentReports = [
    {
      id: 1,
      name: 'Monthly Fee Collection Report',
      type: 'Financial',
      generatedBy: 'Admin',
      date: '2025-09-19',
      status: 'Completed',
      size: '2.4 MB'
    },
    {
      id: 2,
      name: 'Class 10 Attendance Report',
      type: 'Attendance',
      generatedBy: 'Staff',
      date: '2025-09-18',
      status: 'Completed',
      size: '1.8 MB'
    },
    {
      id: 3,
      name: 'New Admissions Summary',
      type: 'Admissions',
      generatedBy: 'Admin',
      date: '2025-09-17',
      status: 'Completed',
      size: '985 KB'
    },
    {
      id: 4,
      name: 'Performance Analytics - Q3',
      type: 'Academic',
      generatedBy: 'Principal',
      date: '2025-09-16',
      status: 'Processing',
      size: '3.2 MB'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Processing': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
          
        <div className="flex-1 lg:ml-64">
          
          
          <main className="p-4 lg:p-6">
            <div className="space-y-6">
              {/* Filter Controls */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Report Period</label>
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
                        <option value="this_year">This Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                      <select
                        value={selectedReport}
                        onChange={(e) => setSelectedReport(e.target.value)}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                      >
                        <option value="overview">Overview</option>
                        <option value="financial">Financial</option>
                        <option value="academic">Academic</option>
                        <option value="attendance">Attendance</option>
                        <option value="admissions">Admissions</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button variant="outline" size="sm">
                      <Calendar className="mr-2 w-4 h-4" />
                      Schedule Report
                    </Button>
                    <Button size="sm">
                      <FileBarChart className="mr-2 w-4 h-4" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {reportStats.map((stat, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                        {getIconComponent(stat.icon, `text-${stat.color}-600 w-5 h-5 lg:w-6 lg:h-6`)}
                      </div>
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-lg lg:text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs lg:text-sm text-slate-600">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Quick Report Generation */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4 lg:mb-6">Quick Report Generation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {quickReports.map((report, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex flex-col items-center space-x-3">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-${report.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                          {getIconComponent(report.icon, `text-${report.color}-600 w-5 h-5 lg:w-6 lg:h-6`)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 text-center mb-1">{report.title}</h4>
                          <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                          <Button size="sm" variant="outline" className="w-full">
                            <FileBarChart className="mr-2 w-4 h-4" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Revenue Trend</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-10 h-10 lg:w-12 lg:h-12 text-green-400 mb-2 mx-auto" />
                      <p className="text-slate-600">Revenue Analytics Chart</p>
                      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>This Month: ₹2,45,600</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Student Distribution</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart2 className="w-10 h-10 lg:w-12 lg:h-12 text-blue-400 mb-2 mx-auto" />
                      <p className="text-slate-600">Student Distribution Chart</p>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">Primary</div>
                          <div className="text-slate-600">245 students</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-purple-600">Secondary</div>
                          <div className="text-slate-600">278 students</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Recent Reports</h3>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 w-4 h-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 w-4 h-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Report Name</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Generated By</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReports.map((report) => (
                        <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{report.name}</td>
                          <td className="py-3 px-4 text-slate-600">{report.type}</td>
                          <td className="py-3 px-4 text-slate-600">{report.generatedBy}</td>
                          <td className="py-3 px-4 text-slate-600">{report.date}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{report.size}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Download">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button className="p-1 hover:bg-green-100 rounded text-green-600" title="View">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1 hover:bg-purple-100 rounded text-purple-600" title="Share">
                                  <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {recentReports.map((report) => (
                    <div key={report.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800 truncate pr-2">{report.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{report.type} • {report.size}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{report.generatedBy} • {report.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-3">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                          <Download className="mr-1 w-4 h-4" />
                          Download
                        </button>
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center">
                          <Eye className="mr-1 w-4 h-4" />
                          View
                        </button>
                        <button className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center">
                          <Share2 className="mr-1 w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduled Reports */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Scheduled Reports</h3>
                  <Button size="sm">
                    <Plus className="mr-2 w-4 h-4" />
                    New Schedule
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="text-blue-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Monthly Revenue Report</h4>
                        <p className="text-sm text-slate-600">Every 1st of month • Next: Oct 1, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Active</span>
                      <button className="p-2 hover:bg-slate-100 rounded-lg">
                        <MoreVertical className="text-slate-600 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <CalendarCheck className="text-purple-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Weekly Attendance Summary</h4>
                        <p className="text-sm text-slate-600">Every Friday • Next: Sep 26, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Active</span>
                      <button className="p-2 hover:bg-slate-100 rounded-lg">
                        <MoreVertical className="text-slate-600 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

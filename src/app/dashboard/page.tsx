"use client"
import { useState, useEffect } from 'react';
// import { 
//   dashboardStats, 
//   metricCards, 
//   insights, 
//   quickActions, 
//   recentActivities, 
//   performanceCards 
// } from '../../mocks/dashboard.tsx';
import { recentPayments, upcomingFees, remainingFees } from '../../mocks/students';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import ConsecutiveLeaveMonitor from '../../components/ConsecutiveLeaveMonitor';
import { Upload, Users2, CalendarCheck, Bell, User, Wallet, Calendar } from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import Link from 'next/link';
import { FeeCollectionReport } from '../../components/fee-collection-report';
import { ActivityFeed } from '../../components/activity-feed';

interface DashboardStats {
  totalStudents: number;
  attendancePercentage: number;
  presentCount: number;
  totalAttendanceRecords: number;
  onLeaveCount: number;
  totalOutstanding: number;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRecentlyPaid, setShowRecentlyPaid] = useState(true);
  const [showUpcomingFees, setShowUpcomingFees] = useState(true);
  const [showRemainingFees, setShowRemainingFees] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    attendancePercentage: 0,
    presentCount: 0,
    totalAttendanceRecords: 0,
    onLeaveCount: 0,
    totalOutstanding: 0,
  });
  const [loading, setLoading] = useState(true);

  // Current date shown under the main title (localized)
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching dashboard stats...');
        const response = await fetch('/api/dashboard/stats');
        console.log('Response status:', response.status);
        
        const result = await response.json();
        console.log('Dashboard stats result:', result);
        
        if (result.success) {
          setStats(result.data);
        } else {
          console.error('Failed to fetch stats:', result.error);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);
  // prepare dashboard stats as an array for rendering


  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <Header 
            title="Dashboard Overview" 
            subtitle={currentDate}
            onMobileMenuToggle={() => setSidebarOpen(true)}
          />
          
          <main className="p-4 lg:p-6">
            <div className="space-y-6 lg:space-y-8">
              {/* Hero Section */}
              
              {/* Quick Actions - Horizontal Layout */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Stats & Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                  <Link
                    href="/dashboard/data-management"
                    className="p-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer whitespace-normal break-words text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-3 mx-auto">
                      <Upload className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-medium text-slate-800 mb-1 text-sm">Upload</h3>
                    <p className="text-xs text-slate-600">Bulk Data</p>
                  </Link>

                  <Link
                    href="/dashboard/students"
                    className="p-4 rounded-xl border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer whitespace-normal break-words text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3 mx-auto">
                      <Users2 className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-medium text-slate-800 mb-1 text-sm">Students</h3>
                    <p className="text-xs text-slate-600">
                      {loading ? 'Loading...' : `${stats.totalStudents} Total`}
                    </p>
                  </Link>

                  <Link
                    href="/dashboard/attendance/daily"
                    className="p-4 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer whitespace-normal break-words text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3 mx-auto">
                      <CalendarCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-slate-800 mb-1 text-sm">Attendance</h3>
                    <p className="text-xs text-slate-600">
                      {loading ? 'Loading...' : `${stats.attendancePercentage}% Today`}
                    </p>
                  </Link>

                  <Link
                    href="/dashboard/notifications"
                    className="p-4 rounded-xl border-2 border-dashed border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer whitespace-normal break-words text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-3 mx-auto">
                      <Bell className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="font-medium text-slate-800 mb-1 text-sm">Notification Reminder</h3>
                    <p className="text-xs text-slate-600">New Admission, Attendance, Fees</p>
                  </Link>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                <Link href="/dashboard/students" className="block hover:opacity-75 transition-opacity">
                  <StatsCard
                    title="Registered"
                    value={loading ? 'Loading...' : stats.totalStudents.toString()}
                    subtitle="Total Students"
                    icon={<User />}
                    iconBg="bg-blue-50"
                  />
                </Link>
                
                <Link href="/dashboard/fees" className="block hover:opacity-75 transition-opacity">
                  <StatsCard
                    title="Outstanding"
                    value={loading ? 'Loading...' : `₹${stats.totalOutstanding.toLocaleString('en-IN')}`}
                    subtitle="Total Pending"
                    icon={<Wallet />}
                    iconBg="bg-red-50"
                  />
                </Link>
                
                <Link href="/dashboard/attendance/daily" className="block hover:opacity-75 transition-opacity">
                  <StatsCard
                    title="Today's Attendance"
                    value={loading ? 'Loading...' : `${stats.presentCount}/${stats.totalAttendanceRecords}`}
                    subtitle="Click to view"
                    icon={<CalendarCheck />}
                    iconBg="bg-green-50"
                  />
                </Link>
                
                <Link href="/dashboard/attendance" className="block hover:opacity-75 transition-opacity">
                  <StatsCard
                    title="On Leave"
                    value={loading ? 'Loading...' : stats.onLeaveCount.toString()}
                    subtitle="Click to view"
                    icon={<Calendar />}
                    iconBg="bg-orange-50"
                  />
                </Link>
              </div>

              {/* Fee Management Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                {/* Recently Paid Fees */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-800">Fees Collection Report</h3>
                      <button
                        onClick={() => setShowRecentlyPaid((v) => !v)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded"
                        aria-expanded={showRecentlyPaid}
                        aria-controls="recent-payments-list"
                      >
                        {showRecentlyPaid ? 'Close' : 'Open'}
                      </button>
                    </div>
                  {showRecentlyPaid && (
                    <div id="recent-payments-list" className="space-y-3">
                     <FeeCollectionReport  />
                    </div>
                  )}
                </div>

                {/* Upcoming Fees */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-800">Recent Activities</h3>
                      <button
                        onClick={() => setShowUpcomingFees((v) => !v)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded"
                        aria-expanded={showUpcomingFees}
                        aria-controls="upcoming-fees-list"
                      >
                        {showUpcomingFees ? 'Close' : 'Open'}
                      </button>
                    </div>
                  {showUpcomingFees && (
                    <div id="upcoming-fees-list" className="space-y-3">
                     <ActivityFeed />
                    </div>
                  )}
                </div>

                {/* Remaining Fees */}
                
              </div>

              {/* Consecutive Leave Monitoring Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Attendance Alerts
                  </h3>
                  <p className="text-sm text-slate-600">
                    Monitor students at risk of suspension due to consecutive leave
                  </p>
                </div>
                <ConsecutiveLeaveMonitor />
              </div>

              

              

              

              

             
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

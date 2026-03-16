"use client"
import { useState, useEffect } from 'react';
import ConsecutiveLeaveMonitor from '../../components/ConsecutiveLeaveMonitor';
import { Upload, Users2, CalendarCheck, Bell, User, Wallet } from 'lucide-react';
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

export default function DashboardPage() {
  const [showRecentlyPaid, setShowRecentlyPaid] = useState(true);
  const [showUpcomingFees, setShowUpcomingFees] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    attendancePercentage: 0,
    presentCount: 0,
    totalAttendanceRecords: 0,
    onLeaveCount: 0,
    totalOutstanding: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        const result = await response.json();
        if (result.success) setStats(result.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Quick Stats & Actions */}
      <div>
        <p style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10
        }}>
          Quick Stats &amp; Actions
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link href="/dashboard/data-management"
            className="p-4 rounded-2xl border-dashed border border-indigo-200 bg-white shadow-sm transition-all text-center active:scale-95">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-2 mx-auto">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-[13px]">Upload</h3>
            <p className="text-[10px] text-slate-500">Bulk Data</p>
          </Link>

          <Link href="/dashboard/students"
            className="p-4 rounded-2xl border-dashed border border-emerald-200 bg-white shadow-sm transition-all text-center active:scale-95">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-2 mx-auto">
              <Users2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-[13px]">Students</h3>
            <p className="text-[10px] text-slate-500">{loading ? '...' : `${stats.totalStudents} Total`}</p>
          </Link>

          <Link href="/dashboard/attendance/daily"
            className="p-4 rounded-2xl border-dashed border border-purple-200 bg-white shadow-sm transition-all text-center active:scale-95">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-2 mx-auto">
              <CalendarCheck className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-[13px]">Attendance</h3>
            <p className="text-[10px] text-slate-500">{loading ? '...' : `${stats.attendancePercentage}% Today`}</p>
          </Link>

          <Link href="/dashboard/notifications"
            className="p-4 rounded-2xl border-dashed border border-orange-200 bg-white shadow-sm transition-all text-center active:scale-95">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-2 mx-auto">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-[13px]">Reminder</h3>
            <p className="text-[10px] text-slate-500">New Admission</p>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
        <Link href="/dashboard/students" className="block active:scale-95 transition-transform">
          <StatsCard title="Registered" value={loading ? '...' : stats.totalStudents.toString()} subtitle="Total Students" icon={<User className="w-5 h-5 text-indigo-600" />} iconBg="bg-indigo-50" />
        </Link>
        <Link href="/dashboard/fees" className="block active:scale-95 transition-transform">
          <StatsCard title="Outstanding" value={loading ? '...' : `₹${stats.totalOutstanding.toLocaleString('en-IN')}`} subtitle="Total Pending" icon={<Wallet className="w-5 h-5 text-rose-600" />} iconBg="bg-rose-50" />
        </Link>
        <Link href="/dashboard/attendance/daily" className="block active:scale-95 transition-transform">
          <StatsCard title="Today's Attendance" value={loading ? '...' : `${stats.presentCount}/${stats.totalAttendanceRecords}`} subtitle="Click to view" icon={<CalendarCheck className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50" />
        </Link>
      </div>

      {/* Fee Collection Report */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-slate-800">Fees Collection Report</h3>
          <button onClick={() => setShowRecentlyPaid((v) => !v)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded">
            {showRecentlyPaid ? 'Close' : 'Open'}
          </button>
        </div>
        {showRecentlyPaid && <FeeCollectionReport />}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-slate-800">Recent Activities</h3>
          <button onClick={() => setShowUpcomingFees((v) => !v)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded">
            {showUpcomingFees ? 'Close' : 'Open'}
          </button>
        </div>
        {showUpcomingFees && <ActivityFeed />}
      </div>

      {/* Attendance Alerts */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="mb-3">
          <h3 className="text-[15px] font-bold text-slate-800 mb-0.5">Attendance Alerts</h3>
          <p className="text-xs text-slate-500">Monitor students at risk due to consecutive leave</p>
        </div>
        <ConsecutiveLeaveMonitor />
      </div>

    </div>
  );
}

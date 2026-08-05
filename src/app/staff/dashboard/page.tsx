'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users2, CalendarCheck, UserPlus, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import RoleGuard from '../../../components/RoleGuard';
import DashboardLayout from '../../dashboard/layout';
import StatsCard from '../../../components/StatsCard';

interface StaffStats {
  totalStudents: number;
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
}

interface RecentStudent {
  id: string;
  name: string;
  roll_number: string;
  admission_date: string;
  classes?: { name: string };
  status: string;
}

export default function StaffDashboardPage() {
  const [stats, setStats] = useState<StaffStats>({
    totalStudents: 0,
    attendancePercentage: 0,
    presentCount: 0,
    absentCount: 0,
  });
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch dashboard stats & recent admissions
        const [statsRes, studentsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/students?limit=5')
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success && statsData.data) {
            const d = statsData.data;
            const totalRecs = d.totalAttendanceRecords || 0;
            const present = d.presentCount || 0;
            const absent = Math.max(totalRecs - present, 0);
            setStats({
              totalStudents: d.totalStudents || 0,
              attendancePercentage: d.attendancePercentage || 0,
              presentCount: present,
              absentCount: absent,
            });
          }
        }

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          if (studentsData.students) {
            setRecentStudents(studentsData.students.slice(0, 5));
          }
        }
      } catch (err) {
        console.error('Error loading staff dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <RoleGuard allowedRoles={['staff', 'teacher', 'admin', 'super_admin']}>
      <DashboardLayout>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold mb-1">Staff Portal — Attendance</h2>
              <p className="text-purple-100 text-sm font-medium max-w-xl">
                Welcome back! Record daily student attendance and track class attendance stats.
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 px-1">
              Attendance Actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/dashboard/attendance/daily"
                className="p-5 rounded-2xl border border-purple-200 bg-white hover:border-purple-400 hover:shadow-md transition-all flex items-center space-x-4 group active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base group-hover:text-purple-600 transition-colors">Mark Daily Attendance</h3>
                  <p className="text-xs text-slate-500 font-medium">Record present/absent entries by class</p>
                </div>
              </Link>

              <Link
                href="/dashboard/attendance"
                className="p-5 rounded-2xl border border-blue-200 bg-white hover:border-blue-400 hover:shadow-md transition-all flex items-center space-x-4 group active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base group-hover:text-blue-600 transition-colors">Attendance Overview</h3>
                  <p className="text-xs text-slate-500 font-medium">View monthly calendar & summary stats</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 px-1">
              Today's Attendance Stats
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                title="Today's Attendance"
                value={loading ? '...' : `${stats.attendancePercentage}%`}
                subtitle="Overall Attendance Rate"
                icon={<CalendarCheck className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-50"
              />

              <StatsCard
                title="Present Today"
                value={loading ? '...' : stats.presentCount.toString()}
                subtitle="Students Marked Present"
                icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-50"
              />

              <StatsCard
                title="Absent Today"
                value={loading ? '...' : stats.absentCount.toString()}
                subtitle="Students Marked Absent"
                icon={<XCircle className="w-5 h-5 text-rose-600" />}
                iconBg="bg-rose-50"
              />

              <StatsCard
                title="Total Enrolled"
                value={loading ? '...' : stats.totalStudents.toString()}
                subtitle="Active Students"
                icon={<Users2 className="w-5 h-5 text-indigo-600" />}
                iconBg="bg-indigo-50"
              />
            </div>
          </div>

          {/* Attendance Action Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Ready to take today's attendance?</h3>
              <p className="text-sm text-slate-500">Select your class and record daily attendance entries in seconds.</p>
            </div>
            <Link
              href="/dashboard/attendance/daily"
              className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-purple-500/20 transition-all shrink-0 active:scale-95 text-sm"
            >
              <span>Take Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}

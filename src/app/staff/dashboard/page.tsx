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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold mb-1">Staff Dashboard</h2>
              <p className="text-blue-100 text-sm font-medium max-w-xl">
                Welcome back! Manage student admissions, search records, and mark daily attendance cleanly.
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 px-1">
              Quick Actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/dashboard/admissions/new"
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all flex items-center space-x-3 group active:scale-95"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">Add Student</h3>
                  <p className="text-xs text-slate-500">Register new admission</p>
                </div>
              </Link>

              <Link
                href="/dashboard/attendance/daily"
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md transition-all flex items-center space-x-3 group active:scale-95"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">Mark Attendance</h3>
                  <p className="text-xs text-slate-500">Record daily entries</p>
                </div>
              </Link>

              <Link
                href="/dashboard/students"
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex items-center space-x-3 group active:scale-95"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Users2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">View Students</h3>
                  <p className="text-xs text-slate-500">Search & filter list</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 px-1">
              Overview Metrics
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                title="Total Active"
                value={loading ? '...' : stats.totalStudents.toString()}
                subtitle="Students Enrolled"
                icon={<Users2 className="w-5 h-5 text-indigo-600" />}
                iconBg="bg-indigo-50"
              />

              <StatsCard
                title="Today's Attendance"
                value={loading ? '...' : `${stats.attendancePercentage}%`}
                subtitle="Attendance Rate"
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
            </div>
          </div>

          {/* Recent Admissions */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Recent Admissions</h3>
                <p className="text-xs text-slate-500">Newly registered students in the system</p>
              </div>
              <Link
                href="/dashboard/students"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading recent admissions...</div>
            ) : recentStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No recent admissions found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-bold">
                      <th className="pb-3 px-2">Student Name</th>
                      <th className="pb-3 px-2">Roll No.</th>
                      <th className="pb-3 px-2">Class</th>
                      <th className="pb-3 px-2">Admission Date</th>
                      <th className="pb-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-2 font-semibold text-slate-800">{st.name}</td>
                        <td className="py-3 px-2 font-mono text-xs text-slate-600">{st.roll_number || 'N/A'}</td>
                        <td className="py-3 px-2 text-slate-600">{st.classes?.name || 'Unassigned'}</td>
                        <td className="py-3 px-2 text-slate-500 text-xs">
                          {st.admission_date ? new Date(st.admission_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Link
                            href={`/dashboard/students/details?id=${st.id}`}
                            className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span>Details</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}

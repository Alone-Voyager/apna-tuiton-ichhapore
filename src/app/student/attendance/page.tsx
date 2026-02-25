'use client';

import { useState, useEffect } from 'react';
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dot: string }> = {
    Present: { label: 'Present', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' },
    Absent: { label: 'Absent', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle, dot: 'bg-red-500' },
    Late: { label: 'Late', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock, dot: 'bg-amber-500' },
    'Half Day': { label: 'Half Day', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Clock, dot: 'bg-blue-500' },
    Leave: { label: 'Leave', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: AlertTriangle, dot: 'bg-purple-500' },
};

export default function StudentAttendancePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        setLoading(true);
        fetch(`/api/student/attendance?month=${currentMonth}`)
            .then(r => r.json())
            .then(d => { if (d.success) setData(d.data); })
            .finally(() => setLoading(false));
    }, [currentMonth]);

    const prevMonth = () => {
        const [y, m] = currentMonth.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };
    const nextMonth = () => {
        const [y, m] = currentMonth.split('-').map(Number);
        const d = new Date(y, m, 1);
        const now = new Date();
        if (d <= now) setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const monthLabel = new Date(currentMonth + '-15').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const summary = data?.summary;

    // Build calendar grid
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const recordMap = new Map<string, any>(
        (data?.records ?? []).map((r: any) => [r.attendance_date.split('T')[0], r])
    );

    return (
        <div className="w-full max-w-5xl mx-auto md:p-8 p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100/50">
                        <CalendarCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    My Attendance
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide">Track your daily attendance and percentage</p>
            </div>

            {/* Summary Cards */}
            {!loading && summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Total Days', value: summary.total, color: 'from-slate-50 to-slate-100/50 border-slate-100 text-slate-800 label-slate-500' },
                        { label: 'Present', value: summary.present, color: 'from-emerald-50 to-emerald-100/50 border-emerald-100 text-emerald-800 label-emerald-600' },
                        { label: 'Absent', value: summary.absent, color: 'from-red-50 to-red-100/50 border-red-100 text-red-800 label-red-600' },
                        { label: 'Late', value: summary.late, color: 'from-amber-50 to-amber-100/50 border-amber-100 text-amber-800 label-amber-600' },
                        { label: 'Leave', value: summary.leave, color: 'from-purple-50 to-purple-100/50 border-purple-100 text-purple-800 label-purple-600' },
                    ].map(s => {
                        const [bgFrom, bgTo, border, text, label] = s.color.split(' ');
                        return (
                            <div key={s.label} className={`bg-gradient-to-br ${bgFrom} ${bgTo} border ${border} p-5 rounded-[20px] shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow`}>
                                <p className={`text-3xl font-black tracking-tighter ${text.replace('text-', 'text-')}`}>{s.value}</p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${label.replace('label-', 'text-')}`}>{s.label}</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Percentage Banner */}
            {!loading && summary && (
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100" />
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (summary.percentage / 100) * 251.2}
                                className={`transition-all duration-1000 ${summary.percentage >= 75 ? 'text-emerald-500' : 'text-red-500'}`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute text-xl font-black text-slate-800 tracking-tighter">{summary.percentage}%</span>
                    </div>
                    <div className="flex-1 w-full text-center md:text-left">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Attendance Rate</h3>
                        <p className={`text-sm font-semibold mt-1 mb-3 ${summary.percentage >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {summary.percentage >= 75 ? 'Excellent attendance! You are above the 75% requirement.' : 'Action required! You are below the 75% minimum requirement.'}
                        </p>
                        <div className="h-2.5 bg-slate-100 rounded-full w-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${summary.percentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(summary.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">{monthLabel}</h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <button onClick={nextMonth} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="animate-pulse grid grid-cols-7 gap-2">
                        {[...Array(35)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 py-2">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(firstDay)].map((_, i) => <div key={`empty-${i}`} />)}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                                const record = recordMap.get(dateStr);
                                const cfg = record ? STATUS_CONFIG[record.status] : null;
                                const isToday = dateStr === new Date().toISOString().split('T')[0];
                                return (
                                    <div
                                        key={day}
                                        className={`h-12 md:h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 relative
                                        ${cfg ? `border ${cfg.color} shadow-sm` : 'text-slate-500 bg-slate-50 border border-transparent'}
                                        ${isToday && !cfg ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                        title={record ? `${record.status}${record.notes ? ': ' + record.notes : ''}` : ''}
                                    >
                                        {cfg && <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />}
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Legend */}
                <div className="mt-8 flex flex-wrap gap-3">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Records List */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Daily Records</h2>
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />)}
                    </div>
                ) : (data?.records ?? []).length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="absolute w-64 h-64 bg-slate-100 rounded-full blur-3xl opacity-50 z-0"></div>
                        <div className="w-16 h-16 bg-white text-slate-300 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-slate-100 relative z-10">
                            <CalendarCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight relative z-10">No Records Found</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1 relative z-10">Attendance entries for this month will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(data?.records ?? []).map((r: any) => {
                            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.Absent;
                            const Icon = cfg.icon;
                            const date = new Date(r.attendance_date).toLocaleDateString('en-IN', {
                                weekday: 'long', day: 'numeric', month: 'long'
                            });
                            return (
                                <div key={r.id} className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.color} transition-all hover:shadow-sm`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-current opacity-80 shrink-0`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold tracking-tight mb-0.5">{date}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{r.status}</span>
                                            {r.check_in_time && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{r.check_in_time}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

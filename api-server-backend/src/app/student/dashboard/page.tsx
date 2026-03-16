'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { MapPin, Calendar as CalIcon, Filter, X, Menu, GraduationCap, Clock, CheckCircle2, ChevronRight, Minus, Bell, Settings, Wallet, BookOpen, Clipboard, Book, Briefcase, StickyNote, MessageSquare, User, PenBox, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp, Trophy, Activity, CreditCard, LayoutDashboard, Lightbulb } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDashboard() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [fees, setFees] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any>(null);

    const [expandedTest, setExpandedTest] = useState<string | null>(null);
    const [testFilterOpen, setTestFilterOpen] = useState(false);
    const [graphTab, setGraphTab] = useState<'Marks' | 'Rank'>('Marks');
    const [attExpanded, setAttExpanded] = useState(false);
    const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [pRes, tRes, fRes, aRes, attRes] = await Promise.all([
                    fetch('/api/student/profile'),
                    fetch('/api/student/tests'),
                    fetch('/api/student/fees'),
                    fetch('/api/student/assignments'),
                    fetch('/api/student/attendance')
                ]);

                const pData = await pRes.json();
                const tData = await tRes.json();
                const fData = await fRes.json();
                const aData = await aRes.json();
                const attData = attRes.ok ? await attRes.json() : null;

                if (pData.success) setProfile(pData.data.students);
                if (tData.success) setTests(tData.data.results || []);
                if (fData.success) setFees(fData.data);
                if (aData.success) setAssignments(aData.data.assignments || []);
                if (attData && attData.success) setAttendance(attData.data.summary);

            } catch (err) { }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="p-8 h-screen flex flex-col items-center justify-center animate-pulse bg-white"><div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4"></div><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Dashboard</p></div>;
    
    if (!profile) return (
        <div className="p-8 h-screen flex flex-col items-center justify-center bg-white text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h2>
            <p className="text-sm text-slate-500 mb-6 px-4">We couldn't load your dashboard. Please check your internet connection or try logging in again.</p>
            <button 
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform"
            >
                Retry
            </button>
        </div>
    );

    // Derived Metrics
    let avgTest = 0;
    let rank = 1;
    let prevAvgTest = 0;
    if (tests.length > 0) {
        avgTest = tests.reduce((acc, t) => acc + (t.percentage || 0), 0) / tests.length;
        rank = tests[0].rank || 1;
        if (tests.length > 1) {
            prevAvgTest = tests.slice(1).reduce((acc, t) => acc + (t.percentage || 0), 0) / (tests.length - 1);
        } else {
            prevAvgTest = avgTest;
        }
    }
    const overallImprovement = avgTest - prevAvgTest;
    const attPerc = attendance?.percentage ?? profile?.attendance_rate ?? 0;
    const hasOverdue = fees?.summary?.totalOverdue > 0;
    const hasPending = fees?.summary?.totalPending > 0;
    const feeStatus = hasOverdue ? 'overdue' : hasPending ? 'due' : 'paid';

    // Graph Data
    const graphData = [...tests].reverse().map(t => ({
        name: new Date(t.tests?.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        marks: t.percentage || 0,
        rank: t.rank || 0
    }));

    // Weak Areas Calculation
    let weakTopics: string[] = [];
    let strongTopics: string[] = [];
    let remarks = "";
    let improvementPlan = "";
    if (tests.length > 0) {
        const latest = tests[0];
        if (latest.weak_topics) weakTopics = latest.weak_topics.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (latest.strong_areas) strongTopics = latest.strong_areas.split(',').map((s: string) => s.trim()).filter(Boolean);
        remarks = latest.remarks || latest.teacher_suggestions || "";
        improvementPlan = latest.improvement_plan || "";
    }


        return (
        <div className="w-full bg-[#F8F9FB] min-h-full pb-36">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-[#F8F9FB]/80 backdrop-blur-md border-b border-slate-100/50">
                <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] bg-[#6C5CE7] rounded-full flex items-center justify-center text-white text-[16px] font-bold shadow-md shadow-indigo-200/60 shrink-0">
                        {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'ST'}
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-[#1E293B] leading-tight">Hi, {profile?.name || 'Student'} 👋</h1>
                        <p className="text-[10px] text-[#94A3B8] font-medium tracking-wide mt-0.5">Class {profile?.classes?.name || '--'} · Batch {profile?.batch || '--'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100/80 hover:bg-slate-50 transition-colors">
                        <Bell className="w-[14px] h-[14px] text-[#64748B] stroke-[2]" />
                    </button>
                    <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100/80 hover:bg-slate-50 transition-colors">
                        <Settings className="w-[14px] h-[14px] text-[#64748B] stroke-[2]" />
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div className="space-y-0">
                {/* Stats Cards — Compact 2×2 Grid */}
                <div className="px-5 grid grid-cols-2 gap-3 mt-3">
                {/* Overall Performance */}
                <div className="bg-gradient-to-br from-[#8B7CF6] to-[#A78BFA] rounded-[20px] px-4 py-[14px] text-white shadow-md shadow-purple-100/60 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Overall Performance</p>
                    <p className="text-[28px] font-extrabold tracking-tight leading-none">{Math.round(avgTest)}%</p>
                    <div className="h-[5px] bg-white/25 rounded-full overflow-hidden w-full mt-1">
                        <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${Math.round(avgTest)}%` }} />
                    </div>
                </div>

                {/* Batch Rank */}
                <div className="bg-gradient-to-br from-[#34D399] to-[#6EE7B7] rounded-[20px] px-4 py-[14px] text-white shadow-md shadow-emerald-100/60 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Batch Rank</p>
                    <p className="text-[28px] font-extrabold tracking-tight leading-none">{rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}</p>
                    <div className="flex bg-white/20 rounded-full px-2 py-[3px] items-center w-fit mt-1">
                        <span className="text-[8px] font-bold text-white tracking-widest uppercase">Class Rank</span>
                    </div>
                </div>

                {/* Attendance */}
                <div className="bg-gradient-to-br from-[#FB923C] to-[#FDBA74] rounded-[20px] px-4 py-[14px] text-white shadow-md shadow-orange-100/60 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Attendance</p>
                    <p className="text-[28px] font-extrabold tracking-tight leading-none">{Math.round(attPerc)}%</p>
                    <span className="text-[9px] font-medium text-white/80 tracking-wide mt-1">Good Standing</span>
                </div>

                {/* Fee Status */}
                <div className="bg-gradient-to-br from-[#60A5FA] to-[#93C5FD] rounded-[20px] px-4 py-[14px] text-white shadow-md shadow-blue-100/60 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Fee Status</p>
                    <p className="text-[28px] font-extrabold tracking-tight leading-none capitalize">{feeStatus}</p>
                    <span className="text-[9px] font-medium text-white/80 tracking-wide italic mt-1">
                        {fees?.fees?.[0]?.receipt_number ? `Receipt #${fees.fees[0].receipt_number}` : 'Latest Status'}
                    </span>
                </div>
            </div>

            {/* Quick Access */}
            <div className="px-5 mt-5">
                <h2 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.12em] mb-4 ml-1">Quick Access</h2>
                <div className="grid grid-cols-4 gap-x-0 gap-y-5">
                    {[
                        { icon: User, label: 'Profile', text: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF]', href: '/student/profile' },
                        { icon: CalIcon, label: 'Attendance', text: 'text-[#A855F7]', bg: 'bg-[#FAF5FF]', href: '/student/attendance' },
                        { icon: Clipboard, label: 'Assignments', text: 'text-[#10B981]', bg: 'bg-[#ECFDF5]', href: '/student/assignments' },
                        { icon: BookOpen, label: 'Homework', text: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]', href: '/student/assignments' },
                        { icon: Briefcase, label: 'Classwork', text: 'text-[#EF4444]', bg: 'bg-[#FEF2F2]', href: '#' },
                        { icon: PenBox, label: 'Notes', text: 'text-[#06B6D4]', bg: 'bg-[#ECFEFF]', href: '#' },
                        { icon: Book, label: 'Syllabus', text: 'text-[#F97316]', bg: 'bg-[#FFF7ED]', href: '#' },
                        { icon: MessageSquare, label: 'Circular', text: 'text-[#6366F1]', bg: 'bg-[#EEF2FF]', href: '#' },
                    ].map((item, idx) => (
                        <Link 
                            key={idx} 
                            href={item.href} 
                            onClick={(e) => {
                                if (item.href === '#') {
                                    e.preventDefault();
                                    alert('Coming soon!');
                                }
                            }}
                            className="flex flex-col items-center gap-[6px] active:scale-95 transition-transform"
                        >
                            <div className={`w-[50px] h-[50px] rounded-[18px] flex items-center justify-center ${item.bg} shadow-sm`}>
                                <item.icon className={`w-[20px] h-[20px] stroke-[2] ${item.text}`} />
                            </div>
                            <span className="text-[9px] font-semibold text-[#475569] tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Academic Trend */}
            <div className="px-5 mt-7">
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100/60">
                    <div className="flex items-center justify-between mb-8 pl-1">
                        <h2 className="text-[15px] font-bold text-slate-900">Academic Trend</h2>
                        <div className="flex bg-[#F8F9FA] rounded-[10px] p-1 border border-slate-100/50">
                            <button onClick={() => setGraphTab('Marks')} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${graphTab === 'Marks' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Marks</button>
                            <button onClick={() => setGraphTab('Rank')} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${graphTab === 'Rank' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Rank</button>
                        </div>
                    </div>
                    {graphData.length > 0 ? (
                        <div className="h-44 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={graphData} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6C45F4" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="#6C45F4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#A3ADC2', fontWeight: 600 }} dy={10} />
                                    <Tooltip
                                        cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px' }}
                                        labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey={graphTab === 'Marks' ? 'marks' : 'rank'}
                                        stroke="#6C45F4"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        activeDot={{ r: 4, fill: '#6C45F4', stroke: '#fff', strokeWidth: 2 }}
                                        dot={{ r: 2, fill: '#fff', stroke: '#6C45F4', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Trend Data Found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Focus Framework */}
            <div className="px-5 mt-5">
                <div className="bg-[#F6F7FF] rounded-[24px] p-5 border border-[#EEF0FF]">
                    <div className="flex items-center gap-3 mb-5 pl-1">
                        <div className="w-10 h-10 bg-[#4F3FF0] rounded-[14px] flex items-center justify-center shrink-0">
                            <Lightbulb className="w-[18px] h-[18px] text-white stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-[#1F2937] leading-tight">Focus Framework</h2>
                            <p className="text-[10px] font-medium text-[#4F3FF0] tracking-wide mt-0.5">AI-driven study insights</p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-[24px] p-4 flex items-center shadow-[0_4px_20px_-10px_rgba(79,63,240,0.1)] gap-3 border border-[#F2F4F7]/60">
                        <p className="flex-1 text-[11px] text-slate-700 leading-relaxed font-medium">
                            {weakTopics.length > 0 ? (
                                <>Your recent performance needs attention.<br/><span className="font-bold text-[#4F3FF0] capitalize">Focus on {weakTopics[0]}</span> this week.</>
                            ) : (
                                <>You are showing great progress.<br/><span className="font-bold text-[#4F3FF0] capitalize">Keep up the good work!</span></>
                            )}
                        </p>
                        <button className="bg-[#4F3FF0] text-white px-3.5 py-3 rounded-[14px] text-[10px] font-bold shrink-0 shadow-md shadow-indigo-200/50 active:scale-95 transition-transform leading-tight">
                            Start<br/>Practice
                        </button>
                    </div>
                </div>
            </div>

            {/* Presence Track */}
            <div className="px-5 mt-5">
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100/60 relative">
                    <h2 className="text-[15px] font-bold text-slate-900 tracking-tight mb-5 pl-1">Presence Track</h2>
                    
                    <div className="flex items-center justify-between gap-6 pl-1 pr-2">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="41" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                                <circle cx="50" cy="50" r="41" stroke="#00C9A7" strokeWidth="8" fill="none" strokeLinecap="round"
                                    strokeDasharray={257}
                                    strokeDashoffset={257 - (attPerc / 100) * 257}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                                <span className="text-[22px] font-black text-slate-900 tracking-tighter leading-none">{Math.round(attPerc)}%</span>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center gap-3.5 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-[7px] h-[7px] rounded-full bg-[#00C9A7]" />
                                    <span className="text-[11px] font-medium text-slate-500 tracking-wide">Present</span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-900">{attendance?.present ?? 0} Days</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-[7px] h-[7px] rounded-full bg-[#FF4560]" />
                                    <span className="text-[11px] font-medium text-slate-500 tracking-wide">Absent</span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-900">{attendance?.absent ?? 0} Days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Test Results */}
            <div className="px-5 mt-6 mb-4">
                <div className="flex items-center justify-between mb-5 pl-1 pr-1 border-b border-transparent">
                    <h2 className="text-[16px] font-bold text-[#1F2937] tracking-tight">Recent Test Results</h2>
                    <Link href="/student/tests" className="text-[11px] font-bold text-[#4F3FF0] pr-1">View All</Link>
                </div>
                <div className="space-y-4">
                    {/* Display actual results or fallback directly to match exactly the mock if empty */}
                    {tests.length > 0 ? tests.slice(0, 2).map((t, idx) => (
                        <div key={t.id} className="bg-white rounded-[28px] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]
                                ${idx === 0 ? 'bg-[#EEF1FF] text-[#4F3FF0]' : 'bg-[#FFF0F2] text-[#F12B47]'}`}>
                                {t.tests?.subject?.substring(0, 2) || 'TE'}
                            </div>
                            <div className="flex-1 min-w-0 pr-2 pb-1">
                                <p className="font-bold text-[#1F2937] text-[13px] leading-tight mb-[3px] truncate">{t.tests?.test_name || 'Test'}</p>
                                <p className="text-[9px] text-[#9CA3AF] font-medium">Completed on {new Date(t.tests?.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                            </div>
                            <div className="text-right shrink-0 pt-0.5 pr-1">
                                <p className="text-[13px] font-bold text-[#1F2937] tracking-tight leading-none mb-1.5">{t.marks_obtained}/{t.tests?.total_marks}</p>
                                <p className={`text-[8px] font-bold mt-1 uppercase text-[#00C9A7]`}>
                                    {t.percentage >= 90 ? 'Excellent' : t.percentage >= 75 ? 'Good' : 'Needs Improvement'}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-6">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No recent tests found</p>
                        </div>
                    )}
                </div>
            </div>

            </div>
        </div>
    );

}

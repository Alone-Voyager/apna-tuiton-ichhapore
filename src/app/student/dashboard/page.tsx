'use client';

import { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronUp, AlertCircle, TrendingUp, TrendingDown,
    MapPin, Calendar as CalIcon, Filter, X, Menu, GraduationCap, Clock, CheckCircle2, ChevronRight, Minus, Bell, Settings, Wallet, BookOpen
} from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
                if (attData && attData.success) setAttendance(attData.summary);

            } catch (err) { }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="p-8 h-screen flex flex-col items-center justify-center animate-pulse"><div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4"></div><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Dashboard</p></div>;
    if (!profile) return null;

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
    const attPerc = attendance?.attendancePercentage || profile.attendance_rate || 0;
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

    // Progress Wheel Helper
    const ProgressWheel = ({ val, color, size = 64, stroke = 5 }: { val: number, color: string, size?: number, stroke?: number }) => {
        const rad = (size - stroke) / 2;
        const circ = 2 * Math.PI * rad;
        const off = circ - (val / 100) * circ;
        return (
            <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle cx={size / 2} cy={size / 2} r={rad} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-white/40" />
                    <circle cx={size / 2} cy={size / 2} r={rad} stroke="currentColor" strokeWidth={stroke} fill="none" strokeDasharray={circ} strokeDashoffset={off} className={`transition-all duration-1000 ${color}`} strokeLinecap="round" />
                </svg>
                <span className="absolute text-sm font-black text-slate-800">{Math.round(val)}%</span>
            </div>
        )
    };

    return (
        <div className="w-full max-w-7xl mx-auto md:p-6 lg:p-8">

            {/* HERO & NOTIFICATIONS */}
            <header className="bg-gradient-to-br from-indigo-50 to-purple-50 md:rounded-[2rem] p-6 pt-12 md:pt-8 md:p-10 shadow-sm border border-white/60 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-300/20 to-teal-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-[1.25rem] shadow-lg shadow-indigo-100 flex items-center justify-center overflow-hidden border border-white p-1 shrink-0">
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <span className="text-white text-2xl font-black uppercase">{profile.name.substring(0, 2)}</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Hi, {profile.name} 👋</h1>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1 bg-white/60 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 shadow-sm border border-white">{profile.classes?.name || 'Class'}</span>
                                <span className="px-3 py-1 bg-white/60 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 shadow-sm border border-white">{profile.batch || 'Batch'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-indigo-600 transition-colors border border-white"><Bell className="w-5 h-5" /></button>
                        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-indigo-600 transition-colors border border-white"><Settings className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* 2x2 PERFORMANCE SUB-GRID (Mobile + Desktop Horizontal Line) */}
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 md:mt-12">
                    {/* Overall Avg */}
                    <div className="bg-white/80 backdrop-blur-lg border border-white rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <ProgressWheel val={avgTest} color="text-indigo-500" size={56} stroke={5} />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Overall %</p>
                            <div className="flex items-center gap-1.5">
                                {overallImprovement !== 0 && (
                                    overallImprovement > 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                )}
                                <span className="text-[10px] font-bold text-slate-500">{Math.abs(overallImprovement).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Rank */}
                    <div className="bg-white/80 backdrop-blur-lg border border-white rounded-3xl p-4 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 text-amber-500/10 opacity-50 transform translate-x-1/4 translate-y-1/4"><TrendingUp className="w-24 h-24" /></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch Rank</p>
                        <span className="text-3xl font-black text-slate-800 tracking-tighter">#{rank}</span>
                    </div>

                    {/* Attendance */}
                    <div className="bg-white/80 backdrop-blur-lg border border-white rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <ProgressWheel val={attPerc} color="text-emerald-500" size={56} stroke={5} />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Presence</p>
                        </div>
                    </div>

                    {/* Fees */}
                    <div className="bg-white/80 backdrop-blur-lg border border-white rounded-3xl p-4 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fee Status</p>
                        <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                ${feeStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : feeStatus === 'overdue' ? 'bg-red-100 text-red-700 shadow-sm shadow-red-500/20' : 'bg-amber-100 text-amber-700'}`}>
                                {feeStatus === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                                {feeStatus === 'overdue' && <AlertCircle className="w-3 h-3" />}
                                {feeStatus === 'due' && <Clock className="w-3 h-3" />}
                                {feeStatus}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* DESKTOP 2-COLUMN LAYOUT WRAPPER / MOBILE STACK */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 px-4 md:px-0">

                {/* ---------- LEFT COLUMN (Trend & Academics) ---------- */}
                <div className="md:col-span-7 space-y-8">

                    {/* Performance Trend */}
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" /> Auto-Analytics Trend
                            </h2>
                            <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 self-start sm:self-auto">
                                <button onClick={() => setGraphTab('Marks')} className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${graphTab === 'Marks' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Marks</button>
                                <button onClick={() => setGraphTab('Rank')} className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${graphTab === 'Rank' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Rank</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            {graphData.length > 0 ? (
                                <>
                                    <div className="h-48 w-full mb-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                                <Tooltip
                                                    cursor={{ stroke: '#f1f5f9', strokeWidth: 3 }}
                                                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                    labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}
                                                    itemStyle={{ fontSize: '14px', fontWeight: '900' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey={graphTab === 'Marks' ? 'marks' : 'rank'}
                                                    stroke={graphTab === 'Marks' ? 'url(#colorP)' : '#f59e0b'}
                                                    strokeWidth={4}
                                                    dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                                                    activeDot={{ r: 7, strokeWidth: 0, fill: graphTab === 'Marks' ? '#6366f1' : '#f59e0b' }}
                                                    animationDuration={1500}
                                                />
                                                <defs>
                                                    <linearGradient id="colorP" x1="0" y1="0" x2="1" y2="0">
                                                        <stop offset="0%" stopColor="#818cf8" />
                                                        <stop offset="100%" stopColor="#c084fc" />
                                                    </linearGradient>
                                                </defs>
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="bg-indigo-50/50 rounded-2xl p-4 flex gap-3 items-start border border-indigo-100/50">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-600 leading-relaxed mt-1">
                                            {graphData.length >= 2
                                                ? (graphData[graphData.length - 1].marks > graphData[graphData.length - 2].marks ? 'Performance is improving compared to the last test! Keep up the momentum.' : 'A slight stall in recent evaluations. Action plan focus recommended.')
                                                : 'Taking more tests will help generate richer analytics.'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10">
                                    <Minus className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Trend Data Found</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Academic Performance Cards */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Recent Tests</h2>
                            <button onClick={() => setTestFilterOpen(true)} className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100 hover:text-indigo-600 hover:border-indigo-100 transition-colors">
                                <Filter className="w-3 h-3" /> Filter
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {tests.slice(0, 4).map((t, idx) => {
                                const pct = t.percentage || 0;
                                const imp = t.improvement !== undefined ? t.improvement : null;
                                const isExpanded = expandedTest === t.id;
                                const getGradeColor = (p: number) => {
                                    if (p >= 80) return 'text-emerald-700 bg-emerald-50';
                                    if (p >= 60) return 'text-amber-700 bg-amber-50';
                                    return 'text-red-700 bg-red-50';
                                };
                                const GradeStyle = getGradeColor(pct);

                                return (
                                    <div key={t.id} className={`bg-white rounded-3xl border ${isExpanded ? 'border-indigo-100 shadow-md ring-4 ring-indigo-50/50' : 'border-slate-100 shadow-sm'} p-5 cursor-pointer transition-all duration-300`} onClick={() => setExpandedTest(isExpanded ? null : t.id)}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${GradeStyle} shadow-sm`}>
                                                    <span className="font-black text-sm">{pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D'}</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm leading-tight mb-1">{t.tests?.test_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">{t.tests?.subject}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(t.tests?.test_date).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right pl-2">
                                                <div className="flex items-center justify-end gap-1 mb-0.5">
                                                    <span className="text-xl font-black text-slate-900 tracking-tighter">{pct.toFixed(0)}%</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500">{t.marks_obtained}/{t.tests?.total_marks}</p>
                                            </div>
                                        </div>

                                        {/* Perf Bar */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex items-center gap-1 min-w-[32px] justify-end">
                                                {imp !== null && (
                                                    <span className={`text-[10px] font-black flex items-center ${imp > 0 ? 'text-emerald-500' : imp < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                                        {imp > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : imp < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3" />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandable remarks */}
                                        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 mt-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Teacher Remarks</p>
                                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">{t.remarks || 'No detailed remarks provided for this paper.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {tests.length === 0 && <div className="col-span-1 lg:col-span-2 text-center py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">No Academic Records</div>}
                        </div>
                    </section>

                </div>


                {/* ---------- RIGHT COLUMN (Widgets) ---------- */}
                <div className="md:col-span-5 space-y-8">

                    {/* Weak Areas & Sub-skills */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Focus Framework
                            </h2>
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">

                            {weakTopics.length === 0 && strongTopics.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No structured analysis yet</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {strongTopics.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Verified Strengths</p>
                                            <div className="flex flex-wrap gap-2">
                                                {strongTopics.map(s => <span key={s} className="px-3 py-1.5 bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-black tracking-wide">{s}</span>)}
                                            </div>
                                        </div>
                                    )}
                                    {weakTopics.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Key Improvement Areas</p>
                                            <div className="flex flex-wrap gap-2">
                                                {weakTopics.map(w => <span key={w} className="px-3 py-1.5 bg-red-50/80 text-red-700 border border-red-200/60 rounded-xl text-xs font-black tracking-wide">{w}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {improvementPlan && (
                                <div className="mt-6 p-5 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-100 shadow-sm shrink-0">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <TrendingUp className="w-3 h-3" /> Curated Action Plan
                                    </p>
                                    <ul className="space-y-2.5">
                                        {improvementPlan.split('. ').map((item, i) => item.trim() && (
                                            <li key={i} className="flex gap-3 text-xs font-bold text-slate-700 leading-snug items-start">
                                                <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 mt-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                </div>
                                                <span className="mt-1">{item.trim()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Attendance Donut */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Presence Track</h2>
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">

                            {attPerc < 75 && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl mb-4 text-xs font-bold flex gap-2 items-start mt-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Warning: Attendance below 75% required mandate.</span>
                                </div>
                            )}

                            <div className="flex items-center gap-4 py-2">
                                {/* Recharts Pie (Donut) */}
                                <div className="w-32 h-32 relative shrink-0 -ml-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={[{ value: attPerc }, { value: 100 - attPerc }]} cx="50%" cy="50%" innerRadius={40} outerRadius={55} dataKey="value" stroke="none" cornerRadius={4} paddingAngle={2}>
                                                <Cell fill={attPerc < 75 ? '#f59e0b' : '#34d399'} />
                                                <Cell fill="#f1f5f9" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-black text-slate-800 tracking-tighter">{Math.round(attPerc)}%</span>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-1 gap-2 border-l border-slate-100 pl-4 py-2">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Present</p>
                                        <p className="text-2xl font-black text-slate-800">{attendance?.present || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Absent</p>
                                        <p className="text-lg font-black text-red-500">{attendance?.absent || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Pending Fees Highlight */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Account Status</h2>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                            {feeStatus === 'overdue' && (
                                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest text-center py-1">Action Required</div>
                            )}

                            <div className={`mt-${feeStatus === 'overdue' ? '4' : '0'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{hasPending ? 'Pending Cycle Balance' : 'Account Cleared'}</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{(fees?.summary?.totalPending + fees?.summary?.totalOverdue || 0).toLocaleString()}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm 
                                        ${feeStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : feeStatus === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-3xl grid grid-cols-2 gap-4 border border-slate-100">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Pay</p>
                                        <p className="text-xs font-bold text-slate-700">None</p>
                                    </div>
                                    <div className="border-l border-slate-200 pl-4">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                                        <p className="text-xs font-black text-slate-700">{fees?.summary?.nextDueDate ? new Date(fees.summary.nextDueDate).toLocaleDateString('en-GB') : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Assignments */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Boards</h2>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-full">{assignments.length} Tasks</span>
                        </div>
                        <div className="space-y-3">
                            {assignments.filter((a: any) => a.submission_status !== 'graded').slice(0, 3).map((a: any) => {
                                const isOverdue = new Date(a.due_date) < new Date() && a.submission_status === 'pending';
                                return (
                                    <div key={a.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden flex items-start gap-4">
                                        {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-400" />}
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 pr-2">
                                            <p className="font-bold text-slate-800 text-xs mb-1">{a.title}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{a.subject}</p>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Clock className="w-3 h-3" /> {new Date(a.due_date).toLocaleDateString()} {isOverdue ? '(Late)' : ''}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                </div>
            </div>

            {/* Filter Modal (Mobile/Desktop overlap safe layer) */}
            {testFilterOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 transition-opacity" onClick={() => setTestFilterOpen(false)}>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tune Interface</h3>
                            <button onClick={() => setTestFilterOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject Logic</p>
                                <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 appearance-none">
                                    <option>All Modules</option>
                                    <option>Mathematics</option>
                                    <option>Sciences</option>
                                </select>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Evaluation Type</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Weekly', 'Monthly', 'Unit', 'Annual'].map(t => (
                                        <button key={t} className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-300 focus:bg-indigo-600 focus:text-white focus:border-indigo-600 transition-all">{t}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setTestFilterOpen(false)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">Apply Filters</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

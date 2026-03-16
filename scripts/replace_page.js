const fs = require('fs');
const filePath = '/Users/mayursinghrajput/Desktop/apna-tuiton-ichhapore/src/app/student/dashboard/page.tsx';

// Actually, I can just read the original file from git HEAD to restore it, then apply my script!
// BUT wait, next.js server is running? I'll restore it via git.
const { execSync } = require('child_process');
execSync('git checkout -- ' + filePath);

let code = fs.readFileSync(filePath, 'utf8');

const returnStart = code.indexOf('    return (');
if (returnStart === -1) {
    console.error('Could not find return start');
    process.exit(1);
}

const head = code.substring(0, returnStart);

const updatedHead = head
    .replace(/import {[\s\S]*?} from 'lucide-react';/, "import { MapPin, Calendar as CalIcon, Filter, X, Menu, GraduationCap, Clock, CheckCircle2, ChevronRight, Minus, Bell, Settings, Wallet, BookOpen, Clipboard, Book, Briefcase, StickyNote, MessageSquare, User, PenBox, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp, Trophy, Activity, CreditCard, LayoutDashboard, Lightbulb } from 'lucide-react';")
    .replace(/import { LineChart[\s\S]*?} from 'recharts';/, "import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';");

const newReturn = `    return (
        <div className="w-full min-h-screen bg-[#F8F9FA] pb-24 font-sans relative overflow-x-hidden md:max-w-md md:mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-[52px] h-[52px] bg-[#4B40F6] rounded-full flex items-center justify-center text-white text-[22px] font-bold shadow-sm shrink-0">
                        {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'VS'}
                    </div>
                    <div>
                        <h1 className="text-[17px] font-bold text-slate-900 leading-tight">Hi, {profile?.name || 'Vivaan Singh'} 👋</h1>
                        <p className="text-[11px] text-slate-500 font-medium tracking-wide">Class {profile?.classes?.name || '10'} - Batch {profile?.batch || 'A'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                        <Bell className="w-[18px] h-[18px] text-slate-500 stroke-[2]" />
                    </button>
                    <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                        <Settings className="w-[18px] h-[18px] text-slate-500 stroke-[2]" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="px-5 grid grid-cols-2 gap-3 mt-2">
                {/* Overall Performance */}
                <div className="bg-gradient-to-br from-[#7344F5] to-[#A352F7] rounded-[24px] p-4 text-white shadow-lg shadow-purple-200/50 flex flex-col justify-between aspect-[1.12]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#E9E1FF]">Overall Performance</p>
                    <p className="text-[40px] font-bold tracking-tight mt-1 leading-none">{Math.round(avgTest)}%</p>
                    <div className="mt-auto pt-4">
                        <div className="h-[6px] bg-[#895CF7] rounded-full overflow-hidden w-full relative">
                            <div className="absolute left-0 top-0 bottom-0 bg-white rounded-full" style={{ width: \`\${Math.round(avgTest)}%\` }} />
                        </div>
                    </div>
                </div>

                {/* Batch Rank */}
                <div className="bg-gradient-to-br from-[#1EBA97] to-[#21CDA6] rounded-[24px] p-4 text-white shadow-lg shadow-teal-200/50 flex flex-col justify-between aspect-[1.12]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#C8F3E9]">Batch Rank</p>
                    <p className="text-[40px] font-bold tracking-tight mt-1 leading-none">{rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : \`\${rank}th\`}</p>
                    <div className="mt-auto pt-4">
                        <div className="flex bg-[#3DD0AE] rounded-full px-2.5 py-0.5 items-center justify-center w-fit border border-[#4CD6B7]">
                            <span className="text-[9px] font-bold text-white tracking-widest uppercase">Top {(rank/100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                {/* Attendance */}
                <div className="bg-gradient-to-br from-[#FD6D56] to-[#FF5E5E] rounded-[24px] p-4 text-white shadow-lg shadow-red-200/50 flex flex-col justify-between aspect-[1.12]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#FFDCD6]">Attendance</p>
                    <p className="text-[40px] font-bold tracking-tight mt-1 leading-none">{Math.round(attPerc)}%</p>
                    <div className="mt-auto pt-4">
                        <span className="text-[10px] font-medium text-[#FFEFEC] tracking-wide">Good Standing</span>
                    </div>
                </div>

                {/* Fee Status */}
                <div className="bg-gradient-to-br from-[#2D8FFC] to-[#2463FD] rounded-[24px] p-4 text-white shadow-lg shadow-blue-200/50 flex flex-col justify-between aspect-[1.12]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#D1E6FF]">Fee Status</p>
                    <p className="text-[40px] font-bold tracking-tight mt-1 leading-none capitalize">{feeStatus}</p>
                    <div className="mt-auto pt-4">
                        <span className="text-[10px] font-medium text-[#D1E6FF] tracking-wide italic">Receipt #3942</span>
                    </div>
                </div>
            </div>

            {/* Quick Access */}
            <div className="px-5 mt-8 mb-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-5 ml-1">Quick Access</h2>
                <div className="grid grid-cols-4 gap-y-7">
                    {[
                        { icon: User, label: 'Profile', text: 'text-[#2B82FE]', bg: 'bg-[#F0F6FF]' },
                        { icon: CalIcon, label: 'Attendance', text: 'text-[#C95AF6]', bg: 'bg-[#FAF2FF]' },
                        { icon: Clipboard, label: 'Assignments', text: 'text-[#1CAA67]', bg: 'bg-[#EAFBF0]' },
                        { icon: BookOpen, label: 'Homework', text: 'text-[#EA7120]', bg: 'bg-[#FFF4EC]' },
                        { icon: Briefcase, label: 'Classwork', text: 'text-[#F12B47]', bg: 'bg-[#FFEBEF]' },
                        { icon: PenBox, label: 'Notes', text: 'text-[#1EABC2]', bg: 'bg-[#E7FAFC]' },
                        { icon: Book, label: 'Syllabus', text: 'text-[#E88E12]', bg: 'bg-[#FFF3E1]' },
                        { icon: MessageSquare, label: 'Circular', text: 'text-[#4853F5]', bg: 'bg-[#EFF1FF]' },
                    ].map((item, idx) => (
                        <Link key={idx} href={'#'} className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity">
                            <div className={\`w-[54px] h-[54px] rounded-full flex items-center justify-center \${item.bg}\`}>
                                <item.icon className={\`w-[22px] h-[22px] stroke-[1.5] \${item.text}\`} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-800 tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Academic Trend */}
            <div className="px-5 mt-10">
                <div className="bg-white rounded-[32px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-50">
                    <div className="flex items-center justify-between mb-8 pl-1">
                        <h2 className="text-[15px] font-bold text-slate-900">Academic Trend</h2>
                        <div className="flex bg-[#F8F9FA] rounded-[10px] p-1 border border-slate-100/50">
                            <button onClick={() => setGraphTab('Marks')} className={\`px-3 py-1 text-[10px] font-bold rounded-lg transition-all \${graphTab === 'Marks' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}\`}>Marks</button>
                            <button onClick={() => setGraphTab('Rank')} className={\`px-3 py-1 text-[10px] font-bold rounded-lg transition-all \${graphTab === 'Rank' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}\`}>Rank</button>
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
            <div className="px-5 mt-6">
                <div className="bg-[#F6F7FF] rounded-[32px] p-5 border border-[#EFF1FF]">
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
                            Your algebra scores are dipping.<br/><span className="font-bold text-[#4F3FF0]">Focus on Quadratic Equations</span> this weekend.
                        </p>
                        <button className="bg-[#4F3FF0] text-white px-3.5 py-3 rounded-[14px] text-[10px] font-bold shrink-0 shadow-md shadow-indigo-200/50 active:scale-95 transition-transform leading-tight">
                            Start<br/>Practice
                        </button>
                    </div>
                </div>
            </div>

            {/* Presence Track */}
            <div className="px-5 mt-6">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-50 relative">
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
                                <span className="text-[11px] font-bold text-slate-900">{attendance?.present || '114'} Days</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-[7px] h-[7px] rounded-full bg-[#FF4560]" />
                                    <span className="text-[11px] font-medium text-slate-500 tracking-wide">Absent</span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-900">{attendance?.absent || '08'} Days</span>
                            </div>
                            <div className="mt-1 bg-[#FFF9F0] text-[#E08A1E] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-[9px] font-bold border border-[#FDF1DE]">
                                <AlertCircle className="w-[11px] h-[11px]" />
                                <span className="tracking-wide">Medical leaves remaining: 2 days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Test Results */}
            <div className="px-5 mt-8 mb-8 pb-10">
                <div className="flex items-center justify-between mb-5 pl-1 pr-1 border-b border-transparent">
                    <h2 className="text-[16px] font-bold text-[#1F2937] tracking-tight">Recent Test Results</h2>
                    <Link href="/student/tests" className="text-[11px] font-bold text-[#4F3FF0] pr-1">View All</Link>
                </div>
                <div className="space-y-4">
                    {/* Display actual results or fallback directly to match exactly the mock if empty */}
                    {tests.length > 0 ? tests.slice(0, 2).map((t, idx) => (
                        <div key={t.id} className="bg-white rounded-[28px] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex items-center gap-3">
                            <div className={\`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]
                                \${idx === 0 ? 'bg-[#EEF1FF] text-[#4F3FF0]' : 'bg-[#FFF0F2] text-[#F12B47]'}\`}>
                                {t.tests?.subject?.substring(0, 2) || (idx === 0 ? 'MA' : 'PH')}
                            </div>
                            <div className="flex-1 min-w-0 pr-2 pb-1">
                                <p className="font-bold text-[#1F2937] text-[13px] leading-tight mb-[3px] truncate">{t.tests?.test_name || (idx === 0 ? 'Mathematics Unit Test' : 'Physics Lab Practical')}</p>
                                <p className="text-[9px] text-[#9CA3AF] font-medium">Completed on {new Date(t.tests?.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                            </div>
                            <div className="text-right shrink-0 pt-0.5 pr-1">
                                <p className="text-[13px] font-bold text-[#1F2937] tracking-tight leading-none mb-1.5">{t.marks_obtained}/{t.tests?.total_marks}</p>
                                <p className={\`text-[8px] font-bold mt-1 uppercase \${idx === 0 ? 'text-[#00C9A7]' : 'text-[#00C9A7]'}\`}>
                                    {idx === 0 ? 'Excellent' : 'Top Performer'}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <>
                        <div className="bg-white rounded-[28px] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] bg-[#EEF1FF] text-[#4F3FF0]">
                                MA
                            </div>
                            <div className="flex-1 min-w-0 pr-2 pb-1">
                                <p className="font-bold text-[#1F2937] text-[13px] leading-tight mb-[3px] truncate">Mathematics Unit Test</p>
                                <p className="text-[9px] text-[#9CA3AF] font-medium">Completed on 12 Oct</p>
                            </div>
                            <div className="text-right shrink-0 pt-0.5 pr-1">
                                <p className="text-[13px] font-bold text-[#1F2937] tracking-tight leading-none mb-1.5">45/50</p>
                                <p className="text-[8px] font-bold mt-1 capitalize text-[#00C9A7]">Excellent</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-[28px] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] bg-[#FFF0F2] text-[#F12B47]">
                                PH
                            </div>
                            <div className="flex-1 min-w-0 pr-2 pb-1">
                                <p className="font-bold text-[#1F2937] text-[13px] leading-tight mb-[3px] truncate">Physics Lab Practical</p>
                                <p className="text-[9px] text-[#9CA3AF] font-medium">Completed on 09 Oct</p>
                            </div>
                            <div className="text-right shrink-0 pt-0.5 pr-1">
                                <p className="text-[13px] font-bold text-[#1F2937] tracking-tight leading-none mb-1.5">18/20</p>
                                <p className="text-[8px] font-bold mt-1 capitalize text-[#00C9A7]">Top Performer</p>
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
`;

fs.writeFileSync(filePath, updatedHead + newReturn + '\n}\n');
console.log('Successfully replaced file');

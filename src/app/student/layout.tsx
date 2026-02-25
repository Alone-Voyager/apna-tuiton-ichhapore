'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    Home,
    CalendarCheck,
    Wallet,
    ClipboardList,
    MoreHorizontal,
    LogOut,
    User,
    BookOpen,
    GraduationCap,
    Bell,
    Settings
} from 'lucide-react';
import { signOut } from '../../lib/supabase/auth';

const navItems = [
    { href: '/student/dashboard', icon: Home, label: 'Home' },
    { href: '/student/tests', icon: ClipboardList, label: 'Tests' },
    { href: '/student/attendance', icon: CalendarCheck, label: 'Attendance' },
    { href: '/student/fees', icon: Wallet, label: 'Fees' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [moreOpen, setMoreOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        await signOut();
        router.push('/login');
    };

    const isActive = (href: string) => pathname === href;

    return (
        <div className="flex h-screen bg-slate-50/50 font-sans overflow-hidden">

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-slate-900 via-indigo-950/80 to-slate-900 shadow-2xl z-20">
                <div className="p-8 flex items-center gap-4 border-b border-white/5">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wide">Apna Tuition</h1>
                        <p className="text-xs text-indigo-300 font-medium">Student Portal</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
                    <p className="px-4 text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">Main Menu</p>
                    {navItems.map(({ href, icon: Icon, label }) => {
                        const active = isActive(href);
                        return (
                            <Link key={href} href={href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
                                ${active ? 'bg-indigo-500/15 text-indigo-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ring-1 ring-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                <div className={`relative flex items-center justify-center transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`font-semibold text-sm ${active ? 'text-indigo-50' : ''}`}>{label}</span>
                            </Link>
                        )
                    })}

                    <p className="px-4 text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-8 mb-4">More</p>
                    <Link href="/student/assignments" className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
                        ${isActive('/student/assignments') ? 'bg-indigo-500/15 text-indigo-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ring-1 ring-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                        <BookOpen className={`w-5 h-5 ${isActive('/student/assignments') ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span className={`font-semibold text-sm ${isActive('/student/assignments') ? 'text-indigo-50' : ''}`}>Assignments</span>
                    </Link>
                    <Link href="/student/profile" className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
                        ${isActive('/student/profile') ? 'bg-indigo-500/15 text-indigo-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ring-1 ring-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                        <User className={`w-5 h-5 ${isActive('/student/profile') ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span className={`font-semibold text-sm ${isActive('/student/profile') ? 'text-indigo-50' : ''}`}>My Profile</span>
                    </Link>
                </div>

                <div className="p-6 border-t border-white/5">
                    <button onClick={handleLogout} disabled={loggingOut}
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all duration-300">
                        <LogOut className="w-4 h-4" />
                        <span className="font-semibold text-sm">{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-[#f8fafc]">

                {/* Scrollable Container */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto pb-24 md:pb-8 scroll-smooth w-full">
                    {children}
                </main>

                {/* MOBILE BOTTOM NAVIGATION */}
                <nav className="md:hidden absolute bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 px-2 py-2 pb-safe flex justify-between items-center shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.08)] rounded-t-3xl">
                    {navItems.map(({ href, icon: Icon, label }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="flex flex-col items-center justify-center w-[20%] pt-1 pb-1 transition-all group"
                            >
                                <div className={`relative mb-1 flex items-center justify-center transition-all duration-300
                                    ${active ? 'bg-indigo-100 w-12 h-8 rounded-full scale-100' : 'scale-90 opacity-70 group-hover:opacity-100'}`}
                                >
                                    <Icon className={`w-5 h-5 ${active ? 'text-indigo-600 fill-indigo-100/50' : 'text-slate-400'}`} />
                                </div>
                                <span className={`text-[10px] font-bold tracking-wide transition-colors ${active ? 'text-indigo-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    {label}
                                </span>
                            </Link>
                        )
                    })}

                    {/* More Button */}
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        className="flex flex-col items-center justify-center w-[20%] pt-1 pb-1 transition-all group relative"
                    >
                        <div className={`relative mb-1 flex items-center justify-center transition-all duration-300
                            ${moreOpen ? 'bg-indigo-100 w-12 h-8 rounded-full scale-100' : 'scale-90 opacity-70 group-hover:opacity-100'}`}
                        >
                            <MoreHorizontal className={`w-5 h-5 ${moreOpen ? 'text-indigo-600 fill-indigo-100/50' : 'text-slate-400'}`} />
                        </div>
                        <span className={`text-[10px] font-bold tracking-wide transition-colors ${moreOpen ? 'text-indigo-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            More
                        </span>
                    </button>
                </nav>

                {/* MOBILE MORE MENU BOTTOM SHEET */}
                {moreOpen && (
                    <div className="md:hidden absolute inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setMoreOpen(false)}>
                        <div
                            className="absolute bottom-24 left-4 right-4 bg-white rounded-3xl shadow-2xl p-5 animate-in slide-in-from-bottom-8 duration-300 border border-slate-100"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                            <div className="space-y-2">
                                <Link
                                    href="/student/assignments"
                                    onClick={() => setMoreOpen(false)}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-indigo-50/80 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-slate-700 text-base">Assignments</span>
                                </Link>
                                <Link
                                    href="/student/profile"
                                    onClick={() => setMoreOpen(false)}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-emerald-50/80 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-slate-700 text-base">My Profile</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-rose-50 active:bg-rose-100 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 bg-rose-50/80 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
                                        <LogOut className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-rose-600 text-base">{loggingOut ? 'Signing out...' : 'Sign out'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

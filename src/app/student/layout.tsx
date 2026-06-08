'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home,
    CalendarCheck,
    Wallet,
    ClipboardList,
    MoreHorizontal,
    LogOut,
    User,
    BookOpen,
    Settings,
    GraduationCap,
} from 'lucide-react';
import { signOut } from '../../lib/supabase/auth';

const navTabs = [
    { href: '/student/tests',      label: 'Tests',   icon: ClipboardList },
    { href: '/student/attendance', label: 'Attend',  icon: CalendarCheck },
    { href: '/student/dashboard',  label: 'Home',    icon: Home },
    { href: '/student/fees',       label: 'Fees',    icon: Wallet },
    { href: '/student/profile/settings', label: 'Settings', icon: Settings },
    { href: '#more',               label: 'More',    icon: MoreHorizontal },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '';
    const router = useRouter();
    const [moreOpen, setMoreOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut();
            router.push('/login');
        } catch (err) {
            console.error("Logout error:", err);
            setIsLoggingOut(false);
        }
    };

    const activeTabIndex = moreOpen ? navTabs.length - 1 : navTabs.findIndex(t => t.href !== '#more' && pathname === t.href);
    const currentIndex = activeTabIndex === -1 ? 2 : activeTabIndex;
    const ActiveIcon = navTabs[currentIndex]?.icon || Home;
    const tabWidth = 100 / navTabs.length;

    if (!mounted) return <div className="bg-white h-screen w-full" />;

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                    <span className="font-bold text-lg">Apna Tuition</span>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navTabs.filter(t => t.href !== '#more').map(tab => (
                        <Link 
                            key={tab.href} 
                            href={tab.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${pathname === tab.href ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}
                        >
                            <tab.icon size={20} />
                            <span className="font-medium">{tab.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white w-full">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] h-full relative">
                <main className="flex-1 overflow-y-auto pb-32 h-full pt-[env(safe-area-inset-top)]">
                    {children}
                </main>

                {/* Mobile Nav (Identical approach to admin) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex flex-col justify-end">
                    <div className="relative w-full pointer-events-auto filter drop-shadow-[0_-4px_15px_rgba(0,0,0,0.06)] bg-white">
                        <div className="relative w-full h-14" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}>
                            {/* SVG Notch */}
                            <svg className="absolute inset-0 w-full h-full text-white" fill="currentColor">
                                <defs>
                                    <mask id="nav-notch-student">
                                        <rect width="100%" height="100%" fill="white" />
                                        <circle 
                                            cy="-12" 
                                            r="37" 
                                            fill="black" 
                                            className="transition-all duration-500"
                                            style={{ cx: `${tabWidth / 2 + currentIndex * tabWidth}%` }}
                                        />
                                    </mask>
                                </defs>
                                <rect width="100%" height="100%" mask="url(#nav-notch-student)" />
                            </svg>

                            {/* Background filler for bottom */}
                            <div className="absolute top-14 inset-x-0 h-32 bg-white" />

                            {/* Sliding Active Bubble */}
                            <div 
                                className="absolute top-0 h-14 flex justify-center z-50 transition-transform duration-500"
                                style={{ width: `${tabWidth}%`, transform: `translateX(${currentIndex * 100}%)` }}
                            >
                                <div className="absolute -top-[1.7rem] w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200">
                                    <ActiveIcon size={24} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Nav Items */}
                            <div className="relative z-10 flex h-14 w-full items-end pb-1">
                                {navTabs.map((tab, i) => (
                                    <button 
                                        key={tab.label}
                                        onClick={() => {
                                            if (tab.href === '#more') setMoreOpen(!moreOpen);
                                            else { setMoreOpen(false); router.push(tab.href); }
                                        }}
                                        className="flex-1 flex flex-col items-center justify-end h-full relative"
                                    >
                                        <div className={`transition-all duration-500 ${currentIndex === i ? 'opacity-0 translate-y-4' : 'opacity-100 text-slate-400'}`}>
                                            <tab.icon size={21} />
                                        </div>
                                        <span className={`text-[10px] font-bold mt-0.5 ${currentIndex === i ? 'text-green-500' : 'text-slate-400'}`}>
                                            {tab.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* More Menu Overlay */}
                {moreOpen && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setMoreOpen(false)}>
                        <div className="absolute bottom-20 left-4 right-4 bg-white rounded-3xl p-6 shadow-2xl space-y-2 border border-slate-100" onClick={e => e.stopPropagation()}>
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                            <Link href="/student/assignments" onClick={() => setMoreOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><BookOpen /></div>
                                <span className="font-bold text-slate-700">Assignments</span>
                            </Link>
                            <Link href="/student/profile" onClick={() => setMoreOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><User /></div>
                                <span className="font-bold text-slate-700">My Profile</span>
                            </Link>
                            <Link href="/student/profile/settings" onClick={() => setMoreOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center"><Settings /></div>
                                <span className="font-bold text-slate-700">Settings</span>
                            </Link>
                            <button onClick={handleLogout} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-red-600 w-full transition-colors">
                                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center"><LogOut /></div>
                                <span className="font-bold">{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import {
    User, GraduationCap, Phone, Mail, MapPin, Calendar,
    BookOpen, Hash, Users, Building2
} from 'lucide-react';

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
    const displayValue = value && value.trim() !== '' ? value : 'Not provided';
    return (
        <div className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100/50 shadow-sm">
                <Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                <p className={`text-sm tracking-tight ${value && value.trim() !== '' ? 'font-bold text-slate-800' : 'font-medium text-slate-400 italic'}`}>
                    {displayValue}
                </p>
            </div>
        </div>
    );
}

export default function StudentProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/student/profile')
            .then(r => r.json())
            .then(d => { if (d.success) setProfile(d.data); })
            .finally(() => setLoading(false));
    }, []);

    const s = profile?.students;

    const admitDate = s?.admission_date
        ? new Date(s.admission_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
    const dob = s?.date_of_birth
        ? new Date(s.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto md:p-8 p-6 pt-12 md:pt-8 space-y-8 animate-pulse">
                <div className="h-64 bg-white rounded-[20px] border border-slate-100 shadow-sm" />
                <div className="h-96 bg-white rounded-[20px] border border-slate-100 shadow-sm" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto md:p-8 p-6 pt-12 md:pt-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100/50">
                        <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    My Profile
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide">Manage your personal and academic details</p>
            </div>

            {/* Profile Hero */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[20px] p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full mix-blend-overlay filter blur-3xl translate-y-1/2 -translate-x-1/2" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[20px] flex items-center justify-center flex-shrink-0 border border-white/20 shadow-inner">
                        <User className="w-12 h-12 text-white/90" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-3xl font-black tracking-tight">{s?.name ?? 'Student'}</h2>
                        {s?.roll_number && (
                            <p className="text-indigo-200 text-sm font-semibold tracking-wide mt-1">Roll No. {s.roll_number}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {s?.classes?.name && (
                                <span className="bg-white/15 backdrop-blur-sm border border-white/10 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-indigo-50">
                                    {s.classes.name}
                                </span>
                            )}
                            {s?.batch && (
                                <span className="bg-white/15 backdrop-blur-sm border border-white/10 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-indigo-50">
                                    Batch: {s.batch}
                                </span>
                            )}
                            {s?.gender && (
                                <span className="bg-white/15 backdrop-blur-sm border border-white/10 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-indigo-50">
                                    {s.gender}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Attendance & Fee Quick Stats */}
                <div className="relative z-10 mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-5 text-center border border-white/10 hover:bg-white/15 transition-colors">
                        <p className="text-3xl font-black tracking-tighter">{s?.attendance_rate ?? 0}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mt-1">Attendance Rate</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-5 text-center border border-white/10 hover:bg-white/15 transition-colors">
                        <p className="text-3xl font-black tracking-tighter">₹{(s?.monthly_fee ?? 0).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mt-1">Monthly Fee</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-all duration-300">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        Personal Information
                    </h3>
                    <div className="space-y-1">
                        <InfoRow icon={Calendar} label="Date of Birth" value={dob} />
                        <InfoRow icon={Mail} label="Email Address" value={s?.email} />
                        <InfoRow icon={Phone} label="Phone Number" value={s?.phone} />
                        <InfoRow icon={MapPin} label="Address" value={s?.address} />
                    </div>
                </div>

                {/* Academic Information */}
                <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-all duration-300">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Academic Information
                    </h3>
                    <div className="space-y-1">
                        <InfoRow icon={BookOpen} label="Class" value={s?.classes?.name} />
                        <InfoRow icon={Hash} label="Batch" value={s?.batch} />
                        <InfoRow icon={Hash} label="Roll Number" value={s?.roll_number} />
                        <InfoRow icon={Calendar} label="Admission Date" value={admitDate} />
                        <InfoRow icon={Building2} label="Institution" value={s?.organizations?.name} />
                    </div>
                </div>

                {/* Parent / Guardian */}
                {s?.parent_name && (
                    <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-all duration-300 md:col-span-2 lg:col-span-1 border-t-4 border-t-indigo-500">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Parent / Guardian
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
                            <InfoRow icon={User} label="Parent Name" value={s.parent_name} />
                        </div>
                    </div>
                )}

                {/* Notes */}
                {s?.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-1">Notes from Admin</p>
                        <p className="text-sm text-amber-800">{s.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

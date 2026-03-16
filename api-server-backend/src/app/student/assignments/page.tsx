'use client';

import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Clock, AlertTriangle, XCircle, Filter, Upload, Download, FileCheck2, Loader2 } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    submitted: { label: 'Submitted', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
    graded: { label: 'Graded', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle2 },
    pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
    late: { label: 'Late', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock },
    missing: { label: 'Missing', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
};

export default function StudentAssignmentsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const fetchAssignments = () => {
        setLoading(true);
        fetch('/api/student/assignments')
            .then(r => r.json())
            .then(d => { if (d.success) setData(d.data); })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, assignmentId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(assignmentId);
        try {
            const formData = new FormData();
            formData.append("submission_file", file);

            const res = await fetch(`/api/student/assignments/${assignmentId}/upload`, {
                method: "POST",
                body: formData,
            });
            const d = await res.json();
            if (d.success) {
                fetchAssignments();
            } else {
                alert(d.error || "Failed to upload file");
            }
        } catch (error) {
            alert("Upload failed");
        } finally {
            setUploadingId(null);
        }
    };

    const assignments = (data?.assignments ?? []).filter((a: any) =>
        filter === 'all' || a.submission_status === filter
    );

    const summary = data?.summary;

    return (
        <div className="w-full max-w-5xl mx-auto md:p-8 p-0 space-y-0">
            {/* Sticky Header Section */}
            <div className="sticky top-0 z-20 bg-[#f8fafc]/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 space-y-4">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shadow-sm border border-rose-100/50">
                            <BookOpen className="w-5 h-5 text-rose-600" />
                        </div>
                        My Assignments
                    </h1>
                </div>

                {/* Summary (Inline on mobile if sticky, or scrollable) */}
                {!loading && summary && (
                    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                        {[
                            { label: 'Total', value: summary.total, color: 'text-slate-600 bg-slate-50' },
                            { label: 'Pending', value: summary.pending, color: 'text-amber-600 bg-amber-50' },
                            { label: 'Submitted', value: summary.submitted, color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Missing', value: summary.missing, color: 'text-red-600 bg-red-50' },
                        ].map(s => (
                            <div key={s.label} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/50 shadow-sm ${s.color}`}>
                                <span className="text-sm font-black tracking-tight">{s.value}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{s.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'submitted', label: 'Submitted' },
                        { key: 'graded', label: 'Graded' },
                        { key: 'missing', label: 'Missing' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${filter === f.key
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 shadow-sm'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 md:p-0 space-y-8">

            {/* Assignments List */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-[20px] border border-slate-100 shadow-sm animate-pulse" />)}
                </div>
            ) : assignments.length === 0 ? (
                <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 py-20 text-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 z-0"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-300 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-emerald-100/50">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">All caught up! 🎉</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm">No assignments found in this category.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {assignments.map((a: any) => {
                        const cfg = STATUS_CONFIG[a.submission_status] ?? STATUS_CONFIG.pending;
                        const Icon = cfg.icon;
                        const dueDate = new Date(a.due_date).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short'
                        });
                        const givenDate = new Date(a.given_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short'
                        });
                        const today = new Date();
                        const due = new Date(a.due_date);
                        const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <div
                                key={a.id}
                                className={`bg-white rounded-[20px] border ${a.is_overdue ? 'border-red-200' : 'border-slate-100'} shadow-sm p-5 hover:shadow-md transition-all duration-300 flex flex-col`}
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                        <Icon className={`w-6 h-6 ${cfg.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-base font-bold text-slate-800 tracking-tight line-clamp-1">{a.title}</p>
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">{a.subject}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} flex-shrink-0`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {a.description && (
                                    <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-4 flex-grow">{a.description}</p>
                                )}

                                <div className="mt-auto pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Given: {givenDate}</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${a.is_overdue ? 'bg-red-50 text-red-600' : daysLeft <= 1 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}>
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-bold uppercase tracking-widest">
                                                {a.is_overdue ? 'Overdue!' : daysLeft === 0 ? 'Due Today' : daysLeft === 1 ? 'Due Tomorrow' : `Due: ${dueDate}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Download / Upload Links */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {a.attachment_url && (
                                            <a href={a.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                                                <Download className="w-3.5 h-3.5" /> Download Homework
                                            </a>
                                        )}
                                        {a.submission_file_url ? (
                                            <a href={a.submission_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                                                <FileCheck2 className="w-3.5 h-3.5" /> View Submission
                                            </a>
                                        ) : (
                                            <div className="relative overflow-hidden inline-block">
                                                <button disabled={uploadingId === a.id} className="text-[10px] font-bold uppercase tracking-widest bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all text-left">
                                                    {uploadingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                    {uploadingId === a.id ? 'Uploading...' : 'Upload Work'}
                                                </button>
                                                <input
                                                    type="file"
                                                    disabled={uploadingId === a.id}
                                                    accept=".pdf,image/png,image/jpeg"
                                                    onChange={(e) => handleFileUpload(e, a.id)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Feedback */}
                                    {a.feedback && (
                                        <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl">
                                            <p className="text-xs font-medium text-blue-800 leading-relaxed"><span className="font-bold uppercase tracking-widest text-[9px] mr-1 block mb-1">Feedback</span> {a.feedback}</p>
                                        </div>
                                    )}

                                    {a.eval_file_url && (
                                        <div className="mt-2">
                                            <a href={a.eval_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1">
                                                <Download className="w-3 h-3" /> Teacher's Evaluated Sheet
                                            </a>
                                        </div>
                                    )}

                                    {/* Completion rating */}
                                    {a.completion_rating && (
                                        <div className="mt-4 flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rating</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-1.5 h-3 rounded-sm ${i < a.completion_rating ? 'bg-amber-400' : 'bg-slate-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-black text-amber-600">{a.completion_rating}/10</span>
                                            </div>
                                        </div>
                                    )}
                                    {a.marks_obtained !== null && a.marks_obtained !== undefined && (
                                        <div className="mt-2 flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Marks Obtained</span>
                                            <span className="text-xs font-black text-emerald-800">{a.marks_obtained}</span>
                                        </div>
                                    )}
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

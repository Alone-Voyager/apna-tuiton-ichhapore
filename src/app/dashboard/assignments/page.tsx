'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import {
    BookOpen, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
    X, Trash2, Calendar, Filter, ChevronRight, Users, MoreVertical, FileText, ArrowLeft, Download, UploadCloud
} from 'lucide-react';

interface Assignment {
    id: string;
    title: string;
    subject: string;
    description: string | null;
    given_date: string;
    due_date: string;
    is_active: boolean;
    class_id: string | null;
    classes: { id: string; name: string } | null;
    stats: { total: number; submitted: number; pending: number; missing: number };
    attachment_url?: string;
}

interface ClassData {
    id: string;
    name: string;
}

const STATUS_COLORS: Record<string, string> = {
    submitted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    missing: 'bg-red-100 text-red-700 border-red-200',
    graded: 'bg-blue-100 text-blue-700 border-blue-200',
    reviewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    late: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function AdminAssignmentsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data States
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);

    // Loading States
    const [loading, setLoading] = useState(true);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);

    // Navigation & Selected States
    const [level, setLevel] = useState<'classes' | 'assignments' | 'students'>('classes');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

    // Create Modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: '', subject: '', description: '', given_date: new Date().toISOString().split('T')[0],
        due_date: '', class_id: '', batch: '',
    });
    const [createFile, setCreateFile] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Delete Modal
    const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);
    const [deleteStage, setDeleteStage] = useState<0 | 1 | 2>(0);
    const [deleting, setDeleting] = useState(false);

    // Filter state for Level 3
    const [studentFilter, setStudentFilter] = useState<string>('all');

    // Drawer state (saving)
    const [savingSubmission, setSavingSubmission] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [assRes, clsRes, stuRes] = await Promise.all([
                fetch('/api/admin/assignments'),
                fetch('/api/classes'),
                fetch('/api/students')
            ]);

            const assData = await assRes.json();
            const clsData = await clsRes.json();
            const stuData = await stuRes.json();

            if (assData.success) setAssignments(assData.data || []);

            // Note: API might return `{ success: true, data: [...] }` or just `[...]`
            const classesList = Array.isArray(clsData) ? clsData : (clsData.data || []);
            setClasses(classesList);

            const studentsList = Array.isArray(stuData) ? stuData : (stuData.students || stuData.data || []);
            setStudents(studentsList);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSubmissions(assignmentId: string) {
        setSubmissionsLoading(true);
        try {
            const res = await fetch(`/api/admin/assignments/${assignmentId}/submissions`);
            const d = await res.json();
            if (d.success) setSubmissions(d.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSubmissionsLoading(false);
        }
    }

    // --- Navigation Handlers ---
    const handleClassClick = (cls: ClassData | { id: string, name: string }) => {
        setSelectedClassId(cls.id);
        setSelectedClassName(cls.name);
        setLevel('assignments');
    };

    const handleAssignmentClick = (assmt: Assignment) => {
        setSelectedAssignmentId(assmt.id);
        setSelectedAssignment(assmt);
        fetchSubmissions(assmt.id);
        setLevel('students');
    };

    const handleBreadcrumbClick = (targetLevel: 'classes' | 'assignments') => {
        if (targetLevel === 'classes') {
            setLevel('classes');
            setSelectedClassId(null);
            setSelectedAssignmentId(null);
            setSelectedSubmission(null);
        } else if (targetLevel === 'assignments') {
            setLevel('assignments');
            setSelectedAssignmentId(null);
            setSelectedSubmission(null);
        }
    };

    // --- Create Handler ---
    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreateError('');
        setCreating(true);
        try {
            const formData = new FormData();
            Object.entries(createForm).forEach(([key, value]) => formData.append(key, value));
            if (createFile) formData.append('attachment', createFile);
            // Default class if in level 2
            if (!createForm.class_id && selectedClassId && selectedClassId !== 'global') {
                formData.set('class_id', selectedClassId);
            }

            const res = await fetch('/api/admin/assignments', { method: 'POST', body: formData });
            const d = await res.json();
            if (d.success) {
                setShowCreate(false);
                setCreateForm({ title: '', subject: '', description: '', given_date: new Date().toISOString().split('T')[0], due_date: '', class_id: '', batch: '' });
                setCreateFile(null);
                fetchData(); // Refresh assignments
            } else {
                setCreateError(d.error || 'Failed to create assignment.');
            }
        } catch (err: any) {
            setCreateError(err.message || 'Network error.');
        } finally {
            setCreating(false);
        }
    }

    // --- Delete Handler ---
    const initDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteAssignmentId(id);
        setDeleteStage(1);
    };

    const confirmDeleteStep1 = () => setDeleteStage(2);

    const executeDelete = async () => {
        if (!deleteAssignmentId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/assignments/${deleteAssignmentId}`, {
                method: 'DELETE'
            });
            const d = await res.json();
            if (d.success) {
                setAssignments(prev => prev.filter(a => a.id !== deleteAssignmentId));
                setDeleteStage(0);
                if (level === 'students' && selectedAssignmentId === deleteAssignmentId) {
                    setLevel('assignments');
                }
            } else {
                alert((d.error || 'Failed to delete assignment') + (d.debug ? '\nDebug: ' + JSON.stringify(d.debug) : ''));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete assignment');
        } finally {
            setDeleting(false);
        }
    };

    // --- Update Handler (Slide Panel) ---
    async function handleUpdateSubmission(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedAssignmentId || !selectedSubmission) return;
        setSavingSubmission(true);
        const fd = new FormData(e.currentTarget);
        fd.append('student_id', selectedSubmission.student_id);

        try {
            const res = await fetch(`/api/admin/assignments/${selectedAssignmentId}/submissions`, {
                method: 'POST',
                body: fd
            });
            const d = await res.json();
            if (d.success) {
                fetchSubmissions(selectedAssignmentId); // refresh list
                fetchData(); // refresh global stats
                setSelectedSubmission(null); // close panel
            } else {
                alert(d.error || 'Failed to update submission');
            }
        } catch (err) {
            console.error(err);
            alert('Network error updating submission');
        } finally {
            setSavingSubmission(false);
        }
    }

    // --- Data Memos ---
    const today = new Date().toISOString().split('T')[0];

    // Compute aggregated class stats
    const enrichedClasses = useMemo(() => {
        const globalClass = { id: 'global', name: 'Global / Unassigned', totalStudents: 0, totalAssignments: 0, pendingSubmissions: 0 };
        const mapped = classes.map(c => {
            const clsStudents = students.filter(s => s.class_id === c.id).length;
            const clsAssignments = assignments.filter(a => a.class_id === c.id);
            const pendingSubs = clsAssignments.reduce((acc, curr) => acc + (curr.stats?.pending || 0), 0);
            return {
                ...c,
                totalStudents: clsStudents,
                totalAssignments: clsAssignments.length,
                pendingSubmissions: pendingSubs
            };
        });

        // Add global if any global assignments exist
        const globalAssignments = assignments.filter(a => !a.class_id);
        if (globalAssignments.length > 0) {
            globalClass.totalAssignments = globalAssignments.length;
            globalClass.totalStudents = students.length; // Global applies to all
            globalClass.pendingSubmissions = globalAssignments.reduce((acc, curr) => acc + (curr.stats?.pending || 0), 0);
            mapped.push(globalClass as any);
        }

        return mapped;
    }, [classes, assignments, students]);

    const filteredAssignments = useMemo(() => {
        if (!selectedClassId) return [];
        if (selectedClassId === 'global') return assignments.filter(a => !a.class_id);
        return assignments.filter(a => a.class_id === selectedClassId);
    }, [assignments, selectedClassId]);

    const filteredSubmissions = useMemo(() => {
        if (studentFilter === 'all') return submissions;
        return submissions.filter(s => s.submission_status === studentFilter);
    }, [submissions, studentFilter]);


    // ========== RENDERERS ==========

    const renderBreadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-6 bg-white py-3 px-5 rounded-[16px] shadow-sm w-fit border border-slate-100">
            <button onClick={() => handleBreadcrumbClick('classes')} className="hover:text-rose-600 transition-colors">Assignments</button>
            {level === 'assignments' || level === 'students' ? (
                <>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <button onClick={() => handleBreadcrumbClick('assignments')} className={`hover:text-rose-600 transition-colors ${level === 'assignments' ? 'text-slate-800 font-bold' : ''}`}>
                        {selectedClassName}
                    </button>
                </>
            ) : null}
            {level === 'students' && selectedAssignment ? (
                <>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-800 font-bold truncate max-w-[200px]">{selectedAssignment.title}</span>
                </>
            ) : null}
        </div>
    );

    const renderLevelClasses = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrichedClasses.map(c => (
                <div
                    key={c.id}
                    onClick={() => handleClassClick(c)}
                    className="bg-white rounded-[20px] p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-slate-100 cursor-pointer group"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-rose-50 text-rose-600 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{c.name}</h3>
                            <p className="text-xs text-slate-500">View class assignments</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-[16px] px-4 py-3 text-center border border-slate-100">
                            <p className="text-2xl font-black text-slate-700">{c.totalStudents}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Students</p>
                        </div>
                        <div className="bg-slate-50 rounded-[16px] px-4 py-3 text-center border border-slate-100">
                            <p className="text-2xl font-black text-slate-700">{c.totalAssignments}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Assignments</p>
                        </div>
                        <div className="col-span-2 bg-amber-50 rounded-[16px] px-4 py-3 text-center border border-amber-100/50 flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-bold text-amber-700">{c.pendingSubmissions} Pending Submissions</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderLevelAssignments = () => {
        if (filteredAssignments.length === 0) {
            return (
                <div className="bg-white rounded-[24px] border border-slate-100 py-20 text-center shadow-sm">
                    <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Assignments Yet</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto">This class doesn't have any assignments assigned to them currently.</p>
                    <button onClick={() => setShowCreate(true)} className="mt-6 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
                        <Plus className="w-4 h-4" />
                        Create Assignment
                    </button>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAssignments.map(a => {
                    const isOverdue = a.due_date < today;
                    const dueDateStr = new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    const givenDateStr = new Date(a.given_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                    return (
                        <div key={a.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden relative group">
                            <div className="p-6 flex-1 cursor-pointer" onClick={() => handleAssignmentClick(a)}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {a.subject}
                                    </div>
                                    <div className="relative group/menu">
                                        <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" onClick={e => e.stopPropagation()}>
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 py-1 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 origin-top-right">
                                            <button onClick={() => handleAssignmentClick(a)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-rose-600 flex items-center gap-2">
                                                <Users className="w-4 h-4" /> View Submissions
                                            </button>
                                            <button onClick={(e) => initDelete(a.id, e)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight pr-4">{a.title}</h3>
                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-5">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Given: {givenDateStr}</span>
                                    <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                        <Clock className="w-4 h-4" /> Due: {dueDateStr}
                                    </span>
                                </div>

                                {/* Status Pills Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold uppercase">Total</span>
                                        <span className="text-sm font-black text-slate-700">{a.stats.total}</span>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
                                        <span className="text-xs text-emerald-600 font-semibold uppercase">Submitted</span>
                                        <span className="text-sm font-black text-emerald-700">{a.stats.submitted}</span>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center justify-between">
                                        <span className="text-xs text-amber-600 font-semibold uppercase">Pending</span>
                                        <span className="text-sm font-black text-amber-700">{a.stats.pending}</span>
                                    </div>
                                    <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex items-center justify-between">
                                        <span className="text-xs text-red-500 font-semibold uppercase">Missing</span>
                                        <span className="text-sm font-black text-red-600">{a.stats.missing}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderLevelStudents = () => {
        if (!selectedAssignment) return null;

        return (
            <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-bold uppercase tracking-wider">{selectedAssignment.subject}</span>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{selectedClassName}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-3">{selectedAssignment.title}</h2>
                        {selectedAssignment.description && (
                            <p className="text-sm text-slate-600 leading-relaxed mb-4">{selectedAssignment.description}</p>
                        )}
                        <div className="flex items-center gap-6 text-sm font-medium">
                            <span className="flex items-center gap-2 text-slate-500"><Calendar className="w-4 h-4" /> Given: {new Date(selectedAssignment.given_date).toLocaleDateString()}</span>
                            <span className={`flex items-center gap-2 ${selectedAssignment.due_date < today ? 'text-red-500' : 'text-slate-500'}`}>
                                <Clock className="w-4 h-4" /> Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    {selectedAssignment.attachment_url && (
                        <a
                            href={selectedAssignment.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 transition-colors"
                        >
                            <Download className="w-4 h-4 text-rose-500" />
                            Reference File
                        </a>
                    )}
                </div>

                {/* Submissions Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-400" /> Student Submissions
                        </h3>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={studentFilter}
                                onChange={(e) => setStudentFilter(e.target.value)}
                                className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="submitted">Submitted</option>
                                <option value="graded">Graded</option>
                                <option value="missing">Missing</option>
                            </select>
                        </div>
                    </div>

                    {submissionsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-[20px] animate-pulse border border-slate-100" />)}
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="bg-white rounded-[24px] border border-slate-100 py-16 text-center shadow-sm">
                            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No students match the selected filter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredSubmissions.map(sub => (
                                <div
                                    key={sub.id}
                                    onClick={() => setSelectedSubmission(sub)}
                                    className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                        {sub.students?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{sub.students?.name}</p>
                                        <p className="text-xs text-slate-400 font-medium">Roll: {sub.students?.roll_number}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[sub.submission_status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {sub.submission_status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="flex">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 lg:ml-64">
                    <Header
                        title="Assignments & Homework"
                        subtitle="Structured assignment tracking and feedback"
                        onMobileMenuToggle={() => setSidebarOpen(true)}
                    />
                    <main className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 relative overflow-hidden">

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            {renderBreadcrumbs()}
                            {level !== 'students' && (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-rose-600/20 active:scale-95 whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Assignment
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-[24px] animate-pulse border border-slate-100" />)}
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {level === 'classes' && renderLevelClasses()}
                                {level === 'assignments' && renderLevelAssignments()}
                                {level === 'students' && renderLevelStudents()}
                            </div>
                        )}

                        {/* Slide Panel for Student Submission */}
                        {/* Overlay */}
                        <div
                            className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedSubmission ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                            onClick={() => setSelectedSubmission(null)}
                        />
                        {/* Drawer */}
                        <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col ${selectedSubmission ? 'translate-x-0' : 'translate-x-full'}`}>
                            {selectedSubmission && (
                                <>
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">{selectedSubmission.students?.name}</h3>
                                            <p className="text-sm font-medium text-slate-500">Roll: {selectedSubmission.students?.roll_number}</p>
                                        </div>
                                        <button onClick={() => setSelectedSubmission(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm hover:shadow transition-all">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-6 flex-1 overflow-y-auto">
                                        <div className="mb-6 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-sm font-bold text-slate-600">Current Status:</span>
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${STATUS_COLORS[selectedSubmission.submission_status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {selectedSubmission.submission_status}
                                            </span>
                                        </div>

                                        {selectedSubmission.submission_file_url ? (
                                            <a href={selectedSubmission.submission_file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold text-sm transition-colors mb-6">
                                                <FileText className="w-5 h-5" /> View Submitted Work
                                            </a>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 border border-slate-100 border-dashed rounded-xl mb-6">
                                                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-sm font-medium text-slate-500">No file uploaded by student</p>
                                            </div>
                                        )}

                                        <form id="eval-form" onSubmit={handleUpdateSubmission} className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Update Status</label>
                                                <select name="submission_status" defaultValue={selectedSubmission.submission_status} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-white transition-all outline-none">
                                                    <option value="pending">Pending</option>
                                                    <option value="submitted">Submitted</option>
                                                    <option value="missing">Missing</option>
                                                    <option value="late">Late</option>
                                                    <option value="graded">Graded / Reviewed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Marks Obtained</label>
                                                <input name="marks_obtained" type="number" step="0.1" defaultValue={selectedSubmission.marks_obtained || ''} placeholder="e.g., 9.5 or 85" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-white transition-all outline-none placeholder:font-normal" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Teacher Feedback</label>
                                                <textarea name="feedback" rows={3} defaultValue={selectedSubmission.feedback || ''} placeholder="Add remarks or feedback for the student..." className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-white transition-all outline-none resize-none placeholder:font-normal" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Upload Evaluated File</label>
                                                <input name="eval_file" type="file" accept=".pdf,image/*" className="w-full text-sm font-medium text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors border border-slate-200 border-dashed rounded-xl cursor-pointer" />
                                            </div>
                                        </form>
                                    </div>
                                    <div className="p-6 border-t border-slate-100 bg-white">
                                        <button type="submit" form="eval-form" disabled={savingSubmission} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 flex justify-center items-center">
                                            {savingSubmission ? 'Saving Changes...' : 'Save Evaluated Results'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                    </main>
                </div>
            </div>

            {/* CREATE MODAL */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">New Assignment</h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Title *</label>
                                        <input required value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Algebra Worksheet" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subject *</label>
                                        <input required value={createForm.subject} onChange={e => setCreateForm({ ...createForm, subject: e.target.value })} placeholder="Mathematics" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Class</label>
                                        <select value={createForm.class_id} onChange={e => setCreateForm({ ...createForm, class_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none bg-white">
                                            <option value="">All Classes (Global)</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Given Date</label>
                                        <input type="date" value={createForm.given_date} onChange={e => setCreateForm({ ...createForm, given_date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Due Date *</label>
                                        <input required type="date" value={createForm.due_date} onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                                        <textarea rows={2} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Instructions for the students..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Attachment (Max 10MB)</label>
                                        <input type="file" accept=".pdf,image/png,image/jpeg" onChange={e => setCreateFile(e.target.files?.[0] || null)} className="w-full text-sm font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors border border-slate-200 border-dashed rounded-xl cursor-pointer" />
                                    </div>
                                </div>
                                {createError && (
                                    <div className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl p-3 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" /> {createError}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 font-bold py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={creating} className="flex-1 font-bold py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-colors active:scale-95 shadow-sm">
                                        {creating ? 'Creating...' : 'Create Assignment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL (DOUBLE CONFIRMATION) */}
            {deleteStage > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteStage(0)} />
                    <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 z-10 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Are you {deleteStage === 2 ? 'REALLY ' : ''}sure?</h2>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            {deleteStage === 1
                                ? "This will delete the assignment. Proceed?"
                                : "This action cannot be undone. All student submissions, files, and grades associated with this assignment will be permanently removed."}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteStage(0)} className="flex-1 font-bold py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
                                Cancel
                            </button>
                            {deleteStage === 1 ? (
                                <button onClick={confirmDeleteStep1} className="flex-1 font-bold py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-sm">
                                    Yes, Proceed
                                </button>
                            ) : (
                                <button onClick={executeDelete} disabled={deleting} className="flex-1 font-bold py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm active:scale-95">
                                    {deleting ? 'Deleting...' : 'Confirm Delete!'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

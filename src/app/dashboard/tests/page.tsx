'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import {
  Search, Plus, Trophy, TrendingUp, TrendingDown, Users, BookOpen, ChevronDown, ChevronUp, X, Save, Trash2, Eye, FileText, Upload, Download, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Check, ClipboardList, Filter, MoreVertical, Calendar, UploadCloud, AlertTriangle
} from 'lucide-react';

interface Test {
  id: string;
  test_name: string;
  type: string;
  total_marks: number;
  subject: string;
  test_date: string;
  class_id?: string;
  classes: { id: string; name: string } | null;
  test_results: any[];
  paper_path?: string | null;
}

interface ClassData {
  id: string;
  name: string;
}

const TEST_TYPES = ["weekly", "monthly", "unit", "annual", "practice"];
const TYPE_COLOR: Record<string, string> = {
  weekly: "bg-blue-100 text-blue-700 border-blue-200",
  monthly: "bg-purple-100 text-purple-700 border-purple-200",
  unit: "bg-green-100 text-green-700 border-green-200",
  annual: "bg-red-100 text-red-700 border-red-200",
  practice: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AdminTestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data States
  const [tests, setTests] = useState<Test[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);

  // Navigation & Selected States
  const [level, setLevel] = useState<'classes' | 'tests' | 'students'>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  // Level 3 specific state
  const [detailedStudents, setDetailedStudents] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<Record<string, number>>({});
  const [studentFilter, setStudentFilter] = useState<string>('all');

  // Drawer State
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number | null>(null);
  const [drawerInput, setDrawerInput] = useState<any>({});
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [uploadingAnswerSheet, setUploadingAnswerSheet] = useState(false);
  const [drawerSuccess, setDrawerSuccess] = useState("");
  const [drawerError, setDrawerError] = useState("");
  const [activeAccordion, setActiveAccordion] = useState<'analysis' | 'recommendations' | null>('analysis');

  // Create Test State
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    test_name: "", type: "weekly", total_marks: "100", subject: "", test_date: new Date().toISOString().split('T')[0], class_id: "", test_paper: null as File | null
  });

  // Delete Modal State
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [deleteStage, setDeleteStage] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [testsRes, clsRes, stuRes] = await Promise.all([
        fetch('/api/admin/tests'),
        fetch('/api/classes'),
        fetch('/api/students')
      ]);

      const testsData = await testsRes.json();
      const clsData = await clsRes.json();
      const stuData = await stuRes.json();

      if (testsData.success) {
        setTests(testsData.data || []);
        // If we are deep refreshed, update local test
        if (selectedTestId) {
          const t = testsData.data.find((x: any) => x.id === selectedTestId);
          if (t) setSelectedTest(t);
        }
      }
      setClasses(Array.isArray(clsData) ? clsData : (clsData.data || []));
      setStudents(Array.isArray(stuData) ? stuData : (stuData.students || stuData.data || []));

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Load rich detail for the selected test (improvements, individual records, etc)
  async function fetchTestDetails(testId: string) {
    setLoading(true);
    try {
      const [detailRes, impRes] = await Promise.all([
        fetch(`/api/admin/tests/${testId}`),
        fetch(`/api/admin/tests/${testId}/improvements`)
      ]);

      const detailData = await detailRes.json();
      const impData = await impRes.json();

      if (impData.success) {
        setImprovements(impData.improvements || {});
      }

      if (detailData.success && detailData.data) {
        const resultsRaw = detailData.data.results || [];
        // Update selectedTest fully 
        setSelectedTest(detailData.data.test);

        // Match students to results
        const tClassId = detailData.data.test.classes?.id || detailData.data.test.class_id;
        let classStudents = students.filter(s => s.class_id == tClassId);
        // If it's a global test, match all students 
        if (!tClassId) classStudents = students;

        const merged = classStudents.map((s: any) => {
          const r = resultsRaw.find((rx: any) => rx.students?.id === s.id || rx.student_id === s.id);
          return { student: s, result: r || null };
        });

        // Sort evaluated first, then alphabetically
        merged.sort((a: any, b: any) => {
          if (a.result && !b.result) return -1;
          if (!a.result && b.result) return 1;
          if (a.result && b.result) return a.result.rank - b.result.rank;
          return a.student.name.localeCompare(b.student.name);
        });

        setDetailedStudents(merged);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // --- Navigation ---
  const handleClassClick = (cls: ClassData | { id: string, name: string }) => {
    setSelectedClassId(cls.id);
    setSelectedClassName(cls.name);
    setLevel('tests');
  };

  const handleTestClick = (t: Test) => {
    setSelectedTestId(t.id);
    setSelectedTest(t);
    fetchTestDetails(t.id);
    setLevel('students');
  };

  const handleBreadcrumb = (targetLevel: 'classes' | 'tests') => {
    if (targetLevel === 'classes') {
      setLevel('classes');
      setSelectedClassId(null);
      setSelectedTestId(null);
      setSelectedStudentIdx(null);
    } else if (targetLevel === 'tests') {
      setLevel('tests');
      setSelectedTestId(null);
      setSelectedStudentIdx(null);
    }
  };

  // --- Create ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(""); setCreating(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null) formData.append(k, v instanceof File ? v : String(v)); });

    // Auto assign class if in class view
    if (!form.class_id && selectedClassId && selectedClassId !== 'global') {
      formData.set('class_id', selectedClassId);
    }

    try {
      const res = await fetch("/api/admin/tests", { method: "POST", body: formData });
      const d = await res.json();
      if (d.success) {
        setShowCreate(false); fetchData();
        setForm({ test_name: "", type: "weekly", total_marks: "100", subject: "", test_date: new Date().toISOString().split('T')[0], class_id: "", test_paper: null });
      } else {
        setCreateError(d.error || "Failed to create test.");
      }
    } catch (err: any) { setCreateError(err.message); } finally { setCreating(false); }
  }

  // --- Delete ---
  const initDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTestId(id);
    setDeleteStage(1);
  };

  const confirmDeleteStep1 = () => setDeleteStage(2);

  const executeDelete = async () => {
    if (!deleteTestId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tests/${deleteTestId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setTests(prev => prev.filter(t => t.id !== deleteTestId));
        setDeleteStage(0);
        if (level === 'students' && selectedTestId === deleteTestId) {
          setLevel('tests');
        }
      } else {
        alert((d.error || 'Failed to delete test') + (d.debug ? '\nDebug: ' + JSON.stringify(d.debug) : ''));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete test');
    } finally {
      setDeleting(false);
    }
  };


  // --- Drawer Functions ---
  const openStudentDrawer = (idx: number) => {
    setSelectedStudentIdx(idx);
    setDrawerSuccess(""); setDrawerError("");
    const s = detailedStudents[idx];
    setDrawerInput({
      marks_obtained: s.result?.marks_obtained ?? "",
      weak_topics: s.result?.weak_topics ?? "",
      strong_areas: s.result?.strong_areas ?? "",
      teacher_suggestions: s.result?.teacher_suggestions ?? "",
      improvement_plan: s.result?.improvement_plan ?? "",
      remarks: s.result?.remarks ?? "",
    });
  };

  const navigateStudent = (dir: "prev" | "next") => {
    setDrawerSuccess(""); setDrawerError("");
    if (selectedStudentIdx === null) return;
    let newIdx = selectedStudentIdx + (dir === 'next' ? 1 : -1);
    if (newIdx >= 0 && newIdx < filteredStudents.length) { // filtered navigation
      // We need to map the filtered index back to the real index in detailedStudents
      const targetStudentId = filteredStudents[newIdx].student.id;
      const absoluteIdx = detailedStudents.findIndex(s => s.student.id === targetStudentId);
      openStudentDrawer(absoluteIdx);
    }
  };

  async function handleSaveStudentResult() {
    if (!selectedTest || selectedStudentIdx === null) return;
    setSavingDrawer(true); setDrawerSuccess(""); setDrawerError("");

    const studData = detailedStudents[selectedStudentIdx];

    // Prepare the entire array since API requires it for ranking
    const allResults = detailedStudents.filter(s => s.result || s.student.id === studData.student.id).map(s => {
      if (s.student.id === studData.student.id) {
        return {
          student_id: s.student.id,
          marks_obtained: Number(drawerInput.marks_obtained) || 0,
          weak_topics: drawerInput.weak_topics,
          strong_areas: drawerInput.strong_areas,
          teacher_suggestions: drawerInput.teacher_suggestions,
          improvement_plan: drawerInput.improvement_plan,
          remarks: drawerInput.remarks,
          answer_sheet_path: s.result?.answer_sheet_path || null
        };
      }
      return {
        student_id: s.student.id,
        marks_obtained: s.result.marks_obtained,
        weak_topics: s.result.weak_topics,
        strong_areas: s.result.strong_areas,
        teacher_suggestions: s.result.teacher_suggestions,
        improvement_plan: s.result.improvement_plan,
        remarks: s.result.remarks,
        answer_sheet_path: s.result.answer_sheet_path || null
      };
    });

    try {
      const res = await fetch(`/api/admin/tests/${selectedTest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: allResults }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Failed to save results.");

      // Success. We should refresh to recalculate ranks and such from API response.
      await fetchTestDetails(selectedTest.id);
      await fetchData(); // Refresh global avg counts

      setDrawerSuccess("Changes saved successfully!");
      setTimeout(() => setDrawerSuccess(""), 3000);
    } catch (err: any) {
      setDrawerError(err.message || "An error occurred.");
    } finally {
      setSavingDrawer(false);
    }
  }


  // Upload inside Drawer
  async function handleUploadAnswerSheet(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTest || selectedStudentIdx === null) return;
    if (file.type !== "application/pdf") { setDrawerError("Only PDF files allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { setDrawerError("PDF max 10MB limit."); return; }

    const studData = detailedStudents[selectedStudentIdx];
    setUploadingAnswerSheet(true); setDrawerSuccess(""); setDrawerError("");

    const fd = new FormData();
    fd.append("answer_sheet", file);
    try {
      const r = await fetch(`/api/admin/tests/${selectedTest.id}/results/${studData.student.id}/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) {
        await fetchTestDetails(selectedTest.id);
        setDrawerSuccess("Uploaded successfully.");
        setTimeout(() => setDrawerSuccess(""), 4000);
      } else { setDrawerError(d.error || "Upload failed."); }
    } catch (err: any) { setDrawerError("Upload failed: " + err.message); } finally { setUploadingAnswerSheet(false); if (e.target) e.target.value = ""; }
  }

  async function handleDeleteAnswerSheet() {
    if (!selectedTest || selectedStudentIdx === null || !confirm("Delete this evaluated answer sheet?")) return;
    const studData = detailedStudents[selectedStudentIdx];
    try {
      const r = await fetch(`/api/admin/tests/${selectedTest.id}/results/${studData.student.id}/upload`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) {
        await fetchTestDetails(selectedTest.id);
        setDrawerSuccess("Deleted successfully.");
        setTimeout(() => setDrawerSuccess(""), 4000);
      } else { setDrawerError(d.error || "Delete failed."); }
    } catch (err: any) { setDrawerError("Delete failed: " + err.message); }
  }


  // Upload for Question Paper (Top level of test details)
  const [uploadingPaper, setUploadingPaper] = useState(false);
  async function uploadQuestionPaper(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTest) return;
    setUploadingPaper(true);
    const fd = new FormData();
    fd.append("test_paper", file);
    try {
      const r = await fetch(`/api/admin/tests/${selectedTest.id}/upload-paper`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) {
        setSelectedTest({ ...selectedTest, paper_path: d.url });
        fetchData();
      } else alert(d.error);
    } finally { setUploadingPaper(false); }
  }



  // --- Computed Data ---
  const enrichedClasses = useMemo(() => {
    const globalClass = { id: 'global', name: 'Global / Unassigned tests', totalStudents: students.length, totalTests: 0, pendingEvals: 0 };
    const mapped = classes.map(c => {
      const clsStudents = students.filter(s => s.class_id === c.id).length;
      const clsTests = tests.filter(t => t.class_id === c.id);
      let pending = 0;
      clsTests.forEach(t => {
        const evaluated = t.test_results?.length || 0;
        if (evaluated < clsStudents) pending += (clsStudents - evaluated);
      });
      return {
        ...c,
        totalStudents: clsStudents,
        totalTests: clsTests.length,
        pendingEvals: pending
      };
    });

    const globalTests = tests.filter(t => !t.class_id);
    if (globalTests.length > 0) {
      globalClass.totalTests = globalTests.length;
      globalTests.forEach(t => {
        const evaluated = t.test_results?.length || 0;
        if (evaluated < students.length) globalClass.pendingEvals += (students.length - evaluated);
      });
      mapped.push(globalClass as any);
    }

    return mapped;
  }, [classes, tests, students]);


  const filteredTests = useMemo(() => {
    if (!selectedClassId) return [];
    if (selectedClassId === 'global') return tests.filter(t => !t.class_id);
    return tests.filter(t => t.class_id === selectedClassId);
  }, [tests, selectedClassId]);

  const filteredStudents = useMemo(() => {
    if (studentFilter === 'all') return detailedStudents;
    return detailedStudents.filter(s => {
      const evaluated = !!s.result;
      if (studentFilter === 'evaluated') return evaluated;
      if (studentFilter === 'not_evaluated') return !evaluated;
      if (studentFilter === 'top_performers' && evaluated && selectedTest) {
        return ((s.result.marks_obtained / selectedTest.total_marks) * 100) >= 80;
      }
      if (studentFilter === 'needs_review' && evaluated && selectedTest) {
        return ((s.result.marks_obtained / selectedTest.total_marks) * 100) < 50;
      }
      return true;
    });
  }, [detailedStudents, studentFilter, selectedTest]);

  // Helpers
  const getTestStats = (test: Test, tClassId: string | undefined) => {
    const targetStudentsCount = tClassId && tClassId !== 'global' ? students.filter(s => s.class_id === tClassId).length : students.length;
    const evaluated = test.test_results?.length || 0;
    const pending = Math.max(0, targetStudentsCount - evaluated);
    let avg = null;
    let highest = 0;
    if (evaluated > 0 && test.test_results) {
      let sum = 0;
      test.test_results.forEach(r => {
        const perc = (r.marks_obtained / test.total_marks) * 100;
        sum += perc;
        if (r.marks_obtained > highest) highest = r.marks_obtained;
      });
      avg = Math.round(sum / evaluated);
    }
    return { avg, evaluated, pending, highest, targetStudentsCount };
  };


  // ========== RENDERERS ==========

  const renderLevelClasses = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enrichedClasses.map(c => (
        <div
          key={c.id}
          onClick={() => handleClassClick(c)}
          className="bg-white rounded-[20px] p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-slate-100 cursor-pointer group"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{c.name}</h3>
              <p className="text-xs text-slate-500">View performance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-[16px] px-4 py-3 text-center border border-slate-100">
              <p className="text-2xl font-black text-slate-700">{c.totalStudents}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Students</p>
            </div>
            <div className="bg-slate-50 rounded-[16px] px-4 py-3 text-center border border-slate-100">
              <p className="text-2xl font-black text-slate-700">{c.totalTests}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Total Tests</p>
            </div>
            <div className="col-span-2 bg-amber-50 rounded-[16px] px-4 py-3 text-center border border-amber-100/50 flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-700">{c.pendingEvals} Pending Evaluations</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLevelTests = () => {
    if (filteredTests.length === 0) {
      return (
        <div className="bg-white rounded-[24px] border border-slate-100 py-20 text-center shadow-sm">
          <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Tests Created</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">There are no tests recorded for this class yet.</p>
          <button onClick={() => setShowCreate(true)} className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            Conduct Test
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTests.map(t => {
          const { avg, evaluated, pending, highest } = getTestStats(t, String(t.class_id || selectedClassId));
          const isDraft = evaluated === 0;

          return (
            <div key={t.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden relative group">
              <div className="p-6 flex-1 cursor-pointer" onClick={() => handleTestClick(t)}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${TYPE_COLOR[t.type] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    {t.type}
                  </div>
                  <div className="relative group/menu">
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" onClick={e => e.stopPropagation()}>
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 origin-top-right">
                      <button onClick={() => handleTestClick(t)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> View Results
                      </button>
                      <button onClick={(e) => initDelete(t.id, e)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight pr-4">{t.test_name}</h3>
                <div className="flex flex-col gap-1.5 text-xs font-medium text-slate-500 mb-5">
                  <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {t.subject} • {t.total_marks} Marks</span>
                  <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(t.test_date).toLocaleDateString('en-GB')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Avg Score</p>
                    <p className="text-lg font-black text-indigo-600 leading-tight">{avg !== null ? `${avg}%` : '--'}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">Highest</p>
                    <p className="text-lg font-black text-emerald-700 leading-tight">{highest}</p>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                    <p className="text-[10px] text-sky-600 font-semibold uppercase">Evaluated</p>
                    <p className="text-sm font-black text-sky-700">{evaluated}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-semibold uppercase">Pending</p>
                    <p className="text-sm font-black text-amber-700">{pending}</p>
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
    if (!selectedTest) return null;

    const evaluatedTotal = detailedStudents.filter(s => s.result).length;
    const totalStuds = detailedStudents.length;

    return (
      <div className="space-y-6">
        {/* Header Information Card */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider ${TYPE_COLOR[selectedTest.type] || 'bg-slate-50 border-slate-100'}`}>{selectedTest.type}</span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{selectedTest.subject}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">{selectedTest.test_name}</h2>

            <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
              <span className="flex items-center gap-2 text-slate-600"><Trophy className="w-4 h-4 text-amber-500" /> Max Marks: {selectedTest.total_marks}</span>
              <span className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4 text-indigo-500" /> Date: {new Date(selectedTest.test_date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Paper Upload Widget in Details */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl w-full md:w-auto shrink-0 flex items-center min-w-[280px]">
            <div className="mr-4 bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 mr-4">
              <p className="text-sm font-bold text-slate-700 mb-0.5">Question Paper</p>
              <p className="text-[10px] text-slate-500">{selectedTest.paper_path ? 'PDF Uploaded' : 'Upload File (PDF under 10MB)'}</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {selectedTest.paper_path && (
                <a href={selectedTest.paper_path} target="_blank" className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-white border border-indigo-100 px-2 py-1 rounded-md shadow-sm">
                  <Eye className="w-3.5 h-3.5" /> View
                </a>
              )}
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm cursor-pointer relative overflow-hidden">
                <Upload className="w-3.5 h-3.5" /> {selectedTest.paper_path ? 'Replace' : 'Upload'}
                <input type="file" accept=".pdf" className="hidden" onChange={uploadQuestionPaper} disabled={uploadingPaper} />
                {uploadingPaper && <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]"><span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-ping"></span></div>}
              </label>
            </div>
          </div>
        </div>

        {/* Submissions Section */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" /> Student Records
              </h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">{evaluatedTotal}/{totalStuds} Evaluated</span>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm min-w-[180px]">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-full"
              >
                <option value="all">All Students</option>
                <option value="evaluated">Evaluated Only</option>
                <option value="not_evaluated">Not Evaluated</option>
                <option value="top_performers">Top Performers (80%+)</option>
                <option value="needs_review">Needs Review {"\u003c"} 50%</option>
              </select>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 py-16 text-center shadow-sm">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No students match the selected filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((studData, relIdx) => {
                const s = studData.student;
                const r = studData.result;
                const isEval = !!r;
                const perc = isEval ? (r.marks_obtained / selectedTest.total_marks) * 100 : 0;

                let borderColor = "border-slate-100";
                let bgDecor = "";
                if (isEval) {
                  if (perc < 50) { borderColor = "border-red-200"; bgDecor = "bg-red-50"; }
                  else if (perc < 80) { borderColor = "border-sky-200"; bgDecor = "bg-sky-50"; }
                  else { borderColor = "border-emerald-200"; bgDecor = "bg-emerald-50"; }
                }

                // Absolute Index for logic
                const absoluteIdx = detailedStudents.findIndex(xd => xd.student.id === s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => openStudentDrawer(absoluteIdx)}
                    className={`bg-white rounded-[20px] p-5 border ${borderColor} shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden`}
                  >
                    <div className={`absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 rounded-full opacity-30 ${bgDecor}`} />

                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-4 z-10 relative">
                        <p className="font-bold text-slate-800 line-clamp-1">{s.name}</p>
                        <p className="text-xs text-slate-400 font-medium">Roll: {s.roll_number}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md whitespace-nowrap z-10 
                                                ${isEval ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                        {isEval ? 'Evaluated' : 'Pending'}
                      </span>
                    </div>

                    {isEval ? (
                      <div className="flex items-end justify-between pt-2 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wide">Score</p>
                          <p className="text-xl font-black text-slate-800 leading-none">
                            {r.marks_obtained} <span className="text-xs text-slate-400 font-semibold">/ {selectedTest.total_marks}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wide">
                            Rank #{r.rank}
                          </p>
                          <p className="text-sm font-bold text-indigo-600">{perc.toFixed(1)}%</p>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-50 mt-1">
                        <p className="text-xs text-slate-400 font-medium italic">Score not yet entered and saved.</p>
                      </div>
                    )}
                  </div>
                );
              })}
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
            title="Tests & Results"
            subtitle="Structured tests, evaluation tracking, and analytics"
            onMobileMenuToggle={() => setSidebarOpen(true)}
          />

          <main className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 relative overflow-hidden">

            {/* Breadcrumbs & Action Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white py-3 px-5 rounded-[16px] shadow-sm w-fit border border-slate-100">
                <button onClick={() => handleBreadcrumb('classes')} className="hover:text-indigo-600 transition-colors">Tests</button>
                {level === 'tests' || level === 'students' ? (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <button onClick={() => handleBreadcrumb('tests')} className={`hover:text-indigo-600 transition-colors ${level === 'tests' ? 'text-slate-800 font-bold' : ''}`}>
                      {selectedClassName || 'All'}
                    </button>
                  </>
                ) : null}
                {level === 'students' && selectedTest ? (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-800 font-bold truncate max-w-[200px]">{selectedTest.test_name}</span>
                  </>
                ) : null}
              </div>

              {level !== 'students' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  New Test
                </button>
              )}
            </div>

            {loading && level === 'classes' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-[24px] animate-pulse border border-slate-100" />)}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {level === 'classes' && renderLevelClasses()}
                {level === 'tests' && renderLevelTests()}
                {level === 'students' && renderLevelStudents()}
              </div>
            )}

            {/* Slide Panel for Test Submissions / Grading */}
            <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedStudentIdx !== null ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setSelectedStudentIdx(null)} />

            <div className={`fixed right-0 top-0 bottom-0 w-full max-w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col ${selectedStudentIdx !== null ? 'translate-x-0' : 'translate-x-full'}`}>
              {selectedStudentIdx !== null && selectedTest && (
                <>
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="pr-4">
                      <h3 className="text-xl font-bold text-slate-800 leading-tight mb-1">{detailedStudents[selectedStudentIdx].student.name}</h3>
                      <p className="text-xs font-medium text-slate-500 flex gap-2">Roll: {detailedStudents[selectedStudentIdx].student.roll_number} <span>•</span> {selectedTest.test_name}</p>
                    </div>
                    <button onClick={() => setSelectedStudentIdx(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm hover:shadow transition-all shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50/30 p-5 space-y-5">

                    {/* Status messages popup in drawer */}
                    {drawerError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 shadow-sm font-bold flex gap-2"><AlertCircle className="w-4 h-4" />{drawerError}</div>}
                    {drawerSuccess && <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200 shadow-sm font-bold flex gap-2"><CheckCircle className="w-4 h-4" />{drawerSuccess}</div>}

                    {/* Score Editor */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Obtained</label>
                        {detailedStudents[selectedStudentIdx].result && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">Rank: #{detailedStudents[selectedStudentIdx].result.rank}</span>
                        )}
                      </div>
                      <div className="flex items-end gap-2">
                        <input
                          type="number"
                          value={drawerInput.marks_obtained}
                          onChange={e => setDrawerInput({ ...drawerInput, marks_obtained: e.target.value })}
                          className="w-1/2 bg-slate-50 border-b-2 border-slate-200 focus:border-indigo-600 text-4xl font-black text-slate-800 p-2 outline-none transition-colors transition-all shadow-inner rounded-t-lg"
                          placeholder="0"
                        />
                        <span className="text-lg font-bold text-slate-400 pb-2">/ {selectedTest.total_marks}</span>
                      </div>
                    </div>

                    {/* PDF Upload */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Evaluated Answer Sheet</h4>
                      {detailedStudents[selectedStudentIdx].result?.answer_sheet_path ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-3">
                          <a href={detailedStudents[selectedStudentIdx].result.answer_sheet_path} target="_blank" className="flex items-center gap-3 text-sm font-bold text-emerald-700 hover:text-emerald-800">
                            <FileText className="w-6 h-6 shrink-0" />
                            <span className="truncate flex-1">View Student PDF</span>
                            <Eye className="w-4 h-4 shrink-0" />
                          </a>
                          <div className="flex gap-2 pt-2 border-t border-emerald-100">
                            <label className="flex-1 text-center py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors">
                              Replace File
                              <input type="file" className="hidden" accept=".pdf" onChange={handleUploadAnswerSheet} disabled={uploadingAnswerSheet} />
                            </label>
                            <button type="button" onClick={handleDeleteAnswerSheet} className="flex-1 text-center py-1.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
                          <UploadCloud className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-500 mb-2 leading-relaxed">Admin upload mapped to student result<br />(PDF max 10MB)</p>
                          <label className={`text-xs font-black px-4 py-2 rounded-lg cursor-pointer transition-colors border ${uploadingAnswerSheet ? 'bg-indigo-50 border-indigo-200 text-indigo-400 cursor-wait' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'}`}>
                            {uploadingAnswerSheet ? 'Uploading...' : 'Browse File'}
                            <input type="file" className="hidden" accept=".pdf" onChange={handleUploadAnswerSheet} disabled={uploadingAnswerSheet} />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Performance Accordions */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button onClick={() => setActiveAccordion(activeAccordion === 'analysis' ? null : 'analysis')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Analytics & Setup</span>
                        {activeAccordion === 'analysis' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {activeAccordion === 'analysis' && (
                        <div className="p-4 space-y-4 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Strong Areas</label>
                            <input type="text" placeholder="e.g. Vocabulary, Speed" value={drawerInput.strong_areas} onChange={e => setDrawerInput({ ...drawerInput, strong_areas: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-300" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Weak Topics</label>
                            <input type="text" placeholder="e.g. Grammar rules" value={drawerInput.weak_topics} onChange={e => setDrawerInput({ ...drawerInput, weak_topics: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-300" />
                          </div>
                        </div>
                      )}

                      <button onClick={() => setActiveAccordion(activeAccordion === 'recommendations' ? null : 'recommendations')} className="w-full flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Feedback</span>
                        {activeAccordion === 'recommendations' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {activeAccordion === 'recommendations' && (
                        <div className="p-4 space-y-4 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Teacher Suggestions</label>
                            <textarea rows={2} placeholder="Focus on..." value={drawerInput.teacher_suggestions} onChange={e => setDrawerInput({ ...drawerInput, teacher_suggestions: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-300 resize-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Improvement Plan</label>
                            <textarea rows={2} placeholder="Actionable steps..." value={drawerInput.improvement_plan} onChange={e => setDrawerInput({ ...drawerInput, improvement_plan: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-300 resize-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">General Remarks</label>
                            <textarea rows={2} placeholder="Excellent performance!" value={drawerInput.remarks} onChange={e => setDrawerInput({ ...drawerInput, remarks: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-300 resize-none" />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="p-5 border-t border-slate-100 bg-white flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 shrink-0">
                      <button onClick={() => navigateStudent("prev")} className="p-3 hover:bg-slate-200 transition-colors border-r border-slate-200" title="Previous Student">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <button onClick={() => navigateStudent("next")} className="p-3 hover:bg-slate-200 transition-colors" title="Next Student">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                    <button onClick={handleSaveStudentResult} disabled={savingDrawer} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 flex justify-center items-center h-[46px]">
                      {savingDrawer ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
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
              <h2 className="text-xl font-bold text-slate-800">New Test Record</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Test Name *</label>
                    <input required value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} placeholder="e.g. Chapter 1 Weekly Test" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subject *</label>
                    <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Type *</label>
                    <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      {TEST_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Class</label>
                    <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      <option value="">All Classes (Global)</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Given Date</label>
                    <input type="date" value={form.test_date} onChange={e => setForm({ ...form, test_date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Marks *</label>
                    <input required type="number" value={form.total_marks} onChange={e => setForm({ ...form, total_marks: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Question Paper PDF (Max 5MB)</label>
                    <input type="file" accept=".pdf" onChange={e => setForm({ ...form, test_paper: e.target.files?.[0] || null })} className="w-full text-sm font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors border border-slate-200 border-dashed rounded-xl cursor-pointer" />
                  </div>
                </div>
                {createError && (
                  <div className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl p-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {createError}
                  </div>
                )}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 font-bold py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 font-bold py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors active:scale-95 shadow-sm">
                    {creating ? 'Creating...' : 'Create Test'}
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
                ? "This will delete the Test. Proceed?"
                : "This action cannot be undone. All student result records, scores, and evaluations associated with this test will be permanently removed."}
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

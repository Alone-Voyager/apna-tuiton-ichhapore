import { useState, useEffect, useMemo } from 'react';
import { Test, ClassData, EnrichedClass, StudentResult } from '../types';

export function useTestsManager() {
  const [tests, setTests] = useState<Test[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<'classes' | 'tests' | 'students'>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [detailedStudents, setDetailedStudents] = useState<StudentResult[]>([]);
  const [improvements, setImprovements] = useState<Record<string, number>>({});
  const [studentFilter, setStudentFilter] = useState<string>('all');
  
  // Drawer/Modal States
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number | null>(null);
  const [drawerInput, setDrawerInput] = useState<any>({});
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [uploadingAnswerSheet, setUploadingAnswerSheet] = useState(false);
  const [drawerSuccess, setDrawerSuccess] = useState("");
  const [drawerError, setDrawerError] = useState("");
  const [activeAccordion, setActiveAccordion] = useState<'analysis' | 'recommendations' | null>('analysis');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    test_name: "", type: "weekly", total_marks: "100", subject: "", test_date: new Date().toISOString().split('T')[0], class_id: "", test_paper: null as File | null
  });
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [deleteStage, setDeleteStage] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPaper, setUploadingPaper] = useState(false);

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
        setSelectedTest(detailData.data.test);

        const tClassId = detailData.data.test.classes?.id || detailData.data.test.class_id;
        let classStudents = students.filter(s => s.class_id == tClassId);
        if (!tClassId) classStudents = students;

        const merged = classStudents.map((s: any) => {
          const r = resultsRaw.find((rx: any) => rx.students?.id === s.id || rx.student_id === s.id);
          return { student: s, result: r || null };
        });

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(""); setCreating(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null) formData.append(k, v instanceof File ? v : String(v)); });

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
        alert((d.error || 'Failed to delete test'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete test');
    } finally {
      setDeleting(false);
    }
  };

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

  const navigateStudent = (dir: "prev" | "next") => {
    setDrawerSuccess(""); setDrawerError("");
    if (selectedStudentIdx === null) return;
    let newIdx = selectedStudentIdx + (dir === 'next' ? 1 : -1);
    if (newIdx >= 0 && newIdx < filteredStudents.length) {
      const targetStudentId = filteredStudents[newIdx].student.id;
      const absoluteIdx = detailedStudents.findIndex(s => s.student.id === targetStudentId);
      openStudentDrawer(absoluteIdx);
    }
  };

  async function handleSaveStudentResult() {
    if (!selectedTest || selectedStudentIdx === null) return;
    setSavingDrawer(true); setDrawerSuccess(""); setDrawerError("");

    const studData = detailedStudents[selectedStudentIdx];

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

      await fetchTestDetails(selectedTest.id);
      await fetchData();

      setDrawerSuccess("Changes saved successfully!");
      setTimeout(() => setDrawerSuccess(""), 3000);
    } catch (err: any) {
      setDrawerError(err.message || "An error occurred.");
    } finally {
      setSavingDrawer(false);
    }
  }

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
      } as EnrichedClass;
    });

    const globalTests = tests.filter(t => !t.class_id);
    if (globalTests.length > 0) {
      globalClass.totalTests = globalTests.length;
      globalTests.forEach(t => {
        const evaluated = t.test_results?.length || 0;
        if (evaluated < students.length) globalClass.pendingEvals += (students.length - evaluated);
      });
      mapped.push(globalClass as EnrichedClass);
    }

    return mapped;
  }, [classes, tests, students]);

  const filteredTests = useMemo(() => {
    if (!selectedClassId) return [];
    if (selectedClassId === 'global') return tests.filter(t => !t.class_id);
    return tests.filter(t => t.class_id === selectedClassId);
  }, [tests, selectedClassId]);

  return {
    tests, classes, students, loading, level, selectedClassId, selectedClassName, selectedTestId, selectedTest,
    detailedStudents, improvements, studentFilter, selectedStudentIdx, drawerInput, savingDrawer,
    uploadingAnswerSheet, drawerSuccess, drawerError, activeAccordion, showCreate, creating, createError,
    form, deleteTestId, deleteStage, deleting, uploadingPaper,
    setStudentFilter, setShowCreate, setForm, setDeleteStage, setSelectedStudentIdx, setActiveAccordion, setDrawerInput,
    handleClassClick, handleTestClick, handleBreadcrumb, handleCreate, initDelete, confirmDeleteStep1, executeDelete,
    openStudentDrawer, navigateStudent, handleSaveStudentResult, handleUploadAnswerSheet, handleDeleteAnswerSheet,
    uploadQuestionPaper, enrichedClasses, filteredTests, filteredStudents
  };
}

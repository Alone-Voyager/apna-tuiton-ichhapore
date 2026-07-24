'use client';

import { Suspense } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTestsManager } from './hooks/useTestsManager';
import { ClassGrid } from './components/ClassGrid';
import { TestGrid } from './components/TestGrid';
import { StudentDetailsGrid } from './components/StudentDetailsGrid';
import { StudentDrawer } from './components/StudentDrawer';
import { CreateTestModal } from './components/CreateTestModal';
import { DeleteTestModal } from './components/DeleteTestModal';
import { Test } from './types';

function TestsContent() {
  const {
    loading, level, selectedClassName, selectedTest,
    detailedStudents, studentFilter, selectedStudentIdx, drawerInput, savingDrawer,
    uploadingAnswerSheet, drawerSuccess, drawerError, activeAccordion, showCreate, creating, createError,
    form, deleteStage, deleting, uploadingPaper,
    setStudentFilter, setShowCreate, setForm, setDeleteStage, setSelectedStudentIdx, setActiveAccordion, setDrawerInput,
    handleClassClick, handleTestClick, handleBreadcrumb, handleBackClick, handleCreate, initDelete, confirmDeleteStep1, executeDelete,
    navigateStudent, handleSaveStudentResult, handleUploadAnswerSheet, handleDeleteAnswerSheet,
    uploadQuestionPaper, enrichedClasses, filteredTests, filteredStudents, students
  } = useTestsManager();

  const getTestStats = (test: Test) => {
    const tClassId = test.classes?.id || test.class_id;
    const targetStudentsCount = tClassId ? students.filter(s => s.class_id === tClassId).length : students.length;
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
    return { avg, evaluated, pending, highest };
  };

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <main className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 relative overflow-hidden">
        {/* Breadcrumbs & Action Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            {level !== 'classes' && (
              <button
                onClick={handleBackClick}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white py-3 px-5 rounded-[16px] shadow-sm w-fit border border-slate-100">
              <button onClick={() => handleBreadcrumb('classes')} className="hover:text-indigo-600 transition-colors">Tests</button>
              {(level === 'tests' || level === 'students') && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <button onClick={() => handleBreadcrumb('tests')} className={`hover:text-indigo-600 transition-colors ${level === 'tests' ? 'text-slate-800 font-bold' : ''}`}>
                    {selectedClassName || 'All'}
                  </button>
                </>
              )}
              {level === 'students' && selectedTest && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <span className="text-slate-800 font-bold truncate max-w-[200px]">{selectedTest.test_name}</span>
                </>
              )}
            </div>
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
            {level === 'classes' && <ClassGrid enrichedClasses={enrichedClasses} onClassClick={handleClassClick} />}
            {level === 'tests' && <TestGrid filteredTests={filteredTests} onTestClick={handleTestClick} onDeleteInit={initDelete} onShowCreate={() => setShowCreate(true)} getTestStats={getTestStats} />}
            {level === 'students' && selectedTest && (
              <StudentDetailsGrid
                selectedTest={selectedTest}
                detailedStudents={detailedStudents}
                filteredStudents={filteredStudents}
                studentFilter={studentFilter}
                setStudentFilter={setStudentFilter}
                openStudentDrawer={setSelectedStudentIdx}
                uploadingPaper={uploadingPaper}
                uploadQuestionPaper={uploadQuestionPaper}
              />
            )}
          </div>
        )}

        {/* MODALS & SLIDE PANELS */}
        <StudentDrawer
          selectedStudentIdx={selectedStudentIdx}
          selectedTest={selectedTest}
          detailedStudents={detailedStudents}
          drawerInput={drawerInput}
          drawerError={drawerError}
          drawerSuccess={drawerSuccess}
          savingDrawer={savingDrawer}
          uploadingAnswerSheet={uploadingAnswerSheet}
          activeAccordion={activeAccordion}
          onClose={() => setSelectedStudentIdx(null)}
          onNavigate={navigateStudent}
          onSave={handleSaveStudentResult}
          onUpload={handleUploadAnswerSheet}
          onDeleteAnswer={handleDeleteAnswerSheet}
          setActiveAccordion={setActiveAccordion}
          setDrawerInput={setDrawerInput}
        />

        <CreateTestModal
          showCreate={showCreate}
          creating={creating}
          createError={createError}
          form={form}
          classes={enrichedClasses}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          setForm={setForm}
        />

        <DeleteTestModal
          deleteStage={deleteStage}
          deleting={deleting}
          onClose={() => setDeleteStage(0)}
          onConfirmStep1={confirmDeleteStep1}
          onExecuteDelete={executeDelete}
        />
      </main>
    </div>
  );
}

export default function AdminTestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-[#F8FAFC] p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <TestsContent />
    </Suspense>
  );
}

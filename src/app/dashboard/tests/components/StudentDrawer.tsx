import { ChevronLeft, X, AlertCircle, CheckCircle, FileText, Eye, UploadCloud, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Test, StudentResult } from '../types';

interface StudentDrawerProps {
  selectedStudentIdx: number | null;
  selectedTest: Test | null;
  detailedStudents: StudentResult[];
  drawerInput: any;
  drawerError: string;
  drawerSuccess: string;
  savingDrawer: boolean;
  uploadingAnswerSheet: boolean;
  activeAccordion: 'analysis' | 'recommendations' | null;
  onClose: () => void;
  onNavigate: (dir: 'prev' | 'next') => void;
  onSave: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAnswer: () => void;
  setActiveAccordion: (a: 'analysis' | 'recommendations' | null) => void;
  setDrawerInput: (input: any) => void;
}

export function StudentDrawer({
  selectedStudentIdx,
  selectedTest,
  detailedStudents,
  drawerInput,
  drawerError,
  drawerSuccess,
  savingDrawer,
  uploadingAnswerSheet,
  activeAccordion,
  onClose,
  onNavigate,
  onSave,
  onUpload,
  onDeleteAnswer,
  setActiveAccordion,
  setDrawerInput
}: StudentDrawerProps) {
  if (selectedStudentIdx === null || !selectedTest) return null;

  const currentStudent = detailedStudents[selectedStudentIdx];

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedStudentIdx !== null ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={onClose} />

      <div className={`fixed right-0 top-0 bottom-0 w-full max-w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col ${selectedStudentIdx !== null ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <button onClick={onClose} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 shrink-0">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 leading-tight truncate">{currentStudent.student.name}</h3>
            <p className="text-xs font-medium text-slate-500 flex gap-2">Roll: {currentStudent.student.roll_number} <span>•</span> {selectedTest.test_name}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm hover:shadow transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-5 space-y-5">
          {drawerError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 shadow-sm font-bold flex gap-2"><AlertCircle className="w-4 h-4" />{drawerError}</div>}
          {drawerSuccess && <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200 shadow-sm font-bold flex gap-2"><CheckCircle className="w-4 h-4" />{drawerSuccess}</div>}

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Obtained</label>
              {currentStudent.result && (
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">Rank: #{currentStudent.result.rank}</span>
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

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Evaluated Answer Sheet</h4>
            {currentStudent.result?.answer_sheet_path ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-3">
                <a href={currentStudent.result.answer_sheet_path} target="_blank" className="flex items-center gap-3 text-sm font-bold text-emerald-700 hover:text-emerald-800">
                  <FileText className="w-6 h-6 shrink-0" />
                  <span className="truncate flex-1">View Student PDF</span>
                  <Eye className="w-4 h-4 shrink-0" />
                </a>
                <div className="flex gap-2 pt-2 border-t border-emerald-100">
                  <label className="flex-1 text-center py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors">
                    Replace File
                    <input type="file" className="hidden" accept=".pdf" onChange={onUpload} disabled={uploadingAnswerSheet} />
                  </label>
                  <button type="button" onClick={onDeleteAnswer} className="flex-1 text-center py-1.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                  <input type="file" className="hidden" accept=".pdf" onChange={onUpload} disabled={uploadingAnswerSheet} />
                </label>
              </div>
            )}
          </div>

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
            <button onClick={() => onNavigate("prev")} className="p-3 hover:bg-slate-200 transition-colors border-r border-slate-200" title="Previous Student">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={() => onNavigate("next")} className="p-3 hover:bg-slate-200 transition-colors" title="Next Student">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <button onClick={onSave} disabled={savingDrawer} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 flex justify-center items-center h-[46px]">
            {savingDrawer ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}

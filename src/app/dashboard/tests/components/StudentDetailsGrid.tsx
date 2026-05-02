import { Trophy, Calendar, FileText, Eye, Upload, Users, Filter } from 'lucide-react';
import { Test, StudentResult } from '../types';
import { TYPE_COLOR } from '../constants';

interface StudentDetailsGridProps {
  selectedTest: Test;
  detailedStudents: StudentResult[];
  filteredStudents: StudentResult[];
  studentFilter: string;
  setStudentFilter: (f: string) => void;
  openStudentDrawer: (idx: number) => void;
  uploadingPaper: boolean;
  uploadQuestionPaper: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function StudentDetailsGrid({
  selectedTest,
  detailedStudents,
  filteredStudents,
  studentFilter,
  setStudentFilter,
  openStudentDrawer,
  uploadingPaper,
  uploadQuestionPaper
}: StudentDetailsGridProps) {
  const evaluatedTotal = detailedStudents.filter(s => s.result).length;
  const totalStuds = detailedStudents.length;

  return (
    <div className="space-y-6">
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
              <option value="needs_review">Needs Review {"<"} 50%</option>
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
            {filteredStudents.map((studData) => {
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
}

import { Trophy, Plus, MoreVertical, Eye, Trash2, BookOpen, Calendar } from 'lucide-react';
import { Test } from '../types';
import { TYPE_COLOR } from '../constants';

interface TestGridProps {
  filteredTests: Test[];
  onTestClick: (t: Test) => void;
  onDeleteInit: (id: string, e: React.MouseEvent) => void;
  onShowCreate: () => void;
  getTestStats: (test: Test) => { avg: number | null; evaluated: number; pending: number; highest: number };
}

export function TestGrid({ filteredTests, onTestClick, onDeleteInit, onShowCreate, getTestStats }: TestGridProps) {
  if (filteredTests.length === 0) {
    return (
      <div className="bg-white rounded-[24px] border border-slate-100 py-20 text-center shadow-sm">
        <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-2">No Tests Created</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">There are no tests recorded for this class yet.</p>
        <button onClick={onShowCreate} className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
          <Plus className="w-4 h-4" />
          Conduct Test
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {filteredTests.map(t => {
        const { avg, evaluated, pending, highest } = getTestStats(t);

        return (
          <div key={t.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden relative group">
            <div className="p-6 flex-1 cursor-pointer" onClick={() => onTestClick(t)}>
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${TYPE_COLOR[t.type] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                  {t.type}
                </div>
                <div className="relative group/menu">
                  <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" onClick={e => e.stopPropagation()}>
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 origin-top-right">
                    <button onClick={() => onTestClick(t)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> View Results
                    </button>
                    <button onClick={(e) => onDeleteInit(t.id, e)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
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
}

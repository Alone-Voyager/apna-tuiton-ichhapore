import { ClipboardList, Users } from 'lucide-react';
import { EnrichedClass } from '../types';

interface ClassGridProps {
  enrichedClasses: EnrichedClass[];
  onClassClick: (cls: EnrichedClass) => void;
}

export function ClassGrid({ enrichedClasses, onClassClick }: ClassGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enrichedClasses.map(c => (
        <div
          key={c.id}
          onClick={() => onClassClick(c)}
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
}

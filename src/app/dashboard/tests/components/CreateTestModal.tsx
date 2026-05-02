import { X, AlertTriangle } from 'lucide-react';
import { TEST_TYPES } from '../constants';
import { ClassData } from '../types';

interface CreateTestModalProps {
  showCreate: boolean;
  creating: boolean;
  createError: string;
  form: any;
  classes: ClassData[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setForm: (form: any) => void;
}

export function CreateTestModal({
  showCreate,
  creating,
  createError,
  form,
  classes,
  onClose,
  onSubmit,
  setForm
}: CreateTestModalProps) {
  if (!showCreate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">New Test Record</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
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
              <button type="button" onClick={onClose} className="flex-1 font-bold py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={creating} className="flex-1 font-bold py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors active:scale-95 shadow-sm">
                {creating ? 'Creating...' : 'Create Test'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

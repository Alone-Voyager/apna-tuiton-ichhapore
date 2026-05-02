import { AlertTriangle } from 'lucide-react';

interface DeleteTestModalProps {
  deleteStage: number;
  deleting: boolean;
  onClose: () => void;
  onConfirmStep1: () => void;
  onExecuteDelete: () => void;
}

export function DeleteTestModal({
  deleteStage,
  deleting,
  onClose,
  onConfirmStep1,
  onExecuteDelete
}: DeleteTestModalProps) {
  if (deleteStage === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-md p-8 z-10 text-center animate-in zoom-in-95 duration-200">
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
          <button onClick={onClose} className="flex-1 font-bold py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          {deleteStage === 1 ? (
            <button onClick={onConfirmStep1} className="flex-1 font-bold py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-sm">
              Yes, Proceed
            </button>
          ) : (
            <button onClick={onExecuteDelete} disabled={deleting} className="flex-1 font-bold py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm active:scale-95">
              {deleting ? 'Deleting...' : 'Confirm Delete!'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

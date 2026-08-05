import React, { Suspense } from 'react';
import RecordsClient from './RecordsClient';

export default function StaffRecordsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading records portal…</div>}>
      <RecordsClient />
    </React.Suspense>
  );
}

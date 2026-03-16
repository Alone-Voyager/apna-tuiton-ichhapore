import React, { Suspense } from 'react';
import AttendanceClient from './AttendanceClient';

export default function DailyAttendancePage() {
  return (
    <React.Suspense fallback={<div>Loading attendance…</div>}>
      <AttendanceClient />
    </React.Suspense>
  );
}
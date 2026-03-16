import { Suspense } from 'react';
import StudentsClient from './StudentsClient';


export default function Students() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <StudentsClient />
    </Suspense>
  );
}

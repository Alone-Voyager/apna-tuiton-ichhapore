'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface AtRiskStudent {
  student_id: string;
  student_name: string;
  consecutive_leaves: number;
  last_leave_date: string;
  days_until_suspension: number;
}

interface SuspendedStudent {
  id: string;
  name: string;
  roll_number: string;
  status: string;
  updated_at: string;
  notes: string;
}

interface ConsecutiveLeaveData {
  atRiskStudents: AtRiskStudent[];
  suspendedStudents: SuspendedStudent[];
  summary: {
    totalAtRisk: number;
    totalSuspended: number;
  };
}

export default function ConsecutiveLeaveMonitor({ organizationId }: { organizationId?: string }) {
  const [data, setData] = useState<ConsecutiveLeaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<SuspendedStudent | null>(null);
  const [reactivationReason, setReactivationReason] = useState('');
  const [isReactivating, setIsReactivating] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(organizationId || null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // If organizationId not provided, fetch it from the user's profile/session
      let currentOrgId = orgId;
      if (!currentOrgId) {
        // For now, we'll fetch from students table or use a default
        // In production, this should come from auth context
        const studentResponse = await fetch('/api/students?limit=1');
        const studentData = await studentResponse.json();
        if (studentData.students && studentData.students.length > 0) {
          currentOrgId = studentData.students[0].organization_id;
          setOrgId(currentOrgId);
        }
      }

      if (!currentOrgId) {
        setError('Organization ID not found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/attendance/consecutive-leave?organization_id=${currentOrgId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch consecutive leave data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReactivateClick = (student: SuspendedStudent) => {
    setSelectedStudent(student);
    setReactivationReason('');
    setShowReactivateDialog(true);
  };

  const handleReactivate = async () => {
    if (!selectedStudent) return;

    try {
      setIsReactivating(true);

      // Get admin ID from session - for now use a placeholder
      // In production, get from auth context
      const adminId = selectedStudent.id; // Temporary: use student ID as admin ID

      const response = await fetch('/api/attendance/reactivate-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          adminId,
          reason: reactivationReason || 'Manual reactivation by admin'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate student');
      }

      const result = await response.json();

      if (result.success) {
        // Refresh data
        await fetchData();
        setShowReactivateDialog(false);
        setSelectedStudent(null);
      } else {
        setError(result.message || 'Failed to reactivate student');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsReactivating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading consecutive leave data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Mobile Optimized SaaS Look */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-2">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-orange-200/40">
            <AlertTriangle className="w-20 h-20" />
          </div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="bg-orange-100 p-1.5 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-orange-900 leading-tight">Students<br className="hidden sm:block" /> at Risk</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600 tracking-tight">{data.summary.totalAtRisk}</div>
            <p className="text-[10px] sm:text-xs font-medium text-orange-600/80 mt-1">
              5-6 consecutive leaves
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-red-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-red-200/40">
            <XCircle className="w-20 h-20" />
          </div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="bg-red-100 p-1.5 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-red-900 leading-tight">Suspended<br className="hidden sm:block" /> Students</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl sm:text-4xl font-bold text-red-600 tracking-tight">{data.summary.totalSuspended}</div>
            <p className="text-[10px] sm:text-xs font-medium text-red-600/80 mt-1">
              7+ consecutive leaves
            </p>
          </div>
        </div>
      </div>

      {/* At Risk Students */}
      {data.atRiskStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base md:text-lg">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Students at Risk of Suspension
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              These students have 5-6 consecutive leave days and are approaching automatic suspension.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.atRiskStudents.map((student) => (
                <div
                  key={student.student_id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 border rounded-lg bg-orange-50 border-orange-200 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{student.student_name}</div>
                    <div className="text-xs md:text-sm text-gray-600 mt-1">
                      Last leave: {new Date(student.last_leave_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
                    <div className="w-full sm:w-auto text-left sm:text-right">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 whitespace-nowrap">
                        {student.consecutive_leaves} consecutive leaves
                      </Badge>
                      <div className="text-xs text-gray-600 mt-1">
                        {student.days_until_suspension} day{student.days_until_suspension !== 1 ? 's' : ''} until suspension
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspended Students */}
      {data.suspendedStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base md:text-lg">
              <XCircle className="h-5 w-5 mr-2 text-red-500" />
              Suspended Students
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              These students have been automatically suspended due to 7+ consecutive leave days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.suspendedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col md:flex-row md:items-start md:justify-between p-3 md:p-4 border rounded-lg bg-red-50 border-red-200 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                      <span className="truncate">{student.name}</span>
                      <Badge variant="destructive" className="shrink-0">
                        Suspended
                      </Badge>
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 mt-1">
                      Roll No: {student.roll_number}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Suspended: {new Date(student.updated_at).toLocaleDateString()}
                    </div>
                    {student.notes && (
                      <div className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border break-words">
                        {student.notes.split('\n').slice(-1)[0]}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivateClick(student)}
                      className="text-green-600 border-green-300 hover:bg-green-50 w-full md:w-auto"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Reactivate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Issues */}
      {data.atRiskStudents.length === 0 && data.suspendedStudents.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>
            No students at risk of suspension or currently suspended due to consecutive leave.
          </AlertDescription>
        </Alert>
      )}

      {/* Reactivation Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reactivate <strong>{selectedStudent?.name}</strong>.
              Please provide a reason for reactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="reason">Reason for Reactivation</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Medical certificate provided, student recovered from illness"
              value={reactivationReason}
              onChange={(e) => setReactivationReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={isReactivating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isReactivating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Reactivate Student
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

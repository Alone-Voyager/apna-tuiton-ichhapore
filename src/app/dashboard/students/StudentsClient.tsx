"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '../../../components/ui/button';
import StudentDetailModal from '../../../components/StudentDetailModal';
import { sortClassesByStandardOrder, getSuggestedNextClassName, type Class as ClassType } from '../../../lib/utils/classOrdering';
import { Filter, X, Search, UserPlus, Eye, Trash2, UserSearch, Loader2, GripVertical } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../components/ui/pagination";

interface Class {
  id: string;
  name: string;
  monthly_fee: number;
  total_students: number;
  avg_attendance: number;
  fee_collection_rate: number;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  parent_name: string;
  phone: string | null;
  email: string | null;
  admission_date: string;
  monthly_fee: number;
  status: string;
  classes?: {
    id: string;
    name: string;
    monthly_fee: number;
  };
  fee_status?: 'paid' | 'overdue' | null;
  payment_months?: string[];
  overdue_months?: string[];
}

// Sortable Class Card Component
function SortableClassCard({ classInfo, isDragMode, isSelected, onSelect }: {
  classInfo: Class;
  isDragMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: classInfo.id, disabled: !isDragMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragMode) {
      e.preventDefault();
      onSelect(classInfo.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
      {...(isDragMode ? attributes : {})}
      {...(isDragMode ? listeners : {})}
    >
      {isDragMode && (
        <div className="absolute top-2 right-2 z-10 p-1 bg-blue-500 text-white rounded-md pointer-events-none">
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      {isDragMode && isSelected && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-green-500 text-white rounded-md text-xs font-medium pointer-events-none">
          Selected
        </div>
      )}
      <a
        href={isDragMode ? undefined : `/dashboard/students?class=${encodeURIComponent(classInfo.name)}`}
        onClick={handleClick}
        className={`block bg-white border-2 rounded-lg p-3 sm:p-4 transition-all ${isDragMode
          ? `hover:shadow-lg ${isSelected ? 'border-green-500 bg-green-50' : 'border-blue-200 hover:border-blue-300'} cursor-pointer`
          : 'border-slate-200 hover:shadow-md hover:border-red-200 cursor-pointer group'
          } ${isDragging ? 'shadow-2xl border-blue-400 cursor-grabbing' : ''}`}
      >
        <h3 className={`font-semibold text-slate-800 mb-2 text-sm sm:text-base ${isDragMode ? '' : 'group-hover:text-red-600'
          }`}>
          {classInfo.name}
        </h3>
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Students:</span>
            <span className="font-medium">{classInfo.total_students || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Attendance:</span>
            <span className="font-medium text-green-600">{classInfo.avg_attendance?.toFixed(1) || 0}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Monthly Fee:</span>
            <span className="font-medium text-blue-600">₹{classInfo.monthly_fee || 0}</span>
          </div>
        </div>
      </a>
    </div>
  );
}

export default function StudentsClient() {
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showAddClassModal, setShowAddClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newMonthlyFees, setNewMonthlyFees] = useState<string>('');
  const [localClasses, setLocalClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [inactiveStudents, setInactiveStudents] = useState<Student[]>([]); // Add state for inactive students
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [loadingInactiveStudents, setLoadingInactiveStudents] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDeleteStudentConfirm, setShowDeleteStudentConfirm] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<boolean>(false);
  const [isDragMode, setIsDragMode] = useState<boolean>(false);
  const [selectedClassForSwap, setSelectedClassForSwap] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentInactivePage, setCurrentInactivePage] = useState<number>(1);
  const studentsPerPage = 10;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press delay for touch devices
        tolerance: 5, // 5px of movement tolerance
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedClass = searchParams?.get('class') ?? null;

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch students when component mounts or when selectedClass changes
  // Wait for classes to load first to ensure proper filtering
  useEffect(() => {
    if (localClasses.length > 0 || !selectedClass) {
      fetchStudents();
      fetchInactiveStudents(); // Also fetch inactive students
    }
  }, [selectedClass, selectedTab, localClasses]); // Added selectedTab dependency

  // Refresh data when page becomes visible (e.g., after navigating back from admission page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchClasses();
        // fetchStudents will be called automatically by the effect above
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/classes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes');
      }

      const classes = data.data || [];
      // Always sort classes by standard academic order
      const sortedClasses = sortClassesByStandardOrder(classes);
      setLocalClasses(sortedClasses);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      setError('');

      // Build URL with query params
      let url = '/api/students';
      const params = new URLSearchParams();

      // If a class is selected, find its ID and filter by it
      if (selectedClass) {
        const classInfo = localClasses.find(c => c.name === decodeURIComponent(selectedClass));
        if (classInfo) {
          params.append('class_id', classInfo.id);
          console.log('Filtering students by class:', classInfo.name, 'ID:', classInfo.id);
        } else {
          console.warn('Class not found in localClasses:', selectedClass);
        }
      }

      // Add fee status filter based on selected tab
      if (selectedTab === 'paid') {
        params.append('fee_status', 'paid');
      } else if (selectedTab === 'pending') {
        params.append('fee_status', 'overdue');
      } else if (selectedTab === 'incomplete') {
        params.append('missing_info', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching students from:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }

      console.log('Fetched students:', data.students?.length || 0);
      setStudents(data.students || []);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchInactiveStudents = async () => {
    try {
      setLoadingInactiveStudents(true);
      setError('');

      // Build URL with query params
      let url = '/api/students';
      const params = new URLSearchParams();

      // Always fetch only inactive students
      params.append('include_inactive', 'only');

      // If a class is selected, find its ID and filter by it
      if (selectedClass) {
        const classInfo = localClasses.find(c => c.name === decodeURIComponent(selectedClass));
        if (classInfo) {
          params.append('class_id', classInfo.id);
          console.log('Filtering inactive students by class:', classInfo.name, 'ID:', classInfo.id);
        } else {
          console.warn('Class not found in localClasses:', selectedClass);
        }
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching inactive students from:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inactive students');
      }

      console.log('Fetched inactive students:', data.students?.length || 0);
      setInactiveStudents(data.students || []);
    } catch (err: any) {
      console.error('Error fetching inactive students:', err);
      // Don't set error state for inactive students to avoid disrupting the main view
    } finally {
      setLoadingInactiveStudents(false);
    }
  };

  const handleCreateClass = async () => {
    // Validation
    if (!newClassName.trim()) {
      setError('Class name is required');
      return;
    }

    const fees = Number(newMonthlyFees);
    if (isNaN(fees) || fees < 0) {
      setError('Please enter a valid monthly fee');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClassName.trim(),
          monthly_fee: fees,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class');
      }

      // Add the new class to the list
      setLocalClasses((prev) => [...prev, data.class]);

      // Close modal and reset form
      setShowAddClassModal(false);
      setNewClassName('');
      setNewMonthlyFees('');
    } catch (err: any) {
      console.error('Error creating class:', err);
      setError(err.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalClasses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleClassSelect = (classId: string) => {
    if (selectedClassForSwap === null) {
      // First selection
      setSelectedClassForSwap(classId);
    } else if (selectedClassForSwap === classId) {
      // Clicking the same class - deselect
      setSelectedClassForSwap(null);
    } else {
      // Second selection - swap the classes
      setLocalClasses((items) => {
        const firstIndex = items.findIndex((item) => item.id === selectedClassForSwap);
        const secondIndex = items.findIndex((item) => item.id === classId);

        if (firstIndex !== -1 && secondIndex !== -1) {
          return arrayMove(items, firstIndex, secondIndex);
        }
        return items;
      });
      // Reset selection after swap
      setSelectedClassForSwap(null);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    try {
      setDeleting(true);
      setError('');

      // Find the class by name to get its ID
      const classToDelete = localClasses.find(c => c.name === selectedClass);
      if (!classToDelete) {
        throw new Error('Class not found');
      }

      const response = await fetch(`/api/classes/${classToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete class');
      }

      // Remove the class from local state
      setLocalClasses((prev) => prev.filter(c => c.id !== classToDelete.id));

      // Close confirm dialog and redirect to students page
      setShowDeleteConfirm(false);
      router.push('/dashboard/students');

      // Refresh the data
      await fetchClasses();
      await fetchStudents();
    } catch (err: any) {
      console.error('Error deleting class:', err);
      setError(err.message || 'Failed to delete class');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      setDeletingStudent(true);
      setError('');

      // Check if student is already inactive - if so, hard delete (permanent)
      // If active, soft delete (mark as inactive)
      const isInactive = studentToDelete.status === 'inactive' || !studentToDelete.classes;
      const deleteType = isInactive ? 'hard' : 'soft';

      const response = await fetch(`/api/students/${studentToDelete.id}?type=${deleteType}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete student');
      }

      // Remove student from appropriate local state
      if (isInactive) {
        setInactiveStudents((prev) => prev.filter(s => s.id !== studentToDelete.id));
      } else {
        setStudents((prev) => prev.filter(s => s.id !== studentToDelete.id));
      }

      // Close confirm dialog
      setShowDeleteStudentConfirm(false);
      setStudentToDelete(null);

      // Refresh the data
      await fetchClasses();
      await fetchStudents();
      await fetchInactiveStudents();
    } catch (err: any) {
      console.error('Error deleting student:', err);
      setError(err.message || 'Failed to delete student');
    } finally {
      setDeletingStudent(false);
    }
  };

  const confirmDeleteStudent = (student: Student, isInactive = false) => {
    setStudentToDelete({ ...student, _isInactive: isInactive } as any);
    setShowDeleteStudentConfirm(true);
  };

  // Filter students based on search term only (fee status now handled by API)
  const filteredStudents = students.filter((student: Student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate pagination for active students
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Calculate pagination for inactive students
  const totalInactivePages = Math.ceil(inactiveStudents.length / studentsPerPage);
  const startInactiveIndex = (currentInactivePage - 1) * studentsPerPage;
  const endInactiveIndex = startInactiveIndex + studentsPerPage;
  const paginatedInactiveStudents = inactiveStudents.slice(startInactiveIndex, endInactiveIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTab, selectedClass]);

  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedStudent(null);
  };

  const getPageTitle = () => {
    if (selectedClass) {
      return `${selectedClass} Students`;
    }
    return 'Students Management';
  };

  const getPageSubtitle = () => {
    if (selectedClass) {
      const classInfo = localClasses.find((c) => c.name === selectedClass);
      return `Manage ${classInfo?.total_students || 0} students in ${selectedClass}`;
    }
    return 'Manage student records and information';
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-4 lg:space-y-6">
          {/* Class Filter Info */}
          {selectedClass && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row gap-2 sm:gap-0 items-start sm:items-center justify-between">
              <div className="flex items-start sm:items-center space-x-3">
                <Filter className="text-blue-600 w-4 h-4" />
                <span className="text-blue-800 font-medium text-sm sm:text-base">Showing students from: {selectedClass}</span>
              </div>
              <a
                href="/dashboard/students"
                className="text-blue-600 hover:text-blue-800 flex items-center font-medium text-sm whitespace-nowrap self-start sm:self-auto"
              >
                <X className="mr-1 w-4 h-4" />
                Clear Filter
              </a>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-4">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <div className="relative w-full shadow-sm rounded-full overflow-hidden border border-slate-200 bg-white group hover:shadow-md transition-shadow">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-11 pr-4 py-3 text-sm bg-transparent focus:outline-none focus:ring-0 placeholder:text-slate-400 text-slate-700"
                  />
                </div>

                {/* Filter chips — scrolls horizontally, extends to screen edges */}
                <div
                  className="flex items-center space-x-2 pb-1"
                  style={{
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch' as any,
                    scrollbarWidth: 'none',
                    marginLeft: -16,
                    marginRight: -16,
                    paddingLeft: 16,
                    paddingRight: 16,
                  }}
                >
                  <button
                    onClick={() => setSelectedTab('all')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${selectedTab === 'all'
                      ? 'bg-linear-to-r from-indigo-400 to-indigo-500 text-white shadow-md shadow-indigo-200/50'
                      : 'text-slate-500 bg-white border border-slate-100 shadow-sm'
                      }`}
                  >
                    All Students
                  </button>
                  <button
                    onClick={() => setSelectedTab('paid')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${selectedTab === 'paid'
                      ? 'bg-linear-to-r from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-200/50'
                      : 'text-slate-500 bg-white border border-slate-100 shadow-sm'
                      }`}
                  >
                    Fee Paid
                  </button>
                  <button
                    onClick={() => setSelectedTab('pending')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${selectedTab === 'pending'
                      ? 'bg-linear-to-r from-rose-400 to-rose-500 text-white shadow-md shadow-rose-200/50'
                      : 'text-slate-500 bg-white border border-slate-100 shadow-sm'
                      }`}
                  >
                    Fee Pending
                  </button>
                  <button
                    onClick={() => setSelectedTab('incomplete')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${selectedTab === 'incomplete'
                      ? 'bg-linear-to-r from-amber-400 to-amber-500 text-white shadow-md shadow-amber-200/50'
                      : 'text-slate-500 bg-white border border-slate-100 shadow-sm'
                      }`}
                  >
                    Incomplete Info
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Students Table/Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-3 sm:p-4 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                {selectedClass ? `${selectedClass} ` : ''}
                {selectedTab === 'incomplete' ? 'Students with Incomplete Info' : 'Student Records'} ({filteredStudents.length})
              </h3>
              {selectedTab === 'incomplete' && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Students missing parent name or WhatsApp number
                </p>
              )}
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="lg:hidden p-3 sm:p-4 space-y-3">
                  {paginatedStudents.map((student: Student) => (
                    <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-[0.98]" style={{ padding: '14px 12px 14px 14px' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 text-[15px] leading-tight mb-1 tracking-tight">{student.name}</div>
                          <div className="text-xs text-slate-500 mb-2 font-medium">{student.parent_name}</div>

                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {student.classes?.name && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {student.classes.name}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${student.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              student.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' :
                                student.status === 'pending' ? 'bg-amber-500' :
                                  'bg-slate-500'
                                }`}></div>
                              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                            </span>
                          </div>

                          {/* Show payment/overdue months */}
                          {(student.payment_months?.length || student.overdue_months?.length) ? (
                            <div className="flex flex-col gap-1 mb-2">
                              {student.payment_months && student.payment_months.length > 0 && (
                                <div className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded self-start">
                                  <span className="font-semibold">Paid:</span>
                                  <span className="wrap-break-word">{student.payment_months.join(', ')}</span>
                                </div>
                              )}
                              {student.overdue_months && student.overdue_months.length > 0 && (
                                <div className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 px-2 py-1 rounded self-start">
                                  <span className="font-semibold">Overdue:</span>
                                  <span className="wrap-break-word">{student.overdue_months.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center space-x-1 border border-slate-100 rounded-full p-1 bg-slate-50 shadow-sm">
                          <button
                            onClick={() => router.push(`/dashboard/students/details?id=${student.id}`)}
                            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-indigo-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-slate-200"></div>
                          <button
                            onClick={() => confirmDeleteStudent(student)}
                            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-rose-600"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                        {selectedTab === 'paid' && (
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Paid Months</th>
                        )}
                        {selectedTab === 'pending' && (
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Overdue Months</th>
                        )}
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Monthly Fee</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((student: Student) => (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-slate-800">{student.name}</div>
                              <div className="text-sm text-slate-500">{student.parent_name}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{student.classes?.name || 'No Class'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-green-100 text-green-800' :
                              student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                            </span>
                          </td>
                          {selectedTab === 'paid' && (
                            <td className="py-3 px-4">
                              <div className="text-xs text-green-700">
                                {student.payment_months && student.payment_months.length > 0
                                  ? student.payment_months.join(', ')
                                  : 'N/A'}
                              </div>
                            </td>
                          )}
                          {selectedTab === 'pending' && (
                            <td className="py-3 px-4">
                              <div className="text-xs text-red-700 font-medium">
                                {student.overdue_months && student.overdue_months.length > 0
                                  ? student.overdue_months.join(', ')
                                  : 'N/A'}
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4 text-slate-600">₹{student.monthly_fee}</td>
                          <td className="py-3 px-4 text-slate-600">{student.phone || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => router.push(`/dashboard/students/details?id=${student.id}`)}
                                className="p-1 hover:bg-slate-100 rounded"
                              >
                                <Eye className="text-slate-600 w-4 h-4" />
                              </button>
                              <button
                                onClick={() => confirmDeleteStudent(student)}
                                className="p-1 hover:bg-red-50 rounded"
                                title="Delete Student"
                              >
                                <Trash2 className="text-red-600 w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {filteredStudents.length === 0 && !loadingStudents && (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserSearch className="text-slate-400 w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">No students found</h3>
                    <p className="text-slate-600 mb-4">
                      {selectedClass
                        ? `No students found in ${selectedClass} matching your criteria.`
                        : 'No students found matching your search criteria.'
                      }
                    </p>
                    {(searchTerm || selectedTab !== 'all') && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedTab('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {filteredStudents.length > 0 && totalPages > 1 && (
                  <div className="p-4 border-t border-slate-200">
                    <div className="overflow-x-auto">
                      <Pagination className="min-w-max mx-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                      </Pagination>
                    </div>
                    <div className="text-center mt-2 text-sm text-slate-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions (Add/Delete class) */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {!selectedClass && localClasses.length > 1 && (
              <Button
                onClick={() => {
                  setIsDragMode(!isDragMode);
                  setSelectedClassForSwap(null); // Reset selection when toggling mode
                }}
                variant={isDragMode ? "default" : "outline"}
                className="w-full sm:w-auto justify-center whitespace-nowrap"
              >
                <GripVertical className="mr-2 w-4 h-4" />
                {isDragMode ? 'Exit Reorder' : 'Reorder Classes'}
              </Button>
            )}

            <div className="w-full sm:w-auto flex justify-end">
              {!selectedClass ? (
                <Button onClick={() => setShowAddClassModal(true)} className="w-full sm:w-auto whitespace-nowrap">
                  <UserPlus className="mr-2 w-4 h-4" />
                  Add New Class
                </Button>
              ) : (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Delete Class
                </Button>
              )}
            </div>
          </div>

          {/* Class Overview - only show if not filtering by specific class */}
          {!selectedClass && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-800">{error}</p>
                  <Button onClick={fetchClasses} variant="outline" className="mt-3">
                    Retry
                  </Button>
                </div>
              ) : localClasses.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="text-slate-400 w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No Classes Yet</h3>
                  <p className="text-slate-600 mb-4">
                    Get started by creating your first class to manage students.
                  </p>
                  <Button onClick={() => setShowAddClassModal(true)}>
                    <UserPlus className="mr-2 w-4 h-4" />
                    Add First Class
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localClasses.map(c => c.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 ${isDragMode ? 'bg-blue-50 p-2 rounded-lg border-2 border-dashed border-blue-200' : ''
                        }`}
                    >
                      {isDragMode && (
                        <div className="col-span-full text-center text-sm text-blue-600 mb-2">
                          <GripVertical className="inline w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Drag and drop classes to reorder them</span>
                          <span className="sm:hidden">Tap a class, then tap another to swap positions</span>
                        </div>
                      )}
                      {localClasses.map((classInfo) => (
                        <SortableClassCard
                          key={classInfo.id}
                          classInfo={classInfo}
                          isDragMode={isDragMode}
                          isSelected={selectedClassForSwap === classInfo.id}
                          onSelect={handleClassSelect}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {/* Previous Students Section (Inactive/Suspended) */}
          {inactiveStudents.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                  Previous Students ({inactiveStudents.length})
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Inactive or suspended students {selectedClass ? `from ${selectedClass}` : ''}
                </p>
              </div>

              {loadingInactiveStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden">
                    <div className="divide-y divide-slate-100">
                      {paginatedInactiveStudents.map((student: Student) => (
                        <div key={student.id} className="p-3 sm:p-4 hover:bg-slate-50 bg-slate-50/50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-medium text-slate-700 mb-1">{student.name}</div>
                              <div className="text-sm text-slate-500 mb-2">{student.parent_name}</div>
                              <div className="flex items-center space-x-4 text-xs text-slate-600">
                                <span>{student.classes?.name || 'No Class'}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => router.push(`/dashboard/students/${student.id}`)}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                              >
                                <Eye className="text-slate-600 w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                                Inactive
                              </span>
                              {student.status === 'suspended' && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{student.phone || 'No phone'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Student</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Class</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Monthly Fee</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Contact</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedInactiveStudents.map((student: Student) => (
                          <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 bg-slate-50/50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-slate-700">{student.name}</div>
                                <div className="text-sm text-slate-500">{student.parent_name}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{student.classes?.name || 'No Class'}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                                  Inactive
                                </span>
                                {student.status === 'suspended' && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Suspended
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">₹{student.monthly_fee}</td>
                            <td className="py-3 px-4 text-slate-600">{student.phone || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => router.push(`/dashboard/students/${student.id}`)}
                                  className="p-1 hover:bg-slate-100 rounded"
                                >
                                  <Eye className="text-slate-600 w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => confirmDeleteStudent(student, true)}
                                  className="p-1 hover:bg-red-50 rounded"
                                  title="Delete Student Permanently"
                                >
                                  <Trash2 className="text-red-600 w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Inactive Students */}
                  {inactiveStudents.length > studentsPerPage && totalInactivePages > 1 && (
                    <div className="p-4 border-t border-slate-200">
                      <div className="overflow-x-auto">
                        <Pagination className="min-w-max mx-auto">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentInactivePage > 1) setCurrentInactivePage(currentInactivePage - 1);
                              }}
                              className={currentInactivePage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>

                          {Array.from({ length: totalInactivePages }, (_, i) => i + 1).map((page) => {
                            if (
                              page === 1 ||
                              page === totalInactivePages ||
                              (page >= currentInactivePage - 1 && page <= currentInactivePage + 1)
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentInactivePage(page);
                                    }}
                                    isActive={currentInactivePage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            } else if (page === currentInactivePage - 2 || page === currentInactivePage + 2) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          })}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentInactivePage < totalInactivePages) setCurrentInactivePage(currentInactivePage + 1);
                              }}
                              className={currentInactivePage === totalInactivePages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                        </Pagination>
                      </div>
                      <div className="text-center mt-2 text-sm text-slate-600">
                        Showing {startInactiveIndex + 1} to {Math.min(endInactiveIndex, inactiveStudents.length)} of {inactiveStudents.length} inactive students
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Add New Class Modal */}
        {
          showAddClassModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/40" onClick={() => {
                if (!saving) {
                  setShowAddClassModal(false);
                  setError('');
                }
              }} />
              <div className="bg-white w-full max-w-md mx-4 rounded-lg shadow-lg z-10 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Create New Class</h3>
                <p className="text-sm text-slate-600 mb-4">Add a class name and the monthly fees.</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Class Name</label>
                    <input
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder={getSuggestedNextClassName(localClasses)}
                      disabled={saving}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suggested: {getSuggestedNextClassName(localClasses)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Monthly Fees (₹)</label>
                    <input
                      value={newMonthlyFees}
                      onChange={(e) => setNewMonthlyFees(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 1500"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={saving}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowAddClassModal(false);
                      setNewClassName('');
                      setNewMonthlyFees('');
                      setError('');
                    }}
                    disabled={saving}
                    className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateClass}
                    disabled={saving}
                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Delete Class Confirmation Modal */}
        {
          showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setShowDeleteConfirm(false)} />
              <div className="bg-white w-full max-w-md mx-4 rounded-lg shadow-lg z-10 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Delete Class</h3>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <p className="text-slate-600 mb-2">
                  Are you sure you want to delete <span className="font-semibold">{selectedClass}</span>?
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  This action cannot be undone. All students in this class will need to be reassigned.
                </p>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setError('');
                    }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteClass}
                    disabled={deleting}
                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Class
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Delete Student Confirmation Modal */}
        {
          showDeleteStudentConfirm && studentToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/40" onClick={() => !deletingStudent && setShowDeleteStudentConfirm(false)} />
              <div className="bg-white w-full max-w-md mx-4 rounded-lg shadow-lg z-10 p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${(studentToDelete as any)._isInactive ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                    <Trash2 className={`w-5 h-5 ${(studentToDelete as any)._isInactive ? 'text-red-600' : 'text-orange-600'
                      }`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {(studentToDelete as any)._isInactive ? 'Permanently Delete Student' : 'Delete Student'}
                  </h3>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <p className="text-slate-600 mb-2">
                  Are you sure you want to {(studentToDelete as any)._isInactive ? 'permanently delete' : 'delete'} <span className="font-semibold">{studentToDelete.name}</span>?
                </p>
                <p className="text-sm text-slate-500 mb-2">
                  Roll Number: <span className="font-medium">{studentToDelete.roll_number}</span>
                </p>

                {(studentToDelete as any)._isInactive ? (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium mb-1">⚠️ Warning: This action cannot be undone!</p>
                    <p className="text-xs text-red-700">
                      This will permanently delete the student and all associated data including:
                    </p>
                    <ul className="text-xs text-red-700 list-disc list-inside mt-1">
                      <li>Attendance records</li>
                      <li>Fee payment history</li>
                      <li>Performance records</li>
                      <li>All documents</li>
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-6">
                    This student will be marked as inactive and moved to "Previous Students" section. You can permanently delete them from there if needed.
                  </p>
                )}

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowDeleteStudentConfirm(false);
                      setStudentToDelete(null);
                      setError('');
                    }}
                    disabled={deletingStudent}
                    className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteStudent}
                    disabled={deletingStudent}
                    className={`px-4 py-2 rounded-md text-white text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${(studentToDelete as any)._isInactive ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                  >
                    {deletingStudent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {(studentToDelete as any)._isInactive ? 'Delete Permanently' : 'Delete Student'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        <StudentDetailModal
          student={selectedStudent}
          isOpen={showDetailModal}
          onClose={handleCloseModal}
        />
    </div>
  );
}
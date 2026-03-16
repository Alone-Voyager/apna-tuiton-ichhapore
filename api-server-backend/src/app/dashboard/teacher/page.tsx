"use client";

import { useState, useEffect } from "react";
import { Save, User, Plus, X, Eye, Edit, Trash2, Phone, Mail, GraduationCap, Calendar, Award, IndianRupee, BookOpen } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../../lib/supabase/client';

// Teachers list will be loaded from server via API

export default function TeacherPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    subjectSpecialization: '',
    qualification: '',
    experienceYears: '',
    joiningDate: '',
    status: 'active',
    address: '',
    salary: '',
  });

  const [teachers, setTeachers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    // get current session to pass token to server
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      alert('You must be signed in to perform this action');
      setLoading(false);
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      gender: formData.gender || null,
      subject_specialization: formData.subjectSpecialization || null,
      qualification: formData.qualification || null,
      experience_years: formData.experienceYears ? Number(formData.experienceYears) : null,
      joining_date: formData.joiningDate || null,
      status: formData.status || 'active',
      address: formData.address || null,
      salary: formData.salary ? Number(formData.salary) : null,
    };

    try {
      // Send payload to server API. Server resolves organization_id and inserts using service role.
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to save teacher');
      }

      const t = json.teacher;
      const uiTeacher = {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        gender: (t.gender || '').toLowerCase(),
        subjectSpecialization: t.subject_specialization || t.subjectSpecialization || '',
        qualification: t.qualification,
        experienceYears: t.experience_years ?? 0,
        joiningDate: t.joining_date || t.joiningDate || new Date().toISOString(),
        status: t.status || 'active',
        salary: t.salary ?? 0,
        address: t.address || '',
      };

      setTeachers(prev => [uiTeacher, ...prev]);
      setFormData({ name: '', email: '', phone: '', gender: 'male', subjectSpecialization: '', qualification: '', experienceYears: '', joiningDate: '', status: 'active', address: '', salary: '' });
      setDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to save teacher');
    } finally {
      setLoading(false);
    }
  };

  // Fetch teachers for current admin's organization
  useEffect(() => {
    let mounted = true;
    const fetchTeachers = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/teachers', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch teachers');

        const list = json.teachers || [];
        if (mounted) {
          const mapped = (list || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            gender: (t.gender || '').toLowerCase(),
            subjectSpecialization: t.subject_specialization || t.subjectSpecialization || '',
            qualification: t.qualification,
            experienceYears: t.experience_years ?? 0,
            joiningDate: t.joining_date || t.joiningDate || new Date().toISOString(),
            status: t.status || 'active',
            salary: t.salary ?? 0,
            address: t.address || '',
          }));
          setTeachers(mapped);
        }
      } catch (err) {
        console.error('Fetch teachers failed', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
                <div className="flex-1 lg:ml-64">
          
          <main className="p-4">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-red-50 rounded-2xl p-4 mb-4 border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-red-600 bg-clip-text text-transparent">Teaching Faculty</h1>
                  <p className="text-slate-600 text-sm mt-1">Manage your educational team</p>
                </div>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex items-center bg-gradient-to-r from-blue-900 to-red-600 hover:from-blue-900 hover:to-red-700 text-white px-4 py-2 rounded-xl font-medium space-x-2 shadow-lg shadow-blue-200 transition-all duration-200 hover:shadow-xl hover:shadow-blue-300 transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Teacher</span>
                </button>
              </div>
            </div>
            {/* Premium Dialog for registration form */}
            {dialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto relative border border-slate-200">
                  <button
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition-colors"
                    onClick={() => setDialogOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-center border-b border-slate-100 pb-4 mb-4">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-red-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
                        <GraduationCap className="w-6 h-6 text-blue-900" />
                        Register New Teacher
                      </h2>
                      <p className="text-slate-500 text-sm mt-1">Add a new faculty member to your team</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <User className="w-4 h-4 text-blue-900" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          placeholder="Enter teacher full name"
                          name="name"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <Mail className="w-4 h-4 text-blue-900" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          placeholder="teacher@email.com"
                          name="email"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <Phone className="w-4 h-4 text-blue-900" />
                          Phone
                        </label>
                        <div className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-900">
                          <PhoneInput
                            international
                            defaultCountry="IN"
                            value={formData.phone}
                            onChange={value => setFormData({ ...formData, phone: value || '' })}
                            className="w-full"
                            placeholder="Enter phone number"
                            name="phone"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <User className="w-4 h-4 text-blue-900" />
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={e => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm bg-slate-50/50"
                          name="gender"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <BookOpen className="w-4 h-4 text-blue-900" />
                          Subject Specialization
                        </label>
                        <input
                          type="text"
                          value={formData.subjectSpecialization}
                          onChange={e => setFormData({ ...formData, subjectSpecialization: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          placeholder="e.g. Mathematics, Science"
                          name="subjectSpecialization"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <Award className="w-4 h-4 text-blue-900" />
                          Qualification
                        </label>
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          placeholder="e.g. B.Ed, M.Sc, PhD"
                          name="qualification"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <Calendar className="w-4 h-4 text-blue-900" />
                          Experience (years)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.experienceYears}
                          onChange={e => setFormData({ ...formData, experienceYears: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          placeholder="e.g. 5"
                          name="experienceYears"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <Calendar className="w-4 h-4 text-blue-900" />
                          Joining Date
                        </label>
                        <input
                          type="date"
                          value={formData.joiningDate}
                          onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          name="joiningDate"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <User className="w-4 h-4 text-blue-900" />
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={e => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          name="status"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on_leave">On Leave</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <User className="w-4 h-4 text-blue-900" />
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={e => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white resize-none"
                          placeholder="Enter address"
                          name="address"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2">
                          <IndianRupee className="w-4 h-4 text-blue-900" />
                          Salary (INR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.salary}
                          onChange={e => setFormData({ ...formData, salary: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm transition-all bg-slate-50/50 hover:bg-white"
                          placeholder="e.g. 35000"
                          name="salary"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        className="w-full sm:w-auto px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-900 to-red-600 hover:from-blue-900 hover:to-red-700 text-white px-8 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all duration-200 hover:shadow-xl hover:shadow-blue-300 transform hover:-translate-y-0.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Teacher</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* Premium Teachers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-semibold text-sm">{teacher.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">{teacher.name}</h3>
                        <p className="text-xs text-slate-500">{teacher.subjectSpecialization}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button title="View" className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors group">
                        <Eye className="w-4 h-4 text-blue-900" />
                      </button>
                      <button title="Edit" className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors group">
                        <Edit className="w-4 h-4 text-blue-900" />
                      </button>
                      <button title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-blue-900" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-blue-900" />
                      <span>{teacher.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Award className="w-4 h-4 text-blue-900" />
                      <span>{teacher.qualification}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 text-xs">{teacher.experienceYears} yrs exp</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 text-xs">₹{teacher.salary.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.status === 'active' ? 'bg-blue-100 text-blue-900' : 
                        teacher.status === 'on_leave' ? 'bg-red-100 text-red-700' : 
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {teacher.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">Joined {new Date(teacher.joiningDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {teachers.length === 0 && (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No Teachers Found</h3>
                <p className="text-slate-500 mb-4">Start building your teaching team by adding faculty members.</p>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex items-center bg-gradient-to-r from-blue-900 to-red-600 hover:from-blue-900 hover:to-red-700 text-white px-4 py-2 rounded-xl font-medium space-x-2 shadow-lg shadow-blue-200 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Teacher</span>
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

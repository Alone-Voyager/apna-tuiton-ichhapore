"use client"
import { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle, Bell, Plus, RefreshCw, Edit, Trash2, Eye, Download, DollarSign, UserPlus, Calendar, AlertTriangle, Users, MessageSquare, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface NotificationStats {
  sentToday: number;
  pending: number;
  deliveryRate: string;
  activeReminders: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  target_type: string;
  target_id?: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  recipient_count?: number;
  delivered_count?: number;
  failed_count?: number;
}

interface ReminderSetting {
  id: string;
  reminder_type: string;
  is_enabled: boolean;
  days_before: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  notification_method: string;
  template_id?: string;
  template_message: string;
  target_type: string;
  target_id?: string;
  trigger_condition?: string;
  updated_at: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  message: string;
  variables: string[];
  usageCount: number;
}

interface ClassOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  name: string;
  rollNumber: string;
  className: string;
}

export default function NotificationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'templates' | 'reminders'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [showEditScheduledModal, setShowEditScheduledModal] = useState(false);
  const [showStudentPreviewModal, setShowStudentPreviewModal] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingReminderData, setPendingReminderData] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editingReminder, setEditingReminder] = useState<ReminderSetting | null>(null);
  const [editingScheduled, setEditingScheduled] = useState<Notification | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    type: 'announcement',
    message: ''
  });
  const [reminderFormData, setReminderFormData] = useState({
    reminder_type: '',
    template_id: '',
    template_message: '',
    days_before: 3,
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
    target_type: 'all' as 'all' | 'class' | 'pending_fees' | 'low_attendance',
    target_id: ''
  });

  // Data states
  const [stats, setStats] = useState<NotificationStats>({
    sentToday: 0,
    pending: 0,
    deliveryRate: '0',
    activeReminders: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ReminderSetting[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'pending' | 'scheduled' | 'failed'>('all');

  // Form states for create notification
  const [formData, setFormData] = useState({
    use_template: false,
    template_id: '',
    type: 'announcement',
    title: '',
    message: '',
    target_type: 'all',
    target_id: '',
    scheduled_at: ''
  });

  // Handle template selection in Send Notification modal
  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setFormData({
        ...formData,
        use_template: true,
        template_id: templateId,
        type: selectedTemplate.type,
        title: selectedTemplate.name,
        message: selectedTemplate.message
      });
    } else {
      // If no template selected, clear template data
      setFormData({
        ...formData,
        use_template: false,
        template_id: '',
        title: '',
        message: ''
      });
    }
  };

  useEffect(() => {
    fetchData();
    fetchClassesAndStudents();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchStats(),
        fetchNotifications(),
        fetchReminderSettings(),
        fetchTemplates()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesAndStudents = async () => {
    try {
      // Fetch classes
      const classesResponse = await fetch('/api/classes');
      const classesData = await classesResponse.json();
      if (classesResponse.ok) {
        // API returns data in classesData.data, not classesData.classes
        setClasses(classesData.data || classesData.classes || []);
      }

      // Fetch students
      const studentsResponse = await fetch('/api/students');
      const studentsData = await studentsResponse.json();
      if (studentsResponse.ok) {
        // API returns data in studentsData.data, not studentsData.students
        const studentsList = studentsData.data || studentsData.students || [];
        const formattedStudents = studentsList.map((student: any) => ({
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber || student.roll_number,
          className: student.className || student.class_name || 'N/A'
        }));
        setStudents(formattedStudents);
      }
    } catch (err) {
      console.error('Error fetching classes/students:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('API not available');
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Mock notification history for testing
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'fee_reminder',
          title: 'Monthly Fee Reminder',
          message: 'Your monthly fee of ₹5000 is due on Nov 10, 2025. Please pay to avoid late charges.',
          target_type: 'class',
          target_id: 'class-10a',
          status: 'sent',
          scheduled_at: null,
          sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          recipient_count: 45,
          delivered_count: 43,
          failed_count: 2
        },
        {
          id: '2',
          type: 'admission',
          title: 'Welcome New Student',
          message: 'Welcome to our tuition! Classes start on Nov 15. Contact us for any queries.',
          target_type: 'student',
          target_id: 'student-123',
          status: 'sent',
          scheduled_at: null,
          sent_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          recipient_count: 1,
          delivered_count: 1,
          failed_count: 0
        },
        {
          id: '3',
          type: 'attendance',
          title: 'Low Attendance Alert',
          message: 'Your child has 68% attendance this month. Please ensure regular attendance.',
          target_type: 'all',
          status: 'sent',
          scheduled_at: null,
          sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          recipient_count: 12,
          delivered_count: 10,
          failed_count: 2
        },
        {
          id: '4',
          type: 'announcement',
          title: 'Exam Schedule',
          message: 'Mid-term exams will be held from Nov 20-25. Syllabus has been shared.',
          target_type: 'all',
          status: 'scheduled',
          scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          sent_at: null,
          created_at: new Date().toISOString(),
          recipient_count: 150,
          delivered_count: 0,
          failed_count: 0
        },
        {
          id: '5',
          type: 'fee_reminder',
          title: 'Fee Overdue Notice',
          message: 'Your fee payment is overdue by 5 days. Please pay immediately.',
          target_type: 'class',
          target_id: 'class-9b',
          status: 'failed',
          scheduled_at: null,
          sent_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
          recipient_count: 8,
          delivered_count: 0,
          failed_count: 8
        }
      ];
      setNotifications(mockNotifications);
    }
  };

  const fetchReminderSettings = async () => {
    try {
      const response = await fetch('/api/notifications/reminders');
      if (!response.ok) {
        throw new Error('API not available');
      }
      const data = await response.json();
      setReminderSettings(data.reminders || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      // Mock data for testing frequency feature
      setReminderSettings([
        {
          id: '1',
          reminder_type: 'fee_due',
          is_enabled: true,
          days_before: 3,
          frequency: 'daily',
          notification_method: 'WhatsApp',
          template_id: '1',
          template_message: 'Your monthly fee of [AMOUNT] is due on [DUE_DATE]. Please pay to avoid late charges.',
          target_type: 'pending_fees',
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          reminder_type: 'fee_overdue',
          is_enabled: true,
          days_before: 7,
          frequency: 'weekly',
          notification_method: 'WhatsApp',
          template_id: '1',
          template_message: 'Your fee payment is overdue by [DAYS] days. Please pay immediately to avoid account suspension.',
          target_type: 'pending_fees',
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          reminder_type: 'attendance_low',
          is_enabled: false,
          days_before: 0,
          frequency: 'monthly',
          notification_method: 'WhatsApp',
          template_id: '3',
          template_message: 'Dear parent, [STUDENT_NAME] has attendance below 75%. Current: [ATTENDANCE]%',
          target_type: 'low_attendance',
          updated_at: new Date().toISOString()
        }
      ]);
      
      // Mock sent notifications
      setSentNotifications([
        {
          id: '1',
          type: 'fee_reminder',
          title: 'Monthly Fee Reminder',
          message: 'Your monthly fee is due on Nov 10, 2025',
          sent_to: 'Class 10-A (45 students)',
          sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'sent',
          delivered: 43,
          failed: 2,
          channel: 'WhatsApp'
        },
        {
          id: '2',
          type: 'announcement',
          title: 'Holiday Notice',
          message: 'School will be closed on Nov 8 for maintenance',
          sent_to: 'All students (156 students)',
          sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'sent',
          delivered: 156,
          failed: 0,
          channel: 'WhatsApp'
        }
      ]);
      
      // Mock scheduled notifications
      setScheduledNotifications([
        {
          id: '1',
          type: 'announcement',
          title: 'Exam Schedule Released',
          message: 'Mid-term exam schedule is now available',
          send_to: 'All students',
          scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          channel: 'WhatsApp'
        },
        {
          id: '2',
          type: 'fee_reminder',
          title: 'Fee Due Reminder',
          message: 'Quarterly fee payment reminder',
          send_to: 'Students with pending fees',
          scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          channel: 'WhatsApp'
        }
      ]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/notifications/templates');
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      // Mock data for testing
      setTemplates([
        {
          id: '1',
          name: 'Fee Payment Reminder',
          type: 'fee_reminder',
          message: 'Dear Parent, this is a gentle reminder that the monthly fee of [AMOUNT] for [STUDENT_NAME] is due on [DUE_DATE]. Please make the payment at your earliest convenience.',
          variables: ['[STUDENT_NAME]', '[AMOUNT]', '[DUE_DATE]'],
          usageCount: 156
        },
        {
          id: '2',
          name: 'Welcome New Student',
          type: 'admission',
          message: 'Welcome [STUDENT_NAME] to [CLASS_NAME]! We are excited to have you join us. Classes start on [START_DATE]. Please contact us if you have any questions.',
          variables: ['[STUDENT_NAME]', '[CLASS_NAME]', '[START_DATE]'],
          usageCount: 23
        },
        {
          id: '3',
          name: 'Low Attendance Alert',
          type: 'attendance',
          message: 'Dear Parent, [STUDENT_NAME] has [ATTENDANCE]% attendance this month, which is below the required 75%. Please ensure regular attendance.',
          variables: ['[STUDENT_NAME]', '[ATTENDANCE]'],
          usageCount: 45
        },
        {
          id: '4',
          name: 'Exam Schedule Notification',
          type: 'announcement',
          message: 'Dear [STUDENT_NAME], your [EXAM_NAME] is scheduled on [EXAM_DATE] at [EXAM_TIME]. Please arrive 15 minutes early. Syllabus: [SYLLABUS]',
          variables: ['[STUDENT_NAME]', '[EXAM_NAME]', '[EXAM_DATE]', '[EXAM_TIME]', '[SYLLABUS]'],
          usageCount: 89
        }
      ]);
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert IST datetime-local to UTC if scheduled_at is provided
      let scheduledAtUTC = formData.scheduled_at;
      if (scheduledAtUTC) {
        // datetime-local gives us local time string like "2025-11-10T12:43"
        // The browser's Date constructor will interpret this in the local timezone (IST)
        // Then toISOString() converts it to UTC automatically
        scheduledAtUTC = new Date(scheduledAtUTC).toISOString();
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          ...formData,
          scheduled_at: scheduledAtUTC
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Add to local state
        const newNotification: Notification = {
          id: data.id || `notif-${Date.now()}`,
          type: formData.type,
          title: formData.title,
          message: formData.message,
          target_type: formData.target_type,
          target_id: formData.target_id || undefined,
          status: formData.scheduled_at ? 'scheduled' : 'sent',
          scheduled_at: formData.scheduled_at || null,
          sent_at: formData.scheduled_at ? null : new Date().toISOString(),
          created_at: new Date().toISOString(),
          recipient_count: formData.target_type === 'all' ? 150 : formData.target_type === 'class' ? 45 : 1,
          delivered_count: 0,
          failed_count: 0
        };
        setNotifications([newNotification, ...notifications]);
        
        setShowCreateModal(false);
        setFormData({
          use_template: false,
          template_id: '',
          type: 'announcement',
          title: '',
          message: '',
          target_type: 'all',
          target_id: '',
          scheduled_at: ''
        });
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create notification');
      }
    } catch (err: any) {
      console.error('Error creating notification:', err);
      // Create notification in local state (mock - API not implemented)
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: formData.type,
        title: formData.title,
        message: formData.message,
        target_type: formData.target_type,
        target_id: formData.target_id || undefined,
        status: formData.scheduled_at ? 'scheduled' : 'sent',
        scheduled_at: formData.scheduled_at || null,
        sent_at: formData.scheduled_at ? null : new Date().toISOString(),
        created_at: new Date().toISOString(),
        recipient_count: formData.target_type === 'all' ? 150 : formData.target_type === 'class' ? 45 : 1,
        delivered_count: formData.scheduled_at ? 0 : (formData.target_type === 'all' ? 145 : formData.target_type === 'class' ? 43 : 1),
        failed_count: formData.scheduled_at ? 0 : (formData.target_type === 'all' ? 5 : formData.target_type === 'class' ? 2 : 0)
      };
      setNotifications([newNotification, ...notifications]);
      
      setShowCreateModal(false);
      setFormData({
        use_template: false,
        template_id: '',
        type: 'announcement',
        title: '',
        message: '',
        target_type: 'all',
        target_id: '',
        scheduled_at: ''
      });
    }
  };

  const handleUpdateScheduledNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheduled) return;

    try {
      // Convert IST datetime-local to UTC if scheduled_at is provided
      let scheduledAtUTC = formData.scheduled_at;
      if (scheduledAtUTC) {
        console.log('Original input value:', scheduledAtUTC);
        
        // datetime-local gives us local time string like "2025-11-10T12:43"
        // The browser's Date constructor will interpret this in the local timezone (IST)
        // Then toISOString() converts it to UTC automatically
        scheduledAtUTC = new Date(scheduledAtUTC).toISOString();
        
        console.log('UTC Date to save:', scheduledAtUTC);
      }

      const response = await fetch(`/api/notifications/${editingScheduled.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduled_at: scheduledAtUTC
        })
      });

      if (response.ok) {
        // Update local state
        setNotifications(notifications.map(n => 
          n.id === editingScheduled.id 
            ? {
                ...n,
                type: formData.type,
                title: formData.title,
                message: formData.message,
                target_type: formData.target_type,
                target_id: formData.target_id || undefined,
                scheduled_at: formData.scheduled_at || null
              }
            : n
        ));
        
        setShowEditScheduledModal(false);
        setEditingScheduled(null);
        setFormData({
          use_template: false,
          template_id: '',
          type: 'announcement',
          title: '',
          message: '',
          target_type: 'all',
          target_id: '',
          scheduled_at: ''
        });
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update notification');
      }
    } catch (err: any) {
      console.error('Error updating notification:', err);
      alert('Failed to update notification');
    }
  };

  const handleToggleReminder = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/notifications/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentState })
      });
      
      if (response.ok) {
        await fetchReminderSettings();
        await fetchStats();
      } else {
        // Update local state (mock)
        setReminderSettings(reminderSettings.map(r => 
          r.id === id ? { ...r, is_enabled: !currentState } : r
        ));
      }
    } catch (err) {
      console.error('Error toggling reminder:', err);
      // Update local state (mock)
      setReminderSettings(reminderSettings.map(r => 
        r.id === id ? { ...r, is_enabled: !currentState } : r
      ));
    }
  };

  const handleUpdateFrequency = async (id: string, frequency: string) => {
    try {
      const response = await fetch(`/api/notifications/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency })
      });
      
      if (response.ok) {
        await fetchReminderSettings();
      } else {
        // Update local state (mock)
        setReminderSettings(reminderSettings.map(r => 
          r.id === id ? { ...r, frequency: frequency as any } : r
        ));
      }
    } catch (err) {
      console.error('Error updating frequency:', err);
      // Update local state (mock)
      setReminderSettings(reminderSettings.map(r => 
        r.id === id ? { ...r, frequency: frequency as any } : r
      ));
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      type: template.type,
      message: template.message
    });
    setShowEditTemplateModal(true);
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/templates/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchTemplates();
      } else {
        // For now, just remove from local state (mock)
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      // Remove from local state (mock)
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/notifications/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateFormData)
      });
      
      if (response.ok) {
        await fetchTemplates();
      } else {
        // Update local state (mock)
        setTemplates(templates.map(t => 
          t.id === editingTemplate.id 
            ? { ...t, ...templateFormData }
            : t
        ));
      }
      setShowEditTemplateModal(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error updating template:', err);
      // Update local state (mock)
      setTemplates(templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, ...templateFormData }
          : t
      ));
      setShowEditTemplateModal(false);
      setEditingTemplate(null);
    }
  };

  const handleEditReminder = (reminder: ReminderSetting) => {
    setEditingReminder(reminder);
    setReminderFormData({
      reminder_type: reminder.reminder_type,
      template_id: reminder.template_id || '',
      template_message: reminder.template_message,
      days_before: reminder.days_before,
      frequency: reminder.frequency,
      target_type: reminder.target_type as 'all' | 'class' | 'pending_fees' | 'low_attendance',
      target_id: reminder.target_id || ''
    });
    setShowEditReminderModal(true);
  };

  const handleDeleteReminder = (id: string, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${getReminderTypeLabel(type)} reminder?`)) {
      return;
    }
    setReminderSettings(reminderSettings.filter(r => r.id !== id));
  };

  const handleViewNotification = (notification: Notification) => {
    alert(`Notification Details:\n\nTitle: ${notification.title}\nType: ${notification.type}\nMessage: ${notification.message}\nStatus: ${notification.status}\nTarget: ${notification.target_type}\nScheduled: ${notification.scheduled_at ? new Date(notification.scheduled_at).toLocaleString() : 'N/A'}\nSent: ${notification.sent_at ? new Date(notification.sent_at).toLocaleString() : 'N/A'}`);
  };

  const handleDeleteNotification = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
        alert('Notification deleted successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  const handleCancelScheduled = async (id: string, title: string) => {
    if (!confirm(`Cancel scheduled notification "${title}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
        alert('Scheduled notification cancelled!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel notification');
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
      alert('Failed to cancel notification');
    }
  };

  const handleEditScheduled = (notification: Notification) => {
    setEditingScheduled(notification);
    
    // Convert UTC scheduled_at to IST for the datetime-local input
    let scheduledAtIST = '';
    if (notification.scheduled_at) {
      const utcDate = new Date(notification.scheduled_at);
      // Add 5 hours 30 minutes (IST offset) to get IST time
      const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
      
      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      const year = istDate.getFullYear();
      const month = String(istDate.getMonth() + 1).padStart(2, '0');
      const day = String(istDate.getDate()).padStart(2, '0');
      const hours = String(istDate.getHours()).padStart(2, '0');
      const minutes = String(istDate.getMinutes()).padStart(2, '0');
      scheduledAtIST = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    setFormData({
      use_template: false,
      template_id: '',
      type: notification.type,
      title: notification.title,
      message: notification.message,
      target_type: notification.target_type,
      target_id: notification.target_id || '',
      scheduled_at: scheduledAtIST
    });
    setShowEditScheduledModal(true);
  };

  const handleUpdateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder) return;

    setReminderSettings(reminderSettings.map(r => 
      r.id === editingReminder.id 
        ? { ...r, ...reminderFormData, updated_at: new Date().toISOString() }
        : r
    ));
    setShowEditReminderModal(false);
    setEditingReminder(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fee_reminder': return <DollarSign className="w-5 h-5" />;
      case 'admission': return <UserPlus className="w-5 h-5" />;
      case 'attendance': return <Calendar className="w-5 h-5" />;
      case 'announcement': return <Bell className="w-5 h-5" />;
      case 'alert': return <AlertTriangle className="w-5 h-5" />;
      default: return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fee_reminder': return { bg: 'bg-yellow-100', text: 'text-yellow-600' };
      case 'admission': return { bg: 'bg-green-100', text: 'text-green-600' };
      case 'attendance': return { bg: 'bg-blue-100', text: 'text-blue-600' };
      case 'announcement': return { bg: 'bg-purple-100', text: 'text-purple-600' };
      case 'alert': return { bg: 'bg-red-100', text: 'text-red-600' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      sent: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || 'bg-slate-100 text-slate-800';
  };

  const getTargetLabel = (target_type: string, target_id?: string) => {
    switch (target_type) {
      case 'all': return 'All Students';
      case 'pending_fees': return 'Students with Pending Fees';
      case 'low_attendance': return 'Students with Low Attendance';
      case 'class': {
        const cls = classes.find(c => c.id === target_id);
        return cls ? `Class: ${cls.name}` : 'Specific Class';
      }
      default: return 'All Students';
    }
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fee_due: 'Fee Due Reminder',
      fee_overdue: 'Fee Overdue Alert',
      fee_payment_confirmation: 'Fee Payment Confirmation',
      attendance_low: 'Low Attendance Alert',
      admission_followup: 'Admission Follow-up'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(n => 
    filterStatus === 'all' || n.status === filterStatus
  );

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50">
      <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading notifications...</p>
                </div>
              </div>
            </main>
    </div>
  );
}

  return (
    <div className="min-h-full bg-gray-50">
      <main className="p-4 lg:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{stats.sentToday}</p>
                      <p className="text-sm text-slate-600">Sent Today</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg hidden sm:flex items-center justify-center">
                      <Send className="w-6 h-6 text-green-600 hidden sm:block" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                      <p className="text-sm text-slate-600">Pending</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg hidden sm:flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600 hidden sm:block" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{stats.deliveryRate}%</p>
                      <p className="text-sm text-slate-600">Delivery Rate</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 hidden sm:flex rounded-lg  items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600 hidden sm:block" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{stats.activeReminders}</p>
                      <p className="text-sm text-slate-600">Active Reminders</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 hidden sm:flex rounded-lg  items-center justify-center">
                      <Bell className="w-6 h-6 text-purple-600 " />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 w-4 h-4" />
                  Send Notification
                </Button>
                <Button variant="outline" onClick={fetchData}>
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Refresh
                </Button>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 p-4">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'overview'
                          ? 'bg-red-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="inline w-4 h-4 mr-2" />
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('scheduled')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'scheduled'
                          ? 'bg-red-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Clock className="inline w-4 h-4 mr-2" />
                      Scheduled
                    </button>
                    <button
                      onClick={() => setActiveTab('templates')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'templates'
                          ? 'bg-red-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <MessageSquare className="inline w-4 h-4 mr-2" />
                      Templates
                    </button>
                    <button
                      onClick={() => setActiveTab('reminders')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'reminders'
                          ? 'bg-red-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Bell className="inline w-4 h-4 mr-2" />
                      Reminders
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 lg:p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-800">Notification History</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              filterStatus === 'all' 
                                ? 'bg-slate-800 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setFilterStatus('sent')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              filterStatus === 'sent' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Sent
                          </button>
                          <button
                            onClick={() => setFilterStatus('failed')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              filterStatus === 'failed' 
                                ? 'bg-red-500 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Failed
                          </button>
                          <button
                            onClick={() => setFilterStatus('scheduled')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              filterStatus === 'scheduled' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Scheduled
                          </button>
                        </div>
                      </div>

                      {filteredNotifications.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No notifications found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredNotifications.map((notification) => {
                            const colors = getTypeColor(notification.type);
                            const deliveryRate = notification.recipient_count && notification.delivered_count 
                              ? Math.round((notification.delivered_count / notification.recipient_count) * 100) 
                              : 0;
                            
                            return (
                              <div key={notification.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                <div className="flex flex-col sm:flex-row gap-4">
                                  {/* Icon */}
                                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <div className={colors.text}>{getTypeIcon(notification.type)}</div>
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div>
                                        <h4 className="font-medium text-slate-800 mb-1">{notification.title}</h4>
                                        <span className="text-xs text-slate-500">
                                          {notification.sent_at ? formatDate(notification.sent_at) : formatDate(notification.created_at)}
                                        </span>
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(notification.status)}`}>
                                        {notification.status}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{notification.message}</p>
                                    
                                    {/* Stats Row */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                      {notification.recipient_count && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                          <Users className="w-3 h-3" />
                                          <span className="font-medium">{notification.recipient_count} recipients</span>
                                        </div>
                                      )}
                                      
                                      {notification.status === 'sent' && notification.delivered_count !== undefined && (
                                        <>
                                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>{notification.delivered_count} delivered</span>
                                          </div>
                                          
                                          {notification.failed_count && notification.failed_count > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded">
                                              <AlertCircle className="w-3 h-3" />
                                              <span>{notification.failed_count} failed</span>
                                            </div>
                                          )}
                                          
                                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                                            <span className="font-medium">{deliveryRate}% success</span>
                                          </div>
                                        </>
                                      )}
                                      
                                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded">
                                        <span>
                                          {notification.target_type === 'all' ? 'All Students' :
                                           notification.target_type === 'class' ? 'Class' :
                                           notification.target_type === 'student' ? 'Individual' : notification.target_type}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex sm:flex-col items-center gap-1 flex-shrink-0">
                                    <button 
                                      onClick={() => handleViewNotification(notification)}
                                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors" 
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteNotification(notification.id, notification.title)}
                                      className="p-2 hover:bg-red-100 rounded-lg transition-colors" 
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scheduled Tab */}
                  {activeTab === 'scheduled' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">Scheduled Notifications</h3>
                        <span className="text-sm text-slate-500">
                          {notifications.filter(n => n.status === 'scheduled').length} upcoming
                        </span>
                      </div>
                      
                      {notifications.filter(n => n.status === 'scheduled').length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="mb-2">No scheduled notifications</p>
                          <p className="text-xs">Schedule notifications for future delivery</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {notifications.filter(n => n.status === 'scheduled').map((notification) => {
                            const colors = getTypeColor(notification.type);
                            const scheduledDate = notification.scheduled_at ? new Date(notification.scheduled_at) : null;
                            const now = new Date();
                            const timeDiff = scheduledDate ? scheduledDate.getTime() - now.getTime() : 0;
                            const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                            const hoursUntil = Math.ceil(timeDiff / (1000 * 60 * 60));
                            
                            let countdown = '';
                            if (daysUntil > 1) {
                              countdown = `in ${daysUntil} days`;
                            } else if (hoursUntil > 1) {
                              countdown = `in ${hoursUntil} hours`;
                            } else {
                              countdown = 'Soon';
                            }
                            
                            return (
                              <div key={notification.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                                      <div className={colors.text}>{getTypeIcon(notification.type)}</div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-slate-800">{notification.title}</h4>
                                      <p className="text-xs text-slate-500 capitalize">{notification.type.replace('_', ' ')}</p>
                                    </div>
                                  </div>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Scheduled
                                  </span>
                                </div>
                                
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{notification.message}</p>
                                
                                {/* Scheduled Info */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700">{formatDate(notification.scheduled_at)}</span>
                                    <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full font-medium">
                                      {countdown}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    {notification.recipient_count && (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                        <Users className="w-3 h-3" />
                                        <span>{notification.recipient_count} recipients</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                                  <button 
                                    onClick={() => handleEditScheduled(notification)}
                                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleCancelScheduled(notification.id, notification.title)}
                                    className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Templates Tab */}
                  {activeTab === 'templates' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">Message Templates</h3>
                        <Button size="sm" onClick={() => setShowCreateTemplateModal(true)}>
                          <Plus className="mr-2 w-4 h-4" />
                          Create Template
                        </Button>
                      </div>

                      {templates.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No templates created yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {templates.map((template) => (
                            <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-800 mb-1">{template.name}</h4>
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                    template.type === 'fee_reminder' ? 'bg-yellow-100 text-yellow-800' :
                                    template.type === 'admission' ? 'bg-green-100 text-green-800' :
                                    template.type === 'attendance' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {template.type.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-slate-600 mb-3 line-clamp-3">{template.message}</p>
                              
                              {template.variables.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs text-slate-500 mb-1">Variables:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {template.variables.map((variable, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                                        {variable}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                <span className="text-xs text-slate-500">Used {template.usageCount} times</span>
                                <div className="flex items-center space-x-1">
                                  <button 
                                    onClick={() => handleEditTemplate(template)}
                                    className="p-1.5 hover:bg-blue-100 rounded" 
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      // Pre-select this template in Send Notification modal
                                      handleTemplateSelect(template.id);
                                      setShowCreateModal(true);
                                    }}
                                    className="p-1.5 hover:bg-green-100 rounded" 
                                    title="Use Template"
                                  >
                                    <Send className="w-4 h-4 text-green-600" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                                    className="p-1.5 hover:bg-red-100 rounded" 
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reminders Tab */}
                  {activeTab === 'reminders' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">Reminder Settings</h3>
                        <Button size="sm" onClick={() => setShowAddRuleModal(true)}>
                          <Plus className="mr-2 w-4 h-4" />
                          Add Reminder
                        </Button>
                      </div>

                      {reminderSettings.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No reminders configured</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reminderSettings.map((reminder) => (
                            <div key={reminder.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-medium text-slate-800">
                                      {getReminderTypeLabel(reminder.reminder_type)}
                                    </h4>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      reminder.is_enabled 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {reminder.is_enabled ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  
                                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                    {reminder.template_message}
                                  </p>
                                  
                                  {/* Target & Trigger Info */}
                                  <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                      <Users className="w-3 h-3" />
                                      <span className="font-medium">
                                        {reminder.target_type === 'all' ? 'All Students' : 
                                         reminder.target_type === 'class' ? 'Specific Class' :
                                         reminder.target_type === 'student' ? 'Specific Student' : 'All'}
                                      </span>
                                    </div>
                                    {reminder.trigger_condition && (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>
                                          {reminder.trigger_condition === 'days_before_due' ? `${reminder.days_before} days before due` :
                                           reminder.trigger_condition === 'fee_overdue' ? 'When overdue' :
                                           reminder.trigger_condition === 'attendance_below' ? 'Low attendance' :
                                           reminder.trigger_condition === 'monthly_check' ? 'Monthly (1st)' : 'Auto'}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                                      <MessageSquare className="w-3 h-3" />
                                      <span>{reminder.notification_method}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Frequency Setting */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-xs font-medium text-slate-700">Frequency:</label>
                                    <select
                                      value={reminder.frequency || 'daily'}
                                      onChange={(e) => handleUpdateFrequency(reminder.id, e.target.value)}
                                      className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                      <option value="quarterly">Quarterly</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Send this reminder via WhatsApp now?')) return;
                                      
                                      try {
                                        const response = await fetch('/api/notifications/send-whatsapp', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            reminderId: reminder.id,
                                            targetType: reminder.target_type,
                                            targetId: reminder.target_id,
                                          }),
                                        });

                                        const data = await response.json();

                                        if (response.ok) {
                                          alert(`WhatsApp messages sent!\nSent: ${data.results.sent}\nFailed: ${data.results.failed}`);
                                        } else {
                                          alert(data.error || 'Failed to send WhatsApp messages');
                                        }
                                      } catch (error) {
                                        console.error('Error sending WhatsApp:', error);
                                        alert('Failed to send WhatsApp messages');
                                      }
                                    }}
                                    className="p-2 hover:bg-green-100 rounded-lg"
                                    title="Send via WhatsApp Now"
                                  >
                                    <MessageSquare className="w-4 h-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleReminder(reminder.id, reminder.is_enabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                      reminder.is_enabled ? 'bg-green-600' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        reminder.is_enabled ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                  <button 
                                    onClick={() => handleEditReminder(reminder)}
                                    className="p-2 hover:bg-blue-100 rounded-lg"
                                    title="Edit Reminder"
                                  >
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteReminder(reminder.id, reminder.reminder_type)}
                                    className="p-2 hover:bg-red-100 rounded-lg"
                                    title="Delete Reminder"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Create Notification Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Send Notification</h3>
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleCreateNotification} className="p-6 space-y-4">
                    {/* Use Template Section */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="use_template"
                          checked={formData.use_template}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              // Clear template selection
                              setFormData({
                                ...formData,
                                use_template: false,
                                template_id: '',
                                title: '',
                                message: ''
                              });
                            } else {
                              setFormData({
                                ...formData,
                                use_template: true
                              });
                            }
                          }}
                          className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="use_template" className="text-sm font-medium text-slate-700">
                          Use Template
                        </label>
                      </div>
                      
                      {formData.use_template && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Select Template
                          </label>
                          <select
                            value={formData.template_id}
                            onChange={(e) => handleTemplateSelect(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            required={formData.use_template}
                          >
                            <option value="">-- Choose a template --</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} ({template.type.replace(/_/g, ' ')})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-2">
                            Template will auto-fill title and message below
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notification Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled={formData.use_template && formData.template_id !== ''}
                        required
                      >
                        <option value="announcement">Announcement</option>
                        <option value="fee_reminder">Fee Reminder</option>
                        <option value="admission">Admission</option>
                        <option value="attendance">Attendance</option>
                        <option value="alert">Alert</option>
                      </select>
                      {formData.use_template && formData.template_id && (
                        <p className="text-xs text-slate-500 mt-1">Type set by selected template</p>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter notification title"
                        disabled={formData.use_template && formData.template_id !== ''}
                        required
                      />
                      {formData.use_template && formData.template_id && (
                        <p className="text-xs text-slate-500 mt-1">Title from selected template</p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px]"
                        placeholder="Enter your message here..."
                        disabled={formData.use_template && formData.template_id !== ''}
                        required
                      />
                      {formData.use_template && formData.template_id && (
                        <p className="text-xs text-slate-500 mt-1">Message from selected template</p>
                      )}
                    </div>

                    {/* Target Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Send To</label>
                      <select
                        value={formData.target_type}
                        onChange={(e) => setFormData({...formData, target_type: e.target.value, target_id: ''})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="all">All Students</option>
                        <option value="class">Specific Class</option>
                        <option value="student">Specific Student</option>
                        <option value="parent">All Parents</option>
                      </select>
                    </div>

                    {/* Select Class Dropdown - Only show when class is selected */}
                    {formData.target_type === 'class' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Class
                        </label>
                        <select
                          value={formData.target_id}
                          onChange={(e) => setFormData({...formData, target_id: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        >
                          <option value="">-- Choose a class --</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Select Student Dropdown - Only show when student is selected */}
                    {formData.target_type === 'student' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Student
                        </label>
                        <select
                          value={formData.target_id}
                          onChange={(e) => setFormData({...formData, target_id: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        >
                          <option value="">-- Choose a student --</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Schedule Date (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Schedule For (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Leave empty to send immediately</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Send className="mr-2 w-4 h-4" />
                        {formData.scheduled_at ? 'Schedule' : 'Send Now'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Scheduled Notification Modal */}
            {showEditScheduledModal && editingScheduled && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Edit Scheduled Notification</h3>
                    <button 
                      onClick={() => {
                        setShowEditScheduledModal(false);
                        setEditingScheduled(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleUpdateScheduledNotification} className="p-6 space-y-4">
                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notification Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="announcement">Announcement</option>
                        <option value="fee_reminder">Fee Reminder</option>
                        <option value="admission">Admission</option>
                        <option value="attendance">Attendance</option>
                        <option value="alert">Alert</option>
                      </select>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter notification title"
                        required
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px]"
                        placeholder="Enter your message here..."
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Available variables: [STUDENT_NAME], [PARENT_NAME], [DATE], [AMOUNT], [DUE_DATE], [ATTENDANCE]
                      </p>
                    </div>

                    {/* Target Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Send To</label>
                      <select
                        value={formData.target_type}
                        onChange={(e) => setFormData({...formData, target_type: e.target.value, target_id: ''})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="all">All Students</option>
                        <option value="class">Specific Class</option>
                        <option value="student">Specific Student</option>
                        <option value="parent">All Parents</option>
                      </select>
                    </div>

                    {/* Select Class Dropdown */}
                    {formData.target_type === 'class' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Class
                        </label>
                        <select
                          value={formData.target_id}
                          onChange={(e) => setFormData({...formData, target_id: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        >
                          <option value="">-- Choose a class --</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Select Student Dropdown */}
                    {formData.target_type === 'student' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Student
                        </label>
                        <select
                          value={formData.target_id}
                          onChange={(e) => setFormData({...formData, target_id: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        >
                          <option value="">-- Choose a student --</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Schedule Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Schedule For
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">Change the scheduled time or keep the current one</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowEditScheduledModal(false);
                          setEditingScheduled(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Edit className="mr-2 w-4 h-4" />
                        Update Schedule
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Reminder Modal */}
            {showAddRuleModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Add Reminder</h2>
                    <button 
                      onClick={() => setShowAddRuleModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      
                      // Prevent double submission
                      const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                      if (submitButton?.disabled) return;
                      if (submitButton) submitButton.disabled = true;
                      
                      const formData = new FormData(e.currentTarget);
                      
                      const trigger_condition = formData.get('trigger_condition') as string;
                      
                      if (!trigger_condition) {
                        alert('Please select a trigger condition');
                        if (submitButton) submitButton.disabled = false;
                        return;
                      }
                      
                      // Get target_id based on target_type
                      const target_type = formData.get('target_type') as string;
                      let target_id = null;
                      
                      if (target_type === 'class') {
                        target_id = formData.get('target_id_class') as string || null;
                        if (!target_id) {
                          alert('Please select a class');
                          if (submitButton) submitButton.disabled = false;
                          return;
                        }
                      } else if (target_type === 'student') {
                        target_id = formData.get('target_id_student') as string || null;
                        if (!target_id) {
                          alert('Please select a student');
                          if (submitButton) submitButton.disabled = false;
                          return;
                        }
                      }
                      
                      // Get template details
                      const template_id = formData.get('template_id') as string;
                      const selectedTemplate = templates.find(t => t.id === template_id);
                      
                      if (!selectedTemplate) {
                        alert('Please select a valid template');
                        if (submitButton) submitButton.disabled = false;
                        return;
                      }
                      
                      console.log('Creating reminder with template:', selectedTemplate.name, selectedTemplate.message);
                      
                      try {
                        const response = await fetch('/api/notifications/reminders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            reminder_type: formData.get('reminder_type') as string,
                            is_enabled: formData.get('is_enabled') === 'on',
                            days_before: parseInt(formData.get('days_before') as string) || 0,
                            frequency: formData.get('frequency') as 'daily' | 'weekly' | 'monthly' | 'quarterly',
                            template_id: template_id,
                            template_message: selectedTemplate.message,
                            target_type: target_type,
                            target_id: target_id,
                            trigger_condition: trigger_condition,
                          }),
                        });

                        const data = await response.json();

                        if (response.ok) {
                          // Refresh the reminders list
                          const remindersResponse = await fetch('/api/notifications/reminders');
                          const remindersData = await remindersResponse.json();
                          if (remindersData.success) {
                            setReminderSettings(remindersData.reminders);
                          }
                          setShowAddRuleModal(false);
                          alert('Reminder created successfully!');
                        } else {
                          alert(data.error || 'Failed to create reminder');
                        }
                      } catch (error) {
                        console.error('Error creating reminder:', error);
                        alert('Failed to create reminder');
                      } finally {
                        // Re-enable submit button
                        if (submitButton) submitButton.disabled = false;
                      }
                    }}
                    className="p-6 space-y-4"
                  >
                    {/* Reminder Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Reminder Type *
                      </label>
                      <select
                        name="reminder_type"
                        id="reminderType"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        onChange={(e) => {
                          const type = e.target.value;
                          const triggerSelect = document.getElementById('triggerCondition') as HTMLSelectElement;
                          const daysBeforeDiv = document.getElementById('daysBeforeDiv');
                          const daysBeforeInput = document.querySelector('input[name="days_before"]') as HTMLInputElement;
                          const templateSelect = document.getElementById('templateSelect') as HTMLSelectElement;
                          const targetTypeSelect = document.getElementById('reminderTargetType') as HTMLSelectElement;
                          const sendToLabel = document.querySelector('label[for="reminderTargetType"]') as HTMLLabelElement;
                          
                          // Filter templates based on reminder type
                          if (templateSelect) {
                            const allOptions = Array.from(templateSelect.options);
                            allOptions.forEach((option, index) => {
                              if (index === 0) return; // Skip the placeholder
                              const optionType = option.dataset.type || '';
                              
                              // Show templates that match the reminder type
                              if (type === 'fee_due' && (optionType === 'fee_due' || optionType === 'fee_reminder')) {
                                option.style.display = '';
                              } else if (type === 'fee_overdue' && (optionType === 'fee_overdue' || optionType === 'fee_reminder')) {
                                option.style.display = '';
                              } else if (type === 'attendance_low' && (optionType === 'attendance_low' || optionType === 'attendance')) {
                                option.style.display = '';
                              } else if (type === 'admission_followup' && (optionType === 'admission_followup' || optionType === 'admission')) {
                                option.style.display = '';
                              } else if (type === '') {
                                option.style.display = ''; // Show all when no type selected
                              } else {
                                option.style.display = 'none';
                              }
                            });
                            templateSelect.value = ''; // Reset selection
                          }
                          
                          // Update "Send To" options based on reminder type
                          if (targetTypeSelect && sendToLabel) {
                            if (type === 'fee_due') {
                              sendToLabel.innerHTML = 'Send To (Students with Unpaid fees) *';
                              targetTypeSelect.innerHTML = `
                                <option value="all">All Students with Unpaid Fees</option>
                                <option value="class">Specific Class (Unpaid)</option>
                                <option value="student">Specific Student</option>
                              `;
                            } else if (type === 'fee_overdue') {
                              sendToLabel.innerHTML = 'Send To (Students with Overdue fees) *';
                              targetTypeSelect.innerHTML = `
                                <option value="all">All Students with Overdue Fees</option>
                                <option value="class">Specific Class (Overdue)</option>
                                <option value="student">Specific Student</option>
                              `;
                            } else if (type === 'attendance_low') {
                              sendToLabel.innerHTML = 'Send To *';
                              targetTypeSelect.innerHTML = `
                                <option value="all">All Students</option>
                                <option value="class">Specific Class</option>
                                <option value="student">Specific Student</option>
                              `;
                            } else if (type === 'admission_followup') {
                              sendToLabel.innerHTML = 'Send To *';
                              targetTypeSelect.innerHTML = `
                                <option value="all">All Inquiries</option>
                              `;
                            } else {
                              sendToLabel.innerHTML = 'Send To *';
                              targetTypeSelect.innerHTML = `
                                <option value="all">All Students</option>
                                <option value="class">Specific Class</option>
                                <option value="student">Specific Student</option>
                              `;
                            }
                          }
                          
                          // Update trigger conditions
                          if (triggerSelect && daysBeforeDiv) {
                            // Clear existing options
                            triggerSelect.innerHTML = '';
                            
                            if (type === 'fee_due') {
                              // Fee Due triggers
                              triggerSelect.innerHTML = `
                                <option value="monthly_check">Monthly check (1st of month)</option>
                                <option value="days_before_due">Days before due date</option>
                                <option value="weekly_check">Weekly check</option>
                              `;
                              daysBeforeDiv.style.display = 'block';
                              if (daysBeforeInput) {
                                daysBeforeInput.required = true;
                                daysBeforeInput.value = '3';
                              }
                            } else if (type === 'fee_overdue') {
                              // Fee Overdue triggers
                              triggerSelect.innerHTML = `
                                <option value="monthly_check">Monthly check (1st of month)</option>
                                <option value="immediate">Immediately when overdue</option>
                                <option value="weekly_check">Weekly check</option>
                              `;
                              daysBeforeDiv.style.display = 'none';
                              if (daysBeforeInput) daysBeforeInput.required = false;
                            } else if (type === 'attendance_low') {
                              // Attendance triggers
                              triggerSelect.innerHTML = `
                                <option value="attendance_below">When attendance below threshold</option>
                                <option value="monthly_check">Monthly check (1st of month)</option>
                                <option value="weekly_check">Weekly check</option>
                              `;
                              daysBeforeDiv.style.display = 'none';
                              if (daysBeforeInput) daysBeforeInput.required = false;
                            } else if (type === 'admission_followup') {
                              // Admission triggers
                              triggerSelect.innerHTML = `
                                <option value="days_after_inquiry">Days after inquiry</option>
                                <option value="weekly_followup">Weekly follow-up</option>
                                <option value="monthly_check">Monthly check (1st of month)</option>
                              `;
                              daysBeforeDiv.style.display = 'none';
                              if (daysBeforeInput) daysBeforeInput.required = false;
                            } else {
                              // Default
                              triggerSelect.innerHTML = `<option value="monthly_check">Monthly check (1st of month)</option>`;
                              daysBeforeDiv.style.display = 'none';
                              if (daysBeforeInput) daysBeforeInput.required = false;
                            }
                            
                            // Trigger change event
                            triggerSelect.dispatchEvent(new Event('change'));
                          }
                        }}
                        required
                      >
                        <option value="">-- Select reminder type --</option>
                        <option value="fee_due">Fee Due Reminder</option>
                        <option value="fee_overdue">Fee Overdue Alert</option>
                        <option value="fee_payment_confirmation">Fee Payment Confirmation (Auto-sent)</option>
                        <option value="admission_welcome">Admission Welcome (Auto-sent)</option>
                        <option value="attendance_low">Low Attendance Warning</option>
                        <option value="admission_followup">Admission Follow-up</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Select the type of reminder you want to create
                      </p>
                    </div>

                    {/* Select Template */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Template *
                      </label>
                      <select
                        name="template_id"
                        id="templateSelect"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="">-- Choose a template --</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id} data-type={template.type}>
                            {template.name} ({template.type.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Template message will be used for this reminder
                      </p>
                    </div>

                    {/* Send To */}
                    <div>
                      <label htmlFor="reminderTargetType" className="block text-sm font-medium text-slate-700 mb-2">
                        Send To *
                      </label>
                      <select
                        name="target_type"
                        id="reminderTargetType"
                        defaultValue="all"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        onChange={(e) => {
                          const classDiv = document.getElementById('reminderClassSelect');
                          const studentDiv = document.getElementById('reminderStudentSelect');
                          if (classDiv) classDiv.style.display = e.target.value === 'class' ? 'block' : 'none';
                          if (studentDiv) studentDiv.style.display = e.target.value === 'student' ? 'block' : 'none';
                        }}
                        required
                      >
                        <option value="all">All Students</option>
                        <option value="class">Specific Class</option>
                        <option value="student">Specific Student</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Choose who should receive this reminder
                      </p>
                    </div>

                    {/* Select Class - Only show when class is selected */}
                    <div id="reminderClassSelect" style={{display: 'none'}}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Class
                      </label>
                      <select
                        name="target_id_class"
                        id="targetIdClass"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">-- Choose a class --</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Student - Only show when student is selected */}
                    <div id="reminderStudentSelect" style={{display: 'none'}}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Student
                      </label>
                      <select
                        name="target_id_student"
                        id="targetIdStudent"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">-- Choose a student --</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Trigger Condition */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Trigger Condition *
                      </label>
                      <select
                        name="trigger_condition"
                        id="triggerCondition"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="">-- Select reminder type first --</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        When should this reminder be triggered
                      </p>
                    </div>

                    {/* Days Before - Only for fee reminders */}
                    <div id="daysBeforeDiv" style={{display: 'none'}}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Days Before Due Date *
                      </label>
                      <input
                        type="number"
                        name="days_before"
                        min="0"
                        max="30"
                        defaultValue="3"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        How many days before the due date to send the reminder
                      </p>
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Frequency *
                      </label>
                      <select
                        name="frequency"
                        defaultValue="daily"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        How often the reminder should be sent
                      </p>
                    </div>

                    {/* Notification Method */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Notification Method *
                      </label>
                      <select
                        defaultValue="WhatsApp"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="WhatsApp">WhatsApp</option>
                      </select>
                    </div>

                    {/* Enable Reminder */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <input
                        type="checkbox"
                        name="is_enabled"
                        id="enableReminder"
                        defaultChecked
                        className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                      />
                      <label htmlFor="enableReminder" className="text-sm font-medium text-slate-700">
                        Enable this reminder immediately after creation
                      </label>
                    </div>

                    {/* Preview Students Button */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <button
                        type="button"
                        onClick={async () => {
                          const formData = new FormData(document.querySelector('form') as HTMLFormElement);
                          const reminder_type = formData.get('reminder_type') as string;
                          const target_type = formData.get('target_type') as string;
                          
                          if (!reminder_type) {
                            alert('Please select a reminder type first');
                            return;
                          }

                          let target_id = null;
                          if (target_type === 'class') {
                            target_id = formData.get('target_id_class') as string;
                          } else if (target_type === 'student') {
                            target_id = formData.get('target_id_student') as string;
                          }

                          setPreviewLoading(true);
                          setShowStudentPreviewModal(true);

                          try {
                            const response = await fetch('/api/notifications/preview-students', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                reminder_type,
                                target_type,
                                target_id
                              })
                            });

                            const data = await response.json();
                            
                            if (response.ok) {
                              setPreviewStudents(data.students || []);
                            } else {
                              alert(data.error || 'Failed to load students');
                              setShowStudentPreviewModal(false);
                            }
                          } catch (error) {
                            console.error('Error previewing students:', error);
                            alert('Failed to load student preview');
                            setShowStudentPreviewModal(false);
                          } finally {
                            setPreviewLoading(false);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview Students Who Will Receive This
                      </button>
                      <p className="text-xs text-blue-600 mt-2 text-center">
                        See the list of students before creating the reminder
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowAddRuleModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Plus className="mr-2 w-4 h-4" />
                        Add Reminder
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Create Template Modal */}
            {showCreateTemplateModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Create Message Template</h2>
                    <button 
                      onClick={() => setShowCreateTemplateModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const name = formData.get('name') as string;
                      const type = formData.get('type') as string;
                      const message = formData.get('message') as string;

                      try {
                        const response = await fetch('/api/notifications/templates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name, type, message })
                        });

                        if (response.ok) {
                          await fetchTemplates();
                          setShowCreateTemplateModal(false);
                          // Show success message
                          alert('Template created successfully!');
                        } else {
                          const data = await response.json();
                          alert(data.error || 'Failed to create template');
                        }
                      } catch (error) {
                        console.error('Error creating template:', error);
                        alert('Failed to create template. Please try again.');
                      }
                    }}
                    className="p-6 space-y-4"
                  >
                    {/* Template Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., Monthly Fee Reminder"
                        required
                      />
                    </div>

                    {/* Template Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Template Type *
                      </label>
                      <select
                        name="type"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="">-- Select type --</option>
                        <option value="fee_reminder">Fee Reminder</option>
                        <option value="fee_payment_confirmation">Fee Payment Confirmation</option>
                        <option value="admission_welcome">Admission Welcome Message</option>
                        <option value="admission">Admission</option>
                        <option value="attendance">Attendance</option>
                        <option value="announcement">Announcement</option>
                        <option value="alert">Alert</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Message Template *
                      </label>
                      <textarea
                        name="message"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows={6}
                        placeholder="Write your message here. Use variables like [STUDENT_NAME], [AMOUNT], [DUE_DATE], etc."
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Available variables: [STUDENT_NAME], [AMOUNT], [DUE_DATE], [CLASS_NAME], [ATTENDANCE], [PHONE], [EMAIL]
                      </p>
                    </div>

                    {/* Variables Preview */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Variable Usage Tips</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Use <code className="bg-blue-100 px-1 rounded">[STUDENT_NAME]</code> for student's full name</li>
                        <li>• Use <code className="bg-blue-100 px-1 rounded">[AMOUNT]</code> for fee amounts</li>
                        <li>• Use <code className="bg-blue-100 px-1 rounded">[DUE_DATE]</code> for payment due dates</li>
                        <li>• Use <code className="bg-blue-100 px-1 rounded">[ATTENDANCE]</code> for attendance percentage</li>
                        <li>• Variables will be automatically replaced when sending notifications</li>
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateTemplateModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Plus className="mr-2 w-4 h-4" />
                        Create Template
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Template Modal */}
            {showEditTemplateModal && editingTemplate && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Edit Template</h2>
                    <button 
                      onClick={() => {
                        setShowEditTemplateModal(false);
                        setEditingTemplate(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateTemplate} className="p-6 space-y-4">
                    {/* Template Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        value={templateFormData.name}
                        onChange={(e) => setTemplateFormData({...templateFormData, name: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., Monthly Fee Reminder"
                        required
                      />
                    </div>

                    {/* Template Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Template Type *
                      </label>
                      <select
                        value={templateFormData.type}
                        onChange={(e) => setTemplateFormData({...templateFormData, type: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="fee_reminder">Fee Reminder</option>
                        <option value="admission">Admission</option>
                        <option value="attendance">Attendance</option>
                        <option value="announcement">Announcement</option>
                        <option value="alert">Alert</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Message Template *
                      </label>
                      <textarea
                        value={templateFormData.message}
                        onChange={(e) => setTemplateFormData({...templateFormData, message: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows={6}
                        placeholder="Write your message here. Use variables like [STUDENT_NAME], [AMOUNT], [DUE_DATE], etc."
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Available variables: [STUDENT_NAME], [AMOUNT], [DUE_DATE], [CLASS_NAME], [ATTENDANCE], [PHONE], [EMAIL]
                      </p>
                    </div>

                    {/* Variables Preview */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Current Variables</h4>
                      <div className="flex flex-wrap gap-2">
                        {editingTemplate.variables.map((variable, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowEditTemplateModal(false);
                          setEditingTemplate(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Edit className="mr-2 w-4 h-4" />
                        Update Template
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Reminder Modal */}
            {showEditReminderModal && editingReminder && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Edit Reminder</h2>
                    <button 
                      onClick={() => {
                        setShowEditReminderModal(false);
                        setEditingReminder(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateReminder} className="p-6 space-y-4">
                    {/* Reminder Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Reminder Type *
                      </label>
                      <select
                        value={reminderFormData.reminder_type}
                        onChange={(e) => setReminderFormData({...reminderFormData, reminder_type: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="fee_due">Fee Due Reminder</option>
                        <option value="fee_overdue">Fee Overdue Alert</option>
                        <option value="attendance_low">Low Attendance Warning</option>
                        <option value="admission_followup">Admission Follow-up</option>
                      </select>
                    </div>

                    {/* Template Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Message Template *
                      </label>
                      <textarea
                        value={reminderFormData.template_message}
                        onChange={(e) => setReminderFormData({...reminderFormData, template_message: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows={4}
                        placeholder="Use variables like [STUDENT_NAME], [AMOUNT], [DUE_DATE], [ATTENDANCE]"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Available variables: [STUDENT_NAME], [AMOUNT], [DUE_DATE], [ATTENDANCE], [DAYS]
                      </p>
                    </div>

                    {/* Days Before */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Days Before Due Date *
                      </label>
                      <input
                        type="number"
                        value={reminderFormData.days_before}
                        onChange={(e) => setReminderFormData({...reminderFormData, days_before: parseInt(e.target.value)})}
                        min="0"
                        max="30"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        How many days before the due date to send the reminder
                      </p>
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Frequency *
                      </label>
                      <select
                        value={reminderFormData.frequency}
                        onChange={(e) => setReminderFormData({...reminderFormData, frequency: e.target.value as any})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        How often the reminder should be sent
                      </p>
                    </div>

                    {/* Notification Method */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Notification Method
                      </label>
                      <input
                        type="text"
                        value="WhatsApp"
                        disabled
                        className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowEditReminderModal(false);
                          setEditingReminder(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Edit className="mr-2 w-4 h-4" />
                        Update Reminder
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Student Preview Modal */}
            {showStudentPreviewModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">Students Who Will Receive This Reminder</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        {previewLoading ? 'Loading...' : `Total: ${previewStudents.length} student${previewStudents.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowStudentPreviewModal(false);
                        setPreviewStudents([]);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {previewLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                      </div>
                    ) : previewStudents.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-slate-900">No students found</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          No students match the selected criteria for this reminder type.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {previewStudents.map((student, index) => (
                          <div key={student.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{student.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                      <span>Roll: {student.roll_number || 'N/A'}</span>
                                      <span>•</span>
                                      <span>Class: {student.class_name}</span>
                                      {student.whatsapp && (
                                        <>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                            {student.whatsapp}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    {student.parent_name && (
                                      <p className="text-sm text-slate-600 mt-1">
                                        Parent: {student.parent_name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {student.fee_status && (
                                  <div className="mt-3 pt-3 border-t border-slate-200">
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        student.fee_status === 'Overdue' 
                                          ? 'bg-red-100 text-red-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {student.fee_status}
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        ₹{student.total_due?.toFixed(2) || '0.00'} due
                                      </span>
                                      <span className="text-slate-600">
                                        {student.pending_months} pending month{student.pending_months !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    {student.fee_details && student.fee_details.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {student.fee_details.slice(0, 3).map((fee: any, i: number) => (
                                          <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                                            <span className="font-medium">{fee.month}:</span>
                                            <span>₹{fee.amount?.toFixed(2)}</span>
                                            <span className="text-slate-400">•</span>
                                            <span>Due: {new Date(fee.due_date).toLocaleDateString('en-IN')}</span>
                                          </div>
                                        ))}
                                        {student.fee_details.length > 3 && (
                                          <p className="text-xs text-slate-500 italic">
                                            +{student.fee_details.length - 3} more
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        These students will receive the reminder based on your settings
                      </p>
                      <Button 
                        onClick={() => {
                          setShowStudentPreviewModal(false);
                          setPreviewStudents([]);
                        }}
                      >
                        Close Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
    </div>
  );
}

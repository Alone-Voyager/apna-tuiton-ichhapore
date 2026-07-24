"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Bell, Mail, CheckCircle, FileText, Plus, Filter, Download, Edit, Eye, Trash2, FileText as FileTextIcon, ArrowLeft } from 'lucide-react';

type ReminderSettings = {
  feeReminders: boolean;
  attendanceAlerts: boolean;
  eventNotifications: boolean;
  examReminders: boolean;
  holidayNotifications: boolean;
};

export default function Reminders() {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/settings');
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    feeReminders: true,
    attendanceAlerts: true,
    eventNotifications: true,
    examReminders: true,
    holidayNotifications: false
  });

  const [reminderFrequency, setReminderFrequency] = useState({
    feeReminder: 'weekly',
    attendanceAlert: 'daily',
    examReminder: 'monthly'
  });

  const activeReminders = [
    {
      id: 1,
      type: 'Fee Payment',
      title: 'Monthly Fee Due Reminder',
      recipients: 45,
      nextSend: '2025-09-25',
      frequency: 'Monthly',
      status: 'Active',
      template: 'Default fee reminder template'
    },
    {
      id: 2,
      type: 'Attendance',
      title: 'Low Attendance Alert',
      recipients: 12,
      nextSend: '2025-09-21',
      frequency: 'Weekly',
      status: 'Active',
      template: 'Attendance concern template'
    },
    {
      id: 3,
      type: 'Exam',
      title: 'Upcoming Exam Notification',
      recipients: 180,
      nextSend: '2025-09-30',
      frequency: 'As needed',
      status: 'Scheduled',
      template: 'Exam preparation template'
    },
    {
      id: 4,
      type: 'Event',
      title: 'Parent-Teacher Meeting',
      recipients: 95,
      nextSend: '2025-10-05',
      frequency: 'One-time',
      status: 'Scheduled',
      template: 'Meeting invitation template'
    }
  ];

  const reminderTemplates = [
    {
      id: 1,
      name: 'Fee Payment Due',
      type: 'SMS',
      content: 'Dear Parent, Your ward\'s tuition fee of ₹[AMOUNT] is due on [DATE]. Please make payment to avoid late charges. - TuitionPro',
      usage: 234
    },
    {
      id: 2,
      name: 'Low Attendance Alert',
      type: 'Email',
      content: 'Dear Parent, We noticed [STUDENT_NAME]\'s attendance has dropped to [PERCENTAGE]%. Please ensure regular attendance.',
      usage: 56
    },
    {
      id: 3,
      name: 'Exam Reminder',
      type: 'Both',
      content: 'Upcoming exam for [SUBJECT] on [DATE]. Please ensure [STUDENT_NAME] is well prepared. Syllabus: [TOPICS]',
      usage: 145
    }
  ];

  const handleReminderToggle = (type: keyof ReminderSettings) => {
    setReminderSettings(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Paused': return 'bg-yellow-100 text-yellow-800';
      case 'Stopped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Fee Payment': return 'bg-green-100 text-green-800';
      case 'Attendance': return 'bg-blue-100 text-blue-800';
      case 'Exam': return 'bg-purple-100 text-purple-800';
      case 'Event': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <main className="p-4 lg:p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Button>
        </div>
        <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{activeReminders.length}</p>
                      <p className="text-sm text-slate-600">Active Reminders</p>
                    </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bell className="text-blue-600 w-6 h-6" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">332</p>
                      <p className="text-sm text-slate-600">Sent This Month</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Mail className="text-green-600 w-6 h-6" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">94.5%</p>
                      <p className="text-sm text-slate-600">Delivery Rate</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-purple-600 w-6 h-6" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">3</p>
                      <p className="text-sm text-slate-600">Templates</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileTextIcon className="text-orange-600 w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminder Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
                  <h3 className="text-lg font-semibold text-slate-800">Reminder Configuration</h3>
                  <Button>
                    <Plus className="mr-2 w-4 h-4" />
                    Create New Reminder
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Toggle Settings */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-4">Enable/Disable Reminders</h4>
                    <div className="space-y-4">
                      {(Object.entries(reminderSettings) as Array<[keyof ReminderSettings, boolean]>).map(([key, value]) => (
                        <div key={String(key)} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <h5 className="font-medium text-slate-800 capitalize">
                              {String(key).replace(/([A-Z])/g, ' $1').trim()}
                            </h5>
                            <p className="text-sm text-slate-600">
                              {key === 'feeReminders' && 'Send payment due notifications'}
                              {key === 'attendanceAlerts' && 'Alert for low attendance'}
                              {key === 'eventNotifications' && 'Notify about upcoming events'}
                              {key === 'examReminders' && 'Remind about exam schedules'}
                              {key === 'holidayNotifications' && 'Announce holidays and breaks'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleReminderToggle(key)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              value ? 'bg-red-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frequency Settings */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-4">Reminder Frequency</h4>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Fee Reminders</label>
                        <select 
                          value={reminderFrequency.feeReminder}
                          onChange={(e) => setReminderFrequency({...reminderFrequency, feeReminder: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Attendance Alerts</label>
                        <select 
                          value={reminderFrequency.attendanceAlert}
                          onChange={(e) => setReminderFrequency({...reminderFrequency, attendanceAlert: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Exam Reminders</label>
                        <select 
                          value={reminderFrequency.examReminder}
                          onChange={(e) => setReminderFrequency({...reminderFrequency, examReminder: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Reminders */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
                  <h3 className="text-lg font-semibold text-slate-800">Active Reminders</h3>
                  <div className="flex items-center space-x-3">
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 w-4 h-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeReminders.map((reminder) => (
                      <div key={reminder.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">{reminder.title}</div>

                            {/* Badges under title */}
                            <div className="mt-2 flex items-center justify-start gap-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(reminder.type)}`}>
                                {reminder.type}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reminder.status)}`}>
                                {reminder.status}
                              </span>
                            </div>

                            <div className="mt-3 text-sm text-slate-600">
                              <div className="text-sm text-slate-600 mt-2 line-clamp-2">{reminder.template}</div>

                              <div className="mt-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-slate-500">Recipients</div>
                                  <div className="font-medium text-slate-800">{reminder.recipients}</div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="text-xs text-slate-500">Next Send</div>
                                  <div className="text-slate-800">{reminder.nextSend}</div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="text-xs text-slate-500">Frequency</div>
                                  <div className="text-slate-800">{reminder.frequency}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="ml-3 flex-shrink-0 text-right">
                            <div className="mt-3 flex flex-col items-end space-y-2">
                              <button className="p-2 hover:bg-blue-100 rounded-lg" title="Edit">
                                <Edit className="text-blue-600 w-4 h-4" />
                              </button>
                              <button className="p-2 hover:bg-green-100 rounded-lg" title="Preview">
                                <Eye className="text-green-600 w-4 h-4" />
                              </button>
                              <button className="p-2 hover:bg-red-100 rounded-lg" title="Delete">
                                <Trash2 className="text-red-600 w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message Templates */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
                  <h3 className="text-lg font-semibold text-slate-800">Message Templates</h3>
                  <Button>
                    <Plus className="mr-2 w-4 h-4" />
                    Create Template
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {reminderTemplates.map((template) => (
                    <div key={template.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800">{template.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          template.type === 'SMS' ? 'bg-green-100 text-green-800' :
                          template.type === 'Email' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {template.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-3">{template.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Used {template.usage} times</span>
                        <div className="flex items-center space-x-2">
                          <button className="p-1 hover:bg-blue-100 rounded">
                            <Edit className="text-blue-600 text-sm w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-green-100 rounded">
                            <FileTextIcon className="text-green-600 text-sm w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-red-100 rounded">
                            <Trash2 className="text-red-600 text-sm w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Analytics */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Delivery Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="text-green-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800">Delivered</h4>
                        <p className="text-sm text-green-600">314 messages (94.5%)</p>
                      </div>
                    </div>
                    <p className="text-xs text-green-700">All messages delivered successfully</p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <FileTextIcon className="text-yellow-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-800">Pending</h4>
                        <p className="text-sm text-yellow-600">12 messages (3.6%)</p>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-700">Currently being processed</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Trash2 className="text-red-600 w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-800">Failed</h4>
                        <p className="text-sm text-red-600">6 messages (1.9%)</p>
                      </div>
                    </div>
                    <p className="text-xs text-red-700">Invalid numbers or network issues</p>
                  </div>
                </div>
              </div>
            </div>
      </main>
    </div>
  );
}
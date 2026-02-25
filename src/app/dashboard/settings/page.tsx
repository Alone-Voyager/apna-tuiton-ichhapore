"use client"
import { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Settings as SettingsIcon, User, UserPlus, Edit, Trash2, Save } from 'lucide-react';
import { Organization, AdminProfile } from '../../../lib/types';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    state: '',
    city: '',
  });

  const tabs = [
    { id: 'general', name: 'General', icon: <SettingsIcon size={20} /> },
    { id: 'users', name: 'Users & Roles', icon: <User size={20} /> },
  ];

  // Fetch organization data
  useEffect(() => {
    fetchOrganization();
  }, []);

  // Fetch admin profiles when Users tab is active
  useEffect(() => {
    if (activeTab === 'users') {
      fetchAdminProfiles();
    }
  }, [activeTab]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }

      const data = await response.json();
      
      setOrganization(data);
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        state: data.state || '',
        city: data.city || '',
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
      alert('Failed to load organization data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const response = await fetch('/api/admin-profiles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin profiles');
      }

      const data = await response.json();
      setAdminProfiles(data);
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
      alert('Failed to load admin profiles. Please try again.');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);
      const response = await fetch('/api/organizations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: organization.id,
          name: formData.name,
          slug: formData.slug,
          state: formData.state,
          city: formData.city,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      alert('Settings saved successfully!');
      fetchOrganization(); // Refresh data
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
        <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Organization Information</h3>
        {loading ? (
          <div className="text-center py-8 text-slate-600">Loading organization data...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug *</label>
                <input 
                  type="text" 
                  name="slug"
                  value={formData.slug} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  required
                  placeholder="unique-identifier"
                />
                <p className="text-xs text-slate-500 mt-1">Used for unique identification (lowercase, hyphens allowed)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input 
                  type="text" 
                  name="state"
                  value={formData.state} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  placeholder="e.g., Maharashtra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  placeholder="e.g., Mumbai"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
        <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Academic Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
            <select className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8 text-sm">
              <option>2024-2025</option>
              <option>2025-2026</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
            <select className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8 text-sm">
              <option>INR (₹)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time Zone</label>
            <select className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8 text-sm">
              <option>Asia/Kolkata (IST)</option>
              <option>UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
            <select className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8 text-sm">
              <option>English</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersSettings = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h3 className="text-base lg:text-lg font-semibold text-slate-800">Team Members</h3>
          {/* <Button className="sm:w-auto">
            <UserPlus className="mr-2 w-4 h-4" />
            Add User
          </Button> */}
        </div>
        
        {loadingProfiles ? (
          <div className="text-center py-8 text-slate-600">Loading team members...</div>
        ) : adminProfiles.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No team members found</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Status</th>
                    {/* <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Actions</th> */}
                  </tr>
                </thead>
                <tbody>
                  {adminProfiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 font-medium text-slate-800 text-sm">{profile.full_name}</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{profile.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                          {profile.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{profile.phone || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {profile.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 hover:bg-slate-100 rounded">
                            <Edit className="text-slate-600 w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-slate-100 rounded">
                            <Trash2 className="text-red-600 w-4 h-4" />
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {adminProfiles.map((profile) => (
                <div key={profile.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-slate-800">{profile.full_name}</h4>
                      <p className="text-sm text-slate-600 truncate">{profile.email}</p>
                      {profile.phone && (
                        <p className="text-sm text-slate-500 mt-1">{profile.phone}</p>
                      )}
                    </div>
                    {/* <div className="flex items-center space-x-2 ml-2">
                      <button className="p-2 hover:bg-slate-100 rounded">
                        <Edit className="text-slate-600 w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded">
                        <Trash2 className="text-red-600 w-4 h-4" />
                      </button>
                    </div> */}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                      {profile.role.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'users':
        return renderUsersSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <Header 
            title="Settings" 
            subtitle="Manage your application settings and preferences"
            onMobileMenuToggle={() => setSidebarOpen(true)}
          />
          
          <main className="p-4 lg:p-6">
            <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
              {/* Settings Navigation */}
              <div className="xl:w-64 shrink-0">
                <div className="bg-white border border-slate-200 rounded-lg p-3 lg:p-4">
                  
                  {/* Mobile Dropdown */}
                  <div className="xl:hidden mb-4">
                    <select
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8 text-sm"
                    >
                      {tabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Desktop Navigation */}
                  <nav className="hidden xl:block space-y-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all text-sm ${
                          activeTab === tab.id
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <div className="w-5 h-5">{tab.icon}</div>
                        <span className="font-medium">{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-1">
                {renderContent()}
                
                {/* Save Button - Only show for General tab */}
                {activeTab === 'general' && (
                  <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                    <Button 
                      variant="outline" 
                      className="sm:w-auto"
                      onClick={() => {
                        fetchOrganization();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="sm:w-auto"
                      onClick={handleSave}
                      disabled={saving || loading}
                    >
                      <Save className="mr-2 w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RefreshCw, AlertCircle, CheckCircle2, Sheet } from 'lucide-react';

export default function GoogleSheetsIntegrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [config, setConfig] = useState({
    spreadsheetId: '',
    clientEmail: '',
    privateKey: '',
    studentSheetName: 'Students',
    feeSheetName: 'Fee Payments',
    isActive: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/integrations/google-sheets');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load config', err);
      setError('Failed to load existing configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/integrations/google-sheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
      
      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    if (!confirm('This will wipe the current contents of the specified sheets and sync all existing students and fees. Are you sure?')) {
      return;
    }
    
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/integrations/google-sheets/sync', {
        method: 'POST'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync data');
      
      setSuccess(data.message || 'Data synced successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sheet className="text-emerald-600" /> Google Sheets Integration
          </h1>
          <p className="text-gray-500 text-sm">Automatically sync students and fee records to Google Sheets</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manual Sync</h2>
            <p className="text-sm text-gray-500">Push all current database records to Google Sheets immediately</p>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing || !config.spreadsheetId}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              syncing || !config.spreadsheetId
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Connection Settings</h2>
          
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={config.isActive}
              onChange={handleChange}
              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <label htmlFor="isActive" className="font-medium text-gray-900 cursor-pointer">Enable Automatic Sync</label>
              <p className="text-sm text-gray-500">Instantly sync new admissions and fee payments when they happen</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
              <input
                type="text"
                name="spreadsheetId"
                value={config.spreadsheetId}
                onChange={handleChange}
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">The long ID found in your Google Sheet URL.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Account Client Email</label>
              <input
                type="email"
                name="clientEmail"
                value={config.clientEmail}
                onChange={handleChange}
                placeholder="e.g. your-bot@your-project.iam.gserviceaccount.com"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Account Private Key</label>
              <textarea
                name="privateKey"
                value={config.privateKey}
                onChange={handleChange}
                placeholder={config.privateKey === '********' ? '******** (Key is already set)' : '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
                rows={4}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
                required={!config.privateKey}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Sheet Mapping</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Students Sheet Name</label>
                <input
                  type="text"
                  name="studentSheetName"
                  value={config.studentSheetName}
                  onChange={handleChange}
                  placeholder="Students"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fees Sheet Name</label>
                <input
                  type="text"
                  name="feeSheetName"
                  value={config.feeSheetName}
                  onChange={handleChange}
                  placeholder="Fee Payments"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              saving
                ? 'bg-emerald-400 cursor-not-allowed text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
            }`}
          >
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

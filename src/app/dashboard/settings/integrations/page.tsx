"use client"
import { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { MessageCircle, AlertCircle, CheckCircle2, Loader2, Copy, Check, RefreshCw, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../../../components/ui/alert';

interface WhatsAppSettings {
  id?: string;
  api_token: string;
  webhook_secret: string;
  webhook_url: string;
  is_connected: boolean;
  connected_phone_number: string | null;
  connection_status: 'disconnected' | 'connecting' | 'connected' | 'error';
  last_connected_at: string | null;
  last_error: string | null;
  enable_notifications: boolean;
  enable_fee_reminders: boolean;
  enable_attendance_alerts: boolean;
  enable_admission_updates: boolean;
}

export default function IntegrationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [settings, setSettings] = useState<WhatsAppSettings>({
    api_token: '',
    webhook_secret: '',
    webhook_url: '',
    is_connected: false,
    connected_phone_number: null,
    connection_status: 'disconnected',
    last_connected_at: null,
    last_error: null,
    enable_notifications: true,
    enable_fee_reminders: true,
    enable_attendance_alerts: true,
    enable_admission_updates: true,
  });

  const [showApiToken, setShowApiToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Fetch existing settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/whatsapp');
      const data = await response.json();

      if (response.ok && data.settings) {
        setSettings({
          ...data.settings,
          api_token: data.settings.api_token || '',
          webhook_secret: data.settings.webhook_secret || '',
        });
      }
    } catch (err) {
      console.error('Error fetching WhatsApp settings:', err);
      setError('Failed to load WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/integrations/whatsapp', {
        method: settings.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: settings.api_token,
          webhook_secret: settings.webhook_secret,
          enable_notifications: settings.enable_notifications,
          enable_fee_reminders: settings.enable_fee_reminders,
          enable_attendance_alerts: settings.enable_attendance_alerts,
          enable_admission_updates: settings.enable_admission_updates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('WhatsApp settings saved successfully!');
        setSettings(prev => ({ ...prev, ...data.settings }));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving WhatsApp settings:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/integrations/whatsapp/test', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Connection test successful! WhatsApp is configured correctly.');
        fetchSettings(); // Refresh to get updated connection status
      } else {
        setError(data.error || 'Connection test failed');
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setError('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'webhook' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'webhook') {
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = () => {
    switch (settings.connection_status) {
      case 'connected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <X className="w-4 h-4 mr-1" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            Not Connected
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-white">
        <main className="p-4 lg:p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <main className="p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {/* Success/Error Messages */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* WhatsApp Integration Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">WhatsApp</h2>
                    <p className="text-slate-600 text-sm">Connect WhatsApp for automated messaging and notifications</p>
                    <div className="mt-2">{getStatusBadge()}</div>
                  </div>
                </div>

                {settings.connected_phone_number && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                    <p className="text-xs sm:text-sm text-slate-600 break-all">
                      <span className="font-medium">Connected Phone:</span>{' '}
                      <span className="text-slate-800">{settings.connected_phone_number}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Configuration Section */}
              <div className="p-4 sm:p-6 space-y-6">
                {/* Features */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Features:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                      <span>Send notifications</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                      <span>Receive messages</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                      <span>Automated responses</span>
                    </li>
                  </ul>
                </div>

                {/* API Configuration */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">WhatsApp API Configuration</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Configure your WhatsApp API token from <a href="https://wasenderapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">wasenderapi.com</a>
                  </p>

                  {/* API Token */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <span className="flex items-center">
                          <span className="mr-1">🔑</span>
                          WhatsApp API Token
                        </span>
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        This token is used to authenticate with the WhatsApp API
                      </p>
                      <div className="relative">
                        <input
                          type={showApiToken ? 'text' : 'password'}
                          value={settings.api_token}
                          onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
                          placeholder="Enter your Wassender API token"
                          className="w-full p-3 pr-24 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiToken(!showApiToken)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                        >
                          {showApiToken ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {settings.api_token && (
                        <div className="mt-2 flex items-center text-xs text-blue-600">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          <span>Token Already Configured</span>
                        </div>
                      )}
                    </div>

                    {/* Webhook Configuration */}
                    <div className="border-t border-slate-200 pt-4">
                      <h4 className="text-sm font-semibold text-slate-800 mb-3">Webhook Security Token</h4>
                      <p className="text-xs text-slate-500 mb-2">
                        This token is used to secure your webhook endpoint
                      </p>
                      <div className="relative">
                        <input
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={settings.webhook_secret}
                          onChange={(e) => setSettings({ ...settings, webhook_secret: e.target.value })}
                          placeholder="Enter webhook security token"
                          className="w-full p-3 pr-24 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                        >
                          {showWebhookSecret ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {settings.webhook_secret && (
                        <button
                          onClick={() => copyToClipboard(settings.webhook_secret, 'secret')}
                          className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-700"
                        >
                          {copiedSecret ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copiedSecret ? 'Copied!' : 'Copy token'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Webhook URL Section */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Webhooks Configuration</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Configure your WhatsApp webhooks to receive messages
                  </p>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Webhook URL</h4>
                    <p className="text-xs text-slate-600 mb-3">
                      Use this URL in your WhatsApp API provider's webhook settings to receive WhatsApp events.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <code className="flex-1 p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-mono text-slate-800 break-all overflow-x-auto">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(
                          typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp',
                          'webhook'
                        )}
                        className="p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors self-center sm:self-auto"
                        title="Copy webhook URL"
                      >
                        {copiedWebhook ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Integration Guide */}
                  <div className="mt-6 bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                    <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">📚 WhatsApp Integration Guide</h4>
                    <ol className="text-xs sm:text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li>Register for an account at <a href="https://wasenderapi.com" target="_blank" rel="noopener noreferrer" className="underline">wasenderapi.com</a> (Pro plan recommended)</li>
                      <li>After registration, go to the <strong>Sessions</strong> section and connect your WhatsApp number by scanning the QR code</li>
                      <li>In your session settings on wasenderapi.com, add the <strong>Webhook URL</strong> provided above to receive WhatsApp events</li>
                      <li>Enable the following checkboxes in your session settings:
                        <ul className="ml-6 mt-1 space-y-1">
                          <li>• Enable Message Logging</li>
                          <li>• Read Incoming Messages</li>
                          <li>• Enable Webhook Notifications (Optional)</li>
                        </ul>
                      </li>
                      <li>Under <strong>Webhook Events</strong>, select:
                        <ul className="ml-6 mt-1 space-y-1">
                          <li>• message.sent</li>
                          <li>• chats.upsert</li>
                          <li>• messages.upsert</li>
                        </ul>
                      </li>
                      <li>Copy your <strong>API Token</strong> and <strong>Webhook Security Token</strong> from wasenderapi.com and paste them in the fields above</li>
                    </ol>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Notification Settings</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'enable_notifications', label: 'Enable WhatsApp Notifications', description: 'Master toggle for all WhatsApp notifications' },
                      { key: 'enable_fee_reminders', label: 'Fee Reminders', description: 'Send fee payment reminders via WhatsApp' },
                      { key: 'enable_attendance_alerts', label: 'Attendance Alerts', description: 'Send attendance notifications via WhatsApp' },
                      { key: 'enable_admission_updates', label: 'Admission Updates', description: 'Send admission-related updates via WhatsApp' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-start sm:items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 text-xs sm:text-sm">{item.label}</h4>
                          <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={settings[item.key as keyof WhatsAppSettings] as boolean}
                            onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {settings.last_error && settings.connection_status === 'error' && (
                  <div className="border-t border-slate-200 pt-6">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Connection Error:</strong> {settings.last_error}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testing || !settings.api_token}
                    variant="outline"
                    className="w-full sm:w-auto sm:flex-1"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving || !settings.api_token || !settings.webhook_secret}
                    className="w-full sm:w-auto sm:flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Update Token'
                    )}
                  </Button>
                </div>
              </div>
            </div>
      </main>
    </div>
  );
}

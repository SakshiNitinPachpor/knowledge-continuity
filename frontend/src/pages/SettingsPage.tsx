import React, { useState, useEffect } from 'react';
import { useAuth, ThemePreference } from '../context/AuthContext';
import { api } from '../services/api';
import { Workspace } from '../types';
import {
  Settings, User, Building2, Lock, Bell, Palette,
  Shield, Check, AlertCircle, Sun, Moon, Monitor,
  LogOut, Save
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, theme, setThemePreference, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'security' | 'notifications' | 'appearance' | 'permissions'>('appearance');

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWs, setLoadingWs] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState({
    handoverUpdates: true,
    reviewFeedback: true,
    riskAlerts: true,
    knowledgeGaps: false,
    teamInvites: true
  });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setTitle(user.title || '');
    }
    loadWorkspaces();
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      setLoadingWs(true);
      const ws = await api.listWorkspaces();
      setWorkspaces(ws);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWs(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.updateProfile({ full_name: fullName, title });
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 transition-colors">
      
      {/* Page Header */}
      <div className="mb-8">
        <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
          System Administration & Preferences
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-[#B9825A]" />
          Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-gray-400 mt-1">
          Manage your account profile, workspace configuration, security credentials, and application theme.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {[
            { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
            { id: 'profile', label: 'Profile Information', icon: User },
            { id: 'workspace', label: 'Workspaces', icon: Building2 },
            { id: 'security', label: 'Security & Password', icon: Lock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'permissions', label: 'Security & Isolation', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827] shadow-soft'
                    : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400 dark:hover:text-white hover:bg-[#F2EFE9] dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          
          {/* TAB 1: APPEARANCE (CRITICAL FIX) */}
          {activeTab === 'appearance' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#151923] dark:text-white">
                  Appearance & Color Theme
                </h2>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Select your preferred interface mode. Changes apply immediately across the entire platform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Light Option */}
                <button
                  onClick={() => setThemePreference('light')}
                  className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
                    theme === 'light'
                      ? 'border-[#B9825A] bg-[#F8F6F1] ring-2 ring-[#B9825A]/40 dark:bg-gray-900'
                      : 'border-[#E5E1D8] dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 bg-white dark:bg-[#1B2432]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Sun className="w-4 h-4 text-[#B9825A]" />
                    </div>
                    {theme === 'light' && (
                      <span className="w-2 h-2 rounded-full bg-[#B9825A]" />
                    )}
                  </div>
                  <h3 className="font-bold text-xs text-[#151923] dark:text-white">Light Mode</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1">
                    Warm ivory backgrounds, deep charcoal typography, champagne gold accents.
                  </p>
                </button>

                {/* Dark Option */}
                <button
                  onClick={() => setThemePreference('dark')}
                  className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#B9825A] bg-[#F8F6F1] dark:bg-gray-900 ring-2 ring-[#B9825A]/40'
                      : 'border-[#E5E1D8] dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 bg-white dark:bg-[#1B2432]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-900/40 text-amber-300 flex items-center justify-center">
                      <Moon className="w-4 h-4 text-amber-400" />
                    </div>
                    {theme === 'dark' && (
                      <span className="w-2 h-2 rounded-full bg-[#B9825A]" />
                    )}
                  </div>
                  <h3 className="font-bold text-xs text-[#151923] dark:text-white">Dark Mode</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1">
                    Midnight navy canvas, slate surfaces, high-contrast readable text.
                  </p>
                </button>

                {/* System Option */}
                <button
                  onClick={() => setThemePreference('system')}
                  className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
                    theme === 'system'
                      ? 'border-[#B9825A] bg-[#F8F6F1] dark:bg-gray-900 ring-2 ring-[#B9825A]/40'
                      : 'border-[#E5E1D8] dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 bg-white dark:bg-[#1B2432]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center">
                      <Monitor className="w-4 h-4" />
                    </div>
                    {theme === 'system' && (
                      <span className="w-2 h-2 rounded-full bg-[#B9825A]" />
                    )}
                  </div>
                  <h3 className="font-bold text-xs text-[#151923] dark:text-white">System Default</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1">
                    Automatically synchronizes with your device operating system theme.
                  </p>
                </button>

              </div>

              <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800 text-xs text-[#64748B] dark:text-gray-400">
                <span className="font-bold text-[#151923] dark:text-white block mb-0.5">Persistence Notice:</span>
                Your appearance setting is stored securely in your browser's persistent state and will remain active across browser restarts and authenticated sessions.
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE */}
          {activeTab === 'profile' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#151923] dark:text-white">Profile Information</h2>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Update your display name and professional job title.
                </p>
              </div>

              {profileMsg && (
                <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200">
                  {profileMsg}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Email is tied to your cryptographic session credentials.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Job Title / Specialty</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lead Enterprise Architect"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#151923] dark:text-white">Accessible Workspaces</h2>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Private organization workspaces associated with your authenticated user.
                </p>
              </div>

              {loadingWs ? (
                <div className="text-xs text-gray-400 animate-pulse">Loading workspaces...</div>
              ) : (
                <div className="space-y-3">
                  {workspaces.map(ws => (
                    <div
                      key={ws.id}
                      className="p-5 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-xs text-[#151923] dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#B9825A]" />
                          {ws.name}
                        </h3>
                        <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">{ws.description || 'No description provided.'}</p>
                        <span className="text-[10px] font-mono text-gray-400 mt-1 inline-block">Slug: {ws.slug}</span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-[#E5E1D8] dark:border-gray-700 text-[#151923] dark:text-gray-200">
                        {ws.member_count} Member(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#151923] dark:text-white">Security & Password</h2>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Update your authentication credentials. Uses salted bcrypt hashing.
                </p>
              </div>

              {passwordMsg && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                }`}>
                  {passwordMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft cursor-pointer"
                  >
                    {savingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of All Sessions</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#151923] dark:text-white">Notification Preferences</h2>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Configure alerts for handover milestones, reviewer feedback, and contradiction flags.
                </p>
              </div>

              <div className="space-y-3 max-w-lg">
                {[
                  { key: 'handoverUpdates', title: 'Handover State Changes', desc: 'Notify when handovers transition between Submitted, Changes Requested, and Published.' },
                  { key: 'reviewFeedback', title: 'Reviewer Feedback & Notes', desc: 'Receive immediate alerts when reviewers request modifications.' },
                  { key: 'riskAlerts', title: 'Continuity Risk Radar Alerts', desc: 'Alert when a critical single-person dependency or contradiction is detected.' },
                  { key: 'knowledgeGaps', title: 'Knowledge Gap Flagging', desc: 'Notify when ungrounded decisions or unassigned services are discovered.' },
                  { key: 'teamInvites', title: 'Invitation Activity', desc: 'Notify when invited colleagues accept or join projects.' }
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex items-start justify-between p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800 cursor-pointer"
                  >
                    <div className="pr-4">
                      <span className="font-bold text-xs text-[#151923] dark:text-white block">{item.title}</span>
                      <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(notifications as any)[item.key]}
                      onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-[#B9825A] focus:ring-[#B9825A] cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & COLLABORATION ARCHITECTURE */}
          {activeTab === 'permissions' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#151923] dark:text-white">Workspace Security & Tenant Isolation</h2>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Knowledge Continuity enforces strict tenant data isolation, secure authentication, and simple project collaboration.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#B9825A]" />
                    <h3 className="font-bold text-xs text-[#151923] dark:text-white">Tenant Data Isolation</h3>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                    Every registered user is provisioned a private workspace. Projects, uploaded documents, code files, and handover dossiers are strictly isolated by workspace ID and user membership.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="font-bold text-xs text-[#151923] dark:text-white">Simplified Collaboration</h3>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                    Collaborators invited to your project can freely upload documents, annotate code architecture, and review handovers without confusing role lockouts or artificial permission walls.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40">
                <h3 className="text-xs font-bold text-[#151923] dark:text-white mb-2">External Credentials Status</h3>
                <div className="space-y-2 text-xs text-[#64748B] dark:text-gray-400">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                    <span>Public GitHub Repositories</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">✓ Active (No Token Required)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                    <span>Deterministic Evidence Engine</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">✓ Active (Local Grounding)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                    <span>Private GitHub Token (GITHUB_TOKEN)</span>
                    <span className="text-amber-600 font-medium">Optional (.env configured)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Live Gemini / OpenAI Vision API</span>
                    <span className="text-gray-500 font-medium">Manual tagging active; API key optional</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

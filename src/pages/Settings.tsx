import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Settings, Save, CheckCircle2, ShieldAlert, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SettingsPage() {
  const { user, isOrgAdmin, logout } = useAuth();

  // Organization settings states
  const [costThreshold, setCostThreshold] = useState<number>(1000);
  const [defaultCpu, setDefaultCpu] = useState<number>(2);
  const [defaultRam, setDefaultRam] = useState<number>(4);
  const [defaultStorage, setDefaultStorage] = useState<number>(50);
  const [defaultBandwidth, setDefaultBandwidth] = useState<number>(20);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOrgAdmin) {
      const fetchOrgSettings = async () => {
        setFetching(true);
        try {
          const response = await axios.get(`${API_URL}/api/org-settings`);
          if (response.data) {
            setCostThreshold(response.data.costThresholdUsd);
            if (response.data.defaultSpecs) {
              const s = response.data.defaultSpecs;
              setDefaultCpu(s.cpu || 2);
              setDefaultRam(s.ram || 4);
              setDefaultStorage(s.storage || 50);
              setDefaultBandwidth(s.bandwidth || 20);
            }
          }
        } catch (err: any) {
          console.error('[Settings] Error fetching settings:', err);
          setError('Failed to fetch organization settings.');
        } finally {
          setFetching(false);
        }
      };
      fetchOrgSettings();
    }
  }, [isOrgAdmin]);

  const handleSaveOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    const payload = {
      costThresholdUsd: costThreshold,
      defaultSpecs: {
        cpu: defaultCpu,
        ram: defaultRam,
        storage: defaultStorage,
        bandwidth: defaultBandwidth,
      },
    };

    try {
      await axios.post(`${API_URL}/api/org-settings`, payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 6000);
    } catch (err: any) {
      console.error('[Settings] Error saving settings:', err);
      setError(err.response?.data?.error || 'Failed to update organization settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <div id="settings-page-wrapper" className="max-w-3xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-sans font-extrabold text-[#2C2C2A] text-2xl tracking-tight flex items-center space-x-2">
            <Settings className="w-6 h-6 text-purple" />
            <span>Workspace Settings</span>
          </h2>
          <p className="font-sans text-xs text-gray-500 mt-1">
            Manage your individual user profile or organization wide defaults.
          </p>
        </div>
        <Link 
          id="btn-back-dashboard"
          to="/" 
          className="flex items-center space-x-1.5 font-sans font-semibold text-xs text-purple hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {success && (
        <div id="settings-success-banner" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-[#1D9E75] shrink-0" />
          <span className="font-sans text-xs font-semibold">
            Organization-wide default profiles and cost alert thresholds saved successfully!
          </span>
        </div>
      )}

      {error && (
        <p className="p-4 bg-red-50 text-red-700 text-xs font-sans rounded-lg border border-red-200">{error}</p>
      )}

      {/* Profile Section */}
      <div className="bg-white border border-[#d8d5cb] rounded-lg p-6 space-y-4">
        <h3 className="font-sans font-bold text-[#2C2C2A] text-sm pb-2 border-b border-[#d8d5cb]/50">
          Individual Profile Details
        </h3>
        
        <div className="flex items-center space-x-4">
          {user?.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              className="w-16 h-16 rounded-full border-2 border-[#d8d5cb]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#534AB7] text-white flex items-center justify-center font-sans font-bold text-lg uppercase">
              {user?.name ? user.name.slice(0, 2) : 'US'}
            </div>
          )}
          <div>
            <h4 className="font-sans font-bold text-sm text-[#2C2C2A]">{user?.name}</h4>
            <p className="font-sans text-xs text-gray-400 mt-0.5">{user?.email}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="inline-flex items-center bg-[#534AB7]/10 text-[#534AB7] px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wide">
                Role: {user?.role.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wide">
                Domain: {user?.email.split('@')[1]}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            id="btn-settings-logout"
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-sans font-semibold text-xs rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out from Workspace</span>
          </button>
        </div>
      </div>

      {/* Organization Admin Settings Panel */}
      {isOrgAdmin && (
        <div className="bg-white border border-[#d8d5cb] rounded-lg p-6 space-y-5">
          <div className="pb-3 border-b border-[#d8d5cb]/50">
            <h3 className="font-sans font-bold text-[#2C2C2A] text-sm flex items-center space-x-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-[#BA7517]" />
              <span>Organization Cost & Hardware Rules</span>
            </h3>
            <p className="font-sans text-[11px] text-gray-500 mt-0.5">
              Define the default spec profile and cost limits for all users under the <strong className="font-semibold text-purple">@{user?.email.split('@')[1]}</strong> domain.
            </p>
          </div>

          {fetching ? (
            <div className="py-6 flex justify-center items-center space-x-2">
              <Loader2 className="w-6 h-6 text-purple animate-spin" />
              <span className="font-sans text-xs text-gray-400">Retrieving organization settings...</span>
            </div>
          ) : (
            <form id="org-rules-form" onSubmit={handleSaveOrgSettings} className="space-y-5">
              {/* Cost Threshold Warn Limit */}
              <div className="space-y-1.5">
                <label htmlFor="settings-cost-threshold" className="block font-sans text-xs font-semibold text-gray-500">
                  Monthly Spend Alert Threshold (USD)
                </label>
                <div className="relative rounded-md shadow-xs max-w-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-400 font-mono text-xs">$</span>
                  </div>
                  <input
                    id="settings-cost-threshold"
                    type="number"
                    min={1}
                    value={costThreshold}
                    onChange={(e) => setCostThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full border border-[#d8d5cb] rounded-lg pl-7 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-purple"
                    required
                  />
                </div>
                <span className="font-sans text-[10px] text-gray-400 block">
                  Triggers an automatic budget warning alert whenever an estimate exceeds this cost.
                </span>
              </div>

              {/* Specs profile */}
              <div className="bg-[#F1EFE8]/20 border border-[#d8d5cb]/50 rounded-lg p-4 space-y-4">
                <h4 className="font-sans font-bold text-xs text-[#2C2C2A]">Default Evaluation Profile</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Default CPU */}
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-semibold text-gray-500">vCPUs</label>
                    <input
                      id="settings-default-cpu"
                      type="number"
                      min={1}
                      max={128}
                      value={defaultCpu}
                      onChange={(e) => setDefaultCpu(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full border border-[#d8d5cb] rounded px-2.5 py-1 text-xs font-mono"
                      required
                    />
                  </div>

                  {/* Default RAM */}
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-semibold text-gray-500">RAM (GB)</label>
                    <input
                      id="settings-default-ram"
                      type="number"
                      min={1}
                      max={512}
                      value={defaultRam}
                      onChange={(e) => setDefaultRam(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full border border-[#d8d5cb] rounded px-2.5 py-1 text-xs font-mono"
                      required
                    />
                  </div>

                  {/* Default Storage */}
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-semibold text-gray-500">Storage (GB)</label>
                    <input
                      id="settings-default-storage"
                      type="number"
                      min={10}
                      max={10000}
                      value={defaultStorage}
                      onChange={(e) => setDefaultStorage(Math.max(10, parseInt(e.target.value, 10) || 10))}
                      className="w-full border border-[#d8d5cb] rounded px-2.5 py-1 text-xs font-mono"
                      required
                    />
                  </div>

                  {/* Default Bandwidth */}
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-semibold text-gray-500">Bandwidth (GB)</label>
                    <input
                      id="settings-default-bandwidth"
                      type="number"
                      min={1}
                      max={10000}
                      value={defaultBandwidth}
                      onChange={(e) => setDefaultBandwidth(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full border border-[#d8d5cb] rounded px-2.5 py-1 text-xs font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="btn-save-org-settings"
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-purple hover:bg-purple/95 text-white text-xs font-sans font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>{loading ? 'Saving Changes...' : 'Save Organization Rules'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
}

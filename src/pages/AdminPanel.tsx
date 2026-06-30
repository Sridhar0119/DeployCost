import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { ShieldAlert, Users, Layers, Trash2, ArrowLeft, Loader2, Search, Mail, ShieldCheck } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Organization {
  id: number;
  name: string;
  member_count: number;
  created_at: string;
}

interface UserRecord {
  id: number;
  email: string;
  name: string;
  oauth_provider: string;
  role: string;
  org_id: number;
  org_name: string;
  created_at: string;
}

export default function AdminPanel() {
  const { user, isSuperAdmin } = useAuth();

  // If not super_admin, block access
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/organizations`);
      if (Array.isArray(response.data)) {
        setOrgs(response.data);
      }
    } catch (err: any) {
      console.error('[Admin] Failed to load orgs:', err);
      setError('Failed to retrieve organizations.');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`);
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err: any) {
      console.error('[Admin] Failed to load users:', err);
      setError('Failed to retrieve user accounts database.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
    fetchAllUsers();
  }, []);

  const handleDeleteUser = async (targetUser: UserRecord) => {
    if (targetUser.id === user?.id) {
      alert('You cannot remove your own active account from the admin panel.');
      return;
    }

    const confirmMsg = `⚠️ EXTREME ACTION: Are you sure you want to permanently delete user "${targetUser.name}" (${targetUser.email})? This will immediately terminate their sessions and access rights.`;
    if (window.confirm(confirmMsg)) {
      try {
        await axios.delete(`${API_URL}/api/admin/users/${targetUser.id}`);
        setSuccess(`User "${targetUser.name}" successfully deleted.`);
        
        // Optimistically update lists
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        setOrgs((prev) => 
          prev.map((o) => 
            o.id === targetUser.org_id ? { ...o, member_count: Math.max(0, o.member_count - 1) } : o
          )
        );

        setTimeout(() => setSuccess(null), 5000);
      } catch (err: any) {
        console.error('[Admin] Delete user failed:', err);
        setError(err.response?.data?.error || 'Failed to delete user.');
      }
    }
  };

  // Filter users based on selections
  const filteredUsers = users.filter((u) => {
    // 1. Domain Organization Select Filter
    if (selectedOrgId !== null && u.org_id !== selectedOrgId) {
      return false;
    }
    // 2. Search Text Input Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.org_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div id="admin-panel-wrapper" className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-sans font-extrabold text-[#2C2C2A] text-2xl tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6.5 h-6.5 text-[#BA7517] animate-pulse" />
            <span>Super Admin Headquarters</span>
          </h2>
          <p className="font-sans text-xs text-gray-500 mt-1">
            Global management hub for organizations, user accounts, and domains.
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
        <div id="admin-success-banner" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-[#1D9E75]" />
          <span className="font-sans text-xs font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <p className="p-4 bg-red-50 text-red-700 text-xs font-sans rounded-lg border border-red-200">{error}</p>
      )}

      {/* Main Splitscreen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Organizations List (span 4) */}
        <div className="lg:col-span-4 bg-white border border-[#d8d5cb] rounded-lg p-5 space-y-4">
          <h3 className="font-sans font-bold text-[#2C2C2A] text-xs flex items-center space-x-1.5 uppercase tracking-wide border-b border-[#d8d5cb]/50 pb-2.5">
            <Layers className="w-4 h-4 text-purple" />
            <span>Organizations ({orgs.length})</span>
          </h3>

          {loadingOrgs ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-purple animate-spin" />
              <span className="font-sans text-[11px] text-gray-400">Loading organizations...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {/* Select All */}
              <button
                id="btn-filter-org-all"
                onClick={() => setSelectedOrgId(null)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-sans font-bold flex justify-between items-center transition-colors ${
                  selectedOrgId === null
                    ? 'bg-[#534AB7]/10 text-[#534AB7]'
                    : 'text-gray-dark hover:bg-[#F1EFE8]/40'
                }`}
              >
                <span>All Domain Groups</span>
                <span className="bg-gray-200 text-gray-700 font-mono text-[10px] px-1.5 py-0.5 rounded">
                  {users.length}
                </span>
              </button>

              {orgs.map((org) => (
                <button
                  key={org.id}
                  id={`btn-filter-org-${org.id}`}
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-sans font-semibold flex justify-between items-center transition-colors ${
                    selectedOrgId === org.id
                      ? 'bg-[#534AB7]/10 text-[#534AB7]'
                      : 'text-gray-dark hover:bg-[#F1EFE8]/40'
                  }`}
                >
                  <span className="truncate pr-2">{org.name}</span>
                  <span className="bg-gray-200 text-gray-700 font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0">
                    {org.member_count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Searchable Roster (span 8) */}
        <div className="lg:col-span-8 bg-white border border-[#d8d5cb] rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#d8d5cb]/50 pb-3">
            <h3 className="font-sans font-bold text-[#2C2C2A] text-xs flex items-center space-x-1.5 uppercase tracking-wide">
              <Users className="w-4.5 h-4.5 text-purple" />
              <span>User Accounts Directory ({filteredUsers.length})</span>
            </h3>

            {/* Search inputs */}
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                id="input-admin-user-search"
                type="text"
                placeholder="Search name, email, org..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full border border-[#d8d5cb] rounded-lg text-xs font-sans focus:outline-none focus:border-purple"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-7 h-7 text-purple animate-spin" />
              <span className="font-sans text-xs text-gray-400">Querying directory...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-sans text-xs">
              No matching users found for selection filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="admin-users-table" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F1EFE8]/30 border-b border-[#d8d5cb] text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Org / Domain</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Auth</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8d5cb]/50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} id={`admin-user-row-${u.id}`} className="hover:bg-[#F1EFE8]/10 transition-colors">
                      {/* Name/Email */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-sans font-bold text-[#2C2C2A]">{u.name}</span>
                          <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-2.5 h-2.5 shrink-0" />
                            {u.email}
                          </span>
                        </div>
                      </td>

                      {/* Org */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col min-w-0">
                          <span className="font-sans font-semibold text-[#2C2C2A] truncate">{u.org_name}</span>
                          <span className="font-mono text-[9px] text-gray-400 truncate mt-0.5">ID: {u.org_id}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-wider ${
                          u.role === 'super_admin'
                            ? 'bg-amber-100 text-[#BA7517]'
                            : u.role === 'org_admin'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Provider */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[10px] text-gray-500 capitalize">
                        {u.oauth_provider}
                      </td>

                      {/* Deletion actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          id={`btn-admin-delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === user?.id}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title={u.id === user?.id ? 'Self deletion blocked' : `Delete user account: ${u.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

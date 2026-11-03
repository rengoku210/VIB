import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  X,
  Edit2,
  Trash2,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login?: string;
  permissions: string[];
}

const AVAILABLE_MODULES = [
  { id: 'analytics', label: 'Analytics & Revenue', description: 'View dashboard metrics and gross sales volume' },
  { id: 'orders', label: 'Order Fulfillment Desk', description: 'Inspect orders, verify evidence, fulfill items' },
  { id: 'inventory', label: 'Indian VP Vault', description: 'Manage unredeemed stock codes and batch imports' },
  { id: 'listings', label: 'Marketplace Listings', description: 'Approve, create, modify, or archive account listings' },
  { id: 'auctions', label: 'Auctions House', description: 'Create and control auction lots, bids, and winners' },
  { id: 'rentals', label: 'Rental Vault & Handover', description: 'Manage rental listings, bookings, and WhatsApp handover' },
  { id: 'invoices', label: 'Invoices & Billing', description: 'Issue commercial invoices and print/download GST reports' },
  { id: 'finance', label: 'Financial Control', description: 'Manage operational expenses, profit margins, and reports' },
  { id: 'users', label: 'Customer Directory & CRM', description: 'Audit customer profiles, internal CRM notes, and histories' },
  { id: 'support', label: 'Communication Center', description: 'Resolve customer dispute tickets and send notifications' },
  { id: 'tasks', label: 'Staff Task Operations', description: 'Create and assign operational tasks to team members' },
  { id: 'settings', label: 'Payment Gateway & Banking', description: 'Configure UPI VPA, QR codes, and bank ledger details' },
];

export const AdminStaffManagement: React.FC = () => {
  const { token, user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Staff Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'moderator' | 'staff' | 'admin'>('moderator');
  const [createPermissions, setCreatePermissions] = useState<string[]>([
    'analytics', 'orders', 'inventory', 'listings', 'auctions', 'rentals', 'support'
  ]);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Permissions Modal
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [token]);

  const fetchStaff = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.warn('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCreatePerm = (moduleId: string) => {
    if (createPermissions.includes(moduleId)) {
      setCreatePermissions(createPermissions.filter((m) => m !== moduleId));
    } else {
      setCreatePermissions([...createPermissions, moduleId]);
    }
  };

  const handleToggleEditPerm = (moduleId: string) => {
    if (editPermissions.includes(moduleId)) {
      setEditPermissions(editPermissions.filter((m) => m !== moduleId));
    } else {
      setEditPermissions([...editPermissions, moduleId]);
    }
  };

  const handleSelectAllCreate = () => {
    if (createPermissions.length === AVAILABLE_MODULES.length) {
      setCreatePermissions([]);
    } else {
      setCreatePermissions(AVAILABLE_MODULES.map((m) => m.id));
    }
  };

  const handleSelectAllEdit = () => {
    if (editPermissions.length === AVAILABLE_MODULES.length) {
      setEditPermissions([]);
    } else {
      setEditPermissions(AVAILABLE_MODULES.map((m) => m.id));
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmittingCreate(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: createRole,
          permissions: createPermissions,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsCreateOpen(false);
        setCreateName('');
        setCreateEmail('');
        setCreatePassword('');
        setCreatePermissions(['analytics', 'orders', 'inventory', 'listings', 'auctions', 'rentals', 'support']);
        fetchStaff();
      } else {
        setCreateError(data.error || 'Failed to create staff account.');
      }
    } catch {
      setCreateError('Network error while creating staff account.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingStaff) return;
    setSubmittingEdit(true);

    try {
      const res = await fetch(`/api/admin/staff/${editingStaff.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions: editPermissions }),
      });

      if (res.ok) {
        setEditingStaff(null);
        fetchStaff();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to update permissions.');
      }
    } catch {
      alert('Network error while saving permissions.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
  });

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#120d26] via-[#0d091e] to-[#070510] border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
              <span>Staff Accounts &amp; Granular Permissions</span>
              <span className="text-xs font-mono bg-purple-950/80 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full">
                {staff.length} Active Staff
              </span>
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Role-based access control (RBAC) with individual module permissions across 12 operational domains.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStaff}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Refresh staff roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-xs text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Staff Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, email, or role..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <div className="text-xs font-mono text-gray-400">
          Showing {filteredStaff.length} of {staff.length} team members
        </div>
      </div>

      {/* Staff Roster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-sans">
            No staff members found matching your search criteria.
          </div>
        ) : (
          filteredStaff.map((member) => {
            const isSelf = member.id === user?.id;
            return (
              <div
                key={member.id}
                className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/10 space-y-4 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-base text-white font-sans flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {isSelf && (
                          <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate max-w-[220px]">{member.email}</div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        member.role === 'superadmin'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : member.role === 'admin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>

                  {/* Permissions Badges */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono uppercase text-gray-500 font-bold flex items-center justify-between">
                      <span>Module Permissions</span>
                      <span>{member.permissions?.length || 0} / 12</span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-[88px] overflow-y-auto">
                      {(member.permissions || []).map((permId) => {
                        const mod = AVAILABLE_MODULES.find((m) => m.id === permId);
                        return (
                          <span
                            key={permId}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300"
                            title={mod?.description}
                          >
                            {mod?.label || permId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-gray-500">
                  <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStaff(member);
                        setEditPermissions(member.permissions || []);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold font-rajdhani uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Perms</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-[#0e0f1e] border border-purple-500/40 p-6 sm:p-8 shadow-2xl text-white space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider text-white">
                  Create Operational Staff Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 uppercase mb-1">Staff Member Name *</label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Arjun Verma"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 uppercase mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="arjun@vib.gg"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 uppercase mb-1">Initial Password * (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 uppercase mb-1">Account Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111220] border border-white/15 text-white focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="moderator">Moderator (Operations &amp; Fulfill)</option>
                    <option value="staff">Staff (Limited Specialist)</option>
                    <option value="admin">Administrator (Broad Access)</option>
                  </select>
                </div>
              </div>

              {/* Module Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-300 uppercase font-bold">
                    Assign Module Permissions ({createPermissions.length} / {AVAILABLE_MODULES.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllCreate}
                    className="text-purple-400 hover:text-purple-300 text-[11px] underline cursor-pointer"
                  >
                    {createPermissions.length === AVAILABLE_MODULES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = createPermissions.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleCreatePerm(mod.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-purple-950/40 border-purple-500/60 text-white'
                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-purple-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs">{mod.label}</div>
                          <div className="text-[10px] text-gray-400 leading-tight">{mod.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-sm text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {submittingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-[#0e0f1e] border border-purple-500/40 p-6 sm:p-8 shadow-2xl text-white space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider text-white">
                  Edit Staff Permissions: {editingStaff.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{editingStaff.name}</div>
                  <div className="text-gray-400">{editingStaff.email}</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-500/40">
                  {editingStaff.role}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-300 uppercase font-bold">
                    Module Access ({editPermissions.length} / {AVAILABLE_MODULES.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllEdit}
                    className="text-purple-400 hover:text-purple-300 text-[11px] underline cursor-pointer"
                  >
                    {editPermissions.length === AVAILABLE_MODULES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = editPermissions.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleEditPerm(mod.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-purple-950/40 border-purple-500/60 text-white'
                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-purple-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs">{mod.label}</div>
                          <div className="text-[10px] text-gray-400 leading-tight">{mod.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-sm text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

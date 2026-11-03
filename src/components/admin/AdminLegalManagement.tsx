import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Users,
  Eye,
  Edit3,
  X,
  Loader2,
  Save,
  Check,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLegalManagement: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'policies' | 'consents'>('policies');
  const [policies, setPolicies] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor Modal
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [versionData, setVersionData] = useState({
    version: '1.1',
    content_md: '',
    summary_of_changes: 'Routine compliance review under DPDPA 2023 & Consumer Protection E-Commerce Rules.',
    effective_date: new Date().toISOString().slice(0, 10),
    publishNow: true,
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
    if (activeTab === 'consents') {
      fetchConsents();
    }
  }, [token, activeTab]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/legal/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
      }
    } catch (err) {
      console.warn('Failed to fetch legal policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/legal/consents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConsents(data.consents || []);
      }
    } catch (err) {
      console.warn('Failed to fetch legal consents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditor = async (policy: any) => {
    setSelectedPolicy(policy);
    setSaveMsg(null);
    setIsEditorOpen(true);
    try {
      const res = await fetch(`/api/legal/policies/${policy.slug}`);
      if (res.ok) {
        const data = await res.json();
        const activeVer = data.activeVersion;
        const currentVerNum = parseFloat(policy.current_version || '1.0');
        const nextVerNum = (currentVerNum + 0.1).toFixed(1);
        setVersionData({
          version: nextVerNum,
          content_md: activeVer?.content_md || '',
          summary_of_changes: 'Compliance update under Indian digital commerce regulations.',
          effective_date: new Date().toISOString().slice(0, 10),
          publishNow: true,
        });
      }
    } catch (err) {
      console.warn('Failed to load version details:', err);
    }
  };

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/legal/policies/${selectedPolicy.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(versionData),
      });

      if (res.ok) {
        setIsEditorOpen(false);
        fetchPolicies();
      } else {
        const err = await res.json();
        setSaveMsg(err.error || 'Failed to save legal policy version.');
      }
    } catch {
      setSaveMsg('Network failure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0d1b] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Legal Governance &amp; Regulatory Compliance (Indian Law)
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative, immutable policies compliant with DPDPA 2023, Information Technology Act 2000, and Consumer Protection (E-Commerce) Rules 2020.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={activeTab === 'policies' ? fetchPolicies : fetchConsents}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
            title="Refresh Legal Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'policies'
              ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Statutory Policies ({policies.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('consents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'consents'
              ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Consent Audit Log ({consents.length})</span>
        </button>
      </div>

      {/* TAB 1: 16 AUTHORITATIVE POLICIES */}
      {activeTab === 'policies' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0d1b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
                <tr>
                  <th className="p-3.5">Policy Title &amp; Slug</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Current Version</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-white/[0.02]">
                    <td className="p-3.5">
                      <div className="font-bold text-white font-rajdhani text-sm">
                        {policy.title}
                      </div>
                      <div className="text-[10px] text-purple-400 font-mono">
                        /legal/{policy.slug}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 text-[10px] uppercase font-bold">
                        {policy.category?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-cyan-300">
                        v{policy.current_version || '1.0'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {policy.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEditor(policy)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white font-bold text-[11px] cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit / New Version</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONSENT AUDIT LOG */}
      {activeTab === 'consents' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0d1b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
                <tr>
                  <th className="p-3.5">User &amp; IP Address</th>
                  <th className="p-3.5">Policy Slug</th>
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Consent Type</th>
                  <th className="p-3.5">Context / Reference</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-sans text-xs">
                      Zero consent audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  consents.map((consent) => (
                    <tr key={consent.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5">
                        <div className="font-bold text-white">
                          {consent.user_id ? consent.user_id.slice(0, 14) : 'Anonymous Session'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          IP: {consent.ip_address || '127.0.0.1'}
                        </div>
                      </td>

                      <td className="p-3.5 text-purple-300 font-bold">
                        {consent.policy_slug || consent.policy_id}
                      </td>

                      <td className="p-3.5 text-cyan-300">
                        v{consent.policy_version || '1.0'}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 text-[10px]">
                          {consent.consent_type}
                        </span>
                      </td>

                      <td className="p-3.5 text-gray-400 text-[10px]">
                        {consent.context_type}: {consent.context_id || 'none'}
                      </td>

                      <td className="p-3.5 text-gray-400 text-[10px]">
                        {new Date(consent.created_at).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / PUBLISH NEW VERSION */}
      {isEditorOpen && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#0b0c19] border border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl my-8 space-y-5">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-white/10 pb-3">
              <h3 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>Draft New Version: {selectedPolicy.title}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Current active version: v{selectedPolicy.current_version || '1.0'} · Previous versions remain archived for immutable legal auditability.
              </p>
            </div>

            {saveMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {saveMsg}
              </div>
            )}

            <form onSubmit={handleSaveVersion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">New Version Number *</label>
                  <input
                    type="text"
                    required
                    value={versionData.version}
                    onChange={(e) => setVersionData({ ...versionData, version: e.target.value })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={versionData.effective_date}
                    onChange={(e) => setVersionData({ ...versionData, effective_date: e.target.value })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Summary of Regulatory Changes *</label>
                <input
                  type="text"
                  required
                  value={versionData.summary_of_changes}
                  onChange={(e) => setVersionData({ ...versionData, summary_of_changes: e.target.value })}
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Policy Markdown Content *</label>
                <textarea
                  rows={14}
                  required
                  value={versionData.content_md}
                  onChange={(e) => setVersionData({ ...versionData, content_md: e.target.value })}
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl p-3.5 text-xs text-white font-mono focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publishNow"
                  checked={versionData.publishNow}
                  onChange={(e) => setVersionData({ ...versionData, publishNow: e.target.checked })}
                  className="rounded border-white/20 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="publishNow" className="text-xs text-gray-300 cursor-pointer select-none">
                  Publish immediately (archives previous version and establishes effective legal date)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-xs font-bold uppercase font-rajdhani cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save &amp; Publish Version</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

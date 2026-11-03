import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  FileText,
  ChevronRight,
  Clock,
  Mail,
  User,
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ClientPage } from '../client/Header';

interface LegalPageProps {
  initialSlug?: string;
  onNavigate: (page: ClientPage) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  initialSlug = 'terms-and-conditions',
  onNavigate,
}) => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);
  const [currentPolicy, setCurrentPolicy] = useState<any | null>(null);
  const [activeVersion, setActiveVersion] = useState<any | null>(null);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Sync prop changes
  useEffect(() => {
    if (initialSlug && initialSlug !== selectedSlug) {
      setSelectedSlug(initialSlug);
    }
  }, [initialSlug]);

  // Fetch all policies metadata
  useEffect(() => {
    fetch('/api/legal/policies')
      .then((res) => res.json())
      .then((data) => {
        if (data?.policies) {
          setPolicies(data.policies);
        }
      })
      .catch((err) => console.warn('Failed to fetch policies catalog:', err));
  }, []);

  // Fetch selected policy content & versions
  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    fetch(`/api/legal/policies/${selectedSlug}`)
      .then((res) => res.json())
      .then((data) => {
        const activeVer = data.activeVersion || data.currentVersion || null;
        setCurrentPolicy(data.policy || null);
        setActiveVersion(activeVer);
        setVersionsList(data.versions || []);
        if (activeVer?.version) {
          setSelectedVersion(activeVer.version);
        }
      })
      .catch((err) => console.warn('Failed to fetch policy details:', err))
      .finally(() => setLoading(false));
  }, [selectedSlug]);

  const handleSelectVersion = async (verNum: string) => {
    setSelectedVersion(verNum);
    setLoading(true);
    try {
      const res = await fetch(`/api/legal/policies/${selectedSlug}/versions/${verNum}`);
      if (res.ok) {
        const data = await res.json();
        setActiveVersion(data.version || null);
      }
    } catch (err) {
      console.warn('Failed to switch version:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group policies by category
  const categories: Record<string, any[]> = {
    'Core Platform': [],
    'Marketplace & Financial': [],
    'User Conduct & Security': [],
    'Governance & Regulatory': [],
  };

  policies.forEach((p) => {
    const cat = p.category;
    if (cat === 'core_platform') categories['Core Platform'].push(p);
    else if (cat === 'marketplace_financial') categories['Marketplace & Financial'].push(p);
    else if (cat === 'conduct_security') categories['User Conduct & Security'].push(p);
    else categories['Governance & Regulatory'].push(p);
  });

  return (
    <div className="w-full min-h-screen bg-[#05040a] text-white selection:bg-purple-600 selection:text-white py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1360px] mx-auto space-y-8">
        {/* Breadcrumb & Header */}
        <div className="space-y-3 border-b border-white/5 pb-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-purple-400 font-semibold">Legal &amp; Regulatory Hub</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Statutory Compliance · Indian Jurisdiction</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-rajdhani">
                VIB 2.0 LEGAL &amp; GOVERNANCE PORTAL
              </h1>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono bg-white/[0.03] border border-white/10 p-3 rounded-xl">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Grievance Response SLA: 48h (IT Rules 2021)</span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: 16 Categorized Statutory Policies */}
          <div className="lg:col-span-4 w-full space-y-5 bg-[#0a0a14] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-purple-400 font-bold border-b border-white/10 pb-3">
              <BookOpen className="w-4 h-4" />
              <span>Statutory Policy Index ({policies.length})</span>
            </div>

            <div className="space-y-4">
              {Object.entries(categories).map(([catName, catPolicies]) => {
                if (catPolicies.length === 0) return null;
                return (
                  <div key={catName} className="space-y-1.5">
                    <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500 font-bold px-2">
                      {catName}
                    </div>
                    <div className="space-y-0.5">
                      {catPolicies.map((p) => {
                        const isSelected = p.slug === selectedSlug;
                        return (
                          <button
                            key={p.slug}
                            type="button"
                            onClick={() => setSelectedSlug(p.slug)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white font-bold shadow-[0_0_15px_rgba(147,51,234,0.35)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{p.title}</span>
                            <span
                              className={`text-[9px] font-mono shrink-0 px-1.5 py-0.2 rounded ml-2 ${
                                isSelected ? 'bg-black/30 text-white' : 'text-gray-500'
                              }`}
                            >
                              v{p.current_version || '1.0'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Content: Active Policy Markdown Reader & Historical Version Dropdown */}
          <div className="lg:col-span-8 w-full space-y-6">
            {loading ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center p-12 rounded-2xl bg-[#0a0a14] border border-white/10">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
                <p className="text-xs font-mono text-gray-400">Loading statutory policy document...</p>
              </div>
            ) : currentPolicy && activeVersion ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0a0a14] border border-white/10 shadow-2xl space-y-6">
                {/* Policy Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
                      {currentPolicy.category?.replace(/_/g, ' ')}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-rajdhani uppercase tracking-wide">
                      {currentPolicy.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono pt-1">
                      <span>Effective: {activeVersion.effective_date || 'November 3, 2026'}</span>
                      <span>·</span>
                      <span>Jurisdiction: Republic of India</span>
                    </div>
                  </div>

                  {/* Version Selector Dropdown */}
                  <div className="flex items-center gap-2 bg-[#121324] border border-white/10 rounded-xl px-3 py-1.5 self-start sm:self-center">
                    <span className="text-[11px] text-gray-400 font-mono">Version:</span>
                    <select
                      value={selectedVersion}
                      onChange={(e) => handleSelectVersion(e.target.value)}
                      className="bg-transparent text-xs text-cyan-300 font-bold font-mono focus:outline-none cursor-pointer"
                    >
                      {versionsList.map((ver) => (
                        <option key={ver.id} value={ver.version} className="bg-[#121324] text-white">
                          v{ver.version} {ver.status === 'published' ? '(Active)' : '(Archived)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Summary of Changes Banner */}
                {activeVersion.summary_of_changes && (
                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Summary of Regulatory Changes: </span>
                      <span className="text-gray-300">{activeVersion.summary_of_changes}</span>
                    </div>
                  </div>
                )}

                {/* Markdown Policy Body */}
                <div className="prose prose-invert prose-purple max-w-none text-xs sm:text-sm text-gray-300 leading-relaxed space-y-4">
                  {activeVersion.content_md.split('\n\n').map((paragraph: string, idx: number) => {
                    const trimmed = paragraph.trim();
                    if (trimmed.startsWith('# ')) {
                      return (
                        <h2 key={idx} className="text-xl sm:text-2xl font-black text-white font-rajdhani uppercase pt-4 border-b border-white/10 pb-2">
                          {trimmed.slice(2)}
                        </h2>
                      );
                    }
                    if (trimmed.startsWith('## ')) {
                      return (
                        <h3 key={idx} className="text-lg font-bold text-purple-300 font-rajdhani uppercase pt-3">
                          {trimmed.slice(3)}
                        </h3>
                      );
                    }
                    if (trimmed.startsWith('### ')) {
                      return (
                        <h4 key={idx} className="text-base font-semibold text-white pt-2">
                          {trimmed.slice(4)}
                        </h4>
                      );
                    }
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      const items = trimmed.split('\n').map((li) => li.replace(/^[-*]\s+/, ''));
                      return (
                        <ul key={idx} className="list-disc pl-5 space-y-1 text-gray-300">
                          {items.map((item, itemIdx) => (
                            <li key={itemIdx}>{item}</li>
                          ))}
                        </ul>
                      );
                    }
                    if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ')) {
                      const items = trimmed.split('\n').map((li) => li.replace(/^\d+\.\s+/, ''));
                      return (
                        <ol key={idx} className="list-decimal pl-5 space-y-1 text-gray-300">
                          {items.map((item, itemIdx) => (
                            <li key={itemIdx}>{item}</li>
                          ))}
                        </ol>
                      );
                    }
                    return (
                      <p key={idx} className="leading-relaxed">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>

                {/* Statutory Grievance Redressal Card (Part 6 Requirement) */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-[#121328] to-[#0c0d1b] border border-cyan-500/30 space-y-3 mt-8">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Statutory Grievance Officer &amp; Dispute Escalation</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    In accordance with Information Technology Act, 2000 and Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and Consumer Protection (E-Commerce) Rules, 2020:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-[10px] text-gray-400 uppercase">Grievance Officer</div>
                      <div className="font-bold text-white mt-0.5">Shaurya Sharma</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-[10px] text-gray-400 uppercase">Official Email</div>
                      <div className="font-bold text-cyan-400 mt-0.5">grievance@vib.gg</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-[10px] text-gray-400 uppercase">Response SLA</div>
                      <div className="font-bold text-emerald-400 mt-0.5">48 Hours Acknowledgment</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs font-mono bg-[#0a0a14] rounded-2xl border border-white/10">
                Policy document could not be located.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

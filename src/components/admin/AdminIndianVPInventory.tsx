import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Zap,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface VPCode {
  id: string;
  package_id: string;
  code: string;
  status: 'available' | 'issued' | 'reserved' | 'invalid';
  order_id: string | null;
  batch_no: string | null;
  issued_at: string | null;
  created_at: string;
}

interface StockSummary {
  package_id: string;
  total: number;
  available: number;
  issued: number;
}

export const AdminIndianVPInventory: React.FC = () => {
  const { token } = useAuth();
  const [codes, setCodes] = useState<VPCode[]>([]);
  const [summary, setSummary] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedPackFilter, setSelectedPackFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Bulk Import Form
  const [importPackId, setImportPackId] = useState('vp-475');
  const [importBatch, setImportBatch] = useState('');
  const [importCodeText, setImportCodeText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Copy helper
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const PACKS = [
    { id: 'vp-475', label: '475 VP (Viper)', priceINR: 425 },
    { id: 'vp-1000', label: '1,000 VP (Neon)', priceINR: 875 },
    { id: 'vp-2050', label: '2,050 VP (Reyna)', priceINR: 1720 },
    { id: 'vp-3650', label: '3,650 VP (Fade)', priceINR: 2999 },
    { id: 'vp-5350', label: '5,350 VP (Jett)', priceINR: 4299 },
    { id: 'vp-7400', label: '7,400 VP (Sova)', priceINR: 6199 },
    { id: 'vp-11000', label: '11,000 VP (Iso)', priceINR: 8499 },
  ];

  useEffect(() => {
    fetchInventory();
  }, [token, selectedPackFilter, selectedStatusFilter]);

  const fetchInventory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = '/api/admin/vp-codes?';
      if (selectedPackFilter !== 'all') url += `package_id=${selectedPackFilter}&`;
      if (selectedStatusFilter !== 'all') url += `status=${selectedStatusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.warn('Failed to fetch VP inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !importCodeText.trim()) return;
    setIsImporting(true);
    setImportResult(null);
    setImportWarning(null);
    setImportError(null);

    try {
      const res = await fetch('/api/admin/vp-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: importPackId,
          batch_no: importBatch.trim() || undefined,
          codes: importCodeText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.addedCount > 0) {
          setImportResult(`Successfully imported ${data.addedCount} VP codes into vault inventory!`);
        }
        if (data.duplicatesSkipped > 0) {
          setImportWarning(`${data.duplicatesSkipped} duplicate code(s) already existed in inventory and were safely skipped.`);
        }
        setImportCodeText('');
        setImportBatch('');
        await fetchInventory();
        setTimeout(() => {
          setImportResult(null);
          setImportWarning(null);
        }, 7000);
      } else {
        const err = await res.json().catch(() => null);
        setImportError(err?.error || 'Failed to import VP codes. Please verify the code format.');
        setTimeout(() => setImportError(null), 8000);
      }
    } catch {
      setImportError('Network error while importing codes. Please check your connection.');
      setTimeout(() => setImportError(null), 8000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!token || !confirm('Are you sure you want to delete this unissued code from inventory?')) return;
    try {
      const res = await fetch(`/api/admin/vp-codes/${codeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchInventory();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Cannot delete code.');
      }
    } catch {
      alert('Network error while deleting code.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Helper to get stock numbers for a pack (consolidating vp-7400 and in-7400)
  const getPackStock = (packId: string) => {
    const rows = summary.filter((s) => s.package_id === packId || (packId === 'vp-7400' && s.package_id === 'in-7400'));
    return {
      available: rows.reduce((acc, r) => acc + (r.available || 0), 0),
      issued: rows.reduce((acc, r) => acc + (r.issued || 0), 0),
      total: rows.reduce((acc, r) => acc + (r.total || 0), 0),
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* SECTION 1: HEADER & STOCK CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" />
              <span>Indian VP Automated Code Inventory</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Genuine Valorant prepaid card codes reserved atomically upon payment approval
            </p>
          </div>

          <button
            type="button"
            onClick={fetchInventory}
            className="p-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-200 cursor-pointer self-start sm:self-auto flex items-center gap-2 text-xs font-mono"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Stock</span>
          </button>
        </div>

        {/* Live Stock Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PACKS.map((pack) => {
            const stock = getPackStock(pack.id);
            const isLow = stock.available < 3;
            return (
              <div
                key={pack.id}
                onClick={() => setSelectedPackFilter(pack.id === selectedPackFilter ? 'all' : pack.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedPackFilter === pack.id
                    ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                    : 'bg-[#0c0d1c] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-[11px] font-mono font-bold text-gray-300 truncate">
                  {pack.label.split('(')[0]}
                </div>
                <div className="text-[10px] text-gray-500 font-rajdhani">{pack.label.split('(')[1]?.replace(')', '')}</div>
                
                <div className="mt-2 flex items-baseline justify-between">
                  <span className={`text-xl font-black font-mono ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {stock.available}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">avail</span>
                </div>

                <div className="mt-1 pt-1 border-t border-white/5 flex justify-between text-[10px] font-mono text-gray-400">
                  <span>Issued: {stock.issued}</span>
                  <span>Tot: {stock.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: BULK IMPORT FORM */}
      <div className="p-6 rounded-3xl bg-[#0e0e1a] border border-purple-500/30 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold font-rajdhani text-lg uppercase">
          <Plus className="w-5 h-5 text-purple-400" />
          <span>Bulk Import Indian VP Codes</span>
        </div>
        <p className="text-xs text-gray-400 font-mono">
          Paste Valorant prepaid digital PIN codes below. Format: One code per line (or comma-separated).
        </p>

        <form onSubmit={handleBulkImport} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Select VP Package *
              </label>
              <select
                value={importPackId}
                onChange={(e) => setImportPackId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:ring-2 focus:ring-purple-400"
              >
                {PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} (₹{p.priceINR})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Batch Number / Supplier Ref (Optional)
              </label>
              <input
                type="text"
                value={importBatch}
                onChange={(e) => setImportBatch(e.target.value)}
                placeholder="e.g. BATCH-OFFICIAL-OCT16"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
              VP Codes (One per line) *
            </label>
            <textarea
              rows={4}
              required
              value={importCodeText}
              onChange={(e) => setImportCodeText(e.target.value)}
              placeholder="RA-IND-VP-XXXX-YYYY-ZZZZ&#10;RA-IND-VP-AAAA-BBBB-CCCC&#10;RA-IND-VP-1111-2222-3333"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Status Feedback Banners */}
          {importResult && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importResult}</span>
            </div>
          )}

          {importWarning && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{importWarning}</span>
            </div>
          )}

          {importError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isImporting || !importCodeText.trim()}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-sm text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Import Codes to Vault</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: INVENTORY CODES TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm font-bold font-rajdhani text-white uppercase tracking-wider">
            Inventory Codes Vault ({codes.length} entries shown)
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 text-xs font-mono">
              <Filter className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
              <select
                value={selectedPackFilter}
                onChange={(e) => setSelectedPackFilter(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none pr-2"
              >
                <option value="all">All Packs</option>
                {PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 text-xs font-mono">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none pr-2"
              >
                <option value="all">All Status</option>
                <option value="available">Available (In Stock)</option>
                <option value="issued">Issued to Customer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[11px]">
                  <th className="p-3.5">Code ID</th>
                  <th className="p-3.5">Package</th>
                  <th className="p-3.5">Valorant Prepaid PIN</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Batch / Supplier</th>
                  <th className="p-3.5">Issued Order</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-mono">
                      No codes found matching current filter.
                    </td>
                  </tr>
                ) : (
                  codes.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono text-gray-400 text-[11px]">{item.id}</td>
                      <td className="p-3.5 font-mono font-bold text-amber-300 uppercase">{item.package_id}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white tracking-wider bg-black/40 px-2 py-0.5 rounded border border-white/10">
                            {item.status === 'issued' ? `${item.code.slice(0, 8)}...${item.code.slice(-4)}` : item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code, item.id)}
                            className="p-1 hover:text-white text-gray-400 cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCodeId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            item.status === 'available'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-gray-400 text-[11px]">{item.batch_no || 'MANUAL'}</td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {item.order_id ? (
                          <span className="text-purple-300 font-bold">#{item.order_id}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {item.status === 'available' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCode(item.id)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 cursor-pointer"
                            title="Delete unused code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

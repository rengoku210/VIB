import React, { useState, useEffect } from 'react';
import {
  Globe,
  MessageCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminRegionalOrders: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status update modal / notes
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [statusVal, setStatusVal] = useState('completed');
  const [notesVal, setNotesVal] = useState('');

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRegionalOrders();
  }, [token, selectedStatus]);

  const fetchRegionalOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = '/api/admin/regional-orders?';
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Failed to fetch regional orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !token) return;
    setUpdatingId(editingOrder.id);

    try {
      const res = await fetch(`/api/admin/regional-orders/${editingOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: statusVal,
          regional_notes: notesVal.trim() || undefined,
        }),
      });

      if (res.ok) {
        setEditingOrder(null);
        fetchRegionalOrders();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to update regional order status.');
      }
    } catch {
      alert('Network error while updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0b131f] border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              PHP &amp; Regional VP Manual Operations Desk
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Strict fulfillment rule: Regional packs are handled 1-on-1 via WhatsApp (+91 9181801766) • No automated code issuance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRegionalOrders}
            className="p-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-500/30 text-sky-200 cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm font-bold font-rajdhani text-white uppercase tracking-wider">
            Regional Orders Queue ({orders.length})
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'processing', 'completed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                  selectedStatus === s
                    ? 'bg-sky-600 text-white font-bold shadow'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[11px]">
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Customer &amp; Pack</th>
                  <th className="p-3.5">Valorant Target Account</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Regional Notes</th>
                  <th className="p-3.5 text-right">Fulfillment Desk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-mono">
                      No regional orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    let parsedDetails: any = {};
                    try {
                      parsedDetails = ord.details_json ? JSON.parse(ord.details_json) : {};
                    } catch {}

                    const riotTarget = parsedDetails.riotId || ord.riot_id || 'Not provided';
                    const customerEmail = parsedDetails.email || ord.user_email || 'No email';
                    const whatsappText = encodeURIComponent(
                      `Hello ${ord.user_name || 'Customer'}, this is the VIB Operations Desk regarding your Regional VP Order #${ord.id} (${ord.title}). Target Riot ID: ${riotTarget}.`
                    );
                    const whatsappLink = `https://wa.me/919181801766?text=${whatsappText}`;

                    return (
                      <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-mono text-sky-300 font-bold">
                          #{ord.id}
                          <div className="text-[10px] text-gray-500 font-mono">
                            {new Date(ord.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-white font-rajdhani text-sm">{ord.title}</div>
                          <div className="text-gray-400 font-mono text-[11px]">{ord.user_name}</div>
                          <div className="text-gray-500 text-[10px]">{customerEmail}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                              {riotTarget}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(riotTarget, ord.id)}
                              className="p-1 hover:text-white text-gray-400 cursor-pointer"
                              title="Copy Riot ID"
                            >
                              {copiedId === ord.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-emerald-400 text-sm font-rajdhani">
                            ₹{ord.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              ord.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : ord.status === 'cancelled'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : 'bg-sky-950 text-sky-300 border border-sky-500/30 animate-pulse'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-gray-400 max-w-xs truncate">
                          {ord.regional_notes || <span className="text-gray-600 italic">No notes</span>}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md"
                              title="Chat with customer on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrder(ord);
                                setStatusVal(ord.status || 'completed');
                                setNotesVal(ord.regional_notes || '');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-mono cursor-pointer"
                            >
                              Status
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* UPDATE STATUS MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0c0d1c] border border-sky-500/40 p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-2 text-sky-400 font-bold font-rajdhani text-lg uppercase">
              <Globe className="w-5 h-5" />
              <span>Update Regional Order #{editingOrder.id}</span>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                  Fulfillment Status *
                </label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:ring-2 focus:ring-sky-400"
                >
                  <option value="processing">Processing (Pending Contact)</option>
                  <option value="completed">Completed (Credited in-game)</option>
                  <option value="cancelled">Cancelled / Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                  Operations Notes
                </label>
                <textarea
                  rows={3}
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  placeholder="e.g. Account credited via manual regional topup portal. Verified with customer on WhatsApp."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === editingOrder.id}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5"
                >
                  {updatingId === editingOrder.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

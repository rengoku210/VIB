import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Users,
  DollarSign,
  Calendar,
  X,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Check,
  Package,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminAuctionsManagement: React.FC = () => {
  const { token, user } = useAuth();
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBiddersOpen, setIsBiddersOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any | null>(null);
  const [biddersList, setBiddersList] = useState<any[]>([]);
  const [loadingBidders, setLoadingBidders] = useState(false);

  // Pause reason state
  const [pauseLotId, setPauseLotId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');

  // Form State (Part 2.1 Schema)
  const [formData, setFormData] = useState({
    title: '',
    lot_number: `LOT-${Date.now().toString().slice(-6)}`,
    category: 'valorant_account',
    account_type: 'radiant_full_access',
    description: '',
    image_url: '',
    gallery_images_json: '[]',
    visibility: 'public',
    status: 'draft',
    // Account details
    account_name: '',
    server_region: 'ap_mumbai',
    account_level: 0,
    inventory_details: '',
    included_benefits: '',
    restrictions: '',
    transfer_info: '',
    // Pricing
    starting_bid: 0,
    bid_increment: 500,
    reserve_price: 0,
    instant_buy_price: 0,
    deposit_pct: 50.0,
    min_deposit_amount: 0,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    winner_payment_deadline_hours: 24,
    delivery_method: 'instant_credentials',
    delivery_eta: '1-2 Hours',
    transfer_instructions: 'Staff verifies remaining settlement before decrypting vault credentials.',
    delivery_conditions: 'Customer must provide verified contact and sign the post-delivery ownership certificate.',
    customer_info_required: 'Riot ID, WhatsApp Phone, Receipt Email',
    post_purchase_support: '30-Day dedicated account warranty & 24/7 priority live support.',
    min_eligibility: 'Authenticated VIB customer with zero chargeback history.',
    verification_required: true,
    allow_bid_raise: true,
    allow_cancellation: false,
    deposit_refund_rules: 'Losing bidders receive 100% deposit refund immediately upon auction completion. No hidden deduction.',
    forfeiture_rules: 'Defaulting winner deposits are forfeited strictly according to published auction policies if balance is unpaid within 24 hours.',
  });

  const [savingLot, setSavingLot] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchLots();
  }, [token]);

  const fetchLots = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auctions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLots(data.lots || []);
      }
    } catch (err) {
      console.warn('Failed to fetch admin auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBidders = async (lot: any) => {
    setSelectedLot(lot);
    setIsBiddersOpen(true);
    setLoadingBidders(true);
    try {
      const res = await fetch(`/api/admin/auctions/${lot.id}/bidders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBiddersList(data.bidders || []);
      }
    } catch (err) {
      console.warn('Failed to fetch bidders:', err);
    } finally {
      setLoadingBidders(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this auction lot to the public marketplace?')) return;
    try {
      const res = await fetch(`/api/admin/auctions/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchLots();
      else {
        const err = await res.json();
        alert(err.error || 'Failed to publish auction.');
      }
    } catch {
      alert('Network failure.');
    }
  };

  const handlePause = async (id: string) => {
    if (!pauseReason.trim()) {
      alert('Please specify a material reason for pausing the auction.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/auctions/${id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: pauseReason.trim() }),
      });
      if (res.ok) {
        setPauseLotId(null);
        setPauseReason('');
        fetchLots();
      }
    } catch {
      alert('Network failure.');
    }
  };

  const handleResume = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/auctions/${id}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchLots();
    } catch {
      alert('Network failure.');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('State the mandatory cancellation reason. All held deposits will be automatically refunded:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await fetch(`/api/admin/auctions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) fetchLots();
      else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel auction.');
      }
    } catch {
      alert('Network failure.');
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this auction now? The highest valid bidder will be confirmed as the winner and issued their settlement deadline.')) return;
    try {
      const res = await fetch(`/api/admin/auctions/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchLots();
      else {
        const err = await res.json();
        alert(err.error || 'Failed to close auction.');
      }
    } catch {
      alert('Network failure.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSavingLot(true);
    try {
      const res = await fetch('/api/admin/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        fetchLots();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to create auction lot.');
      }
    } catch {
      setActionError('Network failure while saving auction lot.');
    } finally {
      setSavingLot(false);
    }
  };

  const filteredLots = lots.filter((lot) => {
    if (statusFilter !== 'all' && lot.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (lot.title || '').toLowerCase().includes(q);
      const matchLotNo = (lot.lot_number || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLotNo) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0d1b] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Auction Marketplace Control
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Create, moderate, schedule, and finalize genuine competitive auction listings with 50% security deposit integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLots}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
            title="Refresh Auctions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                lot_number: `LOT-${Date.now().toString().slice(-6)}`,
              });
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Auction Lot</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0e1022] border border-white/5">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search auctions by title or lot number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#14162e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts Only</option>
            <option value="active">Active (Bidding Live)</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed / Ended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Auction Lots Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0d1b] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
              <tr>
                <th className="p-3.5">Lot &amp; Title</th>
                <th className="p-3.5">Category &amp; Rank</th>
                <th className="p-3.5">Current / Starting</th>
                <th className="p-3.5">Deposit Req.</th>
                <th className="p-3.5">Bidders</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-sans text-xs">
                    No auction listings found. Click &quot;Create New Auction Lot&quot; to add a listing.
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={lot.image_url || '/assets/hires/profiles/card1_exact.jpg'}
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (!img.src.endsWith('/assets/hires/profiles/card1_exact.jpg')) {
                              img.src = '/assets/hires/profiles/card1_exact.jpg';
                            }
                          }}
                          alt={lot.title}
                          className="w-10 h-10 rounded-lg object-contain bg-white/5 border border-white/10 p-1"
                        />
                        <div>
                          <div className="font-bold text-white font-rajdhani text-sm leading-tight">
                            {lot.title}
                          </div>
                          <div className="text-[10px] text-purple-400 font-mono">
                            {lot.lot_number}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 text-[10px] uppercase font-bold">
                        {lot.category?.replace('_', ' ')}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {lot.server_region?.replace('_', ' ').toUpperCase()}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-white font-bold font-rajdhani text-sm">
                        ₹{Number(lot.current_bid || lot.starting_bid).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Start: ₹{Number(lot.starting_bid).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="text-yellow-400 font-bold">
                        {lot.deposit_pct || 50}%
                      </span>
                      <div className="text-[10px] text-gray-400">
                        Min: ₹{Number(lot.min_deposit_amount || 500).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleOpenBidders(lot)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 cursor-pointer font-bold"
                      >
                        <Users className="w-3 h-3 text-purple-400" />
                        <span>{lot.bid_count || 0} Bids</span>
                      </button>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lot.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : lot.status === 'draft'
                            ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                            : lot.status === 'paused'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : lot.status === 'closed'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {lot.status}
                      </span>
                      {lot.status === 'paused' && lot.pause_reason && (
                        <div className="text-[9px] text-amber-300 truncate max-w-[150px] mt-0.5" title={lot.pause_reason}>
                          {lot.pause_reason}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right space-x-1.5">
                      {lot.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handlePublish(lot.id)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                          title="Publish to public marketplace"
                        >
                          Publish
                        </button>
                      )}

                      {lot.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPauseLotId(lot.id);
                              setPauseReason('');
                            }}
                            className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                            title="Pause Auction"
                          >
                            Pause
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClose(lot.id)}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                            title="Finalize &amp; Select Winner"
                          >
                            Close
                          </button>
                        </>
                      )}

                      {lot.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleResume(lot.id)}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Resume
                        </button>
                      )}

                      {['draft', 'active', 'paused'].includes(lot.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(lot.id)}
                          className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                          title="Cancel Auction (auto refund deposits)"
                        >
                          Cancel
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

      {/* MODAL 1: CREATE AUCTION LOT (Part 2.1 Complete Form) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#0b0c19] border border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl my-8 space-y-6">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-400" />
                <span>Create Professional Auction Listing (Part 2.1 Schema)</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Configure basic info, verified account specifications, 50% deposit parameters, delivery terms, and auction legal rules.
              </p>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* SECTION 1: BASIC INFORMATION */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 border-b border-white/5 pb-1">
                  1. Basic Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-gray-400 block mb-1">Auction Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Radiant Season 8 Kuronami Account + VCT Bundle"
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Lot Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.lot_number}
                      onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="valorant_account">Valorant Account</option>
                      <option value="rare_skin">Rare / Limited Knife Skin</option>
                      <option value="bundle_collection">Champions / Exclusive Bundle</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Account Type *</label>
                    <select
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="radiant_full_access">Radiant Full Access (OG Email)</option>
                      <option value="immortal_ranked">Immortal Ranked Active</option>
                      <option value="collector_vault">Collector Skin Vault</option>
                      <option value="smurf_clean">Verified Smurf (Unrated MMR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Thumbnail Image URL *</label>
                    <input
                      type="text"
                      required
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Detailed Description *</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Comprehensive description of the profile, peak ranks, skin upgrades, and competitive history..."
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 2: ACCOUNT INFORMATION */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 border-b border-white/5 pb-1">
                  2. Account Information &amp; Inventory Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Platform Account Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Server / Region *</label>
                    <select
                      value={formData.server_region}
                      onChange={(e) => setFormData({ ...formData, server_region: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="ap_mumbai">AP - India (Mumbai)</option>
                      <option value="ap_singapore">AP - Singapore</option>
                      <option value="eu_frankfurt">EU - Frankfurt</option>
                      <option value="na_virginia">NA - Virginia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Account Level *</label>
                    <input
                      type="number"
                      required
                      value={formData.account_level}
                      onChange={(e) => setFormData({ ...formData, account_level: Number(e.target.value) })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Inventory Details *</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.inventory_details}
                    onChange={(e) => setFormData({ ...formData, inventory_details: e.target.value })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 3: PRICING & BID SECURITY DEPOSIT (FINANCIALLY RESPONSIBLE) */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 border-b border-white/5 pb-1">
                  3. Pricing &amp; Bid Security Deposit (50% Default Requirement)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Starting Bid (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.starting_bid}
                      onChange={(e) => setFormData({ ...formData, starting_bid: Number(e.target.value) })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Min Increment (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.bid_increment}
                      onChange={(e) => setFormData({ ...formData, bid_increment: Number(e.target.value) })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Deposit % (Default 50%) *</label>
                    <input
                      type="number"
                      required
                      value={formData.deposit_pct}
                      onChange={(e) => setFormData({ ...formData, deposit_pct: Number(e.target.value) })}
                      className="w-full bg-[#14162e] border border-yellow-500/40 rounded-xl px-3.5 py-2 text-xs text-yellow-300 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Min Deposit (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.min_deposit_amount}
                      onChange={(e) => setFormData({ ...formData, min_deposit_amount: Number(e.target.value) })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Starts At *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.starts_at}
                      onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Ends At *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.ends_at}
                      onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Winner Payment Deadline (Hours) *</label>
                    <input
                      type="number"
                      required
                      value={formData.winner_payment_deadline_hours}
                      onChange={(e) => setFormData({ ...formData, winner_payment_deadline_hours: Number(e.target.value) })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: DELIVERY & RULES */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 border-b border-white/5 pb-1">
                  4. Delivery Terms &amp; Rules
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Delivery Method *</label>
                    <input
                      type="text"
                      required
                      value={formData.delivery_method}
                      onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Expected Delivery ETA *</label>
                    <input
                      type="text"
                      required
                      value={formData.delivery_eta}
                      onChange={(e) => setFormData({ ...formData, delivery_eta: e.target.value })}
                      className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Published Refund &amp; Forfeiture Terms</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Under VIB 2.0 financial integrity policy, losing bidders are refunded 100% of their deposits immediately upon auction closure. Winner deposits are credited dollar-for-dollar toward the purchase price.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLot}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingLot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save &amp; Create Auction Lot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW BIDDERS & DEPOSIT AUDIT */}
      {isBiddersOpen && selectedLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-[#0b0c19] border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsBiddersOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                  Bidders &amp; Security Deposit Breakdown: {selectedLot.title}
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Lot #{selectedLot.lot_number} · Deposit Requirement: {selectedLot.deposit_pct || 50}%
              </p>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
                  <tr>
                    <th className="p-3">Bidder</th>
                    <th className="p-3">Submitted Bid</th>
                    <th className="p-3">Deposit Held</th>
                    <th className="p-3">Deposit Status</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingBidders ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400" />
                      </td>
                    </tr>
                  ) : biddersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400 font-sans">
                        Zero bids recorded for this auction.
                      </td>
                    </tr>
                  ) : (
                    biddersList.map((bid) => (
                      <tr key={bid.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white font-rajdhani">
                          {bid.bidder_name}
                        </td>
                        <td className="p-3 font-bold text-purple-300">
                          ₹{Number(bid.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-yellow-300 font-bold">
                          ₹{Number(bid.deposit_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              bid.deposit_status === 'applied_to_winner'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : bid.deposit_status === 'refunded'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {bid.deposit_status || 'held'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-[10px]">
                          {new Date(bid.created_at).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsBiddersOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase font-rajdhani cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PAUSE REASON PROMPT */}
      {pauseLotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0b0c19] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black font-rajdhani text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Pause className="w-4 h-4 text-amber-400" />
              <span>Pause Active Auction</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Disclose the formal administrative reason for pausing bidding. This note will be recorded in the immutable audit log and shown to active bidders.
            </p>
            <textarea
              rows={3}
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="e.g. Temporary inventory verification or scheduled server maintenance..."
              className="w-full bg-[#14162e] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPauseLotId(null)}
                className="px-3.5 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePause(pauseLotId)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

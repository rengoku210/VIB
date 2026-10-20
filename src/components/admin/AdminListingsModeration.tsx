import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Shield,
  Crown,
  Eye,
  Loader2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminListingsModeration: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('submitted');

  // Rejection modal
  const [selectedRejectListing, setSelectedRejectListing] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Detail preview modal
  const [selectedPreviewListing, setSelectedPreviewListing] = useState<any | null>(null);

  // Edit listing modal
  const [selectedEditListing, setSelectedEditListing] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editRank, setEditRank] = useState('');
  const [editPeakRank, setEditPeakRank] = useState('');
  const [editLevel, setEditLevel] = useState(1);
  const [editRegion, setEditRegion] = useState('');
  const [editStatus, setEditStatus] = useState('published');
  const [editFeatured, setEditFeatured] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [token, statusFilter]);

  const fetchListings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = '/api/admin/listings?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.warn('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateListingStatus = async (listingId: string, status: 'published' | 'rejected', reason?: string) => {
    if (!token) return;
    setProcessingId(listingId);

    try {
      const res = await fetch(`/api/admin/listings/${listingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          reject_reason: reason,
        }),
      });

      if (res.ok) {
        setSelectedRejectListing(null);
        setRejectReason('');
        fetchListings();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || `Failed to ${status} listing.`);
      }
    } catch {
      alert(`Network error while updating listing.`);
    } finally {
      setProcessingId(null);
    }
  };

  const openEditModal = (item: any) => {
    setSelectedEditListing(item);
    setEditTitle(item.title || '');
    setEditPrice(item.price_inr || 0);
    setEditRank(item.rank || item.rank_tier || 'Diamond 1');
    setEditPeakRank(item.peak_rank || item.rank || 'Diamond 3');
    setEditLevel(item.level || item.account_level || 1);
    setEditRegion(item.region || 'AP / Mumbai');
    setEditStatus(item.status || 'published');
    setEditFeatured(Boolean(item.featured));
    setEditDesc(item.description || '');
  };

  const handleSaveEditListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEditListing) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/listings/${selectedEditListing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          price_inr: Number(editPrice),
          rank: editRank.trim(),
          peak_rank: editPeakRank.trim(),
          level: Number(editLevel),
          region: editRegion.trim(),
          status: editStatus,
          featured: editFeatured,
          description: editDesc.trim(),
        }),
      });

      if (res.ok) {
        setSelectedEditListing(null);
        fetchListings();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to update listing.');
      }
    } catch {
      alert('Network error while saving listing.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteListing = async (listingId: string, title: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to permanently delete listing "${title}" (#${listingId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchListings();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to delete listing.');
      }
    } catch {
      alert('Network error while deleting listing.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#140f28] border border-fuchsia-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-600/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Community Account Listings Review Desk
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Audit player-submitted Valorant account sales before they go live on public marketplace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchListings}
            className="p-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-200 cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Refresh Listings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-sm font-bold font-rajdhani text-white uppercase tracking-wider">
          Listings Queue ({listings.length})
        </div>

        <div className="flex items-center gap-2">
          {(['submitted', 'published', 'rejected', 'draft', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-fuchsia-600 text-white font-bold shadow'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Table */}
      <div className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[11px]">
                <th className="p-3.5">Listing ID</th>
                <th className="p-3.5">Account Title &amp; Details</th>
                <th className="p-3.5">Rank &amp; Region</th>
                <th className="p-3.5">Skins Included</th>
                <th className="p-3.5">Asking Price</th>
                <th className="p-3.5">VIP Plan</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-mono">
                    No listings found with status "{statusFilter}".
                  </td>
                </tr>
              ) : (
                listings.map((item) => {
                  let skinsArray: any[] = [];
                  try {
                    skinsArray = item.skins_json ? JSON.parse(item.skins_json) : [];
                  } catch {}

                  const isSubmitted = item.status === 'submitted';
                  const isPublished = item.status === 'published';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono text-fuchsia-300 font-bold">
                        #{item.id}
                        <div className="text-[10px] text-gray-500 font-mono">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-white font-rajdhani text-sm">{item.title}</div>
                        <div className="text-gray-400 font-mono text-[11px]">
                          Seller: {item.seller_name || item.seller_id}
                        </div>
                        <div className="text-gray-500 text-[10px]">Level {item.account_level || 1}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-amber-300 font-rajdhani text-xs">{item.rank_tier}</div>
                        <div className="text-gray-400 font-mono text-[10px] uppercase">{item.region}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                          {skinsArray.length} Skins
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-emerald-400 text-sm font-rajdhani">
                          ₹{item.price_inr?.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {item.vip_plan_id ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                            <Crown className="w-3 h-3" />
                            <span>{item.vip_plan_id.toUpperCase()}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 font-mono text-[11px]">Standard</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isPublished
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : isSubmitted
                              ? 'bg-sky-950 text-sky-300 border border-sky-500/30 animate-pulse'
                              : isRejected
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewListing(item)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 cursor-pointer"
                            title="Preview Listing"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 cursor-pointer"
                            title="Edit Listing Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteListing(item.id, item.title)}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-400 cursor-pointer"
                              title="Delete Listing"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isPublished && (
                            <button
                              type="button"
                              disabled={processingId === item.id}
                              onClick={() => handleUpdateListingStatus(item.id, 'published')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
                            >
                              {processingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Approve</span>
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              type="button"
                              disabled={processingId === item.id}
                              onClick={() => {
                                setSelectedRejectListing(item);
                                setRejectReason('Listing details require further verification or proof of account ownership.');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
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

      {/* REJECTION REASON MODAL */}
      {selectedRejectListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0c0d1c] border border-rose-500/40 p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-2 text-rose-400 font-bold font-rajdhani text-lg uppercase">
              <AlertCircle className="w-5 h-5" />
              <span>Reject Account Listing #{selectedRejectListing.id}</span>
            </div>

            <p className="text-xs text-gray-300">
              Please enter the moderation reason. The seller will be informed in their dashboard.
            </p>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Skin screenshots must be provided; inappropriate description."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRejectListing(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rejectReason.trim()}
                onClick={() => handleUpdateListingStatus(selectedRejectListing.id, 'rejected', rejectReason.trim())}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW DETAILS MODAL */}
      {selectedPreviewListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0c0d1c] border border-white/20 p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold font-rajdhani text-lg text-white uppercase">
                {selectedPreviewListing.title}
              </h3>
              <span className="font-mono text-xs text-emerald-400 font-bold">
                ₹{selectedPreviewListing.price_inr?.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div>
                <span className="text-gray-500 font-mono">Description:</span>
                <p className="mt-1 text-gray-200">{selectedPreviewListing.description || 'No description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-3 rounded-xl">
                <div>Rank: <strong className="text-white">{selectedPreviewListing.rank_tier}</strong></div>
                <div>Level: <strong className="text-white">{selectedPreviewListing.account_level}</strong></div>
                <div>Region: <strong className="text-white uppercase">{selectedPreviewListing.region}</strong></div>
                <div>VIP Plan: <strong className="text-amber-400">{selectedPreviewListing.vip_plan_id || 'None'}</strong></div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPreviewListing(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT LISTING MODAL */}
      {selectedEditListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#0c0d1c] border border-purple-500/40 p-6 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold font-rajdhani text-lg uppercase">
                <Edit2 className="w-5 h-5 text-purple-400" />
                <span>Edit Listing #{selectedEditListing.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEditListing(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditListing} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-gray-400 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Asking Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Region</label>
                  <input
                    type="text"
                    required
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Rank</label>
                  <input
                    type="text"
                    required
                    value={editRank}
                    onChange={(e) => setEditRank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Peak Rank</label>
                  <input
                    type="text"
                    value={editPeakRank}
                    onChange={(e) => setEditPeakRank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Account Level</label>
                  <input
                    type="number"
                    min="1"
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111425] border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="published">Published</option>
                    <option value="submitted">Submitted (Under Review)</option>
                    <option value="draft">Draft</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300">
                    <input
                      type="checkbox"
                      checked={editFeatured}
                      onChange={(e) => setEditFeatured(e.target.checked)}
                      className="rounded border-purple-400 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>Mark as Featured Listing</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedEditListing(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

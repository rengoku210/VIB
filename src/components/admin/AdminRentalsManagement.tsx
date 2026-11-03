import React, { useState, useEffect } from 'react';
import {
  Key,
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
  Lock,
  X,
  Loader2,
  Save,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminRentalsManagement: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'bookings'>('listings');
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // Create Listing Form
  const [formData, setFormData] = useState({
    title: '',
    rank: 'Radiant #340',
    region: 'AP / Mumbai',
    image_url: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png',
    account_identifier: 'RENT-RAD-01',
    description: 'High-tier verified radiant account with full skin upgrades. Complete 2FA protection and live session tracking.',
    price_24h: 399,
    price_3d: 899,
    price_7d: 1799,
    price_30d: 5999,
    security_deposit: 1500,
    featured_skins: 'Kuronami Vandal, Primordium Vandal, Imperium Melee, Reaver Vandal',
    status: 'available',
  });

  // Activation Form
  const [activationData, setActivationData] = useState({
    username: '',
    password: '',
    expiryHours: 24,
    adminNotes: 'Clean credentials issued. Session timer started.',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRentals();
  }, [token]);

  const fetchRentals = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rentals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.warn('Failed to fetch admin rentals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const skinsArray = formData.featured_skins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          featured_skins_json: JSON.stringify(skinsArray),
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        fetchRentals();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to create rental listing.');
      }
    } catch {
      setErrorMsg('Network failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rentals/bookings/${selectedBooking.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(activationData),
      });

      if (res.ok) {
        setIsActivateOpen(false);
        setSelectedBooking(null);
        fetchRentals();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to activate rental booking.');
      }
    } catch {
      setErrorMsg('Network failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    if (!confirm('Mark this rental booking complete and restore the profile to available inventory?')) return;
    try {
      const res = await fetch(`/api/admin/rentals/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchRentals();
      else {
        const err = await res.json();
        alert(err.error || 'Failed to complete rental booking.');
      }
    } catch {
      alert('Network failure.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0d1b] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Rental Marketplace Control &amp; Credentials Vault
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Zero fake profiles. Genuine database-backed rental listings, automated escrow duration tracking, and Riot login vault dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchRentals}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
            title="Refresh Rentals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Genuine Rental Profile</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'listings'
              ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Inventory Listings ({listings.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Active Bookings &amp; Credentials ({bookings.length})</span>
        </button>
      </div>

      {/* TAB 1: LISTINGS INVENTORY */}
      {activeTab === 'listings' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0d1b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
                <tr>
                  <th className="p-3.5">Rental Profile</th>
                  <th className="p-3.5">Rank &amp; Region</th>
                  <th className="p-3.5">24h / 3d / 7d / 30d Rates</th>
                  <th className="p-3.5">Security Deposit</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-sans text-xs">
                      No rental listings found in the database. Click &quot;Add Genuine Rental Profile&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  listings.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image_url || '/assets/skins/kuronami_vandal.png'}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-contain bg-white/5 border border-white/10 p-1"
                          />
                          <div>
                            <div className="font-bold text-white font-rajdhani text-sm">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-purple-400 font-mono">
                              {item.account_identifier}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-amber-300 font-rajdhani">
                          {item.rank}
                        </span>
                        <div className="text-[10px] text-gray-400">
                          {item.region}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-x-1 font-mono text-[11px]">
                          <span className="text-white">24h: ₹{item.price_24h}</span> ·
                          <span className="text-purple-300">3d: ₹{item.price_3d}</span> ·
                          <span className="text-cyan-300">7d: ₹{item.price_7d}</span> ·
                          <span className="text-emerald-300">30d: ₹{item.price_30d}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-yellow-300 font-bold">
                        ₹{item.security_deposit}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'available'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'rented'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <span className="text-[11px] text-gray-400 font-sans">
                          {item.status === 'available' ? 'Ready for Bookings' : 'Booked'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE BOOKINGS & CREDENTIALS VAULT */}
      {activeTab === 'bookings' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0d1b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
                <tr>
                  <th className="p-3.5">Booking ID &amp; Listing</th>
                  <th className="p-3.5">Customer &amp; Duration</th>
                  <th className="p-3.5">Paid &amp; Deposit</th>
                  <th className="p-3.5">Expires At</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-sans text-xs">
                      Zero rental bookings recorded yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5">
                        <div className="font-bold text-white font-rajdhani text-sm">
                          {booking.listing_title || booking.listing_id}
                        </div>
                        <div className="text-[10px] text-purple-400 font-mono">
                          {booking.id}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-gray-200">
                          {booking.user_name || booking.user_id}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-bold uppercase">
                          Duration: {booking.duration}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-white font-bold">
                          ₹{booking.total_paid}
                        </div>
                        <div className="text-[10px] text-yellow-300">
                          Hold: ₹{booking.deposit_inr}
                        </div>
                      </td>

                      <td className="p-3.5 text-gray-300 text-[11px]">
                        {booking.expires_at ? new Date(booking.expires_at).toLocaleString('en-IN') : 'Pending Dispatch'}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            booking.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : booking.status === 'pending_credentials'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        {booking.status === 'pending_credentials' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBooking(booking);
                              const hours = booking.duration === '30d' ? 720 : booking.duration === '7d' ? 168 : booking.duration === '3d' ? 72 : 24;
                              setActivationData({ ...activationData, expiryHours: hours });
                              setIsActivateOpen(true);
                            }}
                            className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Issue Credentials
                          </button>
                        )}

                        {booking.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleCompleteBooking(booking.id)}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Complete Rental
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
      )}

      {/* MODAL 1: ADD RENTAL PROFILE */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0b0c19] border border-purple-500/30 rounded-2xl p-6 shadow-2xl my-8 space-y-5">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-white/10 pb-3">
              <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                <span>Add Database-Backed Rental Listing</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Zero fake profiles. Genuine account details with tiered duration pricing and refundable damage deposit.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Listing Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Radiant Season 8 + Kuronami Set"
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Rank Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Region *</label>
                  <input
                    type="text"
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Account Identifier *</label>
                  <input
                    type="text"
                    required
                    value={formData.account_identifier}
                    onChange={(e) => setFormData({ ...formData, account_identifier: e.target.value })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Damage Deposit (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                    className="w-full bg-[#14162e] border border-yellow-500/30 rounded-xl px-3.5 py-2 text-xs text-yellow-300 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">24h Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price_24h}
                    onChange={(e) => setFormData({ ...formData, price_24h: Number(e.target.value) })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">3-Day Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price_3d}
                    onChange={(e) => setFormData({ ...formData, price_3d: Number(e.target.value) })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">7-Day Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price_7d}
                    onChange={(e) => setFormData({ ...formData, price_7d: Number(e.target.value) })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">30-Day Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price_30d}
                    onChange={(e) => setFormData({ ...formData, price_30d: Number(e.target.value) })}
                    className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Featured Skins (Comma separated) *</label>
                <input
                  type="text"
                  required
                  value={formData.featured_skins}
                  onChange={(e) => setFormData({ ...formData, featured_skins: e.target.value })}
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-xs font-bold uppercase font-rajdhani cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Rental Listing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE CREDENTIALS & ACTIVATE BOOKING */}
      {isActivateOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0b0c19] border border-purple-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setIsActivateOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Issue Riot Login Credentials</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Booking #{selectedBooking.id} · Customer: {selectedBooking.user_name || selectedBooking.user_id}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleActivateSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Riot Client Username *</label>
                <input
                  type="text"
                  required
                  value={activationData.username}
                  onChange={(e) => setActivationData({ ...activationData, username: e.target.value })}
                  placeholder="e.g. VIBRentalUser42"
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Riot Client Password *</label>
                <input
                  type="text"
                  required
                  value={activationData.password}
                  onChange={(e) => setActivationData({ ...activationData, password: e.target.value })}
                  placeholder="Temporary rental password..."
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Rental Duration (Hours) *</label>
                <input
                  type="number"
                  required
                  value={activationData.expiryHours}
                  onChange={(e) => setActivationData({ ...activationData, expiryHours: Number(e.target.value) })}
                  className="w-full bg-[#14162e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300">
                These credentials will be encrypted into the customer&apos;s personal dashboard vault and accessible only during the active rental window.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActivateOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate &amp; Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

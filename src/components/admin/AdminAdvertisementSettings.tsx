import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Check,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Trash2,
  UploadCloud,
  FileImage,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdvertisementPlan } from '../client/ClientAdvertisePage';

interface AdvertisementOrder {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'pending_payment' | 'approved' | 'rejected' | 'details_submitted' | 'live' | 'completed';
  rejection_reason?: string;
  payment_method: string;
  payment_reference?: string;
  payment_screenshot?: string;
  submission_token: string;
  instagram_username?: string;
  selling_price?: string;
  current_rank?: string;
  premium_skins?: string;
  other_valuable_items?: string;
  inventory_screenshot?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  submitted_at?: string;
}

export const AdminAdvertisementSettings: React.FC = () => {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'packages'>('orders');

  // Orders State
  const [orders, setOrders] = useState<AdvertisementOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdvertisementOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Packages State
  const [plans, setPlans] = useState<AdvertisementPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdvertisementPlan | null>(null);

  // Plan Form
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 95,
    category: 'standard' as 'standard' | 'trade' | 'premium' | 'bonus',
    description: '',
    badge: 'NEW',
    display_order: 1,
    is_active: true,
    instagram_story: true,
    instagram_post: false,
    highlight_placement: false,
    story_count: '1 Story (24h)',
    website_listing: false,
    inventory_editing: false,
    promotion_duration: '24 Hours',
    buyer_assistance: false,
    priority_placement: false,
    dedicated_agent: false,
    lifetime_guaranteed: false,
    benefits: ['24-Hour Story Broadcast', 'Direct Profile Mention'],
  });
  const [newBenefit, setNewBenefit] = useState('');

  // Fetch orders
  const fetchOrders = () => {
    setOrdersLoading(true);
    let url = '/api/admin/advertisement/orders';
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.orders) setOrders(data.orders);
      })
      .catch((e) => console.error('Fetch ad orders error:', e))
      .finally(() => setOrdersLoading(false));
  };

  // Fetch plans
  const fetchPlans = () => {
    setPlansLoading(true);
    fetch('/api/admin/advertisement/plans', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.plans) setPlans(data.plans);
      })
      .catch((e) => console.error('Fetch ad plans error:', e))
      .finally(() => setPlansLoading(false));
  };

  useEffect(() => {
    if (activeSubTab === 'orders') {
      fetchOrders();
    } else {
      fetchPlans();
    }
  }, [activeSubTab, statusFilter]);

  // Order Actions
  const handleApprovePayment = async (orderId: string) => {
    if (!confirm('Approve payment for this order? This will email the customer with the link to submit advertisement details.')) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/advertisement/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payment.');
      setActionFeedback(data.message || 'Payment approved!');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'approved' } : null));
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejecting payment.');
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/advertisement/orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject payment.');
      setActionFeedback(data.message || 'Payment marked rejected.');
      setIsRejecting(false);
      setRejectReason('');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'rejected', rejection_reason: rejectReason } : null));
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkLive = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/advertisement/orders/${orderId}/mark-live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark live.');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'live' } : null));
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Plan Form Actions
  const handleOpenEditPlan = (plan: AdvertisementPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      category: plan.category,
      description: plan.description,
      badge: plan.badge || '',
      display_order: plan.display_order,
      is_active: plan.is_active,
      instagram_story: plan.instagram_story,
      instagram_post: plan.instagram_post,
      highlight_placement: plan.highlight_placement,
      story_count: plan.story_count,
      website_listing: plan.website_listing,
      inventory_editing: plan.inventory_editing,
      promotion_duration: plan.promotion_duration,
      buyer_assistance: plan.buyer_assistance,
      priority_placement: plan.priority_placement,
      dedicated_agent: plan.dedicated_agent,
      lifetime_guaranteed: plan.lifetime_guaranteed,
      benefits: [...plan.benefits],
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      price: 199,
      category: 'standard',
      description: '',
      badge: 'POPULAR',
      display_order: plans.length + 1,
      is_active: true,
      instagram_story: true,
      instagram_post: false,
      highlight_placement: false,
      story_count: '1 Story',
      website_listing: false,
      inventory_editing: false,
      promotion_duration: '24 Hours',
      buyer_assistance: false,
      priority_placement: false,
      dedicated_agent: false,
      lifetime_guaranteed: false,
      benefits: ['Instagram Story Promotion', 'Tagged Seller Account'],
    });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const url = editingPlan
        ? `/api/admin/advertisement/plans/${editingPlan.id}`
        : '/api/admin/advertisement/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save plan.');

      setIsPlanModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete/deactivate this advertisement package?')) return;
    try {
      const res = await fetch(`/api/admin/advertisement/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete plan.');
      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setPlanForm((prev) => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setPlanForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
            <Megaphone className="w-3.5 h-3.5" />
            <span>BUSINESS OPERATIONS</span>
          </div>
          <h2 className="text-2xl font-black uppercase text-white font-rajdhani">
            ADVERTISEMENT OPERATIONS &amp; PACKAGES
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-[#0d0a1a] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Orders &amp; Submissions ({orders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('packages')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'packages'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Manage Packages ({plans.length})
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: ORDERS & SUBMISSIONS                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0a1a] p-3 rounded-xl border border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'pending_payment', 'approved', 'details_submitted', 'live', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
                  placeholder="Search order ID, name, email..."
                  className="bg-[#05040a] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 w-56"
                />
              </div>
              <button
                onClick={fetchOrders}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Refresh Orders"
              >
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          {ordersLoading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Loading advertisement orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 bg-[#0d0a1a] rounded-xl border border-white/10">
              No advertisement orders found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#090714]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#120d24] text-gray-300 font-mono text-[11px]">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Package &amp; Price</th>
                    <th className="p-3">UTR / Payment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono font-bold text-purple-300">{o.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{o.customer_name}</div>
                        <div className="text-[10px] text-gray-400">{o.customer_email} • {o.customer_phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white font-rajdhani">{o.plan_name}</div>
                        <div className="text-[10px] font-mono text-purple-300">
                          {o.plan_price === 0 ? 'FREE (18% After Sale)' : `₹${Number(o.plan_price).toLocaleString('en-IN')}`}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <div>{o.payment_reference || 'N/A'}</div>
                        {o.payment_screenshot && (
                          <span className="text-[9px] text-emerald-400 font-semibold">Screenshot Attached</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            o.status === 'live'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : o.status === 'details_submitted'
                              ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/30'
                              : o.status === 'approved'
                              ? 'bg-sky-950 text-sky-300 border border-sky-500/30'
                              : o.status === 'pending_payment'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-[11px]">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setIsOrderModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white font-bold text-[11px] font-rajdhani uppercase cursor-pointer"
                          >
                            Inspect
                          </button>

                          {o.status === 'pending_payment' && (
                            <button
                              onClick={() => handleApprovePayment(o.id)}
                              className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] font-rajdhani uppercase cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {o.status === 'details_submitted' && (
                            <button
                              onClick={() => handleMarkLive(o.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] font-rajdhani uppercase cursor-pointer"
                            >
                              Mark Live
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PACKAGES CRUD                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0d0a1a] p-3 rounded-xl border border-white/10">
            <div className="text-xs text-gray-400">
              Configure prices, badges, and platform features. Changes immediately reflect on <code className="text-purple-300">/advertise</code>.
            </div>
            <button
              onClick={handleOpenCreatePlan}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Package</span>
            </button>
          </div>

          {plansLoading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Loading packages...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#090714]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#120d24] text-gray-300 font-mono text-[11px]">
                    <th className="p-3 w-16">Order</th>
                    <th className="p-3">Package Name</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Badge</th>
                    <th className="p-3">Story/Post</th>
                    <th className="p-3">Web Listing</th>
                    <th className="p-3">Active</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {plans.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-400">#{p.display_order}</td>
                      <td className="p-3 font-bold text-white font-rajdhani text-sm">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-sans font-normal truncate max-w-xs">{p.description}</div>
                      </td>
                      <td className="p-3 font-black text-purple-300 font-rajdhani text-sm">
                        {p.price === 0 ? 'FREE (18% Fee)' : `₹${p.price.toLocaleString('en-IN')}`}
                      </td>
                      <td className="p-3 font-mono text-[10px] uppercase text-gray-300">{p.category}</td>
                      <td className="p-3">
                        {p.badge && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                            {p.badge}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-gray-300 font-mono">
                        {p.story_count}
                      </td>
                      <td className="p-3">
                        {p.website_listing ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            p.is_active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditPlan(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit Plan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-950/40 text-gray-300 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete or Deactivate Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INSPECT ORDER & REVIEW PAYMENT / SUBMISSION                      */}
      {/* ========================================================================= */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0f0b1e] border border-purple-500/40 rounded-2xl p-6 space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black uppercase text-white font-rajdhani">
                  Order Review: {selectedOrder.id}
                </h3>
                <div className="text-[10px] font-mono text-purple-300">
                  Status: {selectedOrder.status.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Customer & Package Info */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#070510] border border-white/10 text-xs">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Customer</div>
                  <div className="font-bold text-white">{selectedOrder.customer_name}</div>
                  <div className="text-gray-300">{selectedOrder.customer_email}</div>
                  <div className="text-purple-300">{selectedOrder.customer_phone}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Package</div>
                  <div className="font-bold text-white font-rajdhani text-sm">{selectedOrder.plan_name}</div>
                  <div className="text-emerald-400 font-mono font-bold">₹{Number(selectedOrder.plan_price).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-gray-400">Placed: {new Date(selectedOrder.created_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Payment Verification Section */}
              <div className="p-3.5 rounded-xl bg-[#140f28] border border-purple-500/30 space-y-2.5 text-xs">
                <div className="font-bold font-rajdhani uppercase text-purple-300">Payment Evidence</div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">Transaction Reference (UTR):</span>
                  <span className="font-mono font-bold text-white">{selectedOrder.payment_reference || 'None provided'}</span>
                </div>

                {selectedOrder.payment_screenshot && (
                  <div className="pt-2">
                    <div className="text-[10px] font-mono text-gray-400 mb-1">Uploaded Payment Screenshot:</div>
                    <img
                      src={selectedOrder.payment_screenshot}
                      alt="Payment Receipt"
                      className="max-h-56 rounded-lg border border-white/10 object-contain shadow-md mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Submitted Advertisement Details (if submitted) */}
              {selectedOrder.status === 'details_submitted' || selectedOrder.status === 'live' ? (
                <div className="p-3.5 rounded-xl bg-[#091522] border border-cyan-500/30 space-y-2.5 text-xs">
                  <div className="font-bold font-rajdhani uppercase text-cyan-300">Customer Submitted Campaign Details</div>
                  <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-2">
                    <div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase">Instagram Handle</div>
                      <div className="font-bold text-white font-mono">@{selectedOrder.instagram_username}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase">Selling Price</div>
                      <div className="font-bold text-white font-mono">₹{selectedOrder.selling_price}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase">Current Rank</div>
                      <div className="font-bold text-white font-mono">{selectedOrder.current_rank}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-gray-400 uppercase mb-1">Premium Skins List:</div>
                    <pre className="p-2.5 rounded-lg bg-[#050b12] text-[11px] text-gray-200 whitespace-pre-wrap font-mono">
                      {selectedOrder.premium_skins}
                    </pre>
                  </div>

                  {selectedOrder.other_valuable_items && (
                    <div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase mb-1">Other Items:</div>
                      <pre className="p-2.5 rounded-lg bg-[#050b12] text-[11px] text-gray-200 whitespace-pre-wrap font-mono">
                        {selectedOrder.other_valuable_items}
                      </pre>
                    </div>
                  )}

                  {selectedOrder.inventory_screenshot && (
                    <div className="pt-2">
                      <div className="text-[10px] font-mono text-gray-400 mb-1">Main Account Inventory Screenshot:</div>
                      <img
                        src={selectedOrder.inventory_screenshot}
                        alt="Inventory"
                        className="max-h-64 rounded-lg border border-white/10 object-contain shadow-md mx-auto"
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Reject Reason Form */}
              {isRejecting && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 text-xs">
                  <label className="block text-[11px] font-mono text-rose-300 uppercase">
                    Reason for Payment Rejection:
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. UTR not found on bank statement"
                    className="w-full bg-[#0a0714] border border-rose-500/40 rounded-lg p-2 text-xs text-white"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleRejectPayment(selectedOrder.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase font-rajdhani cursor-pointer"
                    >
                      Confirm Rejection &amp; Email Notice
                    </button>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === 'pending_payment' && !isRejecting && (
                  <>
                    <button
                      onClick={() => setIsRejecting(true)}
                      className="px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                    >
                      Reject Payment
                    </button>
                    <button
                      onClick={() => handleApprovePayment(selectedOrder.id)}
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer shadow-md"
                    >
                      Approve Payment &amp; Send Submission Link
                    </button>
                  </>
                )}

                {selectedOrder.status === 'details_submitted' && (
                  <button
                    onClick={() => handleMarkLive(selectedOrder.id)}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer shadow-md"
                  >
                    Mark as Campaign Live
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT / CREATE ADVERTISEMENT PACKAGE                              */}
      {/* ========================================================================= */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0f0b1e] border border-purple-500/40 rounded-2xl p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase text-white font-rajdhani">
                {editingPlan ? `Edit Package: ${editingPlan.name}` : 'Create New Package'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Price (INR) *
                  </label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    required
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={planForm.category}
                    onChange={(e) => setPlanForm({ ...planForm, category: e.target.value as any })}
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="trade">Trade / Exchange</option>
                    <option value="premium">Premium VIP</option>
                    <option value="bonus">Bonus Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Badge
                  </label>
                  <input
                    type="text"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={planForm.display_order}
                    onChange={(e) => setPlanForm({ ...planForm, display_order: Number(e.target.value) })}
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Story Count Description
                  </label>
                  <input
                    type="text"
                    value={planForm.story_count}
                    onChange={(e) => setPlanForm({ ...planForm, story_count: e.target.value })}
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Promotion Duration
                  </label>
                  <input
                    type="text"
                    value={planForm.promotion_duration}
                    onChange={(e) => setPlanForm({ ...planForm, promotion_duration: e.target.value })}
                    className="w-full bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Feature Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#070510] border border-white/10 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.instagram_story}
                    onChange={(e) => setPlanForm({ ...planForm, instagram_story: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Instagram Story</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.instagram_post}
                    onChange={(e) => setPlanForm({ ...planForm, instagram_post: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Instagram Post</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.highlight_placement}
                    onChange={(e) => setPlanForm({ ...planForm, highlight_placement: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Highlight Placement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.website_listing}
                    onChange={(e) => setPlanForm({ ...planForm, website_listing: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Website Listing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.inventory_editing}
                    onChange={(e) => setPlanForm({ ...planForm, inventory_editing: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Inventory Editing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.buyer_assistance}
                    onChange={(e) => setPlanForm({ ...planForm, buyer_assistance: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Buyer Assistance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.priority_placement}
                    onChange={(e) => setPlanForm({ ...planForm, priority_placement: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Priority Placement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.dedicated_agent}
                    onChange={(e) => setPlanForm({ ...planForm, dedicated_agent: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span>Dedicated Agent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                    className="rounded bg-black border-white/20"
                  />
                  <span className="font-bold text-emerald-400">Package Active</span>
                </label>
              </div>

              {/* Benefits List */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-gray-400 uppercase">
                  Benefits Checklist
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBenefit();
                      }
                    }}
                    placeholder="Add a benefit (e.g. 24h Story Broadcast)"
                    className="flex-1 bg-[#05040a] border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white uppercase font-rajdhani cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 pt-1">
                  {planForm.benefits.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#070510] text-xs text-gray-200">
                      <span>• {b}</span>
                      <button
                        type="button"
                        onClick={() => removeBenefit(i)}
                        className="text-gray-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer shadow-md"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

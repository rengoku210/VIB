import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Package,
  CreditCard,
  Headphones,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Plus,
  RefreshCw,
  Wallet,
  Calendar,
  MessageSquare,
  FileText,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyPrice } from '../../utils/format';
import { Currency } from '../../types';

interface UserDashboardProps {
  currency: Currency;
  onNavigate: (page: string) => void;
  onOpenCheckout?: (title: string, priceINR: number) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const { user, token, logout, updateProfile, refreshUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'transactions' | 'tickets' | 'notifications' | 'settings'>('overview');

  // Live state from backend
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [riotId, setRiotId] = useState(user?.riot_id || '');
  const [discordTag, setDiscordTag] = useState(user?.discord_tag || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New ticket state
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('orders');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  // Load user data from API
  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ovRes, ordRes, txnRes, tktRes, notifRes] = await Promise.all([
        fetch('/api/user/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/tickets', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/notifications', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrders(d.orders || []);
      }
      if (txnRes.ok) {
        const d = await txnRes.json();
        setTransactions(d.transactions || []);
      }
      if (tktRes.ok) {
        const d = await tktRes.json();
        setTickets(d.tickets || []);
      }
      if (notifRes.ok) {
        const d = await notifRes.json();
        setNotifications(d.notifications || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Update profile handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({
      name,
      phone,
      riot_id: riotId,
      discord_tag: discordTag,
      bio,
    });
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage || !token) return;
    setTicketSubmitting(true);
    try {
      const res = await fetch('/api/user/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: ticketSubject,
          category: ticketCategory,
          message: ticketMessage,
          priority: ticketPriority,
        }),
      });

      if (res.ok) {
        setShowNewTicketModal(false);
        setTicketSubject('');
        setTicketMessage('');
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Mark notification read
  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/user/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
    } catch {}
  };

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-rajdhani text-white">Access Restricted</h2>
        <p className="text-gray-400 text-sm">Please sign in to access your VIB member dashboard.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full bg-[#06050e] text-white min-h-[calc(100vh-80px)] pb-20 pt-6">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Profile Banner Header */}
        <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-purple-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-500/40 relative shadow-[0_0_20px_rgba(168,85,247,0.3)] flex-shrink-0">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black font-rajdhani text-white uppercase tracking-wide">
                  {user.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider uppercase bg-purple-900/60 border border-purple-500/40 text-purple-300">
                  {user.role}
                </span>
                {user.email_verified === 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                <span>{user.email}</span>
                {user.riot_id && <span>• Riot: <strong className="text-purple-300">{user.riot_id}</strong></span>}
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3 relative z-10 flex-wrap">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] font-mono uppercase text-gray-400">Wallet Balance</div>
              <div className="text-lg font-black font-rajdhani text-emerald-400">
                ₹{((user.wallet_balance || 0)).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] font-mono uppercase text-gray-400">Total Orders</div>
              <div className="text-lg font-black font-rajdhani text-purple-300">
                {orders.length}
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold text-xs uppercase font-rajdhani tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              aria-label="Logout of session"
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/40 text-gray-300 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Transactions ({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'tickets'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Support &amp; Escrow ({tickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'notifications'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            {unreadNotifs > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Profile Settings</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW                                                */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>ACTIVE ORDERS</span>
                  <Package className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-white">
                  {orders.filter((o) => o.status === 'processing' || o.status === 'pending').length} Active
                </div>
                <div className="text-[11px] text-gray-400">Dispatched with escrow protection</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>COMPLETED TRANSACTIONS</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-white">
                  {orders.filter((o) => o.status === 'completed').length} Delivered
                </div>
                <div className="text-[11px] text-gray-400">100% verified fulfillment</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>ACTIVE DISPUTES / TICKETS</span>
                  <Headphones className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-white">
                  {tickets.filter((t) => t.status === 'open').length} Open
                </div>
                <div className="text-[11px] text-gray-400">24/7 middleman assistance</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>ESCROW GUARANTEE</span>
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-sky-300">
                  Secured
                </div>
                <div className="text-[11px] text-gray-400">Funds released upon delivery</div>
              </div>
            </div>

            {/* Recent Orders Showcase */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg font-rajdhani uppercase tracking-wider text-white">
                  Recent Orders
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold font-rajdhani"
                >
                  <span>View All Orders</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 space-y-2">
                  <Package className="w-10 h-10 mx-auto text-gray-500" />
                  <p className="text-sm">You haven't placed any orders yet.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('vp-catalog')}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs uppercase"
                  >
                    Browse VP Catalog
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {orders.slice(0, 3).map((ord) => (
                    <div key={ord.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-white font-rajdhani flex items-center gap-2">
                          <span>{ord.title}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                            ord.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          Order #{ord.id} • {new Date(ord.created_at).toLocaleDateString()} • {ord.payment_method}
                        </div>
                      </div>
                      <div className="font-black text-base text-fuchsia-300 font-rajdhani">
                        ₹{ord.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ALL ORDERS                                             */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Order History &amp; Delivery Tracking
              </h2>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400 space-y-3">
                <Package className="w-12 h-12 mx-auto text-gray-600" />
                <h3 className="text-base font-bold text-white font-rajdhani">No Orders Found</h3>
                <p className="text-xs max-w-sm mx-auto">Browse our Indian VP packs, rankup journeys, or accounts marketplace to place your first order.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {orders.map((ord) => (
                  <div key={ord.id} className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-3 hover:border-purple-500/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div>
                        <div className="font-black text-base text-white font-rajdhani flex items-center gap-2">
                          <span>{ord.title}</span>
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase ${
                            ord.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                          Order ID: <strong className="text-gray-300">{ord.id}</strong> • Date: {new Date(ord.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-fuchsia-300 font-rajdhani">
                          ₹{ord.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">{ord.payment_method}</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400 pt-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          <span>Escrow Protected</span>
                        </span>
                        <span>Type: <strong className="uppercase text-gray-300">{ord.type}</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('tickets');
                            setTicketSubject(`Assistance required for Order #${ord.id}`);
                            setShowNewTicketModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 transition-colors"
                        >
                          Need Help With Order?
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TRANSACTIONS & RECEIPTS                                */}
        {/* ============================================================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Financial Transactions &amp; Payment Receipts
            </h2>

            {transactions.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm">No transaction records found.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-4">Reference No.</th>
                        <th className="p-4">Order ID</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-bold text-white">{txn.reference_no}</td>
                          <td className="p-4 text-purple-300">{txn.order_id || 'N/A'}</td>
                          <td className="p-4 uppercase">{txn.type}</td>
                          <td className="p-4 font-bold text-emerald-400">₹{txn.amount.toLocaleString('en-IN')}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 uppercase text-[10px]">
                              {txn.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400">{new Date(txn.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: SUPPORT DESK & DISPUTES                                */}
        {/* ============================================================== */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Support Desk &amp; Middleman Dispute Resolution
              </h2>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Support Ticket</span>
              </button>
            </div>

            {/* New Ticket Form Modal */}
            {showNewTicketModal && (
              <div className="p-6 rounded-2xl bg-[#0e0f22] border border-purple-500/40 space-y-4 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-bold text-base text-white font-rajdhani uppercase">
                    New Support &amp; Dispute Ticket
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Subject *</label>
                      <input
                        type="text"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="e.g. Question regarding order fulfillment"
                        required
                        className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Category</label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                      >
                        <option value="orders">Orders &amp; VP Top-Up</option>
                        <option value="payment">Payment &amp; Billing</option>
                        <option value="dispute">Escrow Dispute</option>
                        <option value="account">Account &amp; Security</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Message *</label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      rows={4}
                      placeholder="Describe your issue or order inquiry with relevant details..."
                      required
                      className="w-full p-3 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewTicketModal(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani disabled:opacity-50"
                    >
                      {ticketSubmitting ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tickets.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <Headphones className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm">You have no open support or dispute tickets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((tkt) => {
                  const msgs = JSON.parse(tkt.messages_json || '[]');
                  return (
                    <div key={tkt.id} className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-base text-white font-rajdhani flex items-center gap-2">
                            <span>{tkt.subject}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase">
                              {tkt.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Ticket #{tkt.id} • Category: {tkt.category.toUpperCase()} • Priority: {tkt.priority.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {new Date(tkt.updated_at).toLocaleString()}
                        </div>
                      </div>

                      {/* Messages Thread */}
                      <div className="space-y-2 pt-1">
                        {msgs.map((m: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl text-xs space-y-1 ${
                              m.sender === 'staff'
                                ? 'bg-purple-950/40 border border-purple-500/30 ml-4 text-purple-100'
                                : 'bg-white/5 border border-white/5 text-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
                              <span className="font-bold text-purple-300">{m.senderName || m.sender}</span>
                              <span>{new Date(m.time).toLocaleTimeString()}</span>
                            </div>
                            <p className="font-sans leading-relaxed">{m.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: NOTIFICATIONS CENTER                                   */}
        {/* ============================================================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Platform &amp; Order Notifications
            </h2>

            {notifications.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <Bell className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm">No notifications.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkRead(notif.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      notif.read
                        ? 'bg-[#0c0d1c] border-white/5 opacity-70 hover:opacity-100'
                        : 'bg-[#120f26] border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-white font-rajdhani tracking-wide">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: SETTINGS & ACCOUNT SECURITY                             */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-6 animate-in fade-in max-w-2xl">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Profile &amp; Account Settings
            </h2>

            {saveSuccess && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Profile details successfully updated!</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Riot ID &amp; Tag</label>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="Player#TAG"
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Discord Tag</label>
                <input
                  type="text"
                  value={discordTag}
                  onChange={(e) => setDiscordTag(e.target.value)}
                  placeholder="Username#0000"
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 ..."
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Bio / Notes</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider shadow-md transition-all cursor-pointer"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

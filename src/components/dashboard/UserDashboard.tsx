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
  Download,
  Printer,
  X,
  Send,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Currency } from '../../types';
import { verifyRiotIdOnServer, RiotVerificationResponse } from '../../lib/riot';
import { SubmitListingModal } from '../profiles/SubmitListingModal';

interface UserDashboardProps {
  currency: Currency;
  onNavigate: (page: string, id?: string) => void;
  onOpenCheckout?: (title: string, priceINR: number, productId?: string) => void;
  onOpenTracking?: (orderId: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
  onOpenTracking,
}) => {
  const { user, token, logout, updateProfile, refreshUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'transactions' | 'invoices' | 'tickets' | 'notifications' | 'settings' | 'listings'>('overview');

  // Live state from backend
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [listingActionLoading, setListingActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [riotId, setRiotId] = useState(user?.riot_id || '');
  const [discordTag, setDiscordTag] = useState(user?.discord_tag || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [riotVerification, setRiotVerification] = useState<RiotVerificationResponse | null>(null);
  const [isVerifyingRiot, setIsVerifyingRiot] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Live Riot ID verification on settings edit
  useEffect(() => {
    if (activeTab !== 'settings' || !riotId.trim() || riotId.trim() === user?.riot_id) {
      setRiotVerification(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingRiot(true);
      const res = await verifyRiotIdOnServer(riotId.trim());
      setIsVerifyingRiot(false);
      setRiotVerification(res);
    }, 450);

    return () => clearTimeout(timer);
  }, [riotId, activeTab, user?.riot_id]);

  // New ticket state
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('orders');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  // Order Room state (Universal Order Flow & Chat)
  const [selectedOrderRoom, setSelectedOrderRoom] = useState<any | null>(null);
  const [orderRoomMessages, setOrderRoomMessages] = useState<any[]>([]);
  const [newOrderMessage, setNewOrderMessage] = useState('');
  const [messageWarning, setMessageWarning] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [orderRoomLoading, setOrderRoomLoading] = useState(false);

  // Tax Invoice Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Load user data from API
  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ovRes, ordRes, txnRes, invRes, tktRes, notifRes, lstRes] = await Promise.all([
        fetch('/api/user/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/tickets', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/notifications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/listings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrders(d.orders || []);
      }
      if (txnRes.ok) {
        const d = await txnRes.json();
        setTransactions(d.transactions || []);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setInvoices(d.invoices || []);
      }
      if (tktRes.ok) {
        const d = await tktRes.json();
        setTickets(d.tickets || []);
      }
      if (notifRes.ok) {
        const d = await notifRes.json();
        setNotifications(d.notifications || []);
      }
      if (lstRes && lstRes.ok) {
        const d = await lstRes.json();
        setUserListings(d.listings || []);
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

  // Open dedicated Order Room
  const handleOpenOrderRoom = async (orderId: string) => {
    if (!token) return;
    setOrderRoomLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/room`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setSelectedOrderRoom(d.orderRoom);
        setOrderRoomMessages(d.orderRoom.messages || []);
        setMessageWarning(null);
      }
    } catch (err) {
      console.error('Failed to load order room:', err);
    } finally {
      setOrderRoomLoading(false);
    }
  };

  // Send message in Order Room with live anti-fraud scanning
  const handleSendOrderMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderMessage.trim() || !selectedOrderRoom || !token) return;
    setSendingMessage(true);
    setMessageWarning(null);

    try {
      const res = await fetch(`/api/orders/${selectedOrderRoom.orderId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newOrderMessage.trim() }),
      });

      if (res.ok) {
        const d = await res.json();
        setOrderRoomMessages((prev) => [
          ...prev,
          {
            id: d.messageId,
            sender_id: user?.id,
            sender_name: user?.name,
            sender_role: user?.role,
            message: newOrderMessage.trim(),
            flagged: d.flagged ? 1 : 0,
            flag_reason: d.flagReason,
            created_at: new Date().toISOString(),
          },
        ]);
        setNewOrderMessage('');
        if (d.flagged) {
          setMessageWarning(`Security Notice: ${d.flagReason}`);
        }
      }
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Update profile handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);

    // Verify Riot ID if updated
    if (riotId.trim() && riotId.trim() !== user?.riot_id) {
      setIsVerifyingRiot(true);
      const check = await verifyRiotIdOnServer(riotId.trim());
      setIsVerifyingRiot(false);
      setRiotVerification(check);
      if (!check.exists) {
        setSettingsError(check.error || 'The provided Riot ID is not a legitimate Valorant account. Please check your username and tag.');
        return;
      }
    }

    const success = await updateProfile({
      name,
      phone,
      riot_id: riotId.trim() || undefined,
      discord_tag: discordTag,
      bio,
    });
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refreshUser();
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
      console.error('Failed to create ticket:', err);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Mark notification read
  const handleMarkNotificationRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/user/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!token || !confirm('Are you sure you want to withdraw and delete this listing?')) return;
    setListingActionLoading(true);
    try {
      const res = await fetch(`/api/user/listings/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUserListings(prev => prev.filter(l => l.id !== listingId));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to withdraw listing.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListingActionLoading(false);
    }
  };

  const handleSubmitListingForReview = async (listingId: string) => {
    if (!token) return;
    setListingActionLoading(true);
    try {
      const res = await fetch(`/api/user/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submitForReview: true })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListingActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-purple-400 mb-3 animate-pulse" />
        <h2 className="text-xl font-bold font-rajdhani text-white uppercase tracking-wider mb-2">
          Authentication Required
        </h2>
        <p className="text-xs text-gray-400 max-w-sm mb-4">
          Please log in to access your persistent orders, wallet balance, and secure escrow dashboard.
        </p>
      </div>
    );
  }

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Profile Banner Card */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0d0c1b] via-[#15122c] to-[#0c0d1c] border border-purple-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-purple-400/50 shadow-lg flex-shrink-0 bg-purple-950/40">
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
              <div className="flex items-center gap-4 text-xs text-gray-400 font-mono flex-wrap">
                <span>{user.email}</span>
                {user.riot_id && (
                  <span className="flex items-center gap-1.5">
                    • Riot: <strong className="text-purple-300">{user.riot_id}</strong>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-300">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      VALORANT VERIFIED
                    </span>
                  </span>
                )}
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
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto no-scrollbar pb-1 mt-6">
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
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'listings'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>My Listings ({userListings.length})</span>
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
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tax Invoices ({invoices.length})</span>
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
            <span>Support &amp; Disputes ({tickets.length})</span>
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
      </div>

      {/* Main Tab Panels */}
      <div className="space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW                                                */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>ACTIVE ORDERS</span>
                  <Package className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-white">
                  {orders.filter((o) => o.status === 'processing' || o.status === 'pending').length}
                </div>
                <div className="text-[11px] text-gray-500">Live orders currently in fulfillment queue</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>COMPLETED DELIVERIES</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-emerald-400">
                  {orders.filter((o) => o.status === 'completed').length}
                </div>
                <div className="text-[11px] text-gray-500">Successfully verified and credited orders</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>ACTIVE DISPUTES / TICKETS</span>
                  <Headphones className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black font-rajdhani text-indigo-300">
                  {tickets.filter((t) => t.status === 'open').length}
                </div>
                <div className="text-[11px] text-gray-500">Active communications with VIB support</div>
              </div>
            </div>

            {/* Recent Orders List Preview */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                  Recent Orders &amp; Escrow Deliveries
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({orders.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No orders placed yet. Browse our verified Valorant profiles or VP top-ups to get started.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {orders.slice(0, 3).map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-white">{ord.title}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          #{ord.id} • {new Date(ord.created_at).toLocaleDateString()} • {ord.payment_method}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                          ord.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {ord.status}
                        </span>
                        {onOpenTracking && (
                          <button
                            type="button"
                            onClick={() => onOpenTracking(ord.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Track</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenOrderRoom(ord.id)}
                          className="px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/60 border border-purple-500/30 text-purple-200 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                        >
                          Order Room
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ORDERS                                                 */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Your Order History ({orders.length})
              </h2>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <Package className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-semibold">No orders recorded yet.</p>
                <p className="text-xs text-gray-500 mt-1">Explore our catalog of verified profiles and instant VP packs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 hover:border-purple-500/30 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base font-rajdhani">{ord.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            ord.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          <span>Escrow Protected</span>
                        </span>
                        <span>Type: <strong className="uppercase text-gray-300">{ord.type}</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenTracking && (
                          <button
                            type="button"
                            onClick={() => onOpenTracking(ord.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-rajdhani uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Live Tracking &amp; Code</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenOrderRoom(ord.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Order Room</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('tickets');
                            setTicketSubject(`Assistance required for Order #${ord.id}`);
                            setShowNewTicketModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 transition-colors"
                        >
                          Need Help?
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
        {/* TAB 4: TAX INVOICES & BILLING (NEW REQUIREMENT)              */}
        {/* ============================================================== */}
        {activeTab === 'invoices' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                  Official GST Tax Invoices
                </h2>
                <p className="text-xs text-gray-400">
                  Compliance-verified invoices with statutory tax breakdown and middleman escrow certificate.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <FileText className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-semibold">No tax invoices generated yet.</p>
                <p className="text-xs text-gray-500 mt-1">Invoices are automatically generated upon order checkout.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-4">Invoice No.</th>
                        <th className="p-4">Particulars</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Subtotal</th>
                        <th className="p-4">GST (18%)</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-bold text-purple-300">{inv.id}</td>
                          <td className="p-4 font-sans font-semibold text-white max-w-xs truncate">{inv.product_name}</td>
                          <td className="p-4 text-gray-400">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                          <td className="p-4">₹{Number(inv.subtotal).toLocaleString('en-IN')}</td>
                          <td className="p-4 text-amber-300">₹{Number(inv.tax_amount).toLocaleString('en-IN')}</td>
                          <td className="p-4 font-bold text-emerald-400">₹{Number(inv.final_total).toLocaleString('en-IN')}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 uppercase text-[10px]">
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white font-rajdhani uppercase font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Invoice</span>
                            </button>
                          </td>
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
        {/* TAB 5: SUPPORT DESK & DISPUTES                                */}
        {/* ============================================================== */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Support Desk &amp; Dispute Resolution
              </h2>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Open New Ticket</span>
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <Headphones className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-semibold">No active support tickets.</p>
                <p className="text-xs text-gray-500 mt-1">Our executive staff is available 24/7 if you need assistance with an order or account issue.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((tkt) => {
                  const messages = JSON.parse(tkt.messages_json || '[]');
                  return (
                    <div
                      key={tkt.id}
                      className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base font-rajdhani">{tkt.subject}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            tkt.status === 'open'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {tkt.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          Ticket #{tkt.id} • {new Date(tkt.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/5">
                        {messages.map((m: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl text-xs ${
                              m.sender === 'user'
                                ? 'bg-purple-950/30 border border-purple-500/20 text-purple-100'
                                : 'bg-white/5 border border-white/10 text-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] text-gray-400 mb-1">
                              <strong>{m.senderName}</strong>
                              <span>{new Date(m.time).toLocaleTimeString()}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{m.text}</p>
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
        {/* TAB 6: NOTIFICATIONS                                          */}
        {/* ============================================================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Notification Feed ({notifications.length})
            </h2>

            {notifications.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-400">
                <Bell className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                <p className="text-sm">You have zero notifications.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                      notif.read
                        ? 'bg-[#0c0d1c] border-white/5 text-gray-400'
                        : 'bg-purple-950/30 border-purple-500/40 text-purple-100 shadow-md'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{notif.title}</span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-gray-300">{notif.message}</p>
                      <div className="text-[10px] font-mono text-gray-400">
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>

                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotificationRead(notif.id)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono uppercase text-gray-300 cursor-pointer flex-shrink-0"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: PROFILE SETTINGS                                       */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-6 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Profile &amp; Account Preferences
            </h2>

            {saveSuccess && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Profile details successfully updated!</span>
              </div>
            )}

            {settingsError && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{settingsError}</span>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Riot ID &amp; Tag</label>
                  {isVerifyingRiot && (
                    <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking Valorant servers...
                    </span>
                  )}
                  {riotVerification?.exists && (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Verified ({riotVerification.riotId})
                    </span>
                  )}
                  {!riotVerification && user?.riot_id && riotId === user.riot_id && (
                    <span className="text-[10px] text-purple-300 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-purple-400" />
                      Verified In-Game ID
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="Player#TAG"
                  className={`w-full p-2.5 rounded-xl bg-[#141224] border text-white text-xs focus:outline-none transition-colors ${
                    riotVerification?.exists
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : riotVerification?.exists === false
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : 'border-white/10 focus:border-purple-500'
                  }`}
                />
                {riotVerification?.exists === false && (
                  <span className="text-[10px] text-rose-400 block font-mono">
                    {riotVerification.error || 'Valorant Riot ID does not exist.'}
                  </span>
                )}
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

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0c0d1b] border border-white/10">
              <div>
                <h3 className="text-xl font-bold font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>My Account Listings &amp; Escrow</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Manage your submitted Valorant account listings, view moderation statuses, and track payouts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Submit New Listing</span>
              </button>
            </div>

            {userListings.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#0c0d1b] border border-white/10 text-center flex flex-col items-center justify-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-gray-500" />
                <h4 className="text-lg font-bold font-rajdhani text-white uppercase">No Active Account Listings</h4>
                <p className="text-xs text-gray-400 max-w-md">
                  You haven't listed any Valorant accounts yet. Sell securely through VIB Escrow with automated payouts and anti-fraud verification.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {userListings.map((l) => {
                  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
                    published: { bg: 'bg-emerald-950/80 border-emerald-500/40', text: 'text-emerald-300', label: 'PUBLISHED & ACTIVE' },
                    submitted: { bg: 'bg-amber-950/80 border-amber-500/40', text: 'text-amber-300', label: 'UNDER REVIEW' },
                    pending_review: { bg: 'bg-amber-950/80 border-amber-500/40', text: 'text-amber-300', label: 'UNDER REVIEW' },
                    draft: { bg: 'bg-zinc-900 border-zinc-700', text: 'text-zinc-400', label: 'DRAFT' },
                    rejected: { bg: 'bg-rose-950/80 border-rose-500/40', text: 'text-rose-300', label: 'NEEDS REVISION' },
                  };
                  const sInfo = statusColors[l.status] || { bg: 'bg-zinc-900 border-zinc-700', text: 'text-zinc-400', label: l.status.toUpperCase() };

                  return (
                    <div
                      key={l.id}
                      className="rounded-2xl bg-[#0c0d1b] border border-white/10 overflow-hidden flex flex-col justify-between group hover:border-purple-500/50 transition-all shadow-lg"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                        <img
                          src={l.images && l.images[0] ? l.images[0] : '/assets/hires/profiles/card1_exact.jpg'}
                          alt={l.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sInfo.bg} ${sInfo.text}`}>
                            {sInfo.label}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-mono font-bold">
                          ₹{Number(l.price_inr).toLocaleString()}
                        </div>
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-purple-300 font-mono">
                            <span>{l.rank}</span>
                            <span>•</span>
                            <span>Level {l.level}</span>
                            <span>•</span>
                            <span>{l.region}</span>
                          </div>
                          <h4 className="font-bold text-white text-sm line-clamp-1 mt-1 font-rajdhani">
                            {l.title}
                          </h4>
                          {l.rejection_reason && (
                            <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300">
                              <strong>Moderation Feedback:</strong> {l.rejection_reason}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
                          {l.status === 'published' && (
                            <button
                              type="button"
                              onClick={() => onNavigate('listing', l.id)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Listing</span>
                            </button>
                          )}

                          {(l.status === 'draft' || l.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => handleSubmitListingForReview(l.id)}
                              disabled={listingActionLoading}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold font-rajdhani uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Submit for Review</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteListing(l.id)}
                            disabled={listingActionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-950/50 border border-white/10 hover:border-rose-500/40 text-gray-300 hover:text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Withdraw Listing"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Withdraw</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ORDER ROOM (UNIVERSAL ORDER FLOW & INTERNAL CHAT)      */}
      {/* ============================================================== */}
      {selectedOrderRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-room-title"
            className="relative w-full max-w-3xl rounded-3xl bg-[#0c0d1c] border border-purple-500/40 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="order-room-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                    Order Room: #{selectedOrderRoom.orderId}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-900/60 border border-purple-500/40 text-purple-300">
                    {selectedOrderRoom.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {selectedOrderRoom.title} • ₹{selectedOrderRoom.amount.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderRoom(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mandatory Anti-Fraud Warning Banner (Requirements Clause 13) */}
            <div className="my-3 p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2.5 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <strong className="font-bold">Official Escrow Security Notice: </strong>
                Keep all communication, payments, and account deliveries strictly inside VIB. Off-platform deals (sharing WhatsApp, phone numbers, or external UPI) are unprotected and result in immediate account restriction.
              </div>
            </div>

            {/* Order Lifecycle Progression Stages */}
            <div className="py-2 flex items-center justify-between gap-1 text-[10px] font-mono uppercase text-gray-400 border-b border-white/5 overflow-x-auto no-scrollbar">
              <span className="px-2 py-1 rounded bg-purple-950 text-purple-300 border border-purple-500/40">1. Payment Verified</span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="px-2 py-1 rounded bg-purple-950 text-purple-300 border border-purple-500/40">2. Processing</span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className={`px-2 py-1 rounded ${selectedOrderRoom.status === 'completed' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' : 'bg-white/5'}`}>
                3. Delivery Submitted
              </span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className={`px-2 py-1 rounded ${selectedOrderRoom.status === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-white/5'}`}>
                4. Completed
              </span>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-4 pr-1 max-h-[45vh]">
              {orderRoomMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No messages yet. Dispatch team will update this room shortly.
                </div>
              ) : (
                orderRoomMessages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                      msg.sender_id === user?.id
                        ? 'ml-auto bg-purple-600 text-white rounded-tr-none'
                        : msg.sender_role === 'system'
                        ? 'mx-auto bg-white/5 border border-white/10 text-gray-300 text-center max-w-md'
                        : 'mr-auto bg-[#15122c] border border-purple-500/30 text-purple-100 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75 font-mono mb-1 gap-2">
                      <strong>{msg.sender_name}</strong>
                      <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    {msg.flagged === 1 && (
                      <div className="mt-1.5 p-1.5 rounded bg-rose-950 text-rose-200 text-[10px] flex items-center gap-1 border border-rose-500/40">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        <span>Flagged by Anti-Fraud System: {msg.flag_reason}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {messageWarning && (
              <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{messageWarning}</span>
              </div>
            )}

            {/* Message Input Box */}
            <form onSubmit={handleSendOrderMessage} className="pt-3 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={newOrderMessage}
                onChange={(e) => setNewOrderMessage(e.target.value)}
                placeholder="Message dispatch staff or seller... (Protected by VIB Escrow)"
                className="flex-1 p-2.5 rounded-xl bg-[#141224] border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newOrderMessage.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: OFFICIAL TAX INVOICE VIEW & PRINT                     */}
      {/* ============================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-view-title"
            className="relative w-full max-w-2xl rounded-3xl bg-[#0e0f1a] border border-purple-500/40 p-6 sm:p-8 shadow-2xl text-white space-y-6 my-8"
          >
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span className="font-rajdhani font-black text-sm uppercase tracking-wider text-purple-300">
                  Tax Invoice Certificate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Printable Area */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 id="invoice-view-title" className="text-2xl font-black font-rajdhani text-white uppercase tracking-wider">
                    VIB DIGITAL SERVICES
                  </h2>
                  <div className="text-xs text-gray-400 font-mono mt-1 space-y-0.5">
                    <div>GSTIN: 29AAECV1092F1Z8 • MSME Reg. Verified</div>
                    <div>Digital Profile &amp; Game Escrow Services Division</div>
                    <div>Bangalore, Karnataka, India • support@vib.gg</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-black text-purple-400">{selectedInvoice.id}</div>
                  <div className="text-xs text-gray-400">Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold">
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              {/* Bill To */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs grid grid-cols-2 gap-4">
                <div>
                  <span className="font-mono text-gray-400 uppercase text-[10px] block mb-1">Billed To (Customer):</span>
                  <div className="font-bold text-white text-sm">{selectedInvoice.customer_name}</div>
                  <div className="text-gray-300 font-mono">{selectedInvoice.customer_email}</div>
                  <div className="text-gray-400 font-mono">{selectedInvoice.customer_phone || 'India'}</div>
                </div>
                <div>
                  <span className="font-mono text-gray-400 uppercase text-[10px] block mb-1">Transaction Ref:</span>
                  <div className="font-mono text-purple-300 font-bold">{selectedInvoice.payment_reference || 'VIB-TXN-VERIFIED'}</div>
                  <div className="text-gray-400 mt-1">Payment Method: <strong className="text-gray-200">{selectedInvoice.payment_method}</strong></div>
                  <div className="text-gray-400">Order ID: <strong className="text-gray-200">{selectedInvoice.order_id || 'N/A'}</strong></div>
                </div>
              </div>

              {/* Particulars Table */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Particulars / Service Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Taxable Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-200">
                    <tr>
                      <td className="p-3">
                        <div className="font-bold text-white font-sans">{selectedInvoice.product_name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{selectedInvoice.description}</div>
                      </td>
                      <td className="p-3 text-center font-bold">1</td>
                      <td className="p-3 text-right">₹{Number(selectedInvoice.subtotal).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculations Footer */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Taxable Subtotal:</span>
                    <span>₹{Number(selectedInvoice.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>CGST + SGST (18%):</span>
                    <span>₹{Number(selectedInvoice.tax_amount).toLocaleString('en-IN')}</span>
                  </div>
                  {Number(selectedInvoice.platform_fee) > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Platform Escrow Fee:</span>
                      <span>₹{Number(selectedInvoice.platform_fee).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/15 flex justify-between font-bold text-base text-emerald-400 font-rajdhani">
                    <span>Total Paid:</span>
                    <span>₹{Number(selectedInvoice.final_total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-center text-[10px] text-gray-500 font-mono">
                This is a computer-generated tax invoice issued by VIB Digital Services. Protected under electronic authentication laws.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CREATE SUPPORT TICKET                                 */}
      {/* ============================================================== */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="relative w-full max-w-lg rounded-2xl bg-[#0c0d1c] border border-purple-500/30 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 id="ticket-modal-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                Open Support or Dispute Ticket
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Subject *</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Inquiry regarding order #ord_1001"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="orders">Orders &amp; Delivery</option>
                    <option value="disputes">Order Dispute</option>
                    <option value="payment">Payment Issue</option>
                    <option value="account">Account Access</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Message *</label>
                <textarea
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue in detail. Staff will respond within 15-30 minutes."
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                >
                  {ticketSubmitting ? 'Submitting Ticket...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: SUBMIT NEW ACCOUNT LISTING                             */}
      {/* ============================================================== */}
      <SubmitListingModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={() => {
          setShowSubmitModal(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
};

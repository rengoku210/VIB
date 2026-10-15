import React, { useState, useEffect } from 'react';
import {
  Users,
  Package,
  CreditCard,
  Headphones,
  Bell,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  ChevronRight,
  Award,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, token, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'orders' | 'transactions' | 'disputes' | 'communication' | 'audit'>('metrics');

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalOrders: 0,
    completedOrders: 0,
    grossRevenue: 0,
    openDisputes: 0,
    activeSellers: 0,
  });

  // Data states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Announcement state
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceTarget, setAnnounceTarget] = useState('all');
  const [announceResult, setAnnounceResult] = useState<string | null>(null);

  // Dispute reply state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [ticketStatusUpdate, setTicketStatusUpdate] = useState('');

  // Fetch admin data
  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, ordRes, txnRes, tktRes, audRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&role=${roleFilter}&status=${statusFilter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setMetrics(d.metrics);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsersList(d.users || []);
      }
      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrdersList(d.orders || []);
      }
      if (txnRes.ok) {
        const d = await txnRes.json();
        setTransactionsList(d.transactions || []);
      }
      if (tktRes.ok) {
        const d = await tktRes.json();
        setTicketsList(d.tickets || []);
      }
      if (audRes.ok) {
        const d = await audRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token, roleFilter, statusFilter]);

  // Handle User Status change
  const handleUserStatus = async (userId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, reason: 'Administrative review' }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Handle User Role change (Super Admin only)
  const handleUserRole = async (userId: string, newRole: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  // Handle Order Status change
  const handleOrderStatus = async (orderId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, note: 'Processed by VIB platform staff' }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  // Dispatch announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceMessage || !token) return;
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: announceTitle,
          message: announceMessage,
          targetGroup: announceTarget,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnnounceResult(data.message);
        setAnnounceTitle('');
        setAnnounceMessage('');
        setTimeout(() => setAnnounceResult(null), 4000);
      }
    } catch {
      setAnnounceResult('Failed to broadcast announcement.');
    }
  };

  // Reply to ticket
  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !token) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: ticketStatusUpdate || selectedTicket.status,
          replyText,
        }),
      });
      if (res.ok) {
        setSelectedTicket(null);
        setReplyText('');
        setTicketStatusUpdate('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to reply to ticket:', err);
    }
  };

  // Access guard
  if (!isAdmin) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold font-rajdhani text-white">Administrative Access Required</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Your current account role does not have authorization to view or manage the VIB Executive Administrative Console.
        </p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
        >
          Go To Member Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#05040d] text-white min-h-[calc(100vh-80px)] pb-20 pt-6">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Admin Header Banner */}
        <div className="p-6 rounded-2xl bg-[#0a0b18] border border-amber-500/30 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner flex-shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black font-rajdhani text-white uppercase tracking-wider">
                  VIB EXECUTIVE COMMAND CONSOLE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                  {user?.role.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Administrator: <strong className="text-white">{user?.name}</strong> • Node: Production • Protocol v2.4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase font-rajdhani transition-all"
            >
              My User View
            </button>
            <button
              type="button"
              onClick={fetchAdminData}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync All</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Platform Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Order Fulfillment ({ordersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Ledger &amp; Financials ({transactionsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disputes')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'disputes'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Disputes &amp; Support ({ticketsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('communication')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'communication'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Communication Center</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: PLATFORM METRICS                                       */}
        {/* ============================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>TOTAL REGISTERED USERS</span>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-black font-rajdhani text-white">{metrics.totalUsers}</div>
                <div className="text-[11px] text-gray-400 font-mono">Real accounts registered in database</div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>GROSS PLATFORM REVENUE</span>
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black font-rajdhani text-emerald-400">
                  ₹{metrics.grossRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">Aggregated from verified transactions</div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>TOTAL ORDERS DELIVERED</span>
                  <CheckCircle2 className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-3xl font-black font-rajdhani text-white">
                  {metrics.completedOrders} / {metrics.totalOrders}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">Completed vs total orders placed</div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>ACTIVE ESCROW DISPUTES</span>
                  <Headphones className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-black font-rajdhani text-amber-300">{metrics.openDisputes}</div>
                <div className="text-[11px] text-gray-400 font-mono">Pending staff review &amp; evidence</div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>VERIFIED MARKETPLACE SELLERS</span>
                  <Award className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div className="text-3xl font-black font-rajdhani text-fuchsia-300">{metrics.activeSellers}</div>
                <div className="text-[11px] text-gray-400 font-mono">Accounts with seller privileges</div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>DATABASE ENGINE</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black font-rajdhani text-white">SQLite WAL</div>
                <div className="text-[11px] text-gray-400 font-mono">Node 24 native DatabaseSync</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: USER MANAGEMENT                                        */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Search & Filters Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c0d1c] border border-white/5">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAdminData(); }}
                  placeholder="Search user by name, email, riot ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="p-2 rounded-lg bg-[#141224] border border-white/10 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="seller">Seller</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 rounded-lg bg-[#141224] border border-white/10 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Riot ID</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Wallet</th>
                      <th className="p-4">Orders</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="p-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[10px] text-gray-400">{u.email}</div>
                        </td>
                        <td className="p-4 text-purple-300">{u.riot_id || 'N/A'}</td>
                        <td className="p-4">
                          {user?.role === 'superadmin' ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleUserRole(u.id, e.target.value)}
                              className="px-2 py-1 rounded bg-[#141224] border border-purple-500/30 text-purple-200 text-xs font-bold uppercase cursor-pointer"
                            >
                              <option value="user">User</option>
                              <option value="seller">Seller</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Superadmin</option>
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase text-[10px]">
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : u.status === 'suspended'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-emerald-400 font-bold">₹{(u.wallet_balance || 0).toLocaleString('en-IN')}</td>
                        <td className="p-4">{u.total_orders || 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {u.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => handleUserStatus(u.id, 'suspended')}
                                className="px-2 py-1 rounded bg-amber-900/40 hover:bg-amber-800 text-amber-200 text-[10px] font-bold uppercase"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUserStatus(u.id, 'active')}
                                className="px-2 py-1 rounded bg-emerald-900/40 hover:bg-emerald-800 text-emerald-200 text-[10px] font-bold uppercase"
                              >
                                Activate
                              </button>
                            )}

                            {u.status !== 'banned' && (
                              <button
                                type="button"
                                onClick={() => handleUserStatus(u.id, 'banned')}
                                className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-800 text-rose-200 text-[10px] font-bold uppercase"
                              >
                                Ban
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ORDER FULFILLMENT                                      */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Platform Order Operations &amp; Dispatch Desk
            </h2>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Title / Item</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {ordersList.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-white">{ord.id}</td>
                        <td className="p-4">
                          <div className="text-white">{ord.user_name}</div>
                          <div className="text-[10px] text-gray-400">{ord.user_email}</div>
                          {ord.user_riot_id && <div className="text-[10px] text-purple-300">Riot: {ord.user_riot_id}</div>}
                        </td>
                        <td className="p-4 font-bold text-purple-200">{ord.title}</td>
                        <td className="p-4 text-emerald-400 font-bold">₹{ord.amount.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-gray-400">{ord.payment_method}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            ord.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {ord.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleOrderStatus(ord.id, 'completed')}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase"
                              >
                                Mark Delivered
                              </button>
                            )}
                            {ord.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleOrderStatus(ord.id, 'cancelled')}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 font-bold text-[10px] uppercase"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: FINANCIAL TRANSACTIONS                                 */}
        {/* ============================================================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Comprehensive Financial Ledger
            </h2>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {transactionsList.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-white">{t.reference_no}</td>
                        <td className="p-4">{t.user_name} ({t.user_email})</td>
                        <td className="p-4 text-purple-300">{t.order_id || 'N/A'}</td>
                        <td className="p-4 uppercase">{t.type}</td>
                        <td className="p-4 font-bold text-emerald-400">₹{t.amount.toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 uppercase text-[10px]">
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400">{new Date(t.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: DISPUTES & SUPPORT                                     */}
        {/* ============================================================== */}
        {activeTab === 'disputes' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Escrow Disputes &amp; Support Tickets
            </h2>

            {/* Selected Ticket Reply Drawer */}
            {selectedTicket && (
              <div className="p-6 rounded-2xl bg-[#0f1026] border border-amber-500/40 space-y-4 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-bold text-lg text-white font-rajdhani">
                      Ticket #{selectedTicket.id}: {selectedTicket.subject}
                    </h3>
                    <div className="text-xs text-gray-400 font-mono">
                      Customer: {selectedTicket.user_name} ({selectedTicket.user_email})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleTicketReply} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Staff Response Text</label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      placeholder="Enter official resolution or status update for customer..."
                      required
                      className="w-full p-3 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase text-gray-400">Update Status:</span>
                      <select
                        value={ticketStatusUpdate || selectedTicket.status}
                        onChange={(e) => setTicketStatusUpdate(e.target.value)}
                        className="p-2 rounded-lg bg-[#141224] border border-white/10 text-xs text-white"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase font-rajdhani"
                      >
                        Send Resolution Reply
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Ticket</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {ticketsList.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="p-4">
                          <div className="font-bold text-white">{t.subject}</div>
                          <div className="text-[10px] text-gray-400">#{t.id}</div>
                        </td>
                        <td className="p-4">{t.user_name} ({t.user_email})</td>
                        <td className="p-4 uppercase">{t.category}</td>
                        <td className="p-4 uppercase">{t.priority}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase text-[10px]">
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(t)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600/40 hover:bg-amber-600 text-amber-200 hover:text-white font-bold text-xs uppercase font-rajdhani"
                          >
                            Review &amp; Reply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: COMMUNICATION CENTER                                   */}
        {/* ============================================================== */}
        {activeTab === 'communication' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-6 animate-in fade-in max-w-3xl">
            <div>
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Communication Center &amp; Broadcast Dispatcher
              </h2>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Broadcast official platform announcements, maintenance notices, and security alerts directly to member notifications.
              </p>
            </div>

            {announceResult && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{announceResult}</span>
              </div>
            )}

            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Announcement Title *</label>
                <input
                  type="text"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="e.g. Scheduled VP Gateway Maintenance Notice"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Target Audience Segment</label>
                <select
                  value={announceTarget}
                  onChange={(e) => setAnnounceTarget(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Active Users</option>
                  <option value="buyers">Buyers &amp; Customers</option>
                  <option value="sellers">Verified Sellers Only</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Notification Content *</label>
                <textarea
                  value={announceMessage}
                  onChange={(e) => setAnnounceMessage(e.target.value)}
                  rows={4}
                  placeholder="Enter message details that will appear in user dashboard notification centers..."
                  required
                  className="w-full p-3 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-xs uppercase font-rajdhani tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Announcement Now</span>
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: AUDIT LOGS                                             */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Immutable Platform Security &amp; Administrative Audit Trail
            </h2>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Action</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Target Type</th>
                      <th className="p-4">Target ID</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-amber-300">{log.action}</td>
                        <td className="p-4">{log.actor_name}</td>
                        <td className="p-4 uppercase text-gray-400">{log.target_type}</td>
                        <td className="p-4 text-purple-300">{log.target_id || 'N/A'}</td>
                        <td className="p-4 text-gray-400">{log.ip_address}</td>
                        <td className="p-4 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

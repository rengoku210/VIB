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
  FileText,
  Printer,
  Plus,
  X,
  Briefcase,
  Mail,
  Flag,
  DollarSign,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

type AdminTab =
  | 'metrics'
  | 'users'
  | 'orders'
  | 'transactions'
  | 'invoices'
  | 'finance'
  | 'tasks'
  | 'disputes'
  | 'communication'
  | 'audit';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, token, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');

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
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [financeOverview, setFinanceOverview] = useState<any | null>(null);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [taskDeptFilter, setTaskDeptFilter] = useState('all');

  // Announcement state
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceTarget, setAnnounceTarget] = useState('all');
  const [announceResult, setAnnounceResult] = useState<string | null>(null);

  // Dispute reply state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [ticketStatusUpdate, setTicketStatusUpdate] = useState('');

  // Modals state
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);
  const [selectedInvoiceView, setSelectedInvoiceView] = useState<any | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedUserCRM, setSelectedUserCRM] = useState<any | null>(null);
  const [newCRMNote, setNewCRMNote] = useState('');
  const [crmNoteSubmitting, setCrmNoteSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Manual Invoice Form State
  const [invCustName, setInvCustName] = useState('');
  const [invCustEmail, setInvCustEmail] = useState('');
  const [invCustPhone, setInvCustPhone] = useState('');
  const [invAddress, setInvAddress] = useState('India');
  const [invProduct, setInvProduct] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invQty, setInvQty] = useState(1);
  const [invPrice, setInvPrice] = useState(0);
  const [invFee, setInvFee] = useState(0);
  const [invTax, setInvTax] = useState(18);
  const [invMethod, setInvMethod] = useState('Manual UPI / Bank Transfer');
  const [invSubmitting, setInvSubmitting] = useState(false);

  // Expense Form State
  const [expCategory, setExpCategory] = useState('server_hosting');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expMethod, setExpMethod] = useState('Corporate Credit Card');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDept, setTaskDept] = useState('support');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskAssignee, setTaskAssignee] = useState('');

  // Fetch admin data
  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, ordRes, txnRes, invRes, finRes, expRes, tskRes, tktRes, tplRes, audRes] =
        await Promise.all([
          fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&role=${roleFilter}&status=${statusFilter}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/invoices', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/finance/overview', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/finance/expenses', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/tasks', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/communication/templates', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setMetrics(d.metrics || d);
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
      if (invRes.ok) {
        const d = await invRes.json();
        setInvoicesList(d.invoices || []);
      }
      if (finRes.ok) {
        const d = await finRes.json();
        setFinanceOverview(d.financeOverview);
      }
      if (expRes.ok) {
        const d = await expRes.json();
        setExpensesList(d.expenses || []);
      }
      if (tskRes.ok) {
        const d = await tskRes.json();
        setTasksList(d.tasks || []);
      }
      if (tktRes.ok) {
        const d = await tktRes.json();
        setTicketsList(d.tickets || []);
      }
      if (tplRes.ok) {
        const d = await tplRes.json();
        setTemplatesList(d.templates || []);
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
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Open User CRM Modal
  const handleOpenUserCRM = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/crm`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setSelectedUserCRM(d.crmProfile);
      }
    } catch (err) {
      console.error('Failed to load CRM profile:', err);
    }
  };

  // Add CRM Staff Note
  const handleAddCRMNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserCRM || !newCRMNote.trim() || !token) return;
    setCrmNoteSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserCRM.id}/crm/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: newCRMNote.trim(), riskLevel: selectedUserCRM.riskLevel || 'low' }),
      });
      if (res.ok) {
        setNewCRMNote('');
        handleOpenUserCRM(selectedUserCRM.id);
      }
    } catch (err) {
      console.error('Failed to add CRM note:', err);
    } finally {
      setCrmNoteSubmitting(false);
    }
  };

  // Create Manual Invoice
  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invCustName || !invCustEmail || !invProduct || !token) return;
    setInvSubmitting(true);
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: invCustName,
          customerEmail: invCustEmail,
          customerPhone: invCustPhone,
          billingAddress: invAddress,
          productName: invProduct,
          description: invDesc,
          quantity: invQty,
          unitPrice: invPrice,
          platformFee: invFee,
          taxPercent: invTax,
          paymentMethod: invMethod,
        }),
      });
      if (res.ok) {
        setShowManualInvoiceModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to create manual invoice:', err);
    } finally {
      setInvSubmitting(false);
    }
  };

  // Record Operating Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCategory || !expDesc || !expAmount || !token) return;
    try {
      const res = await fetch('/api/admin/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: expCategory,
          description: expDesc,
          amount: expAmount,
          paymentMethod: expMethod,
        }),
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setExpDesc('');
        setExpAmount(0);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to record expense:', err);
    }
  };

  // Create Staff Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDept || !token) return;
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          department: taskDept,
          priority: taskPriority,
          assignedTo: taskAssignee,
        }),
      });
      if (res.ok) {
        setShowCreateTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Update Order Status
  const handleOrderStatus = async (orderId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, note: `Admin updated status to ${status}.` }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  // Send Broadcast Announcement
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
      if (res.ok) {
        const d = await res.json();
        setAnnounceResult(`Success! Dispatched notification to ${d.recipientCount} active accounts.`);
        setAnnounceTitle('');
        setAnnounceMessage('');
      }
    } catch (err) {
      console.error('Failed to broadcast:', err);
    }
  };

  // Dispute Desk Reply
  const handleReplyDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText || !token) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          replyText,
          status: ticketStatusUpdate || selectedTicket.status,
        }),
      });
      if (res.ok) {
        setSelectedTicket(null);
        setReplyText('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to reply dispute:', err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#170e2b] via-[#100d24] to-[#0a0a14] border border-amber-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black font-rajdhani text-white uppercase tracking-wider">
                  VIB Platform Superadmin Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Full-stack executive control, financial audits, task management, and anti-fraud monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Back To Storefront</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={fetchAdminData}
              className="p-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-200 cursor-pointer"
              title="Refresh All Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 border-b border-white/10 overflow-x-auto no-scrollbar pb-1 mt-6">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'metrics'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Platform Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users &amp; CRM ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders ({ordersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoices &amp; Billing ({invoicesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'finance'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Financial Control</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Staff Tasks ({tasksList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disputes')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'disputes'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Disputes ({ticketsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('communication')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'communication'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Communication Center</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: METRICS DASHBOARD                                       */}
        {/* ============================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                <div className="text-[10px] font-mono uppercase text-gray-400">Total Users</div>
                <div className="text-xl font-black font-rajdhani text-white mt-1">{metrics.totalUsers}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                <div className="text-[10px] font-mono uppercase text-gray-400">Total Orders</div>
                <div className="text-xl font-black font-rajdhani text-purple-300 mt-1">{metrics.totalOrders}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                <div className="text-[10px] font-mono uppercase text-gray-400">Completed Orders</div>
                <div className="text-xl font-black font-rajdhani text-emerald-400 mt-1">{metrics.completedOrders}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                <div className="text-[10px] font-mono uppercase text-gray-400">Gross Volume</div>
                <div className="text-xl font-black font-rajdhani text-amber-400 mt-1">
                  ₹{Number(metrics.grossRevenue || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                <div className="text-[10px] font-mono uppercase text-gray-400">Active Sellers</div>
                <div className="text-xl font-black font-rajdhani text-indigo-300 mt-1">{metrics.activeSellers}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                <div className="text-[10px] font-mono uppercase text-gray-400">Open Disputes</div>
                <div className="text-xl font-black font-rajdhani text-rose-400 mt-1">{metrics.openDisputes}</div>
              </div>
            </div>

            {/* Quick Status Strip */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-3">
              <h3 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-white">
                Platform Security &amp; Compliance Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-gray-300">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>scrypt Passwords &amp; WAL DB: <strong className="text-white">Active</strong></span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Chat Anti-Fraud Filter: <strong className="text-white">Active</strong></span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>GST Invoice Generator: <strong className="text-white">18% Standard</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: USERS MANAGEMENT & CRM INSPECTION                       */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                User Registry &amp; CRM Inspection ({usersList.length})
              </h2>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search name, email, riot id..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-48 sm:w-64"
                />
                <button
                  type="button"
                  onClick={fetchAdminData}
                  className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Riot ID</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Orders</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white font-sans">{u.name}</div>
                          <div className="text-[11px] text-gray-400">{u.email}</div>
                        </td>
                        <td className="p-4 text-purple-300 font-bold">{u.riot_id || 'N/A'}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase text-[10px]">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">{u.total_orders || 0}</td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenUserCRM(u.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                          >
                            CRM Notes
                          </button>
                          {u.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => handleUserStatus(u.id, 'suspended')}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUserStatus(u.id, 'active')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
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
        {/* TAB 3: ORDERS MANAGEMENT & FULFILLMENT                         */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Order Fulfillment Console ({ordersList.length})
            </h2>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Product / Particulars</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Fulfillment Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {ordersList.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-purple-300">#{ord.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-white font-sans">{ord.user_name}</div>
                          <div className="text-[10px] text-gray-400">{ord.user_email}</div>
                        </td>
                        <td className="p-4 font-sans font-semibold text-white">{ord.title}</td>
                        <td className="p-4 font-bold text-emerald-400">₹{ord.amount.toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            ord.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {ord.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleOrderStatus(ord.id, 'completed')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] font-rajdhani uppercase cursor-pointer"
                            >
                              Mark Delivered
                            </button>
                          )}
                          {ord.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleOrderStatus(ord.id, 'cancelled')}
                              className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 font-bold text-[10px] font-rajdhani uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
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
        {/* TAB 4: INVOICES & MANUAL BILLING (NEW REQUIREMENT)             */}
        {/* ============================================================== */}
        {activeTab === 'invoices' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                  Invoice &amp; Billing Management ({invoicesList.length})
                </h2>
                <p className="text-xs text-gray-400">
                  Universal invoice registry supporting automatic order billing and manual commercial invoices.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualInvoiceModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Manual Invoice</span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Invoice No.</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Product / Particulars</th>
                      <th className="p-4">Subtotal</th>
                      <th className="p-4">GST (18%)</th>
                      <th className="p-4">Final Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {invoicesList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-purple-300">{inv.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-white font-sans">{inv.customer_name}</div>
                          <div className="text-[10px] text-gray-400">{inv.customer_email}</div>
                        </td>
                        <td className="p-4 font-sans font-semibold text-white max-w-xs truncate">{inv.product_name}</td>
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
                            onClick={() => setSelectedInvoiceView(inv)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                          >
                            View
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
        {/* TAB 5: FINANCIAL CONTROL CENTER & EXPENSES (NEW REQUIREMENT)    */}
        {/* ============================================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                  Financial Control Center
                </h2>
                <p className="text-xs text-gray-400">
                  Comprehensive platform revenue, commission settlements, operational expenses, and tax ledgers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Record Operational Expense</span>
              </button>
            </div>

            {/* Financial Overview Cards */}
            {financeOverview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                  <div className="text-[10px] font-mono uppercase text-gray-400">Gross Buyer Volume</div>
                  <div className="text-xl font-black font-rajdhani text-white mt-1">
                    ₹{Number(financeOverview.grossBuyerPaid).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                  <div className="text-[10px] font-mono uppercase text-gray-400">Platform Commissions (10%)</div>
                  <div className="text-xl font-black font-rajdhani text-purple-300 mt-1">
                    ₹{Number(financeOverview.platformCommissions).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                  <div className="text-[10px] font-mono uppercase text-gray-400">GST / Tax Collected (18%)</div>
                  <div className="text-xl font-black font-rajdhani text-amber-300 mt-1">
                    ₹{Number(financeOverview.totalTaxCollected).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5">
                  <div className="text-[10px] font-mono uppercase text-gray-400">Total Operating Expenses</div>
                  <div className="text-xl font-black font-rajdhani text-rose-400 mt-1">
                    ₹{Number(financeOverview.totalExpenses).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Operating Expenses Table */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-3">
              <h3 className="text-base font-bold font-rajdhani uppercase text-white tracking-wider">
                Operational Expenses Ledger ({expensesList.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Logged By</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {expensesList.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white">{exp.reference_no}</td>
                        <td className="p-3 uppercase text-purple-300">{exp.category}</td>
                        <td className="p-3 font-sans text-gray-200">{exp.description}</td>
                        <td className="p-3 font-bold text-rose-400">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                        <td className="p-3">{exp.payment_method}</td>
                        <td className="p-3 text-gray-400">{exp.recorded_by}</td>
                        <td className="p-3 text-gray-400">{new Date(exp.expense_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: STAFF TASK MANAGEMENT (NEW REQUIREMENT)                 */}
        {/* ============================================================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                  Employee Task Assignment &amp; Management ({tasksList.length})
                </h2>
                <p className="text-xs text-gray-400">
                  Assign tasks across Support, Finance, Moderation, and Verification departments with accountability.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateTaskModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Staff Task</span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Task</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Assigned To</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {tasksList.map((tsk) => (
                      <tr key={tsk.id} className="hover:bg-white/[0.02]">
                        <td className="p-4">
                          <div className="font-bold text-white font-sans">{tsk.title}</div>
                          <div className="text-[11px] text-gray-400 font-sans">{tsk.description}</div>
                        </td>
                        <td className="p-4 uppercase text-purple-300 font-bold">{tsk.department}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            tsk.priority === 'high' || tsk.priority === 'urgent'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : 'bg-white/5 text-gray-300'
                          }`}>
                            {tsk.priority}
                          </span>
                        </td>
                        <td className="p-4 text-gray-200">{tsk.assigned_to || 'Unassigned'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            tsk.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}>
                            {tsk.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {tsk.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(tsk.id, 'completed')}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {tsk.status !== 'in_progress' && tsk.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(tsk.id, 'in_progress')}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                            >
                              In Progress
                            </button>
                          )}
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
        {/* TAB 7: DISPUTES & SUPPORT DESK                                 */}
        {/* ============================================================== */}
        {activeTab === 'disputes' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Dispute Resolution &amp; Escrow Support ({ticketsList.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {ticketsList.map((tkt) => (
                  <div
                    key={tkt.id}
                    onClick={() => {
                      setSelectedTicket(tkt);
                      setTicketStatusUpdate(tkt.status);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedTicket?.id === tkt.id
                        ? 'bg-purple-950/40 border-purple-500 shadow-lg'
                        : 'bg-[#0c0d1c] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-rajdhani text-base">{tkt.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        tkt.status === 'open'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {tkt.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-1">
                      From: {tkt.user_name} ({tkt.user_email}) • #{tkt.id}
                    </div>
                  </div>
                ))}
              </div>

              {/* Dispute Reply Panel */}
              {selectedTicket ? (
                <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="font-bold text-white text-base font-rajdhani">{selectedTicket.subject}</h3>
                      <div className="text-xs text-gray-400 font-mono">Customer: {selectedTicket.user_name}</div>
                    </div>
                    <select
                      value={ticketStatusUpdate}
                      onChange={(e) => setTicketStatusUpdate(e.target.value)}
                      className="p-1.5 rounded-lg bg-[#141224] border border-white/10 text-white text-xs"
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {JSON.parse(selectedTicket.messages_json || '[]').map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs ${
                          m.sender === 'user' ? 'bg-white/5 border border-white/10' : 'bg-purple-950/40 border border-purple-500/30'
                        }`}
                      >
                        <div className="flex justify-between font-mono text-[10px] text-gray-400 mb-1">
                          <strong>{m.senderName}</strong>
                          <span>{new Date(m.time).toLocaleTimeString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleReplyDispute} className="space-y-3 pt-2 border-t border-white/10">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type executive support reply..."
                      rows={3}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer"
                    >
                      Send Staff Response
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/5 text-gray-500 text-xs">
                  Select a dispute ticket from the left to view messages and respond.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: COMMUNICATION CENTER & EMAIL TEMPLATES                  */}
        {/* ============================================================== */}
        {activeTab === 'communication' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Platform Communication Center
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Broadcast Announcement Form */}
              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-4">
                <h3 className="text-base font-bold font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4 text-purple-400" />
                  <span>Dispatch Platform Announcement</span>
                </h3>

                {announceResult && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{announceResult}</span>
                  </div>
                )}

                <form onSubmit={handleSendAnnouncement} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Announcement Title</label>
                    <input
                      type="text"
                      value={announceTitle}
                      onChange={(e) => setAnnounceTitle(e.target.value)}
                      placeholder="e.g. Regional Server Maintenance"
                      required
                      className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Target Audience</label>
                    <select
                      value={announceTarget}
                      onChange={(e) => setAnnounceTarget(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Active Users &amp; Registered Accounts</option>
                      <option value="sellers">Verified Sellers Only</option>
                      <option value="buyers">Active Buyers Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Message</label>
                    <textarea
                      value={announceMessage}
                      onChange={(e) => setAnnounceMessage(e.target.value)}
                      placeholder="Enter announcement text to dispatch to user feeds..."
                      rows={4}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                  >
                    Broadcast Announcement
                  </button>
                </form>
              </div>

              {/* Saved Email Templates */}
              <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/5 space-y-4">
                <h3 className="text-base font-bold font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span>Platform Email Templates ({templatesList.length})</span>
                </h3>

                <div className="space-y-3">
                  {templatesList.map((tpl) => (
                    <div key={tpl.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs font-sans">{tpl.name}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono uppercase">
                          {tpl.category}
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 font-mono">Subject: {tpl.subject}</div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{tpl.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 9: AUDIT LOGS                                              */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Immutable Security Audit Trail ({auditLogs.length})
            </h2>

            <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Target Type</th>
                      <th className="p-4">Target ID</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-4 font-bold text-white">{log.actor_name}</td>
                        <td className="p-4 font-bold text-purple-300">{log.action}</td>
                        <td className="p-4 uppercase">{log.target_type}</td>
                        <td className="p-4 text-gray-400">{log.target_id || 'N/A'}</td>
                        <td className="p-4 text-gray-400">{log.ip_address || '127.0.0.1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: CUSTOMER CRM PROFILE & STAFF NOTES                     */}
      {/* ============================================================== */}
      {selectedUserCRM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-modal-title"
            className="relative w-full max-w-2xl rounded-3xl bg-[#0c0d1c] border border-indigo-500/40 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="crm-modal-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                    Customer CRM Profile: {selectedUserCRM.name}
                  </h3>
                  <div className="text-xs text-gray-400 font-mono">{selectedUserCRM.email} • #{selectedUserCRM.id}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserCRM(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-gray-400 uppercase">Lifetime Spent</div>
                <div className="text-base font-bold text-emerald-400 font-rajdhani">
                  ₹{Number(selectedUserCRM.totalSpent || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-gray-400 uppercase">Total Orders</div>
                <div className="text-base font-bold text-white font-rajdhani">
                  {selectedUserCRM.total_orders || 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-gray-400 uppercase">Dispute Count</div>
                <div className="text-base font-bold text-rose-400 font-rajdhani">
                  {selectedUserCRM.disputeCount || 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-gray-400 uppercase">Risk Level</div>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  selectedUserCRM.riskLevel === 'high' || selectedUserCRM.riskLevel === 'critical'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedUserCRM.riskLevel}
                </span>
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase font-bold text-gray-300 tracking-wider">
                Internal Staff Notes (Hidden From Customer)
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedUserCRM.notes?.length === 0 ? (
                  <div className="text-xs text-gray-500 py-3">No staff notes attached to this profile.</div>
                ) : (
                  selectedUserCRM.notes?.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                      <div className="flex justify-between font-mono text-[10px] text-gray-400 mb-1">
                        <strong>{n.staff_name}</strong>
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-200">{n.note}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddCRMNote} className="space-y-2 pt-2 border-t border-white/10">
                <textarea
                  value={newCRMNote}
                  onChange={(e) => setNewCRMNote(e.target.value)}
                  placeholder="Record an internal operational note regarding this customer..."
                  rows={2}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={crmNoteSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                >
                  {crmNoteSubmitting ? 'Saving Note...' : 'Save Staff Note'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE MANUAL INVOICE (REQUIREMENTS CLAUSE 25 & 19963)  */}
      {/* ============================================================== */}
      {showManualInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-inv-title"
            className="relative w-full max-w-2xl rounded-3xl bg-[#0c0d1c] border border-purple-500/40 p-6 sm:p-8 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 id="manual-inv-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                Create Commercial Manual Invoice
              </h3>
              <button
                type="button"
                onClick={() => setShowManualInvoiceModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Customer Name *</label>
                  <input
                    type="text"
                    value={invCustName}
                    onChange={(e) => setInvCustName(e.target.value)}
                    required
                    placeholder="Full name"
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Customer Email *</label>
                  <input
                    type="email"
                    value={invCustEmail}
                    onChange={(e) => setInvCustEmail(e.target.value)}
                    required
                    placeholder="name@domain.com"
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Phone</label>
                  <input
                    type="text"
                    value={invCustPhone}
                    onChange={(e) => setInvCustPhone(e.target.value)}
                    placeholder="+91 ..."
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Billing Address</label>
                  <input
                    type="text"
                    value={invAddress}
                    onChange={(e) => setInvAddress(e.target.value)}
                    placeholder="State, Country"
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Product / Service Name *</label>
                <input
                  type="text"
                  value={invProduct}
                  onChange={(e) => setInvProduct(e.target.value)}
                  required
                  placeholder="e.g. 11,000 VP Top-Up Bundle"
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Unit Price (₹) *</label>
                  <input
                    type="number"
                    value={invPrice}
                    onChange={(e) => setInvPrice(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Quantity</label>
                  <input
                    type="number"
                    value={invQty}
                    onChange={(e) => setInvQty(Number(e.target.value))}
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">GST Rate (%)</label>
                  <input
                    type="number"
                    value={invTax}
                    onChange={(e) => setInvTax(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowManualInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invSubmitting}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                >
                  {invSubmitting ? 'Generating...' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECORD OPERATING EXPENSE                                */}
      {/* ============================================================== */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
            className="relative w-full max-w-lg rounded-2xl bg-[#0c0d1c] border border-amber-500/30 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 id="expense-modal-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                Record Operating Expense
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Expense Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="server_hosting">Server Hosting &amp; Cloud Infrastructure</option>
                  <option value="payment_gateway_fee">Payment Gateway &amp; Banking Surcharges</option>
                  <option value="api_cost">Game API &amp; Valorant Data Feeds</option>
                  <option value="staff_payroll">Staff Moderation &amp; Escrow Payroll</option>
                  <option value="marketing">Advertising &amp; Creator Sponsorships</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Description *</label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. AWS Singapore monthly hosting invoice"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Amount (₹) *</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Payment Method</label>
                  <input
                    type="text"
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                >
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE STAFF TASK                                       */}
      {/* ============================================================== */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="relative w-full max-w-lg rounded-2xl bg-[#0c0d1c] border border-purple-500/30 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 id="task-modal-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                Create Employee Task
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Task Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Review seller KYC submission #KYC-4091"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Department</label>
                  <select
                    value={taskDept}
                    onChange={(e) => setTaskDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="support">Customer Support</option>
                    <option value="finance">Finance &amp; Settlements</option>
                    <option value="moderation">Listing Moderation</option>
                    <option value="verification">KYC &amp; Verification</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Assigned Employee</label>
                <input
                  type="text"
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  placeholder="Staff name / ID"
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">Description / Notes</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW TAX INVOICE                                        */}
      {/* ============================================================== */}
      {selectedInvoiceView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-inv-title"
            className="relative w-full max-w-2xl rounded-3xl bg-[#0e0f1a] border border-purple-500/40 p-6 sm:p-8 shadow-2xl text-white space-y-6 my-8"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 print:hidden">
              <span className="font-rajdhani font-black text-sm uppercase tracking-wider text-purple-300">
                Official Commercial Invoice: {selectedInvoiceView.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceView(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex justify-between items-start">
                <div>
                  <h3 id="admin-inv-title" className="text-xl font-bold font-rajdhani text-white">VIB DIGITAL SERVICES</h3>
                  <div className="text-gray-400">GSTIN: 29AAECV1092F1Z8</div>
                  <div className="text-gray-400">Bangalore, Karnataka, India</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-purple-300">{selectedInvoiceView.id}</div>
                  <div className="text-gray-400">Date: {new Date(selectedInvoiceView.invoice_date).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">Customer:</div>
                  <div className="font-bold text-white">{selectedInvoiceView.customer_name}</div>
                  <div className="text-gray-300">{selectedInvoiceView.customer_email}</div>
                </div>
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">Payment Reference:</div>
                  <div className="font-bold text-purple-300">{selectedInvoiceView.payment_reference || 'N/A'}</div>
                  <div className="text-gray-300">{selectedInvoiceView.payment_method}</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="p-3">Product / Service</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Taxable Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-200">
                    <tr>
                      <td className="p-3 font-sans font-bold text-white">{selectedInvoiceView.product_name}</td>
                      <td className="p-3 text-center">1</td>
                      <td className="p-3 text-right">₹{Number(selectedInvoiceView.subtotal).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between text-gray-400">
                    <span>Taxable Subtotal:</span>
                    <span>₹{Number(selectedInvoiceView.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>GST (18%):</span>
                    <span>₹{Number(selectedInvoiceView.tax_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-white/15 flex justify-between font-bold text-base text-emerald-400 font-rajdhani">
                    <span>Final Total:</span>
                    <span>₹{Number(selectedInvoiceView.final_total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

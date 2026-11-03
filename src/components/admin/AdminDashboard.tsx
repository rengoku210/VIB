import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Award,
  Zap,
  FileText,
  Printer,
  Download,
  BellRing,
  Plus,
  X,
  Briefcase,
  Mail,
  Flag,
  DollarSign,
  Eye,
  Globe,
  QrCode,
  Image as ImageIcon,
  Check,
  Loader2,
  Phone,
  ExternalLink,
  MessageSquare,
  Copy,
  Gavel,
  Key,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminPaymentSettings } from './AdminPaymentSettings';
import { AdminIndianVPInventory } from './AdminIndianVPInventory';
import { AdminRegionalOrders } from './AdminRegionalOrders';
import { AdminListingsModeration } from './AdminListingsModeration';
import { AdminCreateListingSection } from './AdminCreateListingSection';
import { AdminEmailLogs } from './AdminEmailLogs';
import { AdminAuctionsManagement } from './AdminAuctionsManagement';
import { AdminRentalsManagement } from './AdminRentalsManagement';
import { AdminLegalManagement } from './AdminLegalManagement';
import { AdminStaffManagement } from './AdminStaffManagement';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

type AdminTab =
  | 'metrics'
  | 'payment_verification'
  | 'auctions'
  | 'rentals'
  | 'legal'
  | 'add_listing'
  | 'indian_vp'
  | 'regional_orders'
  | 'listings_review'
  | 'email_logs'
  | 'users'
  | 'orders'
  | 'transactions'
  | 'invoices'
  | 'finance'
  | 'tasks'
  | 'disputes'
  | 'communication'
  | 'staff'
  | 'audit';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, token, logout, isAdmin, isStaff } = useAuth();
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
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);

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
  const [announceError, setAnnounceError] = useState<string | null>(null);
  const [announceSubmitting, setAnnounceSubmitting] = useState(false);

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

  // Orders filter & payment verification modal state
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'verification_needed' | 'verified' | 'completed' | 'cancelled'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrderVerify, setSelectedOrderVerify] = useState<any | null>(null);
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [zoomScreenshot, setZoomScreenshot] = useState<string | null>(null);
  const [zoomImgFailed, setZoomImgFailed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Dedicated Admin Order Room & Live Chat Modal
  const [adminOrderRoom, setAdminOrderRoom] = useState<any | null>(null);
  const [adminOrderMessages, setAdminOrderMessages] = useState<any[]>([]);
  const [adminRoomLoading, setAdminRoomLoading] = useState(false);
  const [adminMessageDraft, setAdminMessageDraft] = useState('');
  const [adminSendingMessage, setAdminSendingMessage] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isIssuingCode, setIsIssuingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [codeActionFeedback, setCodeActionFeedback] = useState<string | null>(null);

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

  // Tab Slider Track & Mouse Drag States
  const tabsTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const checkTabScrollBounds = () => {
    if (tabsTrackRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsTrackRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  };

  useEffect(() => {
    const el = tabsTrackRef.current;
    if (!el) return;
    checkTabScrollBounds();
    el.addEventListener('scroll', checkTabScrollBounds, { passive: true });
    window.addEventListener('resize', checkTabScrollBounds);
    return () => {
      el.removeEventListener('scroll', checkTabScrollBounds);
      window.removeEventListener('resize', checkTabScrollBounds);
    };
  }, []);

  const slideTabs = (direction: 'left' | 'right') => {
    if (tabsTrackRef.current) {
      const scrollAmount = 320;
      tabsTrackRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkTabScrollBounds, 350);
    }
  };

  const handleSelectTab = (tabId: AdminTab, e?: React.MouseEvent) => {
    setActiveTab(tabId);
    if (e?.currentTarget) {
      (e.currentTarget as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  const onTabsMouseDown = (e: React.MouseEvent) => {
    if (!tabsTrackRef.current) return;
    setIsDraggingTabs(true);
    setDragStartX(e.pageX - tabsTrackRef.current.offsetLeft);
    setDragScrollLeft(tabsTrackRef.current.scrollLeft);
  };

  const onTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabs || !tabsTrackRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsTrackRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    tabsTrackRef.current.scrollLeft = dragScrollLeft - walk;
    checkTabScrollBounds();
  };

  const onTabsMouseUp = () => {
    setIsDraggingTabs(false);
  };

  // Fetch admin data with role-based least privilege enforcement
  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Staff-accessible endpoints (allowed for moderator, admin, superadmin)
      const [statsRes, ordRes, tskRes, tktRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setMetrics(d.metrics || d);
      }
      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrdersList(d.orders || []);
        setOrdersLoadError(null);
      } else {
        setOrdersLoadError(`Order feed unavailable (HTTP ${ordRes.status}). Refresh to retry.`);
      }
      if (tskRes.ok) {
        const d = await tskRes.json();
        setTasksList(d.tasks || []);
      }
      if (tktRes.ok) {
        const d = await tktRes.json();
        setTicketsList(d.tickets || []);
      }

      // 2. Admin platform data
      const [usersRes, txnRes, invRes, finRes, expRes, tplRes, audRes] = await Promise.all([
        fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&role=${roleFilter}&status=${statusFilter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/finance/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/finance/expenses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/communication/templates', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsersList(d.users || []);
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

  useEffect(() => {
    if (!token || activeTab !== 'orders') return;

    let active = true;
    const refreshOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) {
          setOrdersList(data.orders || []);
          setOrdersLoadError(null);
        }
      } catch (err) {
        if (active) {
          setOrdersLoadError('Order feed could not be refreshed. Check the server connection and retry.');
          console.error('Failed to refresh admin orders:', err);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshOrders();
    };
    const intervalId = window.setInterval(refreshWhenVisible, 15_000);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [token, activeTab]);

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

  // Confirm or Reject Payment Verification
  const handleConfirmPaymentVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedOrderVerify) return;
    setIsSubmittingVerify(true);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderVerify.id}/verify-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: verifyAction,
          notes: verifyNotes.trim() || undefined,
          reason: verifyAction === 'reject' ? (rejectionReason.trim() || 'Payment UTR verification failed') : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || (verifyAction === 'approve' ? 'Payment verified successfully!' : 'Payment rejected.'));
        setSelectedOrderVerify(null);
        setVerifyNotes('');
        setRejectionReason('');
        fetchAdminData();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to update payment verification.');
      }
    } catch {
      alert('Network error while processing verification.');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // Send Broadcast Announcement
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !token) return;
    setTemplateSaveError(null);
    try {
      const res = await fetch(`/api/admin/communication/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: editingTemplate.subject, body: editingTemplate.body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTemplateSaveError(data.error || 'Could not save this email template.');
        return;
      }
      setTemplatesList((current) => current.map((template) =>
        template.id === data.template.id ? { ...template, ...data.template } : template
      ));
      setEditingTemplate(null);
    } catch {
      setTemplateSaveError('Network error while saving this email template.');
    }
  };

  // Send Broadcast Announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceMessage || !token) return;
    setAnnounceResult(null);
    setAnnounceError(null);
    setAnnounceSubmitting(true);
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
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnnounceError(d.error || `Announcement was not sent (HTTP ${res.status}).`);
        return;
      }
      setAnnounceResult(`Success! Dispatched notification to ${d.recipientCount} active accounts.`);
      setAnnounceTitle('');
      setAnnounceMessage('');
    } catch {
      setAnnounceError('Network error while dispatching the announcement.');
    } finally {
      setAnnounceSubmitting(false);
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

  // Open dedicated Admin Order Room & Live Chat
  const handleOpenAdminOrderRoom = async (orderId: string) => {
    if (!token) return;
    setAdminRoomLoading(true);
    setCodeActionFeedback(null);
    setManualCodeInput('');
    try {
      const res = await fetch(`/api/orders/${orderId}/room`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setAdminOrderRoom(d.orderRoom);
        setAdminOrderMessages(d.orderRoom.messages || []);
      }
    } catch (err) {
      console.error('Failed to load order room:', err);
    } finally {
      setAdminRoomLoading(false);
    }
  };

  // Live polling for new messages when Order Room is open
  useEffect(() => {
    if (!adminOrderRoom?.orderId || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${adminOrderRoom.orderId}/room`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setAdminOrderMessages(d.orderRoom.messages || []);
        }
      } catch {}
    }, 3500);
    return () => clearInterval(interval);
  }, [adminOrderRoom?.orderId, token]);

  // Send message in Order Room as Admin / Official Support
  const handleSendAdminOrderMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMessageDraft.trim() || !adminOrderRoom || !token) return;
    setAdminSendingMessage(true);
    try {
      const res = await fetch(`/api/orders/${adminOrderRoom.orderId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: adminMessageDraft.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setAdminOrderMessages((prev) => [
          ...prev,
          {
            id: d.messageId,
            sender_id: user?.id,
            sender_name: user?.name ? `${user.name} (VIB Support)` : 'VIB Support Desk',
            sender_role: 'admin',
            message: adminMessageDraft.trim(),
            created_at: new Date().toISOString(),
          },
        ]);
        setAdminMessageDraft('');
      }
    } catch (err) {
      console.error('Failed to post order message:', err);
    } finally {
      setAdminSendingMessage(false);
    }
  };

  // Issue VP Code and dispatch email from Order Room
  const handleAdminIssueCode = async () => {
    if (!manualCodeInput.trim() || !adminOrderRoom || !token) return;
    setIsIssuingCode(true);
    setCodeActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${adminOrderRoom.orderId}/issue-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: manualCodeInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodeActionFeedback('VP Code issued and dispatched to customer email!');
        setAdminOrderRoom((prev: any) => ({ ...prev, issuedCode: data.code, status: 'completed' }));
        setManualCodeInput('');
        fetchAdminData();
      } else {
        setCodeActionFeedback(data.error || 'Failed to issue VP code.');
      }
    } catch {
      setCodeActionFeedback('Network error while issuing code.');
    } finally {
      setIsIssuingCode(false);
    }
  };

  // Re-send VP Code email
  const handleAdminResendCodeEmail = async () => {
    if (!adminOrderRoom || !token) return;
    setIsResendingCode(true);
    setCodeActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${adminOrderRoom.orderId}/resend-code-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setCodeActionFeedback('VP code email successfully re-sent to customer!');
      } else {
        setCodeActionFeedback(data.error || 'Failed to re-send email.');
      }
    } catch {
      setCodeActionFeedback('Network error while re-sending email.');
    } finally {
      setIsResendingCode(false);
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
                  VIB Platform Admin Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                  {user?.role || 'Admin'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Order operations, financial controls, task management, and platform oversight.
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

        {/* Navigation Tabs Option Slider */}
        <div className="relative mt-6 select-none group">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => slideTabs('left')}
            disabled={!canScrollLeft}
            aria-label="Slide options left"
            className={`absolute -left-1 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#121426] border border-amber-500/30 text-amber-300 flex items-center justify-center shadow-xl transition-all ${
              canScrollLeft
                ? 'opacity-100 hover:scale-110 hover:border-amber-400 hover:bg-amber-950/90 cursor-pointer'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Left Gradient Edge Mask */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#070814] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Horizontal Scrollable / Draggable Track */}
          <div
            ref={tabsTrackRef}
            onMouseDown={onTabsMouseDown}
            onMouseMove={onTabsMouseMove}
            onMouseUp={onTabsMouseUp}
            onMouseLeave={onTabsMouseUp}
            className="flex items-center gap-1.5 border-b border-white/10 overflow-x-auto no-scrollbar pb-1.5 px-3 scroll-smooth cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              type="button"
              onClick={(e) => handleSelectTab('metrics', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
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
              onClick={(e) => handleSelectTab('payment_verification', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'payment_verification'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Payment Verifications &amp; QR</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('auctions', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'auctions'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>Auctions Marketplace</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('rentals', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'rentals'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Rentals &amp; Vault</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('legal', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'legal'
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Legal &amp; DPDPA</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('indian_vp', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'indian_vp'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Indian VP Vault</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('regional_orders', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'regional_orders'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Regional Orders (WhatsApp)</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('add_listing', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'add_listing'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/30 border border-purple-500/30'
              }`}
            >
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Add Account Listing</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('listings_review', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'listings_review'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Listings Review</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('email_logs', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'email_logs'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email Logs</span>
            </button>

                        <button
              type="button"
              onClick={(e) => handleSelectTab('staff', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff &amp; Permissions</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('users', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users &amp; CRM ({metrics.totalUsers || usersList.length})</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('orders', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Orders ({metrics.totalOrders || ordersList.length})</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('invoices', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'invoices'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Invoices &amp; Billing ({metrics.totalInvoices || invoicesList.length})</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('finance', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
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
              onClick={(e) => handleSelectTab('tasks', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'tasks'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Staff Tasks ({metrics.totalTasks || tasksList.length})</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('disputes', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'disputes'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>Disputes ({metrics.openDisputes || ticketsList.filter(t => t.status === 'open' || t.status === 'in_progress').length})</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('communication', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
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
              onClick={(e) => handleSelectTab('audit', e)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'audit'
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Trail</span>
            </button>
          </div>

          {/* Right Gradient Edge Mask */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#070814] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => slideTabs('right')}
            disabled={!canScrollRight}
            aria-label="Slide options right"
            className={`absolute -right-1 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#121426] border border-amber-500/30 text-amber-300 flex items-center justify-center shadow-xl transition-all ${
              canScrollRight
                ? 'opacity-100 hover:scale-110 hover:border-amber-400 hover:bg-amber-950/90 cursor-pointer'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
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
        {/* PAYMENT VERIFICATION & MANUAL QR SETTINGS                     */}
        {/* ============================================================== */}
        {activeTab === 'payment_verification' && <AdminPaymentSettings />}

        {/* ============================================================== */}
        {/* AUCTIONS MARKETPLACE CONTROL (Part 2.1 & Part 2.2)            */}
        {/* ============================================================== */}
        {activeTab === 'auctions' && <AdminAuctionsManagement />}

        {/* ============================================================== */}
        {/* RENTALS MARKETPLACE & CREDENTIALS VAULT (Part 1 & Part 5)     */}
        {/* ============================================================== */}
        {activeTab === 'rentals' && <AdminRentalsManagement />}

        {/* ============================================================== */}
        {/* LEGAL GOVERNANCE & STATUTORY POLICIES (Part 6 & Part 8)       */}
        {/* ============================================================== */}
        {activeTab === 'legal' && <AdminLegalManagement />}

        {/* ============================================================== */}
        {/* INDIAN VP VAULT & AUTOMATED CODE INVENTORY                    */}
        {/* ============================================================== */}
        {activeTab === 'indian_vp' && <AdminIndianVPInventory />}

        {/* ============================================================== */}
        {/* REGIONAL / PHP ORDERS (MANUAL WHATSAPP FULFILLMENT)           */}
        {/* ============================================================== */}
        {activeTab === 'regional_orders' && <AdminRegionalOrders onOpenOrderRoom={handleOpenAdminOrderRoom} />}

        {/* ============================================================== */}
        {/* ADD DIRECT MARKETPLACE ACCOUNT LISTING                         */}
        {/* ============================================================== */}
        {activeTab === 'add_listing' && (
          <AdminCreateListingSection
            onSuccess={() => setActiveTab('listings_review')}
          />
        )}

        {/* ============================================================== */}
        {/* COMMUNITY ACCOUNT LISTINGS MODERATION QUEUE                   */}
        {/* ============================================================== */}
        {activeTab === 'listings_review' && <AdminListingsModeration />}

        {/* ============================================================== */}
        {/* AUTOMATED EMAIL LOGS & OUTBOUND DISPATCH AUDIT               */}
        {/* ============================================================== */}
        {activeTab === 'email_logs' && <AdminEmailLogs />}

        {/* ============================================================== */}
        {/* TAB 2: USERS MANAGEMENT & CRM INSPECTION                       */}
        {/* ============================================================== */}
        {activeTab === 'staff' && <AdminStaffManagement />}

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
                <table className="w-full min-w-[980px] text-left text-xs font-mono">
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
        {/* TAB 3: ORDERS MANAGEMENT & PAYMENT VERIFICATION CONSOLE        */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (() => {
          const verificationNeededCount = ordersList.filter(
            (o) => o.payment_status === 'SUBMITTED_FOR_VERIFICATION'
          ).length;
          const verifiedCount = ordersList.filter(
            (o) => o.payment_status === 'PAYMENT_VERIFIED'
          ).length;
          const completedCount = ordersList.filter((o) => o.status === 'completed').length;
          const awaitingPaymentCount = ordersList.filter(
            (o) => o.payment_status === 'AWAITING_PAYMENT'
          ).length;

          const filteredOrders = ordersList.filter((ord) => {
            // Status tab filter
            if (orderStatusFilter === 'verification_needed' && ord.payment_status !== 'SUBMITTED_FOR_VERIFICATION') {
              return false;
            }
            if (orderStatusFilter === 'verified' && ord.payment_status !== 'PAYMENT_VERIFIED') {
              return false;
            }
            if (orderStatusFilter === 'completed' && ord.status !== 'completed') {
              return false;
            }
            if (orderStatusFilter === 'cancelled' && ord.status !== 'cancelled' && ord.payment_status !== 'PAYMENT_REJECTED') {
              return false;
            }

            // Search query filter
            if (orderSearchQuery.trim()) {
              const q = orderSearchQuery.toLowerCase().trim();
              const matchId = String(ord.id || '').toLowerCase().includes(q);
              const matchName = String(ord.user_name || '').toLowerCase().includes(q);
              const matchEmail = String(ord.user_email || '').toLowerCase().includes(q);
              const matchTitle = String(ord.title || '').toLowerCase().includes(q);
              const matchUtr = String(ord.payment_evidence_ref || '').toLowerCase().includes(q);
              return matchId || matchName || matchEmail || matchTitle || matchUtr;
            }

            return true;
          });

          return (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Order Fulfillment &amp; Payment Desk</span>
                    <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                      {ordersList.length} Total
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Verify UPI payments, inspect uploaded receipts, and trigger automated or manual dispatch.
                  </p>
                  {ordersLoadError && (
                    <p role="alert" className="text-xs text-rose-300 mt-1">{ordersLoadError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchAdminData}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Status Chips & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-rajdhani font-bold uppercase transition-all cursor-pointer ${
                      orderStatusFilter === 'all'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All ({ordersList.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('verification_needed')}
                    className={`px-3 py-1.5 rounded-xl font-rajdhani font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                      orderStatusFilter === 'verification_needed'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 ring-2 ring-amber-400'
                        : verificationNeededCount > 0
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:bg-amber-900 animate-pulse'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>Verification Needed</span>
                    {verificationNeededCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-bold">
                        {verificationNeededCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('verified')}
                    className={`px-3 py-1.5 rounded-xl font-rajdhani font-bold uppercase transition-all cursor-pointer ${
                      orderStatusFilter === 'verified'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Verified ({verifiedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('completed')}
                    className={`px-3 py-1.5 rounded-xl font-rajdhani font-bold uppercase transition-all cursor-pointer ${
                      orderStatusFilter === 'completed'
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>

                {/* Search Field */}
                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search Order ID, UTR, or Customer..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-purple-400 placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Orders Table */}
              <div className="rounded-2xl bg-[#0c0d1c] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-3.5">Order ID &amp; Time</th>
                        <th className="p-3.5">Customer &amp; Contact</th>
                        <th className="p-3.5">Product &amp; Category</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Payment Status</th>
                        <th className="p-3.5">Payment Evidence</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500 font-sans">
                            No orders found matching the selected filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => {
                          let details: any = {};
                          try {
                            details = ord.details_json ? JSON.parse(ord.details_json) : {};
                          } catch {}

                          const phone = details.contactPhone || details.phone || ord.user_phone;
                          const email = details.email || ord.user_email;
                          const isAwaitingVerification = ord.payment_status === 'SUBMITTED_FOR_VERIFICATION';

                          return (
                            <tr
                              key={ord.id}
                              className={`transition-colors ${
                                isAwaitingVerification
                                  ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                                  : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              {/* Order ID & Date */}
                              <td className="p-3.5">
                                <div className="font-bold text-purple-300">#{ord.id}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {new Date(ord.created_at).toLocaleDateString()}{' '}
                                  {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              {/* Customer & Delivery Contact */}
                              <td className="p-3.5">
                                <div className="font-bold text-white font-sans">{ord.user_name || 'Customer'}</div>
                                <div className="text-[10px] text-gray-400">{email}</div>
                                {phone && (
                                  <div className="text-[10px] text-purple-300 font-mono mt-0.5 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-purple-400" />
                                    <span>{phone}</span>
                                  </div>
                                )}
                              </td>

                              {/* Product & Type */}
                              <td className="p-3.5">
                                <div className="font-sans font-semibold text-white max-w-[180px] truncate" title={ord.title}>
                                  {ord.title}
                                </div>
                                <div className="text-[10px] text-gray-400 uppercase font-mono mt-0.5">
                                  Type: <span className="text-purple-300 font-bold">{ord.type}</span>
                                </div>
                              </td>

                              {/* Amount */}
                              <td className="p-3.5 font-bold text-emerald-400">
                                ₹{Number(ord.amount).toLocaleString('en-IN')}
                              </td>

                              {/* Payment Status */}
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold inline-block ${
                                    ord.payment_status === 'PAYMENT_VERIFIED'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                      : ord.payment_status === 'SUBMITTED_FOR_VERIFICATION'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                                      : ord.payment_status === 'PAYMENT_REJECTED'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                      : 'bg-zinc-800 text-gray-300 border border-white/10'
                                  }`}
                                >
                                  {ord.payment_status || 'AWAITING_PAYMENT'}
                                </span>
                                {ord.fulfillment_status && (
                                  <div className="text-[9px] text-gray-500 uppercase mt-1">
                                    Fulfill: {ord.fulfillment_status}
                                  </div>
                                )}
                              </td>

                              {/* Payment Evidence (UTR & Screenshot) */}
                              <td className="p-3.5">
                                {ord.payment_evidence_ref ? (
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-mono text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 inline-block font-bold">
                                      UTR: {ord.payment_evidence_ref}
                                    </div>
                                    {ord.payment_evidence_image && (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setZoomScreenshot(ord.payment_evidence_image)}
                                          className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer underline"
                                        >
                                          <ImageIcon className="w-3 h-3" />
                                          <span>View Receipt Screenshot</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-500 italic">No proof submitted</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdminOrderRoom(ord.id)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] font-rajdhani uppercase cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                  title="Open Customer Order Room & Live Chat"
                                >
                                  <MessageSquare className="w-3 h-3 text-indigo-400" />
                                  <span>Order Room</span>
                                </button>

                                {/* Linked Invoice button */}
                                {(() => {
                                  const linkedInv = invoicesList.find((i) => i.order_id === ord.id);
                                  if (linkedInv) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedInvoiceView(linkedInv)}
                                        className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-[10px] font-rajdhani uppercase cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                        title={`View Official Invoice (${linkedInv.id})`}
                                      >
                                        <FileText className="w-3 h-3 text-purple-400" />
                                        <span>Invoice</span>
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* Verify & Approve button */}
                                {ord.payment_status === 'SUBMITTED_FOR_VERIFICATION' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrderVerify(ord);
                                      setVerifyAction('approve');
                                      setVerifyNotes('Verified in bank records / UPI ledger');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] font-rajdhani uppercase cursor-pointer shadow-sm"
                                    title="Verify & Confirm Payment"
                                  >
                                    Verify
                                  </button>
                                )}

                                {/* Reject button */}
                                {ord.payment_status === 'SUBMITTED_FOR_VERIFICATION' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrderVerify(ord);
                                      setVerifyAction('reject');
                                      setRejectionReason('UTR could not be located in bank ledger');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-[10px] font-rajdhani uppercase cursor-pointer"
                                    title="Reject Payment Proof"
                                  >
                                    Reject
                                  </button>
                                )}

                                {/* Mark Delivered button if already verified */}
                                {ord.payment_status === 'PAYMENT_VERIFIED' && ord.status !== 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOrderStatus(ord.id, 'completed')}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] font-rajdhani uppercase cursor-pointer shadow-sm"
                                  >
                                    Fulfill
                                  </button>
                                )}

                                {/* Cancel Order button */}
                                {ord.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOrderStatus(ord.id, 'cancelled')}
                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-rajdhani uppercase cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
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
          );
        })()}

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
                      <th className="p-4">Linked Order</th>
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
                    {invoicesList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500 font-sans">
                          No invoices found. Invoices are generated automatically upon order fulfillment or can be created manually.
                        </td>
                      </tr>
                    ) : (
                      invoicesList.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-bold text-purple-300">{inv.id}</td>
                          <td className="p-4">
                            {inv.order_id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderSearchQuery(inv.order_id || '');
                                  setActiveTab('orders');
                                }}
                                className="text-purple-300 hover:text-purple-200 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer font-mono"
                                title="Jump to Order in Orders tab"
                              >
                                <span>#{inv.order_id}</span>
                                <ExternalLink className="w-3 h-3 text-purple-400" />
                              </button>
                            ) : (
                              <span className="text-gray-500 italic text-[11px]">Direct Manual</span>
                            )}
                          </td>
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
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceView(inv)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
                            >
                              View
                            </button>
                            {inv.order_id && (
                              <button
                                type="button"
                                onClick={() => handleOpenAdminOrderRoom(inv.order_id!)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] font-rajdhani uppercase cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                title="Open Live Order Room for this Customer"
                              >
                                <MessageSquare className="w-3 h-3 text-indigo-400" />
                                <span>Order Room</span>
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
                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-gray-400">Gross Buyer Volume</div>
                    <div className="text-xl font-black font-rajdhani text-white mt-1">
                      ₹{Number(financeOverview.grossBuyerPaid).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderStatusFilter('verified');
                      setActiveTab('orders');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold mt-3 flex items-center gap-1 hover:underline cursor-pointer font-sans"
                  >
                    <span>View Verified Orders</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-gray-400">Platform Commissions (10%)</div>
                    <div className="text-xl font-black font-rajdhani text-purple-300 mt-1">
                      ₹{Number(financeOverview.platformCommissions).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-3">Calculated live</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-gray-400">GST / Tax Collected (18%)</div>
                    <div className="text-xl font-black font-rajdhani text-amber-300 mt-1">
                      ₹{Number(financeOverview.totalTaxCollected).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('invoices')}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold mt-3 flex items-center gap-1 hover:underline cursor-pointer font-sans"
                  >
                    <span>View Invoices ({invoicesList.length})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#0c0d1c] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-gray-400">Total Operating Expenses</div>
                    <div className="text-xl font-black font-rajdhani text-rose-400 mt-1">
                      ₹{Number(financeOverview.totalExpenses).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-3">{expensesList.length} Entries Logged</div>
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
                    {expensesList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 font-sans">
                          No operational expenses recorded yet. Click "Record Operational Expense" above to add real business expenses.
                        </td>
                      </tr>
                    ) : (
                      expensesList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-bold text-white">{exp.reference_no}</td>
                          <td className="p-3 uppercase text-purple-300">{exp.category}</td>
                          <td className="p-3 font-sans text-gray-200">{exp.description}</td>
                          <td className="p-3 font-bold text-rose-400">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                          <td className="p-3">{exp.payment_method}</td>
                          <td className="p-3 text-gray-400">{exp.recorded_by}</td>
                          <td className="p-3 text-gray-400">{new Date(exp.expense_date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
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
                    {tasksList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                          No open staff tasks currently. Click "Create Staff Task" above to assign operational responsibilities.
                        </td>
                      </tr>
                    ) : (
                      tasksList.map((tsk) => (
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
                      ))
                    )}
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
                  <div role="status" aria-live="polite" className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{announceResult}</span>
                  </div>
                )}
                {announceError && (
                  <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs">
                    {announceError}
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
                      maxLength={120}
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
                      maxLength={4000}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={announceSubmitting}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer shadow-md"
                  >
                    {announceSubmitting ? 'Dispatching…' : 'Broadcast Announcement'}
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
                    <div key={tpl.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs font-sans">{tpl.name}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono uppercase">
                          {tpl.category}
                        </span>
                      </div>
                      {editingTemplate?.id === tpl.id ? (
                        <form onSubmit={handleSaveTemplate} className="space-y-3">
                          <label className="block space-y-1">
                            <span className="text-[10px] font-mono uppercase text-gray-400">Subject</span>
                            <input
                              value={editingTemplate.subject}
                              onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                              maxLength={200}
                              required
                              className="w-full p-2 rounded-lg bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-mono uppercase text-gray-400">Body</span>
                            <textarea
                              value={editingTemplate.body}
                              onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                              maxLength={20000}
                              rows={5}
                              required
                              className="w-full p-2 rounded-lg bg-[#141224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                            />
                          </label>
                          {templateSaveError && <p role="alert" className="text-xs text-red-300">{templateSaveError}</p>}
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setEditingTemplate(null); setTemplateSaveError(null); }} className="px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-[10px] font-bold uppercase">Cancel</button>
                            <button type="submit" className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase">Save Template</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="text-xs text-gray-300 font-mono">Subject: {tpl.subject}</div>
                          <p className="text-[11px] text-gray-400 line-clamp-2">{tpl.body}</p>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => { setEditingTemplate({ id: tpl.id, subject: tpl.subject, body: tpl.body }); setTemplateSaveError(null); }} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-bold uppercase">Edit Template</button>
                          </div>
                        </>
                      )}
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
                  onClick={() => {
                    if (!selectedInvoiceView) return;
                    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${selectedInvoiceView.id} - VIB Digital Services</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #a855f7; padding-bottom: 20px; }
    .brand { font-size: 24px; font-weight: bold; color: #7e22ce; }
    .meta { text-align: right; font-size: 14px; color: #555; }
    .details { display: flex; justify-content: space-between; margin: 25px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f3f4f6; font-size: 12px; text-transform: uppercase; }
    .totals { margin-left: auto; width: 280px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .final { font-size: 18px; font-weight: bold; color: #059669; border-top: 2px solid #111; padding-top: 10px; margin-top: 6px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">VIB DIGITAL SERVICES</div>
      <div>GSTIN: 29AAECV1092F1Z8</div>
      <div>Bangalore, Karnataka, India</div>
      <div>Support: support@vib.gg</div>
    </div>
    <div class="meta">
      <h2>TAX INVOICE</h2>
      <div><strong>Invoice #:</strong> ${selectedInvoiceView.id}</div>
      <div><strong>Date:</strong> ${new Date(selectedInvoiceView.invoice_date).toLocaleDateString()}</div>
      <div><strong>Status:</strong> PAID / VERIFIED</div>
    </div>
  </div>

  <div class="details">
    <div>
      <strong>BILLED TO:</strong><br>
      ${selectedInvoiceView.customer_name}<br>
      ${selectedInvoiceView.customer_email}<br>
      ${selectedInvoiceView.order_id ? `Order ID: #${selectedInvoiceView.order_id}` : ''}
    </div>
    <div>
      <strong>PAYMENT DETAILS:</strong><br>
      Method: ${selectedInvoiceView.payment_method || 'UPI'}<br>
      UTR / Ref: ${selectedInvoiceView.payment_reference || 'N/A'}<br>
      Currency: INR (₹)
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${selectedInvoiceView.product_name}</strong></td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">₹${Number(selectedInvoiceView.subtotal).toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${Number(selectedInvoiceView.subtotal).toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal (Excl. Tax):</span>
      <span>₹${Number(selectedInvoiceView.subtotal).toLocaleString('en-IN')}</span>
    </div>
    <div class="total-row">
      <span>GST (18%):</span>
      <span>₹${Number(selectedInvoiceView.tax_amount).toLocaleString('en-IN')}</span>
    </div>
    <div class="total-row final">
      <span>Total Paid:</span>
      <span>₹${Number(selectedInvoiceView.final_total).toLocaleString('en-IN')}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated commercial tax invoice and requires no physical signature.</p>
    <p>© ${new Date().getFullYear()} VIB Digital Services. All rights reserved.</p>
  </div>
</body>
</html>`;
                    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `VIB_Tax_Invoice_${selectedInvoiceView.id}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
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

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">Linked Order:</div>
                  {selectedInvoiceView.order_id ? (
                    <div className="space-y-1.5 mt-0.5">
                      <div className="font-bold text-amber-300 font-mono">#{selectedInvoiceView.order_id}</div>
                      <div className="flex items-center gap-1.5 print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const oId = selectedInvoiceView.order_id;
                            setSelectedInvoiceView(null);
                            handleOpenAdminOrderRoom(oId);
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] uppercase font-rajdhani flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Order Room</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const oId = selectedInvoiceView.order_id;
                            setSelectedInvoiceView(null);
                            setOrderSearchQuery(oId);
                            setActiveTab('orders');
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-[10px] uppercase font-rajdhani flex items-center gap-1 cursor-pointer"
                        >
                          <Package className="w-3 h-3" />
                          <span>View Order</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">Direct Commercial Invoice</div>
                  )}
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

      {/* PAYMENT VERIFICATION DECISION MODAL */}
      {selectedOrderVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0c0d1c] border border-purple-500/40 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-chakra font-bold text-lg text-white">
                    Verify Order Payment #{selectedOrderVerify.id}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Audit banking ledger and confirm customer payment proof
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderVerify(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order & Evidence Summary */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="text-white font-bold">{selectedOrderVerify.user_name || 'Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-gray-300">{selectedOrderVerify.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Product:</span>
                <span className="text-purple-300 font-semibold">{selectedOrderVerify.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  ₹{Number(selectedOrderVerify.amount).toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-gray-400">Submitted UTR:</span>
                <span className="font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                  {selectedOrderVerify.payment_evidence_ref || 'No UTR Submitted'}
                </span>
              </div>

              {selectedOrderVerify.payment_evidence_image && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-gray-400">Attached Screenshot:</span>
                  <button
                    type="button"
                    onClick={() => setZoomScreenshot(selectedOrderVerify.payment_evidence_image)}
                    className="px-2 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>View Receipt Image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Decision Form */}
            <form onSubmit={handleConfirmPaymentVerification} className="space-y-3.5">
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                  Verification Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyAction('approve')}
                    className={`py-2 px-3 rounded-xl font-chakra font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      verifyAction === 'approve'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400'
                        : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyAction('reject')}
                    className={`py-2 px-3 rounded-xl font-chakra font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      verifyAction === 'reject'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-400'
                        : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Payment</span>
                  </button>
                </div>
              </div>

              {verifyAction === 'approve' ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                    <div className="text-emerald-300 font-bold font-rajdhani uppercase tracking-wide">
                      Automated Fulfillment Note:
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      {selectedOrderVerify.type === 'vp' && !selectedOrderVerify.title.toLowerCase().includes('php')
                        ? '• Indian VP Order: A genuine prepaid code will be auto-allocated from the Indian VP Vault and emailed to the customer.'
                        : '• Manual Delivery Order: Payment status will be confirmed, order placed in fulfillment queue, and an email dispatched to customer to confirm delivery WhatsApp/email.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1">
                      Audit Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="e.g. Verified in HDFC Bank UPI statement"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs space-y-1">
                    <div className="text-rose-300 font-bold font-rajdhani uppercase tracking-wide">
                      Payment Rejection Notice:
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      The order will be marked PAYMENT_REJECTED. An email alert will be sent to the customer with your specified reason, allowing them to re-submit valid proof.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1">
                      Reason for Rejection *
                    </label>
                    <input
                      type="text"
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. UTR not found in bank ledger / Incorrect transfer amount"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedOrderVerify(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVerify}
                  className={`px-5 py-2 rounded-xl font-bold font-rajdhani uppercase text-xs flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50 ${
                    verifyAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  }`}
                >
                  {isSubmittingVerify ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{verifyAction === 'approve' ? 'Confirm Payment Approval' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DEDICATED ADMIN ORDER ROOM & LIVE CHAT MODAL                   */}
      {/* ============================================================== */}
      {adminOrderRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-room-title"
            className="relative w-full max-w-4xl max-h-[92vh] bg-[#0c0d1c] border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="admin-order-room-title" className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                      Admin Order Room: #{adminOrderRoom.orderId}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      adminOrderRoom.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : adminOrderRoom.status === 'cancelled'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                    }`}>
                      {adminOrderRoom.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-500/30">
                      Payment: {adminOrderRoom.payment_status || 'AWAITING_PAYMENT'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {adminOrderRoom.title} • ₹{Number(adminOrderRoom.amount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAdminOrderRoom(adminOrderRoom.orderId)}
                  disabled={adminRoomLoading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                  title="Refresh Room"
                >
                  <RefreshCw className={`w-4 h-4 ${adminRoomLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminOrderRoom(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                  title="Close Room"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-column layout */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Customer Details, Payment Evidence & VP Code Vault (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Customer Card */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Customer &amp; Account Info</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Buyer Name:</span>
                      <span className="font-bold text-white font-sans">{adminOrderRoom.buyer?.name || 'Customer'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Receipt Email:</span>
                      <span className="font-mono text-purple-300">{adminOrderRoom.details?.email || adminOrderRoom.buyer?.email || 'N/A'}</span>
                    </div>
                    {adminOrderRoom.details?.contactPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">WhatsApp / Phone:</span>
                        <span className="font-mono text-emerald-400">{adminOrderRoom.details?.contactPhone}</span>
                      </div>
                    )}
                    {(adminOrderRoom.details?.riotId || adminOrderRoom.buyer?.riotId) && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Riot ID:</span>
                        <span className="font-bold font-mono text-amber-300">{adminOrderRoom.details?.riotId || adminOrderRoom.buyer?.riotId}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-white/5">
                      <span className="text-gray-400">Total Price:</span>
                      <span className="font-bold text-emerald-400">₹{Number(adminOrderRoom.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Evidence Card */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="text-xs font-mono font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Payment Verification Evidence</span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">UTR / Ref Number:</span>
                      <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {adminOrderRoom.payment_evidence_ref || 'None submitted'}
                      </span>
                    </div>
                    {adminOrderRoom.payment_evidence_image ? (
                      <div className="pt-2">
                        <div className="text-[11px] text-gray-400 mb-1.5 flex items-center justify-between">
                          <span>Attached Screenshot:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setZoomImgFailed(false);
                              setZoomScreenshot(adminOrderRoom.payment_evidence_image);
                            }}
                            className="text-purple-400 hover:text-purple-300 underline cursor-pointer text-[10px] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Zoom Image</span>
                          </button>
                        </div>
                        <div
                          onClick={() => {
                            setZoomImgFailed(false);
                            setZoomScreenshot(adminOrderRoom.payment_evidence_image);
                          }}
                          className="relative h-28 rounded-xl overflow-hidden border border-white/15 cursor-pointer group bg-black/40 flex items-center justify-center"
                        >
                          <img
                            src={adminOrderRoom.payment_evidence_image}
                            alt="Payment Evidence Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (!img.src.includes(':5000') && adminOrderRoom.payment_evidence_image?.startsWith('/uploads')) {
                                img.src = `${adminOrderRoom.payment_evidence_image}`;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 font-rajdhani uppercase">
                            <ImageIcon className="w-4 h-4" />
                            <span>Click to Zoom</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 italic pt-1">
                        No payment screenshot attached for this order.
                      </div>
                    )}
                  </div>
                </div>

                {/* VP Code Vault Delivery Section */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#100d24] to-[#0a0a14] border border-purple-500/30 space-y-3">
                  <div className="text-xs font-mono font-bold uppercase text-purple-300 tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>VP Code Vault Delivery</span>
                    </span>
                    {(adminOrderRoom.issuedCode || adminOrderRoom.issued_code || adminOrderRoom.fulfillment_notes || adminOrderRoom.delivery_data?.code) && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[9px] border border-emerald-500/40 font-mono">
                        ISSUED
                      </span>
                    )}
                  </div>

                  {(() => {
                    const activeCode = adminOrderRoom.issuedCode || adminOrderRoom.issued_code || adminOrderRoom.fulfillment_notes || adminOrderRoom.delivery_data?.code;
                    if (activeCode) {
                      return (
                        <div className="space-y-2.5">
                          <div className="p-3 rounded-xl bg-black/60 border border-purple-500/40 text-center space-y-1">
                            <div className="text-[10px] text-gray-400 font-mono uppercase">Issued VP Code</div>
                            <div className="text-lg font-black font-mono text-emerald-400 tracking-wider select-all break-all">
                              {activeCode}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Recipient: {adminOrderRoom.details?.email || adminOrderRoom.buyer?.email || 'N/A'}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(activeCode);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                              }}
                              className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-rajdhani uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleAdminResendCodeEmail}
                              disabled={isResendingCode}
                              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs font-rajdhani uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                            >
                              {isResendingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                              <span>Resend Email</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Enter or generate the official Riot VP code. Issuing will mark the order completed and instantly dispatch the code to the customer's email.
                        </p>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={manualCodeInput}
                            onChange={(e) => setManualCodeInput(e.target.value)}
                            placeholder="e.g. RA-VAL-8492-9102-4821"
                            className="flex-1 p-2 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const randomDigits = Math.floor(100000000000 + Math.random() * 900000000000);
                              setManualCodeInput(`RA-${randomDigits}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 font-mono text-[10px] font-bold cursor-pointer whitespace-nowrap"
                            title="Auto-generate standard Riot format code"
                          >
                            Auto-Gen
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleAdminIssueCode}
                          disabled={isIssuingCode || !manualCodeInput.trim()}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-black text-xs font-rajdhani uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/30 transition-all"
                        >
                          {isIssuingCode ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Send className="w-4 h-4 text-black" />}
                          <span>Issue Code &amp; Email Customer</span>
                        </button>
                      </div>
                    );
                  })()}

                  {codeActionFeedback && (
                    <div className={`p-2 rounded-xl text-xs flex items-center gap-1.5 ${
                      codeActionFeedback.toLowerCase().includes('success') || codeActionFeedback.toLowerCase().includes('dispatched') || codeActionFeedback.toLowerCase().includes('sent')
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{codeActionFeedback}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Chat Room with Customer (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-[520px] rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
                {/* Chat Header */}
                <div className="p-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold text-gray-200 uppercase">Live Order Room Chat</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    Auto-refreshes every 3.5s
                  </span>
                </div>

                {/* Message History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {adminOrderMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 text-xs space-y-1">
                      <MessageSquare className="w-8 h-8 text-gray-600 mb-1" />
                      <div className="font-bold text-gray-400">No messages in this order room yet.</div>
                      <p className="text-[11px] text-gray-500">Send an official support message to the customer below.</p>
                    </div>
                  ) : (
                    adminOrderMessages.map((msg, i) => {
                      const isStaffMsg = ['admin', 'superadmin', 'moderator'].includes(msg.sender_role);
                      const isSystem = msg.sender_role === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id || i} className="mx-auto max-w-md p-2 rounded-xl bg-white/5 border border-white/10 text-center text-[11px] text-gray-300 font-mono">
                            {msg.message}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id || i}
                          className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                            isStaffMsg
                              ? 'ml-auto bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border border-indigo-500/40 text-indigo-100 rounded-tr-none shadow-md'
                              : 'mr-auto bg-[#181628] border border-white/10 text-gray-200 rounded-tl-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 font-mono mb-1">
                            <span className="font-bold flex items-center gap-1">
                              {isStaffMsg && <Award className="w-3 h-3 text-amber-400" />}
                              <span>{msg.sender_name || (isStaffMsg ? 'VIB Support' : 'Customer')}</span>
                              {isStaffMsg && (
                                <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-300 text-[8px] uppercase border border-amber-500/40">
                                  Staff
                                </span>
                              )}
                            </span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Canned Clicks */}
                <div className="px-3 py-2 border-t border-white/5 bg-white/[0.01] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-mono text-gray-500 uppercase whitespace-nowrap">Quick:</span>
                  {[
                    'Payment verified! Your VP code has been issued above and emailed.',
                    'Please confirm your Riot ID & Tagline.',
                    'Please share a clear screenshot of your bank debit SMS or UPI reference.',
                    'Order fulfilled successfully. Enjoy your Valorant Points!'
                  ].map((quickText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAdminMessageDraft(quickText)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-gray-400 hover:text-white font-sans whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {quickText.slice(0, 24)}...
                    </button>
                  ))}
                </div>

                {/* Message Composer */}
                <form onSubmit={handleSendAdminOrderMessage} className="p-3 border-t border-white/10 bg-[#0e0d1f] flex items-center gap-2">
                  <input
                    type="text"
                    value={adminMessageDraft}
                    onChange={(e) => setAdminMessageDraft(e.target.value)}
                    placeholder="Type an official message to the customer..."
                    className="flex-1 p-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={adminSendingMessage || !adminMessageDraft.trim()}
                    className="min-h-[40px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    {adminSendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT FULLSCREEN ZOOM MODAL */}
      {zoomScreenshot && (
        <div
          onClick={() => {
            setZoomScreenshot(null);
            setZoomImgFailed(false);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[88vh] bg-[#0c0d1c] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-gray-200">Payment Evidence Screenshot</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={zoomScreenshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Image</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setZoomScreenshot(null);
                    setZoomImgFailed(false);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                  aria-label="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[75vh] overflow-auto flex items-center justify-center bg-black/50">
              {zoomImgFailed ? (
                <div className="p-8 text-center space-y-3">
                  <ImageIcon className="w-12 h-12 text-rose-400 mx-auto" />
                  <div className="text-white font-bold text-sm">Image preview could not be loaded</div>
                  <p className="text-gray-400 text-xs font-mono max-w-md">{zoomScreenshot}</p>
                  <a
                    href={zoomScreenshot.startsWith('/uploads') ? `${zoomScreenshot}` : zoomScreenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase font-rajdhani"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Direct File Link</span>
                  </a>
                </div>
              ) : (
                <img
                  src={zoomScreenshot}
                  alt="Payment Screenshot Zoom"
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl mx-auto shadow-2xl"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes(':5000') && zoomScreenshot.startsWith('/uploads')) {
                      img.src = `${zoomScreenshot}`;
                    } else {
                      setZoomImgFailed(true);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

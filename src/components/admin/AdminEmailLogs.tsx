import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Eye,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EmailLog {
  id: string;
  recipient: string;
  template: string;
  subject: string;
  status: 'sent' | 'failed' | 'mocked';
  order_id: string | null;
  error_message: string | null;
  created_at: string;
}

export const AdminEmailLogs: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Test Email state
  const [testEmailTo, setTestEmailTo] = useState('thevibofficial@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Retry state
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [token, statusFilter]);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = '/api/admin/email-logs?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !testEmailTo.trim()) return;
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: testEmailTo.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult(data.message || 'Diagnostic test email dispatched successfully!');
        fetchLogs();
        setTimeout(() => setTestResult(null), 4000);
      } else {
        alert(data.error || 'Failed to dispatch test email.');
      }
    } catch {
      alert('Network error while dispatching test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRetryEmail = async (logId: string) => {
    if (!token) return;
    setRetryingId(logId);

    try {
      const res = await fetch(`/api/admin/email-logs/${logId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Email retried successfully!');
        fetchLogs();
      } else {
        alert(data.error || 'Failed to retry email delivery.');
      }
    } catch {
      alert('Network error while retrying email.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#131124] border border-fuchsia-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-600/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Automated Email Dispatch &amp; Delivery Audit Logs
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Live Nodemailer SMTP delivery status for order receipts, Indian VP codes, and shortage alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            className="p-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-200 cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Test Dispatch Form */}
      <div className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-bold font-rajdhani text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-fuchsia-400" />
            <span>Send SMTP Health-Check Diagnostic Email</span>
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">
            Test the live Nodemailer transport and SQLite logging integration
          </div>
        </div>

        <form onSubmit={handleSendTestEmail} className="flex gap-2 w-full sm:w-auto">
          <input
            type="email"
            required
            value={testEmailTo}
            onChange={(e) => setTestEmailTo(e.target.value)}
            placeholder="thevibofficial@gmail.com"
            className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:ring-2 focus:ring-fuchsia-400 w-full sm:w-64"
          />
          <button
            type="submit"
            disabled={isSendingTest || !testEmailTo.trim()}
            className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Dispatch Test</span>
          </button>
        </form>
      </div>

      {testResult && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Filter and Logs Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm font-bold font-rajdhani text-white uppercase tracking-wider">
            Email Delivery Ledger ({logs.length} entries)
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'sent', 'mocked', 'failed'] as const).map((s) => (
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

        <div className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[11px]">
                  <th className="p-3.5">Log ID &amp; Time</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Template</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Delivery Status</th>
                  <th className="p-3.5">Linked Order</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-mono">
                      No email delivery logs recorded matching filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isSent = log.status === 'sent';
                    const isMocked = log.status === 'mocked';
                    const isFailed = log.status === 'failed';

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-mono text-gray-400 text-[11px]">
                          {log.id}
                          <div className="text-[10px] text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()} • {new Date(log.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-white text-[11px]">
                          {log.recipient}
                        </td>

                        <td className="p-3.5 font-mono text-purple-300 uppercase text-[11px]">
                          {log.template}
                        </td>

                        <td className="p-3.5 text-gray-300 font-rajdhani text-xs font-semibold max-w-xs truncate">
                          {log.subject}
                          {log.error_message && (
                            <div className="text-[10px] text-rose-400 font-mono truncate">{log.error_message}</div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isSent
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : isMocked
                                ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          {log.order_id ? (
                            <span className="text-purple-300 font-bold">#{log.order_id}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          {isFailed && (
                            <button
                              type="button"
                              disabled={retryingId === log.id}
                              onClick={() => handleRetryEmail(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto disabled:opacity-50"
                              title="Retry delivery"
                            >
                              {retryingId === log.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>Retry</span>
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
    </div>
  );
};

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Bell, 
  CheckCheck, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle, 
  BarChart2, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

interface AlertItem {
  id: number;
  type: 'cost_threshold' | 'estimate_run' | 'upload_failed';
  message: string;
  metadata: any;
  isRead: boolean;
  createdAt: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/alerts`);
      if (response.data) {
        setAlerts(response.data.alerts || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (err: any) {
      console.error('[Alerts] Failed to fetch alerts:', err);
      setError('Failed to fetch organization notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API_URL}/api/alerts/read-all`);
      setUnreadCount(0);
      // Optimistically update all currently displayed alerts to read status
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch (err: any) {
      console.error('[Alerts] Failed to mark read:', err);
      alert(err.response?.data?.error || 'Failed to mark alerts as read.');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'cost_threshold':
        return <AlertTriangle className="w-5 h-5 text-[#BA7517] shrink-0" />;
      case 'estimate_run':
        return <BarChart2 className="w-5 h-5 text-purple shrink-0" />;
      case 'upload_failed':
        return <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500 shrink-0" />;
    }
  };

  const getAlertBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white';
    switch (type) {
      case 'cost_threshold':
        return 'bg-[#BA7517]/5 border-l-4 border-[#BA7517]';
      case 'estimate_run':
        return 'bg-[#534AB7]/5 border-l-4 border-[#534AB7]';
      case 'upload_failed':
        return 'bg-red-50 border-l-4 border-red-500';
      default:
        return 'bg-[#F1EFE8]/40 border-l-4 border-gray-400';
    }
  };

  return (
    <div id="alerts-page-wrapper" className="max-w-4xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <h2 className="font-sans font-extrabold text-[#2C2C2A] text-2xl tracking-tight flex items-center space-x-2">
            <Bell className="w-6 h-6 text-purple" />
            <span>Activity & Budget Alerts</span>
          </h2>
          {unreadCount > 0 && (
            <span id="unread-alerts-badge" className="bg-[#BA7517] text-white font-sans text-xs font-bold px-2.5 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            id="btn-refresh-alerts"
            onClick={fetchAlerts}
            className="flex items-center space-x-1 px-2.5 py-1.5 border border-[#d8d5cb] bg-white text-xs font-semibold rounded hover:bg-[#F1EFE8]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {unreadCount > 0 && (
            <button
              id="btn-mark-all-read"
              onClick={handleMarkAllRead}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20 border border-[#1D9E75]/20 text-xs font-semibold rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
          <Link 
            id="btn-back-dashboard"
            to="/" 
            className="flex items-center space-x-1 font-sans font-semibold text-xs text-purple hover:underline ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div id="loading-alerts-box" className="bg-white border border-[#d8d5cb] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple animate-spin" />
          <span className="font-sans text-xs text-gray-400">Fetching notifications...</span>
        </div>
      ) : error ? (
        <p className="text-center text-red-500 font-sans text-xs p-6 bg-white border border-[#d8d5cb] rounded-lg">{error}</p>
      ) : alerts.length === 0 ? (
        <div id="no-alerts-box" className="bg-white border border-[#d8d5cb] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Bell className="w-10 h-10 text-gray-300" />
          <p className="font-sans font-bold text-sm text-gray-400">Everything is quiet</p>
          <p className="font-sans text-xs text-gray-400">Your organization has no active alert events logged.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              id={`alert-item-${alert.id}`}
              className={`border border-[#d8d5cb] rounded-lg p-4 flex items-start space-x-4 transition-all ${getAlertBg(alert.type, alert.isRead)}`}
            >
              <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-sans font-semibold text-xs text-[#2C2C2A] capitalize">
                    {alert.type.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">
                    {new Date(alert.createdAt).toLocaleString(undefined, {
                      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="font-sans text-xs text-gray-700 mt-1 leading-relaxed">
                  {alert.message}
                </p>

                {/* Sub Metadata detail disclosure if available */}
                {alert.metadata && (
                  <div className="mt-2.5 bg-[#F1EFE8]/30 border border-[#d8d5cb]/40 p-2.5 rounded font-mono text-[10px] text-gray-500 overflow-x-auto whitespace-pre">
                    {JSON.stringify(alert.metadata, null, 2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

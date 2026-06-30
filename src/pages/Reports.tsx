import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Trash2, ArrowLeft, Loader2, Cpu, HardDrive, Network, Layers3, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

interface EstimateReport {
  id: number;
  userName: string;
  userEmail: string;
  specs: {
    cpu: number;
    ram: number;
    storage: number;
    bandwidth: number;
  };
  cheapestPlatform: string;
  monthlyCostUsd: number;
  createdAt: string;
}

export default function Reports() {
  const [reports, setReports] = useState<EstimateReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/estimates`);
      if (Array.isArray(response.data)) {
        setReports(response.data);
      }
    } catch (err: any) {
      console.error('[Reports] Error loading history:', err);
      setError('Failed to load estimation reports history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm('⚠️ WARNING: Wiping the history is irreversible! Are you sure you want to clear all estimation logs for your organization?')) {
      try {
        await axios.delete(`${API_URL}/api/estimates`);
        setReports([]);
      } catch (err: any) {
        console.error('[Reports] Wiping history failed:', err);
        alert(err.response?.data?.error || 'Failed to clear history.');
      }
    }
  };

  return (
    <div id="reports-page-wrapper" className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-sans font-extrabold text-[#2C2C2A] text-2xl tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-purple" />
            <span>Estimation Reports</span>
          </h2>
          <p className="font-sans text-xs text-gray-500 mt-1">
            Historical audit log of the last 10 estimates evaluated within this organization.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            id="btn-refresh-reports"
            onClick={fetchReports}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-[#d8d5cb] bg-white text-xs font-semibold rounded-lg hover:bg-[#F1EFE8] text-gray-dark"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          {reports.length > 0 && (
            <button
              id="btn-clear-history"
              onClick={handleClearHistory}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-semibold rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Clear History</span>
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
        <div id="loading-reports-box" className="bg-white border border-[#d8d5cb] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple animate-spin" />
          <span className="font-sans text-xs text-gray-400">Loading historic reports...</span>
        </div>
      ) : error ? (
        <p className="text-center text-red-500 font-sans text-xs p-6 bg-white border border-[#d8d5cb] rounded-lg">{error}</p>
      ) : reports.length === 0 ? (
        <div id="no-reports-box" className="bg-white border border-[#d8d5cb] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-2">
          <FileText className="w-10 h-10 text-gray-300" />
          <p className="font-sans font-bold text-sm text-gray-400">No Estimation Reports Yet</p>
          <p className="font-sans text-xs text-gray-400">Run a calculation on the dashboard to log your first estimate.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#d8d5cb] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table id="reports-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F1EFE8]/40 border-b border-[#d8d5cb] text-gray-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5">Run By</th>
                  <th className="py-3.5 px-5">Specs Summary</th>
                  <th className="py-3.5 px-5">Cheapest Provider</th>
                  <th className="py-3.5 px-5 text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d8d5cb]/50">
                {reports.map((report) => (
                  <tr key={report.id} id={`report-row-${report.id}`} className="hover:bg-[#F1EFE8]/10 transition-colors">
                    {/* Date */}
                    <td className="py-4 px-5 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {new Date(report.createdAt).toLocaleString(undefined, { 
                        year: 'numeric', month: 'short', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </td>

                    {/* Operator */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-sans text-xs font-bold text-[#2C2C2A]">{report.userName}</span>
                        <span className="font-sans text-[10px] text-gray-400 leading-none mt-0.5">{report.userEmail}</span>
                      </div>
                    </td>

                    {/* Specifications */}
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-2.5">
                        <span className="inline-flex items-center space-x-1 bg-[#F1EFE8] text-gray-700 px-2 py-0.5 rounded text-[10px] font-mono">
                          <Cpu className="w-2.5 h-2.5 text-purple shrink-0" />
                          <span>{report.specs.cpu} vCPU</span>
                        </span>
                        <span className="inline-flex items-center space-x-1 bg-[#F1EFE8] text-gray-700 px-2 py-0.5 rounded text-[10px] font-mono">
                          <Layers3 className="w-2.5 h-2.5 text-purple shrink-0" />
                          <span>{report.specs.ram} GB</span>
                        </span>
                        <span className="inline-flex items-center space-x-1 bg-[#F1EFE8] text-gray-700 px-2 py-0.5 rounded text-[10px] font-mono">
                          <HardDrive className="w-2.5 h-2.5 text-purple shrink-0" />
                          <span>{report.specs.storage} GB SSD</span>
                        </span>
                        <span className="inline-flex items-center space-x-1 bg-[#F1EFE8] text-gray-700 px-2 py-0.5 rounded text-[10px] font-mono">
                          <Network className="w-2.5 h-2.5 text-purple shrink-0" />
                          <span>{report.specs.bandwidth} GB/mo</span>
                        </span>
                      </div>
                    </td>

                    {/* Winner platform */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="inline-flex items-center bg-[#1D9E75]/10 text-[#1D9E75] px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold">
                        {report.cheapestPlatform}
                      </span>
                    </td>

                    {/* Price Quote */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <span className="font-sans font-bold text-sm text-[#2C2C2A]">
                        ${report.monthlyCostUsd.toFixed(2)}
                      </span>
                      <span className="font-sans text-[10px] text-gray-400 block mt-0.5">/month</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

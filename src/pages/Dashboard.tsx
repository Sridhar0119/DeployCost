import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import CostCard from '../components/CostCard';
import CostChart from '../components/CostChart';
import SpecForm, { SpecState } from '../components/SpecForm';
import SavingsTips from '../components/SavingsTips';
import ProjectUpload from '../components/ProjectUpload';
import ChunkedUploadCard from '../components/ChunkedUploadCard';
import { BadgeCheck, Info, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Dashboard() {
  const { user } = useAuth();
  
  // 1. Initial Spec States
  const [specs, setSpecs] = useState<SpecState>({
    cpu: 2,
    ram: 4,
    storage: 50,
    bandwidth: 20,
  });

  // 2. Pricing calculation output results
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState(false);
  
  // 3. Status logs / analysis highlights
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState<string[]>([]);
  const [analysisSource, setAnalysisSource] = useState<string | null>(null);

  const triggerToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((prev) => (prev && prev.text === text ? null : prev));
    }, 8000);
  };

  // Run actual estimations against API
  const runEstimation = async (targetSpecs = specs) => {
    setLoading(true);
    setCalcSuccess(false);
    try {
      const response = await axios.post(`${API_URL}/api/estimate`, targetSpecs);
      if (response.data) {
        setResults(response.data);
        setCalcSuccess(true);
        triggerToast('success', `Price models recalculated successfully for ${targetSpecs.cpu} vCPU / ${targetSpecs.ram}GB RAM!`);
      }
    } catch (err: any) {
      console.error('[Dashboard] Cost estimation run failed:', err);
      triggerToast('error', err.response?.data?.error || 'Cost estimation run failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Hydrate spec parameters on mount
  useEffect(() => {
    const loadInitialSpecs = async () => {
      // Priority 1: Check configure preferences in localStorage
      const cached = localStorage.getItem('deploycost_local_defaults');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as SpecState;
          setSpecs(parsed);
          runEstimation(parsed);
          return;
        } catch {
          // fallback
        }
      }

      // Priority 2: Check organization-wide defaults from backend API
      try {
        const response = await axios.get(`${API_URL}/api/org-settings`);
        if (response.data && response.data.defaultSpecs) {
          const dSpecs = response.data.defaultSpecs;
          setSpecs(dSpecs);
          runEstimation(dSpecs);
          return;
        }
      } catch (err) {
        console.warn('[Dashboard] Could not retrieve organization default specs:', err);
      }

      // Priority 3: Default baseline specs
      runEstimation(specs);
    };

    loadInitialSpecs();
  }, []);

  // When files analyze and detect specifications
  const handleSpecsDetected = (detected: SpecState, notes: string[], source: string) => {
    setSpecs(detected);
    setAnalysisNotes(notes);
    setAnalysisSource(source);
    triggerToast('info', `Successfully imported specifications from ${source}!`);
    
    // Auto run estimation directly using new values
    runEstimation(detected);
  };

  return (
    <div id="dashboard-page-container" className="space-y-6">
      
      {/* Dynamic Alert Toasts */}
      {toastMsg && (
        <div
          id="dashboard-toast-banner"
          className={`flex items-start space-x-3 p-4 rounded-lg border transition-all animate-bounce ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toastMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-[#534AB7]/10 border-[#534AB7]/30 text-purple'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <BadgeCheck className="w-5 h-5 shrink-0 text-[#1D9E75]" />
          ) : toastMsg.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          ) : (
            <Info className="w-5 h-5 shrink-0 text-purple" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-semibold">{toastMsg.text}</p>
          </div>
        </div>
      )}

      {/* Dashboard Top Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
        <div>
          <h2 className="font-sans font-extrabold text-[#2C2C2A] text-2xl tracking-tight flex items-center space-x-2">
            <span>Team Estimation Hub</span>
            {calcSuccess && (
              <span id="badge-estimate-ready" className="bg-[#1D9E75] text-white font-sans text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center space-x-0.5 animate-pulse">
                <span>Estimate Ready</span>
              </span>
            )}
          </h2>
          <p className="font-sans text-xs text-gray-500 mt-1">
            Running scoped inside <strong className="font-semibold text-purple">{user?.email.split('@')[1]}</strong> organizational workspace.
          </p>
        </div>
        <button
          id="btn-re-estimate-refresh"
          onClick={() => runEstimation()}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#F1EFE8] border border-[#d8d5cb] text-gray-dark rounded-lg font-sans font-semibold text-xs transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Manual Recalculate</span>
        </button>
      </div>

      {/* Codebase Scanning Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ProjectUpload onSpecsDetected={handleSpecsDetected} onError={(msg) => triggerToast('error', msg)} />
        <ChunkedUploadCard onSpecsDetected={handleSpecsDetected} onError={(msg) => triggerToast('error', msg)} />
      </div>

      {/* File parsing logs and details */}
      {analysisSource && analysisNotes.length > 0 && (
        <div id="file-analysis-notes-panel" className="bg-white border border-[#d8d5cb] rounded-lg p-5">
          <h4 className="font-sans font-bold text-xs text-[#2C2C2A] flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-[#BA7517]" />
            <span>Analysis Notes for: {analysisSource}</span>
          </h4>
          <ul className="mt-3 space-y-1.5">
            {analysisNotes.map((note, i) => (
              <li key={i} className="font-sans text-xs text-gray-600 flex items-start space-x-2">
                <span className="text-purple shrink-0 mt-0.5">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: Specification configuration & chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <SpecForm specs={specs} onChange={setSpecs} onSubmit={() => runEstimation()} loading={loading} />
        </div>
        <div className="lg:col-span-7">
          <CostChart 
            data={
              results 
                ? { 
                    aws: results.aws.totalCost, 
                    azure: results.azure.totalCost, 
                    gcp: results.gcp.totalCost, 
                    do: results.do.totalCost,
                    cheapestName: results.cheapest.name
                  } 
                : null
            } 
          />
        </div>
      </div>

      {/* Bottom side-by-side comparative quotes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CostCard 
          platform="AWS" 
          data={results ? results.aws : null} 
          isCheapest={results ? results.cheapest.name === 'AWS' : false} 
        />
        <CostCard 
          platform="Azure" 
          data={results ? results.azure : null} 
          isCheapest={results ? results.cheapest.name === 'Azure' : false} 
        />
        <CostCard 
          platform="GCP" 
          data={results ? results.gcp : null} 
          isCheapest={results ? results.cheapest.name === 'GCP' : false} 
        />
        <CostCard 
          platform="DigitalOcean" 
          data={results ? results.do : null} 
          isCheapest={results ? results.cheapest.name === 'DigitalOcean' : false} 
        />
      </div>

      {/* Intelligent advice */}
      <SavingsTips specs={specs} results={results ? {
        aws: results.aws.totalCost,
        azure: results.azure.totalCost,
        gcp: results.gcp.totalCost,
        do: results.do.totalCost,
        cheapestName: results.cheapest.name
      } : null} />

    </div>
  );
}

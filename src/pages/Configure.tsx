import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Configure() {
  const [cpu, setCpu] = useState(2);
  const [ram, setRam] = useState(4);
  const [storage, setStorage] = useState(50);
  const [bandwidth, setBandwidth] = useState(20);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('deploycost_local_defaults');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.cpu) setCpu(parsed.cpu);
        if (parsed.ram) setRam(parsed.ram);
        if (parsed.storage) setStorage(parsed.storage);
        if (parsed.bandwidth) setBandwidth(parsed.bandwidth);
      } catch {
        // use default
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const config = { cpu, ram, storage, bandwidth };
    localStorage.setItem('deploycost_local_defaults', JSON.stringify(config));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 5000);
  };

  return (
    <div id="configure-page-wrapper" className="max-w-2xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans font-extrabold text-[#2C2C2A] text-2xl tracking-tight flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-purple" />
            <span>Local Preferences</span>
          </h2>
          <p className="font-sans text-xs text-gray-500 mt-1">
            Configure default specs stored inside this browser device.
          </p>
        </div>
        <Link 
          id="btn-back-dashboard"
          to="/" 
          className="flex items-center space-x-1.5 font-sans font-semibold text-xs text-purple hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {saved && (
        <div id="settings-save-success-banner" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-[#1D9E75] shrink-0" />
          <span className="font-sans text-xs font-semibold">
            Default specifications saved successfully to device storage! Future estimates will load these on mount.
          </span>
        </div>
      )}

      {/* Configuration Form */}
      <form id="local-defaults-form" onSubmit={handleSave} className="bg-white border border-[#d8d5cb] rounded-lg p-6 space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* CPU */}
          <div className="space-y-1.5">
            <label htmlFor="config-cpu" className="block font-sans text-xs font-semibold text-gray-500">
              Default vCPU Cores
            </label>
            <input
              id="config-cpu"
              type="number"
              min={1}
              max={128}
              value={cpu}
              onChange={(e) => setCpu(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full border border-[#d8d5cb] rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:border-purple"
              required
            />
            <span className="font-sans text-[10px] text-gray-400">Specify range 1 to 128 cores</span>
          </div>

          {/* RAM */}
          <div className="space-y-1.5">
            <label htmlFor="config-ram" className="block font-sans text-xs font-semibold text-gray-500">
              Default RAM (GB)
            </label>
            <input
              id="config-ram"
              type="number"
              min={1}
              max={512}
              value={ram}
              onChange={(e) => setRam(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full border border-[#d8d5cb] rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:border-purple"
              required
            />
            <span className="font-sans text-[10px] text-gray-400">Specify range 1 to 512 GB</span>
          </div>

          {/* Storage */}
          <div className="space-y-1.5">
            <label htmlFor="config-storage" className="block font-sans text-xs font-semibold text-gray-500">
              Default Storage (GB)
            </label>
            <input
              id="config-storage"
              type="number"
              min={10}
              max={10000}
              value={storage}
              onChange={(e) => setStorage(Math.max(10, parseInt(e.target.value, 10) || 10))}
              className="w-full border border-[#d8d5cb] rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:border-purple"
              required
            />
            <span className="font-sans text-[10px] text-gray-400">Specify range 10 to 10,000 GB</span>
          </div>

          {/* Bandwidth */}
          <div className="space-y-1.5">
            <label htmlFor="config-bandwidth" className="block font-sans text-xs font-semibold text-gray-500">
              Default Bandwidth (GB/mo)
            </label>
            <input
              id="config-bandwidth"
              type="number"
              min={1}
              max={10000}
              value={bandwidth}
              onChange={(e) => setBandwidth(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full border border-[#d8d5cb] rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:border-purple"
              required
            />
            <span className="font-sans text-[10px] text-gray-400">Specify range 1 to 10,000 GB/mo</span>
          </div>
        </div>

        <button
          id="btn-save-local-defaults"
          type="submit"
          className="flex items-center justify-center space-x-2 w-full bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-sans font-semibold text-sm py-2.5 rounded-lg transition-colors"
        >
          <Save className="w-4 h-4 shrink-0" />
          <span>Save Preferences to Device</span>
        </button>

      </form>
    </div>
  );
}

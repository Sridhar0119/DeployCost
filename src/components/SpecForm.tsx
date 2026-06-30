import React from 'react';
import { Cpu, HardDrive, Network, Layers3 } from 'lucide-react';

export interface SpecState {
  cpu: number;
  ram: number;
  storage: number;
  bandwidth: number;
}

interface SpecFormProps {
  specs: SpecState;
  onChange: (updated: SpecState) => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function SpecForm({ specs, onChange, onSubmit, loading }: SpecFormProps) {
  const updateField = (field: keyof SpecState, value: number) => {
    onChange({
      ...specs,
      [field]: value,
    });
  };

  const handleSliderChange = (field: keyof SpecState, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      updateField(field, val);
    }
  };

  const handleNumberInputChange = (field: keyof SpecState, e: React.ChangeEvent<HTMLInputElement>, min: number, max: number) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < min) val = min;
    if (val > max) val = max;
    updateField(field, val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form 
      id="spec-configuration-form" 
      onSubmit={handleSubmit} 
      className="bg-white border border-[#d8d5cb] rounded-lg p-6 flex flex-col justify-between"
    >
      <div>
        <h3 className="font-sans font-bold text-[#2C2C2A] text-sm">Resource Specifications</h3>
        <p className="font-sans text-xs text-gray-500 mt-0.5">
          Configure specs manually or upload a project configuration above.
        </p>
      </div>

      <div className="space-y-5 mt-6">
        {/* CPU */}
        <div id="spec-group-cpu" className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="font-sans text-xs font-semibold text-[#2C2C2A] flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#534AB7]" />
              <span>vCPU Cores</span>
            </label>
            <input
              id="input-spec-cpu"
              type="number"
              min={1}
              max={128}
              value={specs.cpu}
              onChange={(e) => handleNumberInputChange('cpu', e, 1, 128)}
              className="w-14 text-center font-mono text-xs border border-[#d8d5cb] rounded py-0.5"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              id="slider-spec-cpu"
              type="range"
              min={1}
              max={32}
              value={specs.cpu > 32 ? 32 : specs.cpu}
              onChange={handleSliderChange.bind(null, 'cpu')}
              className="w-full h-1.5 bg-[#F1EFE8] rounded-lg appearance-none cursor-pointer accent-[#534AB7]"
            />
            <span className="font-mono text-[10px] text-gray-400 w-8 text-right">32 max</span>
          </div>
        </div>

        {/* RAM */}
        <div id="spec-group-ram" className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="font-sans text-xs font-semibold text-[#2C2C2A] flex items-center space-x-1.5">
              <Layers3 className="w-3.5 h-3.5 text-[#534AB7]" />
              <span>RAM Capacity (GB)</span>
            </label>
            <input
              id="input-spec-ram"
              type="number"
              min={1}
              max={512}
              value={specs.ram}
              onChange={(e) => handleNumberInputChange('ram', e, 1, 512)}
              className="w-14 text-center font-mono text-xs border border-[#d8d5cb] rounded py-0.5"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              id="slider-spec-ram"
              type="range"
              min={1}
              max={64}
              value={specs.ram > 64 ? 64 : specs.ram}
              onChange={handleSliderChange.bind(null, 'ram')}
              className="w-full h-1.5 bg-[#F1EFE8] rounded-lg appearance-none cursor-pointer accent-[#534AB7]"
            />
            <span className="font-mono text-[10px] text-gray-400 w-8 text-right">64 max</span>
          </div>
        </div>

        {/* Storage */}
        <div id="spec-group-storage" className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="font-sans text-xs font-semibold text-[#2C2C2A] flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#534AB7]" />
              <span>SSD Storage (GB)</span>
            </label>
            <input
              id="input-spec-storage"
              type="number"
              min={10}
              max={10000}
              value={specs.storage}
              onChange={(e) => handleNumberInputChange('storage', e, 10, 10000)}
              className="w-14 text-center font-mono text-xs border border-[#d8d5cb] rounded py-0.5"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              id="slider-spec-storage"
              type="range"
              min={10}
              max={1000}
              step={10}
              value={specs.storage > 1000 ? 1000 : specs.storage}
              onChange={handleSliderChange.bind(null, 'storage')}
              className="w-full h-1.5 bg-[#F1EFE8] rounded-lg appearance-none cursor-pointer accent-[#534AB7]"
            />
            <span className="font-mono text-[10px] text-gray-400 w-8 text-right">1K max</span>
          </div>
        </div>

        {/* Bandwidth */}
        <div id="spec-group-bandwidth" className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="font-sans text-xs font-semibold text-[#2C2C2A] flex items-center space-x-1.5">
              <Network className="w-3.5 h-3.5 text-[#534AB7]" />
              <span>Egress Bandwidth (GB/mo)</span>
            </label>
            <input
              id="input-spec-bandwidth"
              type="number"
              min={1}
              max={10000}
              value={specs.bandwidth}
              onChange={(e) => handleNumberInputChange('bandwidth', e, 1, 10000)}
              className="w-14 text-center font-mono text-xs border border-[#d8d5cb] rounded py-0.5"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              id="slider-spec-bandwidth"
              type="range"
              min={1}
              max={500}
              step={5}
              value={specs.bandwidth > 500 ? 500 : specs.bandwidth}
              onChange={handleSliderChange.bind(null, 'bandwidth')}
              className="w-full h-1.5 bg-[#F1EFE8] rounded-lg appearance-none cursor-pointer accent-[#534AB7]"
            />
            <span className="font-mono text-[10px] text-gray-400 w-8 text-right">500 max</span>
          </div>
        </div>
      </div>

      <button
        id="btn-run-estimate"
        type="submit"
        disabled={loading}
        className="w-full bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-sans font-semibold text-sm py-2.5 rounded-lg transition-colors mt-8 disabled:opacity-50"
      >
        {loading ? 'Evaluating Price Quotes...' : 'Recalculate Estimate'}
      </button>
    </form>
  );
}

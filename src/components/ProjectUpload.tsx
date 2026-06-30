import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, FileCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SpecState } from './SpecForm';

interface ProjectUploadProps {
  onSpecsDetected: (specs: SpecState, notes: string[], source: string) => void;
  onError: (message: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ProjectUpload({ onSpecsDetected, onError }: ProjectUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    // 25MB Max
    const limit = 25 * 1024 * 1024;
    if (file.size > limit) {
      const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use the Chunked Upload tool for files > 25MB.`;
      onError(msg);
      return;
    }

    setUploading(true);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.specs) {
        const specs = response.data.specs;
        const notes = response.data.notes || [];
        const source = response.data.source || 'Uploaded File';
        
        onSpecsDetected(specs, notes, source);
        setSuccess(`Successfully analyzed "${file.name}"!`);
      } else {
        throw new Error('Analysis completed but did not return valid specifications.');
      }
    } catch (err: any) {
      console.error('[ProjectUpload] Error uploading file:', err);
      const errMsg = err.response?.data?.error || err.message || 'File analysis failed.';
      onError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="project-upload-container" className="bg-white border border-[#d8d5cb] rounded-lg p-5">
      <div className="flex items-center space-x-2 mb-3.5">
        <FileCode className="w-5 h-5 text-[#534AB7]" />
        <div>
          <h4 className="font-sans font-bold text-xs text-[#2C2C2A]">Auto-Detect Specs</h4>
          <p className="font-sans text-[10px] text-gray-500">
            Upload single file (Dockerfile, docker-compose.yml, k8s manifest, or .zip) up to 25MB.
          </p>
        </div>
      </div>

      <div
        id="drop-zone-single-file"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2 ${
          dragActive
            ? 'border-[#534AB7] bg-[#534AB7]/5'
            : success
            ? 'border-[#1D9E75] bg-[#1D9E75]/5'
            : 'border-[#d8d5cb] hover:bg-[#F1EFE8]/40'
        }`}
      >
        <input
          id="input-file-uploader"
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".zip,.yml,.yaml,Dockerfile,docker-compose.yml,docker-compose.yaml"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-[#534AB7] animate-spin" />
            <span className="font-sans text-xs font-semibold text-[#2C2C2A]">Parsing configuration specifications...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-8 h-8 text-[#1D9E75]" />
            <span className="font-sans text-xs font-semibold text-[#1D9E75]">{success}</span>
            <span className="font-sans text-[10px] text-gray-400">Click or drag another file to re-run detection</span>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="font-sans text-xs font-semibold text-[#2C2C2A]">
              Drag & drop file here, or <span className="text-[#534AB7] underline">browse files</span>
            </span>
            <span className="font-sans text-[9px] text-gray-400">
              Supports Dockerfile, docker-compose.yml, Kubernetes manifests or small zips
            </span>
          </>
        )}
      </div>
    </div>
  );
}

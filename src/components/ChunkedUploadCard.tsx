import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Layers, CheckCircle2, AlertTriangle, Loader2, ArrowUpCircle } from 'lucide-react';
import { SpecState } from './SpecForm';

interface ChunkedUploadCardProps {
  onSpecsDetected: (specs: SpecState, notes: string[], source: string) => void;
  onError: (message: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export default function ChunkedUploadCard({ onSpecsDetected, onError }: ChunkedUploadCardProps) {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processLargeFile = async (file: File) => {
    setUploading(true);
    setSuccess(null);
    setChunksUploaded(0);
    setStatusText('Initializing session...');

    const fileSize = file.size;
    const computedTotalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    setTotalChunks(computedTotalChunks);

    try {
      // 1. Initialize upload session
      const initResponse = await axios.post(`${API_URL}/api/upload/init`, {
        filename: file.name,
        totalSize: fileSize,
        totalChunks: computedTotalChunks,
      });

      const { uploadId } = initResponse.data;
      if (!uploadId) {
        throw new Error('Initialization response did not return an upload session ID.');
      }

      // 2. Upload chunks sequentially
      for (let index = 0; index < computedTotalChunks; index++) {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunkBlob = file.slice(start, end);

        setStatusText(`Uploading chunk ${index + 1} of ${computedTotalChunks}...`);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', index.toString());
        formData.append('chunk', chunkBlob, `chunk-${index}`);

        await axios.post(`${API_URL}/api/upload/chunk`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setChunksUploaded(index + 1);
      }

      // 3. Trigger sequential assembly and analysis
      setStatusText('Processing code structures & compiling specs...');
      const completeResponse = await axios.post(`${API_URL}/api/upload/complete`, {
        uploadId,
      });

      if (completeResponse.data && completeResponse.data.specs) {
        const specs = completeResponse.data.specs;
        const notes = completeResponse.data.notes || [];
        const source = completeResponse.data.source || 'Large Archive Upload';

        onSpecsDetected(specs, notes, source);
        setSuccess(`Successfully analyzed "${file.name}"!`);
      } else {
        throw new Error('Assembled codebase did not yield valid resource definitions.');
      }

    } catch (err: any) {
      console.error('[ChunkedUpload] Processing error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Chunked upload process failed.';
      onError(errMsg);
    } finally {
      setUploading(false);
      setStatusText('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processLargeFile(e.target.files[0]);
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const progressPercentage = totalChunks > 0 ? Math.round((chunksUploaded / totalChunks) * 100) : 0;

  return (
    <div id="chunked-upload-container" className="bg-white border border-[#d8d5cb] rounded-lg p-5">
      <div className="flex items-center space-x-2 mb-3.5">
        <Layers className="w-5 h-5 text-purple" />
        <div>
          <h4 className="font-sans font-bold text-xs text-[#2C2C2A]">Chunked Large Uploads</h4>
          <p className="font-sans text-[10px] text-gray-500">
            Split very large repositories (500MB+) sequentially using 5MB buffered chunks.
          </p>
        </div>
      </div>

      <div className="border border-[#d8d5cb]/60 rounded-lg p-4 bg-[#F1EFE8]/15 flex flex-col items-center justify-center space-y-3 min-h-[140px]">
        <input
          id="input-chunked-file"
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".zip"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="w-full space-y-2 text-center flex flex-col items-center">
            <Loader2 className="w-7 h-7 text-purple animate-spin" />
            <p className="font-sans font-semibold text-xs text-[#2C2C2A]">{statusText}</p>
            
            {/* Progress Bar */}
            <div className="w-full max-w-xs bg-gray-200 h-2 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-purple h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-gray-500">
              {chunksUploaded} / {totalChunks} chunks sent ({progressPercentage}%)
            </span>
          </div>
        ) : success ? (
          <div className="text-center space-y-2 flex flex-col items-center">
            <CheckCircle2 className="w-7 h-7 text-[#1D9E75]" />
            <p className="font-sans font-semibold text-xs text-[#1D9E75]">{success}</p>
            <button
              id="btn-chunked-reset"
              onClick={handlePickFile}
              className="font-sans text-[10px] text-purple hover:underline"
            >
              Upload another zip file
            </button>
          </div>
        ) : (
          <div className="text-center space-y-2 flex flex-col items-center">
            <ArrowUpCircle className="w-7 h-7 text-gray-400" />
            <button
              id="btn-trigger-chunked-pick"
              onClick={handlePickFile}
              className="bg-white hover:bg-[#F1EFE8] border border-[#d8d5cb] text-gray-dark px-4 py-2 rounded font-sans font-semibold text-xs transition-colors shadow-xs"
            >
              Select Big Zip Archive
            </button>
            <p className="font-sans text-[9px] text-gray-400">
              Files are split sequentially in memory to protect bandwidth stability
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

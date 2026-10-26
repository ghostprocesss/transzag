import React, { useState } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { uploadDatasetFile, loadDemoDataset } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDatasetChanged: () => void;
  datasetName: string;
}

export const DatasetManager: React.FC<Props> = ({
  isOpen,
  onClose,
  onDatasetChanged,
  datasetName,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const res = await uploadDatasetFile(file);
      setMessage({ text: res.message, error: false });
      onDatasetChanged();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setUploading(false);
    }
  };

  const handleResetDemo = async () => {
    setUploading(true);
    setMessage(null);
    try {
      const res = await loadDemoDataset();
      setMessage({ text: res.message, error: false });
      onDatasetChanged();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl border border-[#00ff66] bg-[#050a07] text-xs font-mono shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#132e1f] pb-2 mb-3">
          <div className="flex items-center space-x-2 text-[#00ff66]">
            <Upload className="h-4 w-4" />
            <span className="font-bold text-sm tracking-wider">[DATASET MANAGEMENT &amp; DEMO CONTROL]</span>
          </div>
          <button onClick={onClose} className="text-[#ff3344] hover:border border-[#ff3344] px-1.5 py-0.5">
            [X]
          </button>
        </div>

        <div className="space-y-4 text-[#5a8a6e]">
          {/* Current Status */}
          <div className="border border-[#132e1f] bg-[#030604] p-3 flex justify-between items-center">
            <span>ACTIVE LOADED DATASET:</span>
            <span className="text-[#00f0ff] font-bold text-sm">{datasetName}</span>
          </div>

          {/* Feedback banner */}
          {message && (
            <div className={`border p-2.5 flex items-start space-x-2 text-xs ${
              message.error ? 'border-[#ff3344] bg-[#ff3344]/10 text-[#ff3344]' : 'border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66]'
            }`}>
              {message.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Upload Box */}
          <div className="border border-dashed border-[#132e1f] hover:border-[#00ff66] bg-[#030604] p-6 text-center space-y-2">
            <Upload className="h-6 w-6 text-[#00ff66] mx-auto animate-pulse" />
            <div className="text-xs text-[#00ff66] font-semibold">
              Select or Drop CSV or JSON transaction records
            </div>
            <p className="text-[10px] text-[#5a8a6e]">
              Required Schema: tx_hash, from_address, to_address, amount, token, timestamp
            </p>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-2 text-xs text-[#00ff66]"
            />
            {file && (
              <div className="text-[11px] text-[#00f0ff] font-bold pt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 py-2 text-xs text-[#00ff66] font-bold disabled:opacity-30 transition-colors"
            >
              {uploading ? 'PARSING &amp; VALIDATING...' : '[IMPORT SELECTED FILE]'}
            </button>

            <button
              onClick={handleResetDemo}
              disabled={uploading}
              className="border border-[#ffb000] bg-[#ffb000]/10 hover:bg-[#ffb000]/20 px-4 py-2 text-xs text-[#ffb000] font-bold transition-colors"
            >
              [RELOAD DETERMINISTIC DEMO]
            </button>
          </div>

          {/* Download Sample Dataset Link */}
          <div className="border-t border-[#132e1f] pt-3 flex items-center justify-between text-xs">
            <span>NEED SAMPLE TEMPLATE?</span>
            <a
              href="/api/dataset/export"
              download="sample_transactions.csv"
              className="flex items-center space-x-1 border border-[#132e1f] hover:border-[#00f0ff] text-[#00f0ff] px-2 py-1 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>DOWNLOAD DEMO CSV</span>
            </a>
          </div>
        </div>

        <div className="mt-4 border-t border-[#132e1f] pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="border border-[#132e1f] hover:border-[#00ff66] text-[#00ff66] px-3 py-1"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { FileUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatementUploadProps {
  onUploaded: () => void;
}

// Only banks with a `pdf_statement` parsing config in banks.config.ts can go
// through this path — currently just HSBC_HK. Add more here as their
// line_pattern regex gets configured on the backend.
const PDF_BANKS = [{ id: 'HSBC_HK', name: 'HSBC Hong Kong' }];

export function StatementUpload({ onUploaded }: StatementUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bank, setBank] = useState(PDF_BANKS[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank', bank);

    try {
      const res = await fetch('/api/pipeline/upload-statement', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setResult({
          type: 'success',
          message: `Extracted ${data.recordsExtracted}, classified ${data.recordsClassified} (${data.recordsFlagged} flagged for review).`,
        });
        setFile(null);
        onUploaded();
      } else {
        setResult({ type: 'error', message: data.error || 'Upload failed.' });
      }
    } catch (error) {
      setResult({ type: 'error', message: 'Network error while uploading.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-50 rounded-lg">
          <FileUp className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No RPA Session? Upload a Statement PDF</h3>
          <p className="text-sm text-gray-500">
            Fallback for banks with no live portal session to attach to — parses a digitally-generated statement PDF directly.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {PDF_BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="flex-1 text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2
            ${!file || isUploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing...
            </>
          ) : (
            'Upload & Reconcile'
          )}
        </button>
      </div>

      {result && (
        <div className={`mt-4 flex items-start gap-2 text-sm p-3 rounded-lg ${
          result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {result.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{result.message}</span>
        </div>
      )}
    </section>
  );
}

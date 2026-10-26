import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { importApi } from '../api/import';
import type { PreviewResponse, ExecuteImportResponse } from '../api/import';
import { TopHeader } from '../components/layout/TopHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDateTime } from '../utils/formatters';

const SAMPLE_CSV = `fullName,phone,address,notes
Suresh Babu,9848099887,14-2-12 Arundelpet Guntur,Hardware shop owner
Lakshmi Prasanna,9848055443,Old Bus Stand Tenali,Punctual member
Naveen Kumar,9848033221,Market Road Mangalagiri,New grocery retailer`;

export const ImportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filename, setFilename] = useState('customers_migration.csv');
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [previewResult, setPreviewResult] = useState<PreviewResponse | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Past batches query
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['importHistory'],
    queryFn: importApi.getHistory,
  });

  // Preview Mutation
  const previewMutation = useMutation({
    mutationFn: () =>
      importApi.preview({
        batchType: 'CUSTOMERS',
        filename,
        csvContent,
      }),
    onSuccess: (res) => {
      setPreviewResult(res);
      setExecuteResult(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to parse and validate CSV file');
    },
  });

  // Execute Mutation
  const executeMutation = useMutation({
    mutationFn: () => {
      if (!previewResult) throw new Error('No previewed data to import');
      return importApi.execute({
        batchType: 'CUSTOMERS',
        filename: previewResult.filename,
        csvContent,
        rows: previewResult.rows,
      });
    },
    onSuccess: (res) => {
      setExecuteResult(res);
      setPreviewResult(null);
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Transactional import failed');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        setPreviewResult(null);
        setExecuteResult(null);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'durga_customers_sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <TopHeader
        title="Data Migration & Import"
        subtitle="Safe Excel/CSV Customer & Ledger Onboarding"
        showBack
        backPath="/more"
      />

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 shadow-xs">
            <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: File Upload & Template Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet size={16} className="text-teal-700" />
                <span>1. Select or Paste CSV File</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload existing customer records from notebook export or previous spreadsheet
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 self-start"
            >
              <Download size={13} />
              <span>Download Sample CSV</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upload .CSV File from Device
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  CSV Data Content (or Edit Below)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Columns: fullName, phone, address, notes
                </span>
              </div>
              <textarea
                rows={5}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setPreviewResult(null);
                }}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <button
              type="button"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending || !csvContent.trim()}
              className="py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Validating CSV Rows...</span>
                </>
              ) : (
                <>
                  <Upload size={15} />
                  <span>Preview & Validate Rows</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Row Validation & Preview Table */}
        {previewResult && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Validation Results & Row Preview
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  File: {previewResult.filename} • Total {previewResult.totalRows} row(s)
                </span>
              </div>

              {/* Counts Breakdown Pills */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {previewResult.validCount} Valid
                </span>
                {previewResult.warningCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    {previewResult.warningCount} Duplicate/Warning
                  </span>
                )}
                {previewResult.invalidCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 border border-red-200">
                    {previewResult.invalidCount} Invalid
                  </span>
                )}
              </div>
            </div>

            {/* Rows Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Validation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.rows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={
                        row.status === 'INVALID'
                          ? 'bg-red-50/40'
                          : row.status === 'WARNING'
                          ? 'bg-amber-50/40'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                        #{row.rowIndex}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            row.status === 'VALID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.fullName || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.phone || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{row.address || '-'}</td>
                      <td className="py-2.5 px-3">
                        {row.errors.length > 0 && (
                          <div className="text-red-700 font-semibold text-[11px]">
                            {row.errors.join('; ')}
                          </div>
                        )}
                        {row.warnings.length > 0 && (
                          <div className="text-amber-700 font-semibold text-[11px]">
                            {row.warnings.join('; ')}
                          </div>
                        )}
                        {row.errors.length === 0 && row.warnings.length === 0 && (
                          <span className="text-emerald-700 text-[11px]">Ready for import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Execute Import Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {previewResult.invalidCount > 0
                  ? 'Note: Invalid rows will be skipped during import.'
                  : 'All rows are validated and ready.'}
              </span>

              <button
                type="button"
                onClick={() => executeMutation.mutate()}
                disabled={executeMutation.isPending || previewResult.validCount === 0}
                className="py-3 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                {executeMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Executing Transactional Import...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Import {previewResult.validCount} Valid Customers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Import Success Summary */}
        {executeResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <h3 className="text-sm font-bold">Import Completed Successfully!</h3>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              <strong>{executeResult.successCount}</strong> customer records were imported and assigned unique customer codes. A raw file backup was preserved in the database for auditing.
            </p>

            <div className="space-y-1.5 pt-2">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Imported Customer Sample:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {executeResult.importedRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{r.fullName}</span>
                      <span className="text-[10px] text-slate-500 block">{r.phone}</span>
                    </div>
                    <span className="font-mono font-bold text-teal-800 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200">
                      {r.customerCode}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/customers"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                <span>View Customer Directory</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Past Import Batches History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={15} className="text-slate-500" />
            <span>Past Import History & File Backups</span>
          </h3>

          {isHistoryLoading ? (
            <LoadingSpinner message="Loading batch logs..." />
          ) : history && history.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {history.map((batch: any) => (
                <div key={batch.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{batch.filename}</div>
                    <div className="text-[11px] text-slate-500">
                      Type: {batch.batchType} • Imported on {formatDateTime(batch.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-teal-50 text-teal-800 border border-teal-200">
                      {batch.successCount} imported
                    </span>
                    {batch.skippedCount > 0 && (
                      <span className="ml-1 text-[10px] text-slate-400">({batch.skippedCount} skipped)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-3">
              No historical batches recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

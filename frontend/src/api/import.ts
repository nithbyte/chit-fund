import { apiClient } from './client';

export interface PreviewRow {
  rowIndex: number;
  fullName: string;
  phone: string;
  address?: string;
  notes?: string;
  status: 'VALID' | 'WARNING' | 'INVALID';
  errors: string[];
  warnings: string[];
}

export interface PreviewResponse {
  batchType: string;
  filename: string;
  totalRows: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  canImport: boolean;
  rows: PreviewRow[];
}

export interface ExecuteImportResponse {
  batchId: string;
  successCount: number;
  skippedCount: number;
  importedRecords: {
    id: string;
    customerCode: string;
    fullName: string;
    phone: string;
  }[];
}

export const importApi = {
  preview: (payload: { batchType: 'CUSTOMERS'; filename: string; csvContent: string }) =>
    apiClient<PreviewResponse>('/import/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  execute: (payload: { batchType: 'CUSTOMERS'; filename: string; csvContent: string; rows: PreviewRow[] }) =>
    apiClient<ExecuteImportResponse>('/import/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHistory: () => apiClient<any[]>('/import/history'),
};

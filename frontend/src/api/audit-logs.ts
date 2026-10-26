import { apiClient } from './client';

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  metadata?: any;
  timestamp: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditLogsApi = {
  getAll: (filters?: {
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<AuditLogsResponse>(`/audit-logs${qs}`);
  },
};

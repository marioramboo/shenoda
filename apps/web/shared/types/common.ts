/**
 * Standard API Response Structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Standard Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Query parameters for pagination & filtering
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * System Healthcheck Payload
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  database: 'connected' | 'disconnected';
  environment: string;
}

/**
 * Attendance Status Enum and Definition
 */
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'UNSET';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, { ar: string; en: string }> = {
  PRESENT: { ar: 'حاضر', en: 'Present' },
  ABSENT: { ar: 'غائب', en: 'Absent' },
  LATE: { ar: 'متأخر', en: 'Late' },
  UNSET: { ar: 'غير محدد', en: 'Unset' },
};

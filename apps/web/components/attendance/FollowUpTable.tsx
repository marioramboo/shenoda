'use client';

import React from 'react';
import {
  ServantSessionType,
  AttendanceStatus,
  SERVANT_SESSION_LABELS,
  ATTENDANCE_STATUS_LABELS,
} from '@shenoda/shared';
import { Badge } from '@/components/ui/Badge';
import { Check, X, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FollowUpRecord {
  id: string;
  sessionType: ServantSessionType;
  sessionDate: string;
  status: AttendanceStatus;
  notes?: string | null;
  recordedBy?: {
    id: string;
    fullName: string;
    role?: { name: string };
  } | null;
}

export interface FollowUpTableProps {
  servantName: string;
  roleName?: string;
  records: FollowUpRecord[];
  allowedSessions: ServantSessionType[];
  stats?: {
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    totalSessions: number;
    attendanceRatePercentage: number;
  };
  isLoading?: boolean;
}

export const FollowUpTable: React.FC<FollowUpTableProps> = ({
  servantName,
  roleName,
  records,
  allowedSessions,
  stats,
  isLoading = false,
}) => {
  // Extract unique sorted session dates
  const uniqueDates = Array.from(
    new Set(records.map((r) => r.sessionDate.split('T')[0]))
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 8); // Last 8 sessions

  // Quick lookup map: `${sessionType}_${date}` -> FollowUpRecord
  const recordMap = new Map<string, FollowUpRecord>();
  records.forEach((r) => {
    const d = r.sessionDate.split('T')[0];
    recordMap.set(`${r.sessionType}_${d}`, r);
  });

  const getStatusIcon = (status?: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-status-success-soft text-status-success">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-status-danger-soft text-status-danger">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </span>
        );
      case 'EXCUSED':
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-status-warning-soft text-status-warning">
            <Clock className="w-4 h-4" strokeWidth={2.5} />
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-bg-muted text-text-tertiary text-caption font-bold">
            -
          </span>
        );
    }
  };

  return (
    <div className="bg-bg-surface rounded-card border border-border-default shadow-card overflow-hidden">
      {/* Table Header & Servant Bio */}
      <div className="p-4 border-b border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-bg-surface">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-h3 font-bold text-text-primary">
              جدول متابعة الخادم: {servantName}
            </h3>
            {roleName && <Badge variant="primary">{roleName}</Badge>}
          </div>
          <p className="text-body-small text-text-secondary mt-0.5">
            سجل المتابعة الروحية والخدمية (للقراءة فقط - يسجلها المشرف المسؤول)
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-3 bg-bg-muted px-3.5 py-2 rounded-card border border-border-default">
            <div className="text-center">
              <span className="text-caption text-text-secondary block">نسبة الالتزام</span>
              <span className="text-body font-bold text-brand-primary">
                {stats.attendanceRatePercentage}%
              </span>
            </div>
            <div className="w-[1px] h-6 bg-border-default" />
            <div className="text-center">
              <span className="text-caption text-text-secondary block">حاضر</span>
              <span className="text-body font-bold text-status-success">{stats.presentCount}</span>
            </div>
            <div className="w-[1px] h-6 bg-border-default" />
            <div className="text-center">
              <span className="text-caption text-text-secondary block">غياب</span>
              <span className="text-body font-bold text-status-danger">{stats.absentCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Matrix Table with Horizontal Scroll */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right select-none min-w-[500px]">
          <thead>
            <tr className="bg-bg-muted border-b border-border-default">
              <th className="py-3 px-4 text-body-small font-semibold text-text-primary sticky right-0 bg-bg-muted z-10 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                نوع النشاط / الاجتماع
              </th>
              {uniqueDates.length === 0 ? (
                <th className="py-3 px-4 text-caption text-text-secondary font-normal">
                  لا توجد جلسات مسجلة بعد
                </th>
              ) : (
                uniqueDates.map((dateStr) => {
                  const dateObj = new Date(dateStr);
                  const formattedDate = dateObj.toLocaleDateString('ar-EG', {
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <th
                      key={dateStr}
                      className="py-3 px-3 text-center text-caption font-semibold text-text-secondary whitespace-nowrap min-w-[70px]"
                    >
                      <div className="flex flex-col items-center">
                        <Calendar className="w-3.5 h-3.5 text-text-tertiary mb-0.5" />
                        <span>{formattedDate}</span>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {allowedSessions.map((sessionType) => {
              const sessionLabel =
                SERVANT_SESSION_LABELS[sessionType]?.ar || sessionType;

              return (
                <tr
                  key={sessionType}
                  className="hover:bg-bg-surface-hover/50 transition-colors"
                >
                  <td className="py-3 px-4 text-body-small font-medium text-text-primary sticky right-0 bg-bg-surface z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    {sessionLabel}
                  </td>
                  {uniqueDates.map((dateStr) => {
                    const record = recordMap.get(`${sessionType}_${dateStr}`);
                    return (
                      <td
                        key={dateStr}
                        className="py-2.5 px-3 text-center align-middle"
                      >
                        {getStatusIcon(record?.status)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend Footer */}
      <div className="p-3 bg-bg-muted border-t border-border-default flex flex-wrap items-center justify-between gap-3 text-caption text-text-secondary">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-success" />
            حاضر
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-danger" />
            غائب
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-warning" />
            معتذر
          </span>
        </div>
        <div className="flex items-center gap-1 text-text-tertiary">
          <CheckCircle2 className="w-4 h-4 text-brand-primary" />
          <span>التحديث يتم دورياً بعد انتهاء كل خدمة</span>
        </div>
      </div>
    </div>
  );
};

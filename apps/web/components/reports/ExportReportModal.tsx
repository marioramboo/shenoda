'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  ShieldAlert,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageId?: string;
  stageName?: string;
  userRoleLevel: number;
}

export type ReportFormat = 'PDF' | 'EXCEL';
export type PdfReportType = 'stage-summary' | 'member-dossier';
export type ExcelReportType = 'stage-attendance' | 'stage-roster';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  stageId,
  stageName = 'المرحلة الحالية',
  userRoleLevel,
}) => {
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [pdfType, setPdfType] = useState<PdfReportType>('stage-summary');
  const [excelType, setExcelType] = useState<ExcelReportType>('stage-attendance');
  const [memberId, setMemberId] = useState('');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const canExportSensitive = userRoleLevel >= 2;

  const handleExport = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsExporting(true);

    try {
      let endpoint = '';
      let payload: any = { stageId };
      let defaultFileName = 'report';

      if (format === 'PDF') {
        if (pdfType === 'member-dossier') {
          if (!memberId.trim()) {
            throw new Error('يرجى تحديد معرف المخدوم المراد تصدير ملفه الرعوي');
          }
          endpoint = `/api/v1/reports/pdf/member-dossier/${memberId.trim()}`;
          defaultFileName = `member_dossier_${memberId.trim()}.pdf`;
          payload = {};
        } else {
          endpoint = '/api/v1/reports/pdf/stage-summary';
          defaultFileName = `stage_summary_${stageName || 'stage'}.pdf`;
        }
      } else {
        if (excelType === 'stage-attendance') {
          endpoint = '/api/v1/reports/excel/stage-attendance';
          defaultFileName = `attendance_matrix_${stageName || 'stage'}.xlsx`;
        } else {
          endpoint = '/api/v1/reports/excel/stage-roster';
          payload.includeSensitive = includeSensitive && canExportSensitive;
          defaultFileName = `stage_roster_${stageName || 'stage'}.xlsx`;
        }
      }

      const response = await api.post(endpoint, payload, {
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition if present
      let filename = defaultFileName;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Trigger native browser download
      const blob = new Blob([response.data], {
        type:
          format === 'PDF'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage('تم إنشاء المستند وتنزيله بنجاح، وتم قيد العملية في سجل الرقابة.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Export failed:', err);
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'حدث خطأ غير متوقع أثناء تصدير التقرير';
      setErrorMessage(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-surface w-full max-w-lg rounded-2xl shadow-elevated border border-border-default overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-primary-soft text-brand-primary flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                تصدير التقارير والبيانات
              </h2>
              <p className="text-xs text-text-secondary">
                {stageName} — مستندات رسمية موثقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-muted transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 bg-status-success-soft border border-status-success/30 rounded-xl flex items-center gap-2.5 text-status-success text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-status-danger-soft border border-status-danger/30 rounded-xl flex items-center gap-2.5 text-status-danger text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Format Selector */}
          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">
              صيغة المستند المطلوب
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('PDF')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                  format === 'PDF'
                    ? 'border-brand-primary bg-brand-primary-soft/40 text-brand-primary ring-2 ring-brand-primary/20 font-bold'
                    : 'border-border-default bg-bg-surface hover:bg-bg-muted text-text-secondary'
                }`}
              >
                <FileText className="w-7 h-7 text-red-500" />
                <div>
                  <div className="text-sm">مستند رسمي PDF</div>
                  <div className="text-xs opacity-75">ترويسة كنسية معتمدة</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('EXCEL')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                  format === 'EXCEL'
                    ? 'border-brand-primary bg-brand-primary-soft/40 text-brand-primary ring-2 ring-brand-primary/20 font-bold'
                    : 'border-border-default bg-bg-surface hover:bg-bg-muted text-text-secondary'
                }`}
              >
                <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                <div>
                  <div className="text-sm">جدول بيانات Excel</div>
                  <div className="text-xs opacity-75">اتجاه عربي أصلي RTL</div>
                </div>
              </button>
            </div>
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">
              نوع التقرير
            </label>
            {format === 'PDF' ? (
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    pdfType === 'stage-summary'
                      ? 'border-brand-primary bg-brand-primary-soft/20 text-text-primary'
                      : 'border-border-default hover:bg-bg-muted/50 text-text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="pdfType"
                    checked={pdfType === 'stage-summary'}
                    onChange={() => setPdfType('stage-summary')}
                    className="mt-1 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      ملخص تنفيذي للمرحلة (Stage Executive Summary)
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      موجز رسمي شهري لأب الكنيسة ولجنة الخدمة، يتضمن نسب الحضور وقمع المخاطر.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    pdfType === 'member-dossier'
                      ? 'border-brand-primary bg-brand-primary-soft/20 text-text-primary'
                      : 'border-border-default hover:bg-bg-muted/50 text-text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="pdfType"
                    checked={pdfType === 'member-dossier'}
                    onChange={() => setPdfType('member-dossier')}
                    className="mt-1 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      ملف الرعاية الفردي للمخدوم (Pastoral Dossier)
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      سجل فردي موحد يتضمن البيانات الأسرية، سجل الحضور، وملاحظات المشرفين.
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    excelType === 'stage-attendance'
                      ? 'border-brand-primary bg-brand-primary-soft/20 text-text-primary'
                      : 'border-border-default hover:bg-bg-muted/50 text-text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="excelType"
                    checked={excelType === 'stage-attendance'}
                    onChange={() => setExcelType('stage-attendance')}
                    className="mt-1 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      كشف الحضور والغياب الأسبوعي المتعدد (Attendance Matrix)
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      مصفوفة الحضور الكاملة (الأسابيع في الأعمدة والمخدومين في الصفوف).
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    excelType === 'stage-roster'
                      ? 'border-brand-primary bg-brand-primary-soft/20 text-text-primary'
                      : 'border-border-default hover:bg-bg-muted/50 text-text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="excelType"
                    checked={excelType === 'stage-roster'}
                    onChange={() => setExcelType('stage-roster')}
                    className="mt-1 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      سجل مخدومي المرحلة الشامل (Stage Members Roster)
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      بيانات الطلاب، العناوين، المدرسة، وهواتف أولياء الأمور.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Member ID Input if Individual Dossier */}
          {format === 'PDF' && pdfType === 'member-dossier' && (
            <div className="p-3.5 bg-bg-muted/40 rounded-xl border border-border-default space-y-2">
              <label className="block text-xs font-bold text-text-primary">
                معرف المخدوم (Member ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="مثال: member-uuid أو الكود التعريفي"
                  className="w-full h-10 px-3 pr-9 rounded-lg border border-border-default bg-bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <User className="w-4 h-4 text-text-tertiary absolute right-3 top-3" />
              </div>
            </div>
          )}

          {/* Sensitive Data Toggle (Level 2+) */}
          {format === 'EXCEL' && excelType === 'stage-roster' && (
            <div className="p-3.5 bg-bg-muted/40 rounded-xl border border-border-default space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-text-primary">
                    تضمين البيانات الحساسة المقيدة
                  </div>
                  <div className="text-xs text-text-secondary">
                    يشمل الحالة المادية وأرقام هواتف الأوصياء (يتطلب مستوى مساعد أمين فأعلى)
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!canExportSensitive}
                  checked={includeSensitive && canExportSensitive}
                  onChange={(e) => setIncludeSensitive(e.target.checked)}
                  className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary disabled:opacity-40 cursor-pointer"
                />
              </div>
              {!canExportSensitive && (
                <p className="text-xs text-status-warning font-medium">
                  حسابك لا يمتلك صلاحية تصدير البيانات الحساسة (مستوى خادم 1). سيتم حجبها تلقائياً.
                </p>
              )}
            </div>
          )}

          {/* Privacy & Audit Warning Banner (NFR-3.3) */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block mb-0.5">
                تنبيه سرية وتدقيق رقمي (NFR-3.3):
              </span>
              سيتم تسجيل عملية التصدير في سجل الرقابة الرقمي (Sensitive Access Logs)
              وربطها بهويتك وعنوان IP الخاص بك طبقا للائحة خصوصية وأمن البيانات الكنسية.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border-default bg-bg-muted/40 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            إلغاء
          </Button>

          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2 min-w-[140px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الإنشاء...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تنزيل التقرير</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

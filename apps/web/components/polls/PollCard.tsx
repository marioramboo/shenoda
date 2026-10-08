'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, Clock, BarChart3, AlertCircle, Trash2 } from 'lucide-react';

export interface PollOptionItem {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  percentage: number;
}

export interface PollItem {
  id: string;
  question: string;
  allowMultiple: boolean;
  closesAt: string;
  isClosed: boolean;
  createdAt: string;
  createdBy?: { id: string; fullName: string };
  stage?: { id: string; name: string } | null;
  sector?: { id: string; name: string } | null;
  userVotedOptionIds?: string[];
  totalVotes: number;
  options: PollOptionItem[];
}

interface PollCardProps {
  poll: PollItem;
  onVoted?: () => void;
  canDelete?: boolean;
  onDelete?: (poll: PollItem) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, onVoted, canDelete, onDelete }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollData, setPollData] = useState<PollItem>(poll);

  const hasVoted = Boolean(
    pollData.userVotedOptionIds && pollData.userVotedOptionIds.length > 0
  );
  const isExpired = new Date() > new Date(pollData.closesAt);
  const isClosed = pollData.isClosed || isExpired;
  const showResults = hasVoted || isClosed;

  const handleVote = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.post(`/api/v1/polls/${pollData.id}/vote`, {
        optionId: selectedOption,
      });

      // Refetch results immediately for real-time tallies
      const res = await api.get(`/api/v1/polls/${pollData.id}/results`);
      if (res.data.success) {
        setPollData((prev) => ({
          ...prev,
          totalVotes: res.data.data.totalVotes,
          options: res.data.data.options,
          userVotedOptionIds: [selectedOption],
        }));
      }
      if (onVoted) onVoted();
    } catch (err: any) {
      console.error('Error submitting vote:', err);
      const msg =
        err.response?.data?.error?.message ||
        'تعذر تسجيل التصويت، يرجى المحاولة لاحقاً';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-bg-surface rounded-card border border-border-default p-4 shadow-card hover:shadow-elevated transition-shadow">
      {/* Header with question and deadline badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-h2 font-bold text-text-primary leading-snug">
          {pollData.question}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-caption font-semibold ${
              isClosed
                ? 'bg-status-danger-soft text-status-danger border border-status-danger/20'
                : 'bg-brand-accent-soft text-brand-accent border border-brand-accent/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {isClosed ? 'استطلاع منتهي' : `ينتهي: ${formatDeadline(pollData.closesAt)}`}
          </span>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(pollData)}
              className="p-1 rounded-button text-text-secondary hover:text-status-danger hover:bg-status-danger-soft transition-colors"
              title="حذف استطلاع الرأي"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        {pollData.createdBy && (
          <p className="text-caption text-text-secondary">
            الناشر: <span className="font-medium text-text-primary">{pollData.createdBy.fullName}</span>
          </p>
        )}
        <div className="flex items-center gap-1.5">
          {pollData.stage && (
            <span className="px-2 py-0.5 rounded-pill text-[11px] bg-bg-app text-text-secondary border border-border-default font-medium">
              {pollData.stage.name}
            </span>
          )}
          {!pollData.stage && pollData.sector && (
            <span className="px-2 py-0.5 rounded-pill text-[11px] bg-brand-primary-soft text-brand-primary font-medium">
              {pollData.sector.name} (كامل القطاع)
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-input bg-status-danger-soft border border-status-danger/30 text-status-danger text-body-small flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Options Listing */}
      <div className="space-y-2.5">
        {pollData.options.map((option) => {
          const isUserChoice = pollData.userVotedOptionIds?.includes(option.id);

          if (showResults) {
            // Live Percentage Progress Bar View
            return (
              <div
                key={option.id}
                className={`relative overflow-hidden rounded-input border p-3 transition-all ${
                  isUserChoice
                    ? 'border-brand-primary bg-brand-primary-soft/40 ring-1 ring-brand-primary'
                    : 'border-border-default bg-bg-app/40'
                }`}
              >
                {/* Visual Progress Fill */}
                <div
                  className="absolute inset-y-0 right-0 bg-brand-primary/10 transition-all duration-700 ease-out"
                  style={{ width: `${option.percentage}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isUserChoice && (
                      <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                    )}
                    <span className="text-body-default font-medium text-text-primary">
                      {option.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-caption font-semibold text-brand-primary">
                    <span>{option.voteCount} صوت</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/80 border border-brand-primary/20">
                      {option.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Active Voting Radio View
          return (
            <label
              key={option.id}
              className={`flex items-center gap-3 p-3 rounded-input border cursor-pointer transition-colors ${
                selectedOption === option.id
                  ? 'border-brand-primary bg-brand-primary-soft/50 ring-1 ring-brand-primary'
                  : 'border-border-default bg-bg-surface hover:bg-bg-app/50'
              }`}
            >
              <input
                type="radio"
                name={`poll-${pollData.id}`}
                value={option.id}
                checked={selectedOption === option.id}
                onChange={() => setSelectedOption(option.id)}
                className="w-4 h-4 text-brand-primary border-border-default focus:ring-brand-primary"
              />
              <span className="text-body-default text-text-primary font-medium">
                {option.text}
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between text-caption text-text-secondary">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-brand-primary" />
          <span>إجمالي الأصوات: {pollData.totalVotes}</span>
        </div>

        {!showResults && (
          <button
            type="button"
            onClick={handleVote}
            disabled={!selectedOption || isSubmitting}
            className="px-4 py-1.5 rounded-button bg-brand-primary text-text-inverse font-semibold text-caption hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? 'جارٍ التسجيل...' : 'إرسال التصويت'}
          </button>
        )}

        {hasVoted && (
          <span className="text-status-success font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            تم تسجيل صوتك
          </span>
        )}
      </div>
    </div>
  );
};

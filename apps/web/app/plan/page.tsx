'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { TabBar } from '@/components/layout/TabBar';
import {
  CalendarCheck2,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronLeft,
  FileText,
} from 'lucide-react';

export default function StagePlanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');

  const lessons = [
    {
      id: 1,
      title: 'مقدمة في سر الإفخارستيا والتناول المقدس',
      date: 'الجمعة 3 أكتوبر 2026',
      assignedServant: 'مينا سمير',
      status: 'DONE',
      week: 'الأسبوع 1',
    },
    {
      id: 2,
      title: 'رحلة الخروج وعناية الله في البرية',
      date: 'الجمعة 10 أكتوبر 2026',
      assignedServant: 'بيتر عادل',
      status: 'UPCOMING',
      week: 'الأسبوع 2',
    },
    {
      id: 3,
      title: 'فضيلة المحبة والاتضاع في حياة القديسين',
      date: 'الجمعة 17 أكتوبر 2026',
      assignedServant: 'كيرلس ناصر',
      status: 'UPCOMING',
      week: 'الأسبوع 3',
    },
    {
      id: 4,
      title: 'تاريخ الكنيسة: مجمع نيقية وقانون الإيمان',
      date: 'الجمعة 24 أكتوبر 2026',
      assignedServant: 'يوسف مجدي',
      status: 'UPCOMING',
      week: 'الأسبوع 4',
    },
  ];

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-24">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="w-9 h-9 rounded-button flex items-center justify-center text-text-secondary hover:bg-bg-muted transition-colors"
                title="العودة للوحة التحكم"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-h2 font-bold text-text-primary">خطة ومنهج المرحلة</h1>
                <p className="text-caption text-text-secondary">
                  الخطة السنوية وتوزيع الدروس والأنشطة (FR-5.1)
                </p>
              </div>
            </div>

            <Badge variant="accent">
              {user?.scopes.stages[0]?.name || 'المرحلة النشطة'}
            </Badge>
          </header>

          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <Chip
              selected={selectedTerm === 'term1'}
              onClick={() => setSelectedTerm('term1')}
            >
              الترم الأول (خريف 2026)
            </Chip>
            <Chip
              selected={selectedTerm === 'term2'}
              onClick={() => setSelectedTerm('term2')}
            >
              الترم الثاني (ربيع 2027)
            </Chip>
          </div>

          {/* Theme Banner */}
          <section className="bg-brand-primary text-text-inverse rounded-card p-5 shadow-card flex flex-col gap-2.5 text-right">
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold px-2 py-0.5 bg-brand-accent text-white rounded-pill">
                شعار المرحلة لهذا العام
              </span>
              <Sparkles className="w-4 h-4 text-brand-accent" />
            </div>
            <h2 className="text-h2 font-bold text-white leading-tight">
              «أَمَّا أَنَا وَبَيْتِي فَنَعْبُدُ الرَّبَّ» (يش 24: 15)
            </h2>
            <p className="text-body-small text-brand-primary-soft leading-relaxed">
              الهدف السنوي: تعميق روح الانتماء للكنسية وبناء أسس روحية متينة لكل مخدوم في المرحلة.
            </p>
          </section>

          {/* Curriculum Lessons List */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-bold text-text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-primary" />
                <span>جدول الدروس والخدمات</span>
              </h2>
              <span className="text-caption text-text-secondary">
                {lessons.length} دروس مجدولة
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-semibold text-brand-primary">
                      {lesson.week}
                    </span>
                    {lesson.status === 'DONE' ? (
                      <Badge variant="success" withDot>
                        تم إلقاؤه
                      </Badge>
                    ) : (
                      <Badge variant="neutral" withDot>
                        قادم
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-body-default font-bold text-text-primary">
                    {lesson.title}
                  </h3>

                  <div className="flex items-center justify-between text-caption text-text-secondary pt-2 border-t border-border-default mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                      {lesson.date}
                    </span>
                    <span className="font-medium text-text-primary">
                      الخادم المسئول: {lesson.assignedServant}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Global Bottom Tab Bar */}
        <TabBar activeTab="plan" />
      </div>
    </ProtectedRoute>
  );
}

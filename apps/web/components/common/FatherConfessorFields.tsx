'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import {
  PRIEST_CONFESSORS,
  OTHER_CONFESSOR_OPTION,
  SHENODA_CHURCH_NAME,
} from '@shenoda/shared';
import { Church, UserCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FatherConfessorFieldsProps {
  fatherConfessor: string;
  fatherConfessorChurch: string;
  onChange: (confessor: string, church: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  churchLabel?: string;
  required?: boolean;
}

export const FatherConfessorFields: React.FC<FatherConfessorFieldsProps> = ({
  fatherConfessor,
  fatherConfessorChurch,
  onChange,
  disabled = false,
  className,
  label = 'أب الاعتراف',
  churchLabel = 'كنيسة أب الاعتراف',
  required = false,
}) => {
  // Determine if the current value matches one of the 6 canonical priests
  const isPresetPriest = PRIEST_CONFESSORS.includes(
    fatherConfessor as (typeof PRIEST_CONFESSORS)[number]
  );

  // Initial selected dropdown mode
  const getInitialSelection = () => {
    if (isPresetPriest) return fatherConfessor;
    if (fatherConfessor && fatherConfessor.trim().length > 0) return OTHER_CONFESSOR_OPTION;
    return '';
  };

  const [selectedOption, setSelectedOption] = useState<string>(getInitialSelection);
  const [customName, setCustomName] = useState<string>(
    isPresetPriest ? '' : fatherConfessor || ''
  );
  const [customChurch, setCustomChurch] = useState<string>(
    isPresetPriest ? SHENODA_CHURCH_NAME : fatherConfessorChurch || ''
  );

  // Keep internal states in sync if props change from outside (e.g. drawer opens with new record)
  useEffect(() => {
    const isPreset = PRIEST_CONFESSORS.includes(
      fatherConfessor as (typeof PRIEST_CONFESSORS)[number]
    );
    if (isPreset) {
      setSelectedOption(fatherConfessor);
      setCustomName('');
      setCustomChurch(SHENODA_CHURCH_NAME);
    } else if (fatherConfessor && fatherConfessor.trim().length > 0) {
      setSelectedOption(OTHER_CONFESSOR_OPTION);
      setCustomName(fatherConfessor);
      setCustomChurch(fatherConfessorChurch || '');
    } else {
      setSelectedOption('');
      setCustomName('');
      setCustomChurch('');
    }
  }, [fatherConfessor, fatherConfessorChurch]);

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedOption(val);

    if (val === OTHER_CONFESSOR_OPTION) {
      // Switched to Other
      const name = customName.trim();
      const church = customChurch.trim();
      onChange(name, church);
    } else if (val) {
      // Selected one of the 6 canonical priests
      setCustomName('');
      setCustomChurch(SHENODA_CHURCH_NAME);
      onChange(val, SHENODA_CHURCH_NAME);
    } else {
      // Cleared / None
      setCustomName('');
      setCustomChurch('');
      onChange('', '');
    }
  };

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomName(val);
    onChange(val, customChurch);
  };

  const handleCustomChurchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomChurch(val);
    onChange(customName, val);
  };

  const isOther = selectedOption === OTHER_CONFESSOR_OPTION;

  return (
    <div className={cn('w-full flex flex-col gap-3', className)}>
      {/* 1. Primary Dropdown */}
      <div className="w-full flex flex-col gap-1.5 text-right">
        <label className="text-body-small font-medium text-text-primary select-none flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-brand-primary" />
            {label}
            {required && <span className="text-status-danger">*</span>}
          </span>
          {selectedOption && !isOther && (
            <span className="text-caption text-brand-primary font-bold">
              كنيسة الأنبا شنودة
            </span>
          )}
        </label>

        <select
          value={selectedOption}
          onChange={handleDropdownChange}
          disabled={disabled}
          className={cn(
            'w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary',
            'disabled:bg-bg-muted disabled:text-text-disabled disabled:cursor-not-allowed'
          )}
        >
          <option value="">اختر أب الاعتراف...</option>
          {PRIEST_CONFESSORS.map((priest: string, idx: number) => (
            <option key={priest} value={priest}>
              {idx + 1}) {priest}
            </option>
          ))}
          <option value={OTHER_CONFESSOR_OPTION}>
            7) {OTHER_CONFESSOR_OPTION}
          </option>
        </select>
      </div>

      {/* 2. When 'اب اعتراف اخر' is chosen -> custom name & custom church */}
      {isOther && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-brand-primary-soft/30 rounded-card border border-brand-accent/30 animate-fade-in">
          <Input
            label="اسم أب الاعتراف"
            placeholder="اكتب اسم أب الاعتراف..."
            value={customName}
            onChange={handleCustomNameChange}
            disabled={disabled}
            required={required || isOther}
            iconLeading={<UserCheck className="w-4 h-4" />}
          />
          <Input
            label={churchLabel}
            placeholder="اكتب اسم الكنيسة والإيبارشية..."
            value={customChurch}
            onChange={handleCustomChurchChange}
            disabled={disabled}
            required={required || isOther}
            iconLeading={<Church className="w-4 h-4" />}
          />
        </div>
      )}

      {/* 3. When one of the 6 canonical priests is selected -> auto-filled church */}
      {selectedOption && !isOther && (
        <div className="w-full flex flex-col gap-1.5 text-right animate-fade-in">
          <label className="text-caption text-text-secondary select-none flex items-center gap-1.5">
            <Church className="w-3.5 h-3.5 text-brand-accent" />
            {churchLabel} (تلقائي)
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              disabled
              value={SHENODA_CHURCH_NAME}
              className="w-full h-[42px] bg-bg-muted text-text-primary font-cairo text-body-small rounded-input border border-border-default px-4 pr-10 cursor-not-allowed"
            />
            <div className="absolute right-3.5 flex items-center justify-center text-text-secondary">
              <Lock className="w-3.5 h-3.5 text-brand-primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

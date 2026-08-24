'use client';

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface DateSelectorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const today = new Date();

  const getDateStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const yesterdayStr = getDateStr(-1);
  const todayStr = getDateStr(0);
  const tomorrowStr = getDateStr(1);

  const presets = [
    { label: 'Kecha', date: yesterdayStr },
    { label: 'Bugun', date: todayStr },
    { label: 'Ertaga', date: tomorrowStr },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
      {presets.map((preset) => {
        const isActive = selectedDate === preset.date;
        return (
          <button
            key={preset.date}
            onClick={() => onDateChange(preset.date)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80',
            )}
          >
            {preset.label}
          </button>
        );
      })}

      <div className="relative flex items-center">
        <label
          htmlFor="custom-date-picker"
          className={clsx(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all',
            !presets.some((p) => p.date === selectedDate)
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80',
          )}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>{selectedDate}</span>
        </label>
        <input
          id="custom-date-picker"
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}

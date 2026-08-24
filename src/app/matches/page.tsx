'use client';

import React, { useState, useEffect } from 'react';
import { DateSelector } from '@/components/fixtures/DateSelector';
import { CompetitionFilter } from '@/components/fixtures/CompetitionFilter';
import { MatchCard } from '@/components/fixtures/MatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DBFixture } from '@/lib/db/queries';
import { Calendar, RefreshCw } from 'lucide-react';
import { formatUzbekDateWithWeekday } from '@/lib/utils/formatters';

export default function MatchesPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | undefined>(undefined);
  const [fixtures, setFixtures] = useState<DBFixture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchMatches(selectedDate, selectedCompetitionId);
  }, [selectedDate, selectedCompetitionId]);

  const fetchMatches = async (date: string, compId?: number) => {
    setLoading(true);
    try {
      let url = `/api/matches?date=${date}`;
      if (compId) url += `&competitionId=${compId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFixtures(data.fixtures || []);
      } else {
        setFixtures([]);
      }
    } catch {
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-400" />
            <span>O‘yinlar taqvimi</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {formatUzbekDateWithWeekday(selectedDate)} kunidagi barcha futbol uchrashuvlari
          </p>
        </div>

        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>

      {/* Competition Pills Filter */}
      <div className="pt-2">
        <CompetitionFilter
          selectedCompetitionId={selectedCompetitionId}
          onSelectCompetition={setSelectedCompetitionId}
        />
      </div>

      {/* Match Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-sm text-slate-400">O‘yinlar yuklanmoqda...</span>
        </div>
      ) : fixtures.length === 0 ? (
        <EmptyState
          title="Ushbu sanada o‘yinlar yo‘q"
          description={`${selectedDate} sanasiga mos keladigan o‘yinlar topilmadi. Boshqa sanani tanlab ko‘ring.`}
          icon="calendar"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fixtures.map((fixture) => (
            <MatchCard key={fixture.id || fixture.provider_fixture_id} fixture={fixture} />
          ))}
        </div>
      )}
    </div>
  );
}

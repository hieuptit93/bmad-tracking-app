import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../AuthProvider';

interface ContributionGraphProps {
  userId?: string; // If undefined, show team-wide data
  title?: string;
  compact?: boolean;
}

// Helper to get YYYY-MM-DD in local time
const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ContributionGraph({ userId, title, compact = false }: ContributionGraphProps) {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.
  const [earliestMonth, setEarliestMonth] = useState<{ year: number; month: number } | null>(null);

  // Calculate displayed month based on offset
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const displayDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return d;
  }, [monthOffset]);
  
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const monthName = displayDate.toLocaleString('vi-VN', { month: 'long' });

  // Fetch the earliest log date to know which months have data
  useEffect(() => {
    const fetchEarliestDate = async () => {
      let query = supabase
        .from('ai_impact_logs')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: rows } = await query;
      if (rows && rows.length > 0) {
        const earliest = new Date(rows[0].created_at);
        setEarliestMonth({ year: earliest.getFullYear(), month: earliest.getMonth() });
      } else {
        // No data at all — set to current month so navigation is disabled
        setEarliestMonth({ year: now.getFullYear(), month: now.getMonth() });
      }
    };
    fetchEarliestDate();
  }, [userId, user]);

  // Check if we can go further back
  const canGoPrev = useMemo(() => {
    if (!earliestMonth) return false;
    const prevDate = new Date(now.getFullYear(), now.getMonth() + monthOffset - 1, 1);
    const earliestDate = new Date(earliestMonth.year, earliestMonth.month, 1);
    return prevDate >= earliestDate;
  }, [monthOffset, earliestMonth]);

  // Can't go past the current month
  const canGoNext = monthOffset < 0;

  // Generate days in month
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Day of week for padding (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // We want Monday (1) as the first column (index 0)
    let startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push(getLocalDateString(d));
    }
    
    return days;
  }, [year, month]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
    
    let query = supabase
      .from('ai_impact_logs')
      .select('created_at, estimate_hours, actual_hours')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[ContributionGraph] Error:', error.message);
    } else if (logs) {
      const stats: Record<string, number> = {};
      logs.forEach(log => {
        // Convert created_at (UTC) to local date string
        const dateStr = getLocalDateString(new Date(log.created_at));
        const saved = Math.max(0, log.estimate_hours - log.actual_hours);
        stats[dateStr] = (stats[dateStr] || 0) + saved;
      });
      setData(stats);
    }
    setLoading(false);
  }, [year, month, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, user]);

  const getColorClass = (hours: number) => {
    if (hours === 0) return 'bg-stone-100';
    
    const isTeam = !userId;
    const t1 = isTeam ? 5 : 1;
    const t2 = isTeam ? 15 : 3;
    const t3 = isTeam ? 30 : 5;

    if (hours < t1) return 'bg-[#ff385c]/20';
    if (hours < t2) return 'bg-[#ff385c]/50';
    if (hours < t3) return 'bg-[#ff385c]/80';
    return 'bg-[#ff385c]';
  };

  const totalSaved = Object.values(data).reduce((acc, curr) => acc + curr, 0);

  // Capitalize first letter of month name
  const displayMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className={`bg-surface-container-lowest rounded-[20px] shadow-ambient border border-stone-50 h-fit ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex justify-between items-end ${compact ? 'mb-4' : 'mb-6'}`}>
        <div>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-on-surface`}>{title || 'Lịch sử tiết kiệm'}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => canGoPrev && setMonthOffset(prev => prev - 1)}
              disabled={!canGoPrev}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200 ${
                canGoPrev 
                  ? 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 active:scale-90 cursor-pointer' 
                  : 'text-stone-200 cursor-not-allowed'
              }`}
              aria-label="Tháng trước"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-[10px] text-secondary min-w-[70px] text-center select-none">
              {displayMonthName} {year}
            </span>
            <button
              onClick={() => canGoNext && setMonthOffset(prev => prev + 1)}
              disabled={!canGoNext}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200 ${
                canGoNext 
                  ? 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 active:scale-90 cursor-pointer' 
                  : 'text-stone-200 cursor-not-allowed'
              }`}
              aria-label="Tháng sau"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="text-right">
          <p className={`${compact ? 'text-sm' : 'text-base'} font-bold text-primary`}>{totalSaved.toFixed(1)}h</p>
          <p className="text-[9px] text-secondary uppercase tracking-wider">Tổng</p>
        </div>
      </div>

      <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-4'}`}>
        {/* Days Header */}
        <div className={`grid grid-cols-7 ${compact ? 'gap-1' : 'gap-2'}`}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="text-[9px] text-stone-400 font-bold text-center uppercase">{d}</div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className={`grid grid-cols-7 ${compact ? 'gap-1' : 'gap-2'} animate-pulse`}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`aspect-square bg-stone-100 ${compact ? 'rounded-sm' : 'rounded-md'}`} />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-7 ${compact ? 'gap-1' : 'gap-2'}`}>
            {daysInMonth.map((day, idx) => {
              if (day === null) return <div key={`pad-${idx}`} className="aspect-square" />;
              
              const hours = data[day] || 0;
              const isToday = day === todayStr;

              return (
                <div 
                  key={day} 
                  className="group relative aspect-square"
                >
                  <div className={`
                    w-full h-full transition-all duration-300
                    ${compact ? 'rounded-sm' : 'rounded-md'}
                    ${getColorClass(hours)}
                    ${isToday ? 'ring-1 ring-primary ring-offset-1 z-10' : ''}
                    hover:scale-110 hover:shadow-sm cursor-pointer
                  `} />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-[9px] rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
                    {day.split('-').reverse().slice(0, 2).join('/')}: {hours.toFixed(1)}h
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className={`mt-1 flex items-center justify-end ${compact ? 'gap-1' : 'gap-2'}`}>
          <span className="text-[9px] text-stone-400">Less</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-[1px] bg-stone-100" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-[#ff385c]/20" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-[#ff385c]/50" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-[#ff385c]/80" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-[#ff385c]" />
          </div>
          <span className="text-[9px] text-stone-400">More</span>
        </div>
      </div>
    </div>
  );
}

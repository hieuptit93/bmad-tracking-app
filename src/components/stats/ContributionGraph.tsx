import { useState, useEffect, useMemo } from 'react';
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

  // Get current month info (Local time)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('vi-VN', { month: 'long' });
  const todayStr = getLocalDateString(now);

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

  const fetchData = async () => {
    setLoading(true);
    
    const startOfMonth = new Date(year, month, 1).toISOString();
    
    let query = supabase
      .from('ai_impact_logs')
      .select('created_at, estimate_hours, actual_hours')
      .gte('created_at', startOfMonth);

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
  };

  useEffect(() => {
    fetchData();
  }, [userId, user]);

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

  return (
    <div className={`bg-surface-container-lowest rounded-[20px] shadow-ambient border border-stone-50 h-fit ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex justify-between items-end ${compact ? 'mb-4' : 'mb-6'}`}>
        <div>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-on-surface`}>{title || 'Lịch sử tiết kiệm'}</h3>
          <p className="text-[10px] text-secondary mt-0.5">{monthName} {year}</p>
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

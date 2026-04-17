import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';

interface DayData {
  date: string;
  hours_saved: number;
  reports: number;
}

interface ToolData {
  tool: string;
  count: number;
}

type Range = '7d' | '30d';

export default function ImpactChart() {
  const [range, setRange] = useState<Range>('7d');
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [toolData, setToolData] = useState<ToolData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      const days = range === '7d' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('ai_impact_logs')
        .select('created_at, estimate_hours, actual_hours, tool_used')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data) { setLoading(false); return; }

      // Group by date
      const byDate: Record<string, { hours_saved: number; reports: number }> = {};
      // Fill all days with 0
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        byDate[key] = { hours_saved: 0, reports: 0 };
      }

      const byTool: Record<string, number> = {};

      data.forEach((row) => {
        const key = new Date(row.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (byDate[key]) {
          byDate[key].hours_saved += Math.max(0, (row.estimate_hours ?? 0) - (row.actual_hours ?? 0));
          byDate[key].reports += 1;
        }
        byTool[row.tool_used] = (byTool[row.tool_used] || 0) + 1;
      });

      setDayData(
        Object.entries(byDate).map(([date, v]) => ({
          date,
          hours_saved: Math.round(v.hours_saved * 10) / 10,
          reports: v.reports,
        }))
      );

      setToolData(
        Object.entries(byTool)
          .map(([tool, count]) => ({ tool, count }))
          .sort((a, b) => b.count - a.count)
      );

      setLoading(false);
    };

    fetchChartData();
  }, [range]);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📈 Xu hướng tác động AI</h2>
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
          {(['7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                range === r
                  ? 'bg-white dark:bg-stone-700 text-on-surface shadow-sm'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {r === '7d' ? '7 ngày' : '30 ngày'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : dayData.every((d) => d.hours_saved === 0 && d.reports === 0) ? (
        <div className="h-48 flex flex-col items-center justify-center text-secondary">
          <span className="material-symbols-outlined text-4xl opacity-30 mb-2">bar_chart</span>
          <p className="text-sm">Chưa có đủ dữ liệu để hiển thị biểu đồ</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Area Chart — Hours saved by day */}
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Giờ tiết kiệm theo ngày</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dayData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="hoursSavedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ba0036" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ba0036" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value}h`, 'Giờ tiết kiệm']}
                />
                <Area
                  type="monotone"
                  dataKey="hours_saved"
                  stroke="#ba0036"
                  strokeWidth={2}
                  fill="url(#hoursSavedGradient)"
                  dot={{ r: 3, fill: '#ba0036' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart — Reports by tool */}
          {toolData.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Báo cáo theo công cụ AI</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={toolData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="tool" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value, 'Báo cáo']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#ba0036"
                    radius={[6, 6, 0, 0]}
                    name="Số báo cáo"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

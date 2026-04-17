import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ImpactChart from '../components/ImpactChart';
import ContributionGraph from '../components/stats/ContributionGraph';
import EditLogModal from '../components/EditLogModal';
import UserProgressTable from '../components/UserProgressTable';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import type { RecentLog } from '../types/log';

interface TeamStat {
  total_tasks: number;
  total_hours_saved: number;
  avg_percent_saved: number;
}

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url: string;
  department: string;
  total_logs: number;
  total_hours_saved: number;
  avg_percent_saved: number;
}

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [teamStat, setTeamStat] = useState<TeamStat | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Edit/Delete State ─────────────────────────────────────
  const [editingLog, setEditingLog] = useState<RecentLog | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: stat }, { data: board }, { data: logs }] = await Promise.all([
      supabase.from('team_impact_today').select('*').single(),
      supabase.from('leaderboard_30d').select('*').limit(10),
      supabase
        .from('ai_impact_logs')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (stat) setTeamStat(stat as TeamStat);
    if (board) setLeaderboard(board as LeaderboardEntry[]);
    if (logs) setRecentLogs(logs as RecentLog[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Realtime subscription for admin feed
    const channel = supabase
      .channel('admin-logs-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_impact_logs' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDelete = async (logId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa báo cáo này? (Quyền Admin)')) return;
    
    setIsDeleting(logId);
    const { error } = await supabase
      .from('ai_impact_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      alert('Lỗi khi xóa: ' + error.message);
    }
    setIsDeleting(null);
  };

  const statCards = [
    {
      label: 'Nhiệm vụ hôm nay',
      value: teamStat?.total_tasks ?? '--',
      unit: 'tasks',
      icon: 'task_alt',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Giờ tiết kiệm hôm nay',
      value: teamStat?.total_hours_saved ?? '--',
      unit: 'giờ',
      icon: 'schedule',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Hiệu quả trung bình',
      value: teamStat?.avg_percent_saved ? `${teamStat.avg_percent_saved}%` : '--',
      unit: '',
      icon: 'trending_up',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="bg-surface text-on-surface antialiased pt-20 pb-12 min-h-screen flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-8 w-full flex-grow space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
            <p className="text-secondary mt-1">
              Xin chào {profile?.full_name} — theo dõi hiệu suất toàn team
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Dữ liệu thời gian thực
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient flex items-center gap-4 border border-stone-50">
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {s.icon}
                </span>
              </div>
              <div>
                <p className="text-xs text-secondary font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-on-surface mt-0.5">
                  {loading ? <span className="animate-pulse bg-stone-200 rounded w-16 h-7 inline-block" /> : s.value}
                  {!loading && s.unit && <span className="text-sm font-normal text-secondary ml-1">{s.unit}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* User Progress Table */}
        <UserProgressTable />

        {/* Impact Charts Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ImpactChart />
          <ContributionGraph title="Cường độ sử dụng AI toàn team" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Leaderboard */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-ambient border border-stone-50">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">military_tech</span>
              Bảng xếp hạng (30 ngày)
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-stone-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-secondary text-sm text-center py-8">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, idx) => {
                   const initials = (entry.full_name || '?').charAt(0).toUpperCase();
                   return (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                      <span className={`text-sm font-bold w-5 text-center ${
                        idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-stone-400' : idx === 2 ? 'text-orange-400' : 'text-stone-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="relative w-8 h-8 flex-shrink-0">
                        {entry.avatar_url ? (
                          <img 
                            src={entry.avatar_url} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).classList.add('hidden');
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ${entry.avatar_url ? 'hidden absolute inset-0' : ''}`}>
                          {initials}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{entry.full_name || 'Anonymous'}</p>
                        <p className="text-xs text-secondary">{entry.total_logs} báo cáo</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{entry.total_hours_saved ?? 0}h</p>
                        <p className="text-xs text-secondary">{entry.avg_percent_saved ?? 0}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Logs */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-ambient border border-stone-50">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">list_alt</span>
              Báo cáo gần đây (toàn team)
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-stone-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-secondary text-sm text-center py-8">Chưa có báo cáo nào</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentLogs.map((log) => {
                  const name = log.profiles?.full_name || 'User';
                  const initials = name.charAt(0).toUpperCase();
                  const isOwn = log.user_id === user?.id;
                  const isToday = new Date(log.created_at).toDateString() === new Date().toDateString();

                  return (
                    <div key={log.id} className="group flex items-start gap-3 p-4 rounded-xl hover:bg-stone-50 transition-colors border border-stone-100 relative">
                      <div className="relative w-9 h-9 flex-shrink-0 mt-0.5">
                        {log.profiles?.avatar_url ? (
                          <img 
                            src={log.profiles.avatar_url} 
                            alt="" 
                            className="w-9 h-9 rounded-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).classList.add('hidden');
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex ${log.profiles?.avatar_url ? 'hidden absolute inset-0' : ''}`}>
                          {initials}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap pr-16">
                          <span className="text-sm font-semibold">{name}</span>
                          <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{log.tool_used}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{log.category}</span>
                        </div>
                        <p className="text-sm text-on-surface truncate mt-1 font-medium">{log.task_name}</p>
                        <p className="text-xs text-secondary mt-1">
                          {log.estimate_hours}h dự kiến → {log.actual_hours}h thực tế ·{' '}
                          <span className="text-emerald-600 font-bold">tiết kiệm {log.percent_saved}%</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-[10px] text-stone-400">
                          {new Date(log.created_at).toLocaleDateString('vi-VN')}
                        </span>
                        
                        {/* Admin Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isOwn && isToday && (
                            <button
                              onClick={() => setEditingLog(log)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(log.id)}
                            disabled={isDeleting === log.id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Xóa (Admin)"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isDeleting === log.id ? 'sync' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Edit Modal (Chỉ admin có thể sửa log của chính mình) */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={() => {
            fetchData();
            setEditingLog(null);
          }}
        />
      )}
    </div>
  );
}

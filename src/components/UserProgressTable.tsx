import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProgress {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  today_count: number;
  last_submission: string | null;
}

export default function UserProgressTable() {
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email');

    if (!profiles) {
      setLoading(false);
      return;
    }

    const { data: todayLogs } = await supabase
      .from('ai_impact_logs')
      .select('user_id, created_at')
      .gte('created_at', todayISO);

    const progressMap = new Map<string, { count: number; lastTime: string | null }>();

    (todayLogs || []).forEach((log) => {
      const existing = progressMap.get(log.user_id);
      if (existing) {
        existing.count++;
        if (!existing.lastTime || log.created_at > existing.lastTime) {
          existing.lastTime = log.created_at;
        }
      } else {
        progressMap.set(log.user_id, { count: 1, lastTime: log.created_at });
      }
    });

    const result: UserProgress[] = profiles.map((p) => {
      const progress = progressMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: p.email,
        today_count: progress?.count || 0,
        last_submission: progress?.lastTime || null,
      };
    });

    result.sort((a, b) => {
      if (a.today_count === 0 && b.today_count > 0) return 1;
      if (a.today_count > 0 && b.today_count === 0) return -1;
      return b.today_count - a.today_count;
    });

    setUsers(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchProgress();

    const channel = supabase
      .channel('user-progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_impact_logs' }, () => {
        fetchProgress();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const submitted = users.filter((u) => u.today_count > 0).length;
  const total = users.length;

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient border border-stone-50">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-500">group</span>
          Tiến độ Team hôm nay
        </h2>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${submitted === total ? 'text-emerald-600' : 'text-amber-600'}`}>
            {submitted}/{total}
          </span>
          <span className="text-xs text-secondary">đã nộp</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-stone-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-secondary text-sm text-center py-6">Chưa có thành viên</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {users.map((user) => {
            const initials = (user.full_name || user.email || '?').charAt(0).toUpperCase();
            const hasSubmitted = user.today_count > 0;

            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  hasSubmitted ? 'bg-emerald-50/50' : 'bg-amber-50/50'
                }`}
              >
                <div className="relative w-8 h-8 flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).classList.add('hidden');
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ${
                      user.avatar_url ? 'hidden absolute inset-0' : ''
                    }`}
                  >
                    {initials}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.full_name || user.email}</p>
                  {hasSubmitted && user.last_submission && (
                    <p className="text-xs text-secondary">
                      Lần cuối: {formatTime(user.last_submission)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasSubmitted ? (
                    <>
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        {user.today_count} báo cáo
                      </span>
                      <span className="material-symbols-outlined text-emerald-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        Chưa nộp
                      </span>
                      <span className="material-symbols-outlined text-amber-500 text-lg">
                        schedule
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

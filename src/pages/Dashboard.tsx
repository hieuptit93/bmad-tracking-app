import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import EditLogModal from '../components/EditLogModal';
import LogItem from '../components/LogItem';
import ContributionGraph from '../components/stats/ContributionGraph';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import type { RecentLog } from '../types/log';

const CATEGORIES = ['Frontend', 'Backend', 'Kiểm thử', 'Code mẫu', 'Sửa lỗi', 'DevOps', 'Tài liệu'];
const AI_TOOLS = ['Cursor', 'GitHub Copilot', 'ChatGPT', 'Claude', 'Gemini', 'Windsurf', 'Khác'];

interface TeamStat {
  total_tasks: number;
  total_hours_saved: number;
  avg_percent_saved: number;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'bạn';

  // ── Form state ──────────────────────────────────────────
  const [taskName, setTaskName] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [category, setCategory] = useState('');
  const [toolUsed, setToolUsed] = useState('Cursor');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Feed & Stats ─────────────────────────────────────────
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [teamStat, setTeamStat] = useState<TeamStat | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);

  // ── Edit/Delete State ─────────────────────────────────────
  const [editingLog, setEditingLog] = useState<RecentLog | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchFeed = async () => {
    const [logsResult, statResult] = await Promise.all([
      supabase
        .from('ai_impact_logs')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('team_impact_today').select('*').single(),
    ]);

    if (logsResult.error) {
      console.error('[Feed] Error fetching logs:', logsResult.error.message);
    } else if (logsResult.data) {
      setRecentLogs(logsResult.data as RecentLog[]);
    }

    if (statResult.error) {
      console.warn('[Stat] team_impact_today error:', statResult.error.message);
    } else if (statResult.data) {
      setTeamStat(statResult.data as TeamStat);
    }

    setFeedLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    const channel = supabase
      .channel('logs-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_impact_logs' }, () => {
        fetchFeed();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!taskName.trim()) return setErrorMsg('Vui lòng nhập tên nhiệm vụ.');
    if (!estimateHours || parseFloat(estimateHours) <= 0) return setErrorMsg('Thời gian dự kiến phải lớn hơn 0.');
    if (!actualHours || parseFloat(actualHours) < 0) return setErrorMsg('Thời gian thực tế không hợp lệ.');
    if (!category) return setErrorMsg('Vui lòng chọn lĩnh vực.');
    if (!user) return setErrorMsg('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');

    setSubmitting(true);
    const { error } = await supabase.from('ai_impact_logs').insert({
      user_id: user.id,
      task_name: taskName.trim(),
      estimate_hours: parseFloat(estimateHours),
      actual_hours: parseFloat(actualHours),
      category,
      tool_used: toolUsed,
      rating: rating || null,
      notes: notes.trim() || null,
    });

    setSubmitting(false);
    if (error) {
      setSubmitStatus('error');
      setErrorMsg('Gửi báo cáo thất bại: ' + error.message);
    } else {
      setSubmitStatus('success');
      setTaskName('');
      setEstimateHours('');
      setActualHours('');
      setCategory('');
      setToolUsed('Cursor');
      setRating(0);
      setNotes('');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa báo cáo này?')) return;
    
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

  const hoursSaved =
    estimateHours && actualHours
      ? Math.max(0, parseFloat(estimateHours) - parseFloat(actualHours))
      : null;
  const pctSaved =
    estimateHours && actualHours && parseFloat(estimateHours) > 0
      ? Math.round(((parseFloat(estimateHours) - parseFloat(actualHours)) / parseFloat(estimateHours)) * 100)
      : null;

  return (
    <div className="bg-surface text-on-surface antialiased pt-20 pb-12 min-h-screen flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
        {/* ── LEFT: Form ─────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Xin chào, {displayName} 👋</h1>
            <p className="text-secondary mt-1">Ghi lại các chỉ số công việc để theo dõi hiệu quả đạt được</p>
          </div>

          <div className="bg-surface-container-lowest rounded-[20px] p-8 shadow-ambient border border-stone-50">
            <h2 className="text-lg font-bold mb-6">Ghi nhận sử dụng BMAD AI hôm nay</h2>

            {hoursSaved !== null && (
              <div className="mb-5 flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  bolt
                </span>
                Dự kiến tiết kiệm{' '}
                <span className="font-bold">{hoursSaved.toFixed(1)} giờ</span>
                {pctSaved !== null && (
                  <span className="ml-1 bg-emerald-100 px-2 py-0.5 rounded-full text-xs">{pctSaved}%</span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="taskName">
                  Tên nhiệm vụ <span className="text-primary">*</span>
                </label>
                <input
                  id="taskName"
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="ví dụ: Tái cấu trúc thành phần xác thực"
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 placeholder:text-secondary focus:ring-2 focus:ring-primary/40 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="estTime">
                    Dự kiến (giờ) <span className="text-primary">*</span>
                  </label>
                  <input
                    id="estTime"
                    type="number"
                    min="0"
                    step="any"
                    value={estimateHours}
                    onChange={(e) => setEstimateHours(e.target.value)}
                    placeholder="4.0"
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 placeholder:text-secondary focus:ring-2 focus:ring-primary/40 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" htmlFor="actTime">
                    Thực tế (giờ) <span className="text-primary">*</span>
                  </label>
                  <input
                    id="actTime"
                    type="number"
                    min="0"
                    step="any"
                    value={actualHours}
                    onChange={(e) => setActualHours(e.target.value)}
                    placeholder="2.5"
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 placeholder:text-secondary focus:ring-2 focus:ring-primary/40 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">
                  Lĩnh vực <span className="text-primary">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        category === cat
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-container-low text-secondary hover:bg-surface-container'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="aiTool">
                  Công cụ AI chính đã dùng
                </label>
                <select
                  id="aiTool"
                  value={toolUsed}
                  onChange={(e) => setToolUsed(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 transition-all outline-none"
                >
                  {AI_TOOLS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Đánh giá mức độ hỗ trợ của AI</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <span
                        className="material-symbols-outlined text-2xl transition-colors"
                        style={{
                          color: star <= (hoverRating || rating) ? '#ff385c' : '#d1d5db',
                          fontVariationSettings: star <= (hoverRating || rating) ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="notes">
                  Ghi chú thêm <span className="text-secondary font-normal">(tuỳ chọn)</span>
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mô tả ngắn về cách AI hỗ trợ bạn..."
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 placeholder:text-secondary focus:ring-2 focus:ring-primary/40 transition-all outline-none resize-none"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-base">error</span>
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || submitStatus === 'success'}
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-white font-medium py-4 px-6 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Đang gửi...
                    </>
                  ) : submitStatus === 'success' ? (
                    <>
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Đã gửi báo cáo!
                    </>
                  ) : (
                    <>
                      <span>Gửi báo cáo</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Stats + Feed ─────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight hidden lg:block">Tổng quan hôm nay</h2>

          <div className="bg-gradient-to-br from-[#ba0036] to-[#e21e4a] rounded-[20px] p-8 shadow-ambient relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
              <span className="material-symbols-outlined text-9xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div className="relative z-10">
              <p className="text-white/80 text-xs uppercase tracking-widest font-semibold mb-2">TÁC ĐỘNG NHÓM HÔM NAY</p>
              {feedLoading ? (
                <div className="h-12 bg-white/20 rounded-xl animate-pulse w-3/4" />
              ) : (
                <h3 className="text-4xl font-extrabold text-white tracking-tighter">
                  {teamStat?.avg_percent_saved ?? 0}%{' '}
                  <span className="text-xl font-semibold opacity-80">Thời gian tiết kiệm</span>
                </h3>
              )}
              <div className="mt-4 flex items-center gap-2 text-white/90 text-sm">
                <span className="material-symbols-outlined text-sm">task_alt</span>
                <span>
                  {feedLoading ? '...' : `${teamStat?.total_tasks ?? 0} báo cáo · ${teamStat?.total_hours_saved ?? 0}h tiết kiệm`}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly History Graph - Compact version on the right */}
          <ContributionGraph userId={user?.id} title="Thành tích cá nhân" compact={true} />

          <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-ambient border border-stone-50">
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-base font-bold">Báo cáo gần đây</h4>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Realtime" />
            </div>

            {feedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-stone-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-stone-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-stone-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                <span className="material-symbols-outlined text-4xl opacity-30 block mb-2">inbox</span>
                <p className="text-sm">Chưa có báo cáo nào. Hãy là người đầu tiên!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {recentLogs.slice(0, 5).map((log) => (
                  <LogItem
                    key={log.id}
                    log={log}
                    onEdit={setEditingLog}
                    onDelete={handleDelete}
                    isDeleting={isDeleting === log.id}
                  />
                ))}

                {recentLogs.length > 5 && (
                  <div className="pt-2 border-t border-stone-100 flex justify-center">
                    <Link 
                      to="/logs" 
                      className="group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 font-semibold text-sm transition-all duration-300 active:scale-95"
                    >
                      <span>Xem tất cả báo cáo</span>
                      <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={() => {
            fetchFeed();
            setEditingLog(null);
          }}
        />
      )}
    </div>
  );
}

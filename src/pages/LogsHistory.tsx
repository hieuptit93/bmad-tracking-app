import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import LogItem from '../components/LogItem';
import EditLogModal from '../components/EditLogModal';
import { supabase } from '../lib/supabase';
import type { RecentLog } from '../types/log';

import { useSearchParams } from 'react-router-dom';

const ITEMS_PER_PAGE = 10;

export default function LogsHistory() {
  const [searchParams] = useSearchParams();
  const userIdFilter = searchParams.get('user');
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [editingLog, setEditingLog] = useState<RecentLog | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('ai_impact_logs')
      .select('*, profiles(full_name, avatar_url)', { count: 'exact' });

    if (userIdFilter) {
      query = query.eq('user_id', userIdFilter);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[LogsHistory] Error:', error.message);
    } else {
      setLogs(data as RecentLog[]);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page, userIdFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa báo cáo này?')) return;
    setIsDeleting(id);
    const { error } = await supabase.from('ai_impact_logs').delete().eq('id', id);
    if (error) alert('Lỗi khi xóa: ' + error.message);
    else fetchLogs();
    setIsDeleting(null);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="bg-surface text-on-surface antialiased pt-20 pb-12 min-h-screen flex flex-col">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-6 mt-8 flex-grow w-full">
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tất cả báo cáo</h1>
            <p className="text-secondary text-sm">Xem lịch sử tác động AI của toàn bộ hệ thống</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[24px] p-6 shadow-ambient border border-stone-50 min-h-[400px]">
          {loading ? (
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-stone-100 rounded-full" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-stone-100 rounded w-1/2" />
                    <div className="h-3 bg-stone-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-secondary">
              <span className="material-symbols-outlined text-6xl opacity-20 mb-4">history</span>
              <p>Chưa có dữ liệu lịch sử</p>
            </div>
          ) : (
            <div className="space-y-6">
              {logs.map(log => (
                <LogItem 
                  key={log.id} 
                  log={log} 
                  onEdit={setEditingLog}
                  onDelete={handleDelete}
                  isDeleting={isDeleting === log.id}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-between border-t border-stone-100 pt-6">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                Trang trước
              </button>
              
              <span className="text-sm text-secondary font-medium">
                Trang {page + 1} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                Trang sau
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={() => {
            fetchLogs();
            setEditingLog(null);
          }}
        />
      )}
    </div>
  );
}

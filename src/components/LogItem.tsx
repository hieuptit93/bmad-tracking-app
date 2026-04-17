import type { RecentLog } from '../types/log';
import { useAuth } from './AuthProvider';

interface LogItemProps {
  log: RecentLog;
  onEdit?: (log: RecentLog) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export default function LogItem({ log, onEdit, onDelete, isDeleting }: LogItemProps) {
  const { user, isAdmin } = useAuth();
  const name = log.profiles?.full_name || 'User';
  const initials = name.charAt(0).toUpperCase();
  const savedH = (log.estimate_hours - log.actual_hours).toFixed(1);
  const isOwn = log.user_id === user?.id;
  const isToday = new Date(log.created_at).toDateString() === new Date().toDateString();

  return (
    <div className="flex gap-3 items-start group relative border-b border-stone-50 pb-4 last:border-0 last:pb-0">
      <div className="relative w-10 h-10 flex-shrink-0">
        {log.profiles?.avatar_url ? (
          <img 
            src={log.profiles.avatar_url} 
            alt={name} 
            className="w-10 h-10 rounded-full object-cover" 
            onError={(e) => {
              (e.target as HTMLImageElement).classList.add('hidden');
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ${log.profiles?.avatar_url ? 'hidden absolute inset-0' : ''}`}>
          {initials}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug pr-12">
          <span className="font-semibold">{name}</span>
          {' '}tiết kiệm{' '}
          <span className="font-bold text-primary">{savedH}h</span>
          {' '}bằng {log.tool_used}
        </p>
        <p className="text-xs text-secondary mt-0.5 truncate">{log.task_name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{log.category}</span>
          <span className="text-[10px] text-emerald-600 font-medium">{log.percent_saved}% tiết kiệm</span>
          <span className="text-[10px] text-stone-300">•</span>
          <span className="text-[10px] text-stone-400">
            {new Date(log.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] text-stone-400">
          {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        
        {(isOwn && isToday || isAdmin) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && isOwn && isToday && (
              <button
                onClick={() => onEdit(log)}
                className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                title="Sửa"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(log.id)}
                disabled={isDeleting}
                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="Xóa"
              >
                <span className="material-symbols-outlined text-sm">
                  {isDeleting ? 'sync' : 'delete'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

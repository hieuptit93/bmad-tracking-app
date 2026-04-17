import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Frontend', 'Backend', 'Kiểm thử', 'Code mẫu', 'Sửa lỗi', 'DevOps', 'Tài liệu'];
const AI_TOOLS = ['Cursor', 'GitHub Copilot', 'ChatGPT', 'Claude', 'Gemini', 'Windsurf', 'Khác'];

interface Log {
  id: string;
  task_name: string;
  estimate_hours: number;
  actual_hours: number;
  category: string;
  tool_used: string;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  log: Log | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditLogModal({ log, onClose, onSaved }: Props) {
  const [taskName, setTaskName] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [category, setCategory] = useState('');
  const [toolUsed, setToolUsed] = useState('Cursor');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (log) {
      setTaskName(log.task_name);
      setEstimateHours(String(log.estimate_hours));
      setActualHours(String(log.actual_hours));
      setCategory(log.category);
      setToolUsed(log.tool_used);
      setRating(log.rating ?? 0);
      setNotes(log.notes ?? '');
    }
  }, [log]);

  if (!log) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!taskName.trim()) return setErrorMsg('Vui lòng nhập tên nhiệm vụ.');
    if (!estimateHours || parseFloat(estimateHours) <= 0) return setErrorMsg('Thời gian dự kiến phải lớn hơn 0.');
    if (!category) return setErrorMsg('Vui lòng chọn lĩnh vực.');

    setSaving(true);
    const { error } = await supabase
      .from('ai_impact_logs')
      .update({
        task_name: taskName.trim(),
        estimate_hours: parseFloat(estimateHours),
        actual_hours: parseFloat(actualHours),
        category,
        tool_used: toolUsed,
        rating: rating || null,
        notes: notes.trim() || null,
      })
      .eq('id', log.id);

    setSaving(false);
    if (error) {
      setErrorMsg('Lỗi: ' + error.message);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800 sticky top-0 bg-white dark:bg-stone-900 z-10">
          <h2 className="text-lg font-bold">✏️ Chỉnh sửa báo cáo</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
          >
            <span className="material-symbols-outlined text-base text-stone-400">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="edit-taskName">
              Tên nhiệm vụ <span className="text-primary">*</span>
            </label>
            <input
              id="edit-taskName"
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="edit-est">
                Dự kiến (giờ) <span className="text-primary">*</span>
              </label>
              <input
                id="edit-est"
                type="number"
                min="0"
                step="any"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="edit-act">
                Thực tế (giờ) <span className="text-primary">*</span>
              </label>
              <input
                id="edit-act"
                type="number"
                min="0"
                step="any"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Category */}
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
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-primary text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tool */}
          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="edit-tool">
              Công cụ AI
            </label>
            <select
              id="edit-tool"
              value={toolUsed}
              onChange={(e) => setToolUsed(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              {AI_TOOLS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold mb-2">Đánh giá AI</label>
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="edit-notes">
              Ghi chú <span className="text-stone-400 font-normal">(tuỳ chọn)</span>
            </label>
            <textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              <span className="material-symbols-outlined text-base">error</span>
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

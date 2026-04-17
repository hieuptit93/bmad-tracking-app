import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, department, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-surface text-on-surface antialiased pt-20 pb-12 min-h-screen flex flex-col">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 md:px-12 mt-10 w-full flex-grow space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt tài khoản</h1>
          <p className="text-secondary mt-1">Cập nhật thông tin cá nhân của bạn</p>
        </div>

        {/* Profile Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient space-y-6">
          {/* Avatar & Role */}
          <div className="flex items-center gap-5">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-primary/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold ring-4 ring-primary/10">
                {(profile?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-on-surface">{profile?.full_name ?? 'Chưa cập nhật'}</p>
              <p className="text-sm text-secondary">{profile?.email ?? user?.email}</p>
              <span className={`mt-1.5 inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                profile?.role === 'admin'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-stone-100 text-stone-500'
              }`}>
                {profile?.role === 'admin' ? '👑 Admin' : '👤 Member'}
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2" htmlFor="fullName">
                Họ và tên
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface placeholder:text-secondary focus:ring-2 focus:ring-primary/40 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2" htmlFor="department">
                Phòng ban / Team
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="vd: Frontend Team, Backend Team..."
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface placeholder:text-secondary focus:ring-2 focus:ring-primary/40 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                Email
              </label>
              <input
                type="email"
                value={profile?.email ?? user?.email ?? ''}
                disabled
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-4 py-3 text-secondary cursor-not-allowed outline-none"
              />
              <p className="text-xs text-secondary mt-1.5">Email được lấy từ tài khoản Google, không thể thay đổi.</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : saved ? (
                  <>
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Đã lưu!
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

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 flex gap-4">
          <span className="material-symbols-outlined text-blue-500 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
          </span>
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Thông tin về Role</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Role được quản lý bởi Admin hệ thống. Để thay đổi quyền, hãy liên hệ quản trị viên.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

function NavLink({ to, children }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-sm ${
        isActive
          ? 'text-primary border-b-2 border-primary pb-1'
          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/50 dark:hover:bg-stone-800/50'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md shadow-ambient">
      <div className="flex justify-between items-center h-16 px-6 md:px-12 w-full mx-auto max-w-7xl">
        {/* Brand */}
        <div className="text-xl font-bold text-primary tracking-tighter">
          AI Impact Tracker
        </div>

          <div className="hidden md:flex space-x-2">
            <NavLink to="/">Báo cáo</NavLink>
            {isAdmin && <NavLink to="/admin">Dashboard</NavLink>}
            {isAdmin && <NavLink to="/users">Thành viên</NavLink>}
            <NavLink to="/settings">Cài đặt</NavLink>
          </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 hover:bg-stone-100/70 dark:hover:bg-stone-800/70 rounded-full pl-2 pr-3 py-1.5 transition-colors"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                {initials}
              </div>
            )}
            <span className="hidden md:block text-sm font-medium text-stone-700 dark:text-stone-200 max-w-[120px] truncate">
              {displayName}
            </span>
            {isAdmin && (
              <span className="hidden md:block text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            )}
            <span className="material-symbols-outlined text-base text-stone-400">expand_more</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200/60 dark:border-stone-700/60 overflow-hidden z-50">
              {/* User Info */}
              <div className="px-4 py-3.5 border-b border-stone-100 dark:border-stone-800">
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{displayName}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">{profile?.email || user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isAdmin ? 'bg-primary/10 text-primary' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}>
                    {isAdmin ? '👑 Admin' : '👤 Member'}
                  </span>
                  {profile?.department && (
                    <span className="text-[10px] text-stone-400">· {profile.department}</span>
                  )}
                </div>
              </div>

              {/* Menu */}
              <div className="py-1.5">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-stone-400">settings</span>
                  Cài đặt tài khoản
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-stone-400">admin_panel_settings</span>
                      Quản trị hệ thống
                    </Link>
                    <Link
                      to="/users"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-stone-400">group</span>
                      Quản lý người dùng
                    </Link>
                  </>
                )}
              </div>

              {/* Sign Out */}
              <div className="py-1.5 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={() => { setDropdownOpen(false); signOut(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

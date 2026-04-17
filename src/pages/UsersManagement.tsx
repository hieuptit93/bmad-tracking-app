import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ContributionGraph from '../components/stats/ContributionGraph';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: 'member' | 'admin';
  department: string | null;
  created_at: string;
}

export default function UsersManagement() {
  const { isAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.id) {
      alert('Bạn không thể tự hạ quyền của chính mình!');
      return;
    }

    try {
      setIsUpdating(userId);
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as 'member' | 'admin' } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Không thể cập nhật quyền hạn.');
    } finally {
      setIsUpdating(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('Bạn không thể xóa chính mình!');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này? Thao tác này sẽ xóa hồ sơ và tất cả báo cáo liên quan.')) {
      return;
    }

    try {
      setIsUpdating(userId);
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Không thể xóa người dùng. Vui lòng kiểm tra lại quyền hạn.');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900 antialiased">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Quản lý người dùng</h1>
            <p className="text-stone-500 mt-1">Quản lý quyền hạn và danh sách thành viên trong hệ thống.</p>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">search</span>
            <input 
              type="text" 
              placeholder="Tìm kiếm tên, email, phòng ban..."
              className="pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl w-full md:w-80 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Phòng ban</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Ngày tham gia</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-stone-400">Đang tải danh sách...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name || ''} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-stone-400 font-bold">{user.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900 truncate">{user.full_name || 'Chưa đặt tên'}</p>
                            <p className="text-xs text-stone-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-stone-600">{user.department || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-red-50 text-red-700' 
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Thành viên'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                            title="Xem chi tiết người dùng"
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                          
                          <button
                            onClick={() => toggleAdmin(user.id, user.role)}
                            disabled={isUpdating === user.id || user.id === currentUser?.id}
                            className={`p-2 rounded-lg transition-all ${
                              user.role === 'admin'
                                ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                                : 'text-primary hover:bg-primary/5'
                            } disabled:opacity-30`}
                            title={user.role === 'admin' ? 'Gỡ quyền Admin' : 'Cấp quyền Admin'}
                          >
                            <span className="material-symbols-outlined text-xl">
                              {user.role === 'admin' ? 'person_remove' : 'admin_panel_settings'}
                            </span>
                          </button>
                          
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={isUpdating === user.id || user.id === currentUser?.id}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                            title="Xóa người dùng"
                          >
                            <span className="material-symbols-outlined text-xl">
                              {isUpdating === user.id ? 'sync' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900">Chi tiết người dùng</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {/* Profile Header */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 overflow-hidden shadow-inner">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt={selectedUser.full_name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">{selectedUser.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">{selectedUser.full_name || 'Chưa đặt tên'}</h3>
                  <p className="text-stone-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedUser.role === 'admin' ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {selectedUser.role === 'admin' ? '👑 Quản trị viên' : '👤 Thành viên'}
                    </span>
                    {selectedUser.department && (
                      <span className="text-sm text-stone-400">· {selectedUser.department}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contribution Graph */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                <ContributionGraph userId={selectedUser.id} title="Hoạt động trong tháng" />
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-white border border-stone-100 rounded-xl">
                  <p className="text-stone-400 mb-1">Ngày gia nhập</p>
                  <p className="font-semibold text-stone-900">
                    {new Date(selectedUser.created_at).toLocaleDateString('vi-VN', { 
                      day: '2-digit', month: 'long', year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="p-4 bg-white border border-stone-100 rounded-xl">
                  <p className="text-stone-400 mb-1">ID Người dùng</p>
                  <p className="font-mono text-[10px] text-stone-500 break-all">{selectedUser.id}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 flex gap-3">
              <button 
                onClick={() => navigate(`/logs?user=${selectedUser.id}`)}
                className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-semibold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">list_alt</span>
                Xem tất cả báo cáo
              </button>
              <button 
                onClick={() => setSelectedUser(null)}
                className="flex-1 bg-white border border-stone-200 text-stone-700 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

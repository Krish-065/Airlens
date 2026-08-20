import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import CustomCursor from '@/components/effects/CustomCursor';
import { Flag, Trash2, MessageSquare } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  coins: number;
  createdAt: string;
  level: string;
  postCount: number;
}

interface Report {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  city: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  _count?: {
    comments: number;
  };
}

interface ModerationGroup {
  targetType: string;
  targetId: string;
  reportCount: number;
  reports: any[];
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'moderation'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [moderationReports, setModerationReports] = useState<ModerationGroup[]>([]);
  
  // Comments Management Modal
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [reportComments, setReportComments] = useState<any[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        await adminApi.check();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'users') fetchUsers();
      else if (activeTab === 'reports') fetchReports();
      else if (activeTab === 'moderation') fetchModerationReports();
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await adminApi.login({ password });
      sessionStorage.setItem('adminToken', res.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await adminApi.logout();
      setIsAuthenticated(false);
      setUsers([]);
      setReports([]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await adminApi.getReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    }
  };

  const fetchModerationReports = async () => {
    try {
      const data = await adminApi.getModerationReports();
      setModerationReports(data);
    } catch (err) {
      console.error('Failed to fetch moderation reports', err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminApi.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Failed to delete user');
    }
  };

  const deleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await adminApi.deleteReport(id);
      setReports(reports.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete report', err);
      alert('Failed to delete report');
    }
  };

  const openCommentsModal = async (reportId: string) => {
    setSelectedReportId(reportId);
    setCommentsModalOpen(true);
    fetchReportComments(reportId);
  };

  const fetchReportComments = async (reportId: string) => {
    try {
      const data = await adminApi.getReportComments(reportId);
      setReportComments(data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await adminApi.deleteComment(commentId);
      fetchReportComments(selectedReportId);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await adminApi.deleteReply(replyId);
      fetchReportComments(selectedReportId);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <CustomCursor />
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter admin password"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Login
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Return to site
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 relative">
      <CustomCursor />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Go to App
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(['users', 'reports', 'moderation'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level/Badge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Posts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coins</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="h-8 w-8 rounded-full mr-3 object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 text-green-600 dark:text-green-400 font-bold">
                              {user.name?.charAt(0) || user.email.charAt(0)}
                            </div>
                          )}
                          {user.name || 'Unnamed User'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {user.level || 'Newbie'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.postCount || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.coins}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title & Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map(report => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img src={report.imageUrl} alt={report.title} className="h-16 w-16 object-cover rounded-md" />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="font-medium">{report.title}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{report.city || 'Unknown location'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {report.user?.name || report.user?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <button 
                          onClick={() => openCommentsModal(report.id)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MessageSquare size={16} />
                          See Comments & Replies ({report._count?.comments || 0})
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => deleteReport(report.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No reports found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Moderation Queue</h2>
              <div className="space-y-4">
                {moderationReports.map(group => (
                  <div key={`${group.targetType}-${group.targetId}`} className="bg-gray-700/50 border border-red-500/20 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-2.5 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded-md border border-red-500/30">
                          {group.targetType}
                        </span>
                        <span className="ml-3 text-sm text-gray-400">ID: {group.targetId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-lg">
                        <Flag size={16} />
                        {group.reportCount} Reports
                      </div>
                    </div>
                    
                    <div className="space-y-3 pl-4 border-l-2 border-gray-600">
                      {group.reports.map((report: any) => (
                        <div key={report.id} className="text-sm">
                          <span className="text-white font-medium">{report.reporter?.name}</span>
                          <span className="text-gray-400 mx-2">reported for</span>
                          <span className="text-red-400 font-medium">{report.reason}</span>
                          {report.details && (
                            <p className="text-gray-300 mt-1 p-2 bg-gray-800/50 rounded-lg">{report.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-600 flex justify-end gap-3">
                      <button 
                        onClick={() => {
                          if (group.targetType === 'COMMENT') deleteComment(group.targetId);
                          else if (group.targetType === 'REPLY') deleteReply(group.targetId);
                          else if (group.targetType === 'REPORT') deleteReport(group.targetId);
                        }}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete Content
                      </button>
                    </div>
                  </div>
                ))}
                {moderationReports.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No content has been reported.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Management Modal */}
      {commentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Manage Comments & Replies</h3>
              <button 
                onClick={() => setCommentsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {reportComments.map(comment => (
                <div key={comment.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-white">{comment.user.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={() => deleteComment(comment.id)}
                      className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 rounded-md"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">{comment.content}</p>

                  {comment.replies?.length > 0 && (
                    <div className="pl-4 border-l-2 border-white/10 space-y-3">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="font-medium text-gray-200 text-xs">{reply.user.name}</span>
                            </div>
                            <button 
                              onClick={() => deleteReply(reply.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-gray-400 text-xs">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {reportComments.length === 0 && (
                <p className="text-center text-gray-500 py-8">No comments found for this post.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, Trash2, UserPlus, Users, Activity, Clock, Key, Lock, ChevronDown, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Add User State
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpPass, setNewEmpPass] = useState('');
    const [showPassword, setShowPassword] = useState(false); // Visibility Toggle
    const [newEmpRole, setNewEmpRole] = useState('user'); // 'user', 'manager', 'admin'
    const [selectedManagerId, setSelectedManagerId] = useState('');

    // Load Users
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load users", err);
            setLoading(false);
        }
    };

    // Derived State for Managers dropdown
    const managers = users.filter(u => u.role === 'manager');

    // Add User Handler
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const payload = {
                username: newEmpName,
                password: newEmpPass,
                role: newEmpRole,
                managerId: (newEmpRole === 'user' && selectedManagerId) ? selectedManagerId : null
            };

            // Using the /api/users/add endpoint we saw earlier (or fallback to admin/add-user if that was the route)
            // The previous summary said /api/users/add was created. Let's strictly use the one we saw or the one we will ensure exists.
            // I will assume /api/users/add is the robust one based on previous context.
            // Fix: Remove /api prefix since axios base already has it
            const response = await api.post('/users/add', payload);

            if (response.data) {
                setMessage(`✅ Success: Added ${newEmpName} as ${newEmpRole}`);
                setNewEmpName('');
                setNewEmpPass('');
                setNewEmpRole('user');
                setSelectedManagerId('');
                fetchUsers(); // Refresh list
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            console.error(err);
            const status = err.response?.status;
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            const fullError = status ? `${status}: ${errorMsg}` : errorMsg;

            setError(`❌ Error: ${fullError}`);
            setTimeout(() => setError(''), 5000);
        }
    };

    // Delete User Handler
    const handleDeleteUser = async (id, username) => {
        if (!window.confirm(`Are you sure you want to KICK OUT ${username}? They will not be able to login again.`)) return;

        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
            setMessage(`🚫 Kicked out ${username}`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setError("Failed to delete user");
        }
    };

    // Reset Modal State
    const [resetModalUser, setResetModalUser] = useState(null);
    const [resetPasswordValue, setResetPasswordValue] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Open Modal
    const openResetModal = (targetUser) => {
        setResetModalUser(targetUser);
        setResetPasswordValue('');
        setIsResetModalOpen(true);
    };

    // Execute Reset
    const handleExecuteReset = async (e) => {
        e.preventDefault();
        if (!resetModalUser || !resetPasswordValue) return;

        try {
            // Fix: Remove /api prefix
            await api.post(`/users/change-password`, {
                userId: resetModalUser.id,
                newPassword: resetPasswordValue
            });
            setMessage(`✅ Password for ${resetModalUser.username} updated!`);
            setIsResetModalOpen(false);
            setResetModalUser(null);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setError("Failed to reset password");
            setTimeout(() => setError(''), 3000);
        }
    };

    // Security Guard
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white flex items-center">
                <Shield className="mr-3 h-8 w-8 text-indigo-600" />
                {user.role === 'admin' ? 'Admin Settings' : 'Team Management'}
            </h1>

            {/* --- ADD USER SECTION --- */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center border-b pb-4 dark:border-gray-700">
                    <UserPlus className="mr-2 h-5 w-5 text-green-500" />
                    Create New User
                </h3>

                <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input
                            type="text"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="e.g. Ahmed"
                            required
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newEmpPass}
                                onChange={(e) => setNewEmpPass(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
                                placeholder="e.g. pass123"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ROLE SELECTION */}
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <div className="relative">
                            <select
                                value={newEmpRole}
                                onChange={(e) => setNewEmpRole(e.target.value)}
                                disabled={user.role === 'manager'}
                                className={`w-full p-2.5 rounded-lg border transition-all appearance-none ${user.role === 'manager'
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500'
                                    }`}
                            >
                                <option value="user">Employee (User)</option>
                                {user.role === 'admin' && <option value="manager">Manager</option>}
                                {user.role === 'admin' && <option value="admin">Admin</option>}
                            </select>
                            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* MANAGER ASSIGNMENT REMOVED AS REQUESTED */}
                    {/* 
                    <div className="lg:col-span-1">
                        ...
                    </div> 
                    */}

                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-md w-full hover:shadow-lg flex items-center justify-center">
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create
                    </button>
                </form>

                {/* Feedback Messages */}
                {message && <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-medium border border-green-200 dark:border-green-800 flex items-center animate-in fade-in slide-in-from-top-2">{message}</div>}
                {error && <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-medium border border-red-200 dark:border-red-800 flex items-center animate-in fade-in slide-in-from-top-2">{error}</div>}
            </div>

            {/* --- USER LIST SECTION --- */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <Users className="mr-2 h-5 w-5 text-indigo-500" />
                        Team Structure
                    </h3>
                    <span className="text-sm px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                        {users.length} Active Accounts
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reports To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mr-4 shadow-sm">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{u.username}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
                                            u.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                                                'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {u.manager_username ? (
                                            <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                                                <Shield className="w-3 h-3 mr-1" />
                                                {u.manager_username}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600">--</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">
                                            <Activity className="h-4 w-4 mr-2 text-gray-400" />
                                            {u.records_count || 0} Records
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Admin Only Actions */}
                                            {user.role === 'admin' && (
                                                <>
                                                    <button
                                                        onClick={() => openResetModal(u)}
                                                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 flex items-center"
                                                        title="Reset Password"
                                                    >
                                                        <Key className="h-4 w-4" />
                                                    </button>

                                                    {u.id !== user.id && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.username)}
                                                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400 flex items-center"
                                                            title="Kick Out User"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {/* Manager Actions (If any? Currently None) */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- RESET PASSWORD MODAL --- */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Lock className="w-5 h-5 mr-2 text-amber-500" />
                            Reset Password for <span className="text-indigo-600 dark:text-indigo-400 ml-1">{resetModalUser?.username}</span>
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Enter a new password. The user will need to use this new password immediately.
                        </p>

                        <form onSubmit={handleExecuteReset}>
                            <input
                                type="text"
                                value={resetPasswordValue}
                                onChange={(e) => setResetPasswordValue(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 mb-6"
                                placeholder="New Password"
                                autoFocus
                                required
                            />

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
                                >
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}


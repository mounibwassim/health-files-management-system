import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, LayoutDashboard, ArrowLeft, UserPlus, HeartPulse } from 'lucide-react';

export default function Login() {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'reset', 'repair'

    // Form States
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // UI States
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, repairAccount, resetPassword, user } = useAuth(); // Destructure user
    const navigate = useNavigate();

    // Fix for "Nothing happens": Automatically redirect when user is detected
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            let res;
            if (mode === 'signup') {
                res = await signup(username, password);
                if (res.success) {
                    setMessage('Account created! Redirecting...');
                    setLoading(false); // Reset loading immediately
                    // Auto-redirect to Login mode after 1.5s
                    setTimeout(() => {
                        setMode('login');
                        setMessage(''); // Clear success message
                    }, 1500);
                }
            } else if (mode === 'login') {
                res = await login(username, password);
                if (res.success) {
                    // Navigation handled by useEffect
                }
            } else if (mode === 'reset') {
                res = await resetPassword(username);
                if (res.success) {
                    setMessage(res.message);
                }
            } else if (mode === 'repair') {
                // Reform Mode: Link existing email to username
                console.log("Repairing account for:", email);
                res = await repairAccount(username, email, password);
                if (res.success) {
                    setMessage('Username linked! Redirecting...');
                    // Navigation handled by useEffect
                }
            }

            if (res && !res.success) {
                setError(res.error);
                // If error, force loading to false so user can retry
                setLoading(false);
            }

        } catch (err) {
            console.error("Unexpected error:", err);
            setError("An unexpected application error occurred.");
            setLoading(false);
        }
        // NOTE: We do NOT set loading(false) on success, to prevent the form from flashing back to active state while redirecting
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <img src="/logo.png" alt="HealthFiles Manager Logo" className="h-32 w-auto mx-auto object-contain" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    {mode === 'login' && 'Sign in to HealthFiles'}
                    {mode === 'signup' && 'Create Admin Account'}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {mode === 'login' && 'Enter your credentials to access the system'}
                    {mode === 'signup' && 'Set up a new administrator username'}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {/* Success Message */}
                        {message && (
                            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900 text-green-600 dark:text-green-200 px-4 py-3 rounded-md text-sm">
                                {message}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-200 px-4 py-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        {/* Username Field - Always Visible */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2"
                                    placeholder={mode === 'repair' ? "Desired Username (e.g. mounib)" : "Enter username"}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password Field - Login, Signup, AND Repair */}
                        {mode !== 'reset' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                            </div>
                        )}

                        {/* Mode Switchers */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                {mode === 'login' && (
                                    <>
                                        {/* <div className="text-sm">
                                            <button type="button" onClick={() => setMode('signup')} className="font-medium text-indigo-600 hover:text-indigo-500">
                                                Create Account
                                            </button>
                                        </div> */}
                                    </>
                                )}

                                {mode !== 'login' && (
                                    <div className="text-sm w-full text-center">
                                        <button type="button" onClick={() => setMode('login')} className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center justify-center mx-auto">
                                            <ArrowLeft className="h-4 w-4 mr-1" />
                                            Back to Login
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Create Account')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

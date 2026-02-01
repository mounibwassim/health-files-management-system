import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, User, LogOut, Check, HeartPulse, Trash2, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DeleteModal from './DeleteModal';

export default function Navbar() {
    // Theme State
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Auth State
    const { user, logout, deleteAccount } = useAuth();
    const navigate = useNavigate();

    // Modal State

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const confirmDeleteAccount = async () => {
        const res = await deleteAccount();
        if (res.success) {
            alert("Account deleted.");
            navigate('/login');
        } else {
            alert("Failed to delete: " + res.error);
        }
        setIsDeleteModalOpen(false);
    };

    const handleDeleteClick = () => {
        console.log("Delete button clicked!");
        setIsDeleteModalOpen(true);
    };

    // Apply Theme
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo & Title */}
                    <Link to="/" className="flex items-center space-x-3 group mr-8">
                        <img src="/logo.png" alt="HealthFiles Manager Logo" className="h-10 w-10 object-contain" />
                        <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
                            HealthFiles Manager
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex space-x-4 flex-1">
                        <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                            Dashboard
                        </Link>
                        <Link to="/analytics" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                            Analytics
                        </Link>
                    </div>

                    {/* Right Section: Profile & Theme */}
                    <div className="flex items-center space-x-4">

                        {/* User Profile */}
                        {user && (
                            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600">
                                <div className="bg-indigo-100 dark:bg-indigo-900 p-1 rounded-full">
                                    <User className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 mr-1">
                                    {user.username}
                                </span>
                            </div>
                        )}



                        {/* Theme Toggle */}
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>



                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>

                        {/* Admin Settings Link */}
                        {user && user.role === 'admin' && (
                            <Link
                                to="/settings"
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                                title="Admin Settings"
                            >
                                <Settings className="h-5 w-5" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteAccount}
                title="CRITICAL WARNING"
                message="Are you sure you want to PERMANENTLY DELETE your account? This cannot be undone."
            />
        </nav>
    );
}

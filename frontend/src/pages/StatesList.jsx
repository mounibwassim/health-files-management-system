import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Loader } from 'lucide-react';

export default function StatesList() {
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // CEO Panel Logic (Admin User Creation)
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpPass, setNewEmpPass] = useState('');
    const [adminMessage, setAdminMessage] = useState('');

    useEffect(() => {
        const cached = sessionStorage.getItem('states_data');
        if (cached) {
            console.log('Using cached states');
            setStates(JSON.parse(cached));
            setLoading(false);
            return;
        }

        console.log('Fetching states...');
        api.get('/states')
            .then(res => {
                setStates(res.data);
                sessionStorage.setItem('states_data', JSON.stringify(res.data));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch states", err);
                setError("Failed to load states. Please check API connection.");
                setLoading(false);
            });
    }, []);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/add-user', {
                username: newEmpName,
                password: newEmpPass,
                adminUsername: JSON.parse(localStorage.getItem('user'))?.username || 'admin'
            });

            if (response.data) {
                setAdminMessage(`✅ Success: Added ${newEmpName}`);
                setNewEmpName('');
                setNewEmpPass('');
                setTimeout(() => setAdminMessage(''), 3000);
            }
        } catch (err) {
            console.error("Add User Error", err);
            setAdminMessage(`❌ Error: ${err.response?.data?.error || "Network Error"}`);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <Loader className="animate-spin w-10 h-10 text-indigo-600 mb-4" />
            <p className="text-gray-500">Loading states...</p>
        </div>
    );

    if (error) return (
        <div className="p-10 text-center">
            <div className="text-red-600 text-xl font-semibold mb-2">Error</div>
            <p className="text-gray-600">{error}</p>
        </div>
    );

    if (states.length === 0) return (
        <div className="p-20 text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No States Found</h2>
            <p className="text-gray-500 mb-6">The database appears to be empty.</p>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md inline-block text-left">
                <p className="font-mono text-sm text-yellow-800">
                    <strong>Tip:</strong> Run the seed script in your backend:
                    <br />
                    <code className="bg-yellow-100 px-1 rounded">psql -f deployment/seed.sql</code>
                </p>
            </div>
        </div>
    );

    // Main Render
    return (
        <div className="px-4 py-6 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white transition-colors">Algeria Health Files</h1>

            {/* --- CEO PANEL: ADD EMPLOYEE --- */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8 text-white border border-gray-700 shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center">👑 CEO Panel: Add New Employee</h3>

                <form onSubmit={handleAddEmployee} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm mb-1 text-gray-300">Employee Name</label>
                        <input
                            type="text"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            className="p-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-green-500 outline-none w-full"
                            placeholder="e.g. Ahmed"
                            required
                        />
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm mb-1 text-gray-300">Employee Password</label>
                        <input
                            type="text"
                            value={newEmpPass}
                            onChange={(e) => setNewEmpPass(e.target.value)}
                            className="p-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-green-500 outline-none w-full"
                            placeholder="e.g. pass123"
                            required
                        />
                    </div>

                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors shadow-md w-full md:w-auto">
                        + Add User
                    </button>
                </form>

                {adminMessage && <p className="mt-4 font-bold animate-pulse text-green-400">{adminMessage}</p>}
            </div>

            {/* --- STATES GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {states.map(state => (
                    <Link
                        key={state.id}
                        to={`/states/${state.code}`}
                        className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-center group"
                    >
                        <div className="text-2xl font-bold text-indigo-600 mb-2 group-hover:scale-110 transition-transform">{state.code}</div>
                        <div className="text-gray-700 font-medium truncate" title={state.name}>{state.name}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

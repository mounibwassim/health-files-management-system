import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Loader } from 'lucide-react';

export default function StatesList() {
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedAlgiers, setExpandedAlgiers] = useState(false);

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

    // Grouping Logic
    const displayedStates = [];
    const algiersSubStates = [];

    // Separate states
    if (!loading && !error && states.length > 0) {
        states.forEach(state => {
            if ([161, 162, 163].includes(state.code)) {
                algiersSubStates.push(state);
            } else {
                displayedStates.push(state);
            }
        });

        // Create Virtual Algiers State
        const virtualAlgiers = {
            id: 'virtual-16',
            code: 16,
            name: 'Algiers',
            isVirtual: true
        };

        // Insert Virtual Algiers
        displayedStates.sort((a, b) => a.code - b.code);
        const insertIndex = displayedStates.findIndex(s => s.code > 16);
        if (insertIndex !== -1) {
            displayedStates.splice(insertIndex, 0, virtualAlgiers);
        } else {
            displayedStates.push(virtualAlgiers);
        }

        // Sort sub-states
        algiersSubStates.sort((a, b) => a.code - b.code);
    }

    // Helper to format sub-state code
    const getDisplayCode = (code) => {
        if (code === 161) return "16 - 1";
        if (code === 162) return "16 - 2";
        if (code === 163) return "16 - 3";
        return code;
    };

    // UI Render Helper
    const renderCard = (state) => {
        if (state.isVirtual) {
            return (
                <div
                    key={state.id}
                    onClick={() => setExpandedAlgiers(!expandedAlgiers)}
                    className={`cursor-pointer block p-6 bg-indigo-50 border-2 border-indigo-200 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-400 transition-all text-center group ${expandedAlgiers ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                >
                    <div className="text-2xl font-bold text-indigo-700 mb-2">{state.code}</div>
                    <div className="text-indigo-900 font-bold truncate">{state.name}</div>
                    <div className="mt-2 text-xs text-indigo-500 uppercase tracking-wide font-semibold">
                        {expandedAlgiers ? 'Click to Collapse' : 'Click to Expand'}
                    </div>
                </div>
            );
        }
        return (
            <Link
                key={state.id}
                to={`/states/${state.code}`}
                className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-center group"
            >
                <div className="text-2xl font-bold text-indigo-600 mb-2 group-hover:scale-110 transition-transform">{state.code}</div>
                <div className="text-gray-700 font-medium truncate" title={state.name}>{state.name}</div>
            </Link>
        );
    };

    // Main Render
    return (
        <div className="px-4 py-6 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white transition-colors">Algeria Health Files</h1>

            {/* --- STATES GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {displayedStates.map(state => {
                    if (state.isVirtual && expandedAlgiers) {
                        return (
                            <>
                                {renderCard(state)}
                                {algiersSubStates.map(sub => (
                                    <Link
                                        key={sub.id}
                                        to={`/states/${sub.code}`}
                                        className="block p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-center group animate-in zoom-in duration-200"
                                    >
                                        <div className="text-lg font-bold text-indigo-600 mb-1">{getDisplayCode(sub.code)}</div>
                                        <div className="text-sm text-gray-700 font-medium truncate">{sub.name}</div>
                                    </Link>
                                ))}
                            </>
                        );
                    }
                    return renderCard(state);
                })}
            </div>
        </div>
    );
}

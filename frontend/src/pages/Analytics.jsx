import { useEffect, useState } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Map, Loader } from 'lucide-react';

export default function Analytics() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics')
            .then(res => {
                // Backend returns [{ name: 'Adrar', count: 10 }, ...]
                // Convert count to number just in case
                const formatted = res.data.map(item => {
                    let name = item.name;
                    if (name === 'Algeria Central') name = 'Algeria C';
                    if (name === 'Algeria East') name = 'Algeria E';
                    if (name === 'Algeria West') name = 'Algeria W';

                    return {
                        ...item,
                        name,
                        count: parseInt(item.count)
                    };
                });
                setData(formatted);
                setLoading(false);
            })
            .catch(err => {
                console.error("Analytics fetch failed", err);
                setLoading(false);
            });
    }, []);

    // Derived Stats
    const totalRecords = data.reduce((sum, item) => sum + item.count, 0);
    const topWilaya = data.length > 0 ? data[0] : { name: 'N/A', count: 0 };
    // Find lowest (non-zero ideally, or just lowest in the list)
    // Filter out zeros if we want "active" lowest
    const activeWilayas = data.filter(d => d.count > 0);
    const lowWilaya = activeWilayas.length > 0 ? activeWilayas[activeWilayas.length - 1] : { name: 'N/A', count: 0 };

    if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin text-indigo-600 w-10 h-10" /></div>;

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="px-4 py-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Analytics Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Records</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalRecords}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                            <Map className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Wilaya</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{topWilaya.name}</p>
                            <p className="text-sm text-gray-500">{topWilaya.count} records</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lowest Activity</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{lowWilaya.name}</p>
                            <p className="text-sm text-gray-500">{lowWilaya.count} records</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-full">
                            <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Records by Wilaya</h2>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                interval={0}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <YAxis tick={{ fill: '#6B7280' }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

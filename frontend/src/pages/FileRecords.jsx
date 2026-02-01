import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import RecordModal from '../components/RecordModal';
import DeleteModal from '../components/DeleteModal';
import { Plus, Search, Trash2, Edit, ArrowLeft, Loader, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_SIZE = 20;

export default function FileRecords() {
    const { stateId, fileType } = useParams();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Added error state
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'treatment_date', direction: 'desc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const fetchRecords = (searchTerm = search) => {
        setLoading(true);
        // Use query param for search
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
        api.get(`/states/${stateId}/files/${fileType}/records${query}`)
            .then(res => {
                setRecords(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch records", err);
                setError("Failed to load records. Please try again.");
                setLoading(false);
            });
    };

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            console.log("Fetching with search:", search);
            fetchRecords(search);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, stateId, fileType]);

    // Handle Download (PDF)
    const handleDownload = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text(`State ${stateId} - ${fileType.toUpperCase()} Records`, 14, 22);
            doc.setFontSize(11);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

            // Table Data
            const tableColumn = ["Status", "Date", "Employee Name", "CCP Account", "Amount", "Notes"];
            const tableRows = [];

            records.forEach(record => {
                const recordData = [
                    record.status === 'completed' ? 'Completed' : 'Incomplete',
                    new Date(record.treatment_date).toLocaleDateString(),
                    record.employee_name,
                    record.postal_account,
                    `${record.amount} DA`,
                    record.notes || '--'
                ];
                tableRows.push(recordData);
            });

            // Generate Table
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
                alternateRowStyles: { fillColor: [240, 240, 240] }
            });

            // Save
            doc.save(`records_${stateId}_${fileType}.pdf`);
        } catch (err) {
            console.error("PDF generation failed", err);
            alert("Failed to generate PDF.");
        }
    };

    console.log("Render Records:", records); // Debug Log

    // Optimistic Save Handler
    const handleSave = async (recordData) => {
        const isEdit = !!recordData.id;

        // 1. Optimistic Update
        const optimisticRecord = {
            ...recordData,
            id: recordData.id || `temp-${Date.now()}`,
            treatment_date: recordData.treatmentDate,
            employee_name: recordData.employeeName,
            postal_account: recordData.postalAccount,
            status: recordData.status,
            notes: recordData.status === 'completed' ? '' : recordData.notes
        };

        setRecords(prev => {
            if (isEdit) {
                return prev.map(r => r.id === recordData.id ? optimisticRecord : r);
            }
            return [optimisticRecord, ...prev];
        });

        setIsModalOpen(false);

        // 2. Background API Call
        try {
            if (isEdit) {
                await api.put(`/records/${recordData.id}`, recordData);
            } else {
                await api.post('/records', recordData);
            }
            fetchRecords();
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save record remotely. The list will revert.");
            fetchRecords();
        }
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        try {
            await api.delete(`/records/${recordToDelete}`);
            fetchRecords();
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
        } catch (err) {
            alert('Failed to delete record');
        }
    };

    const promptDelete = (id) => {
        setRecordToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter, Sort & Pagination Logic
    const safeRecords = Array.isArray(records) ? records : [];

    // Client-side filtering is no longer needed for search as it's server-side
    // But we keep it if we want to filter logically? No, server does it.
    // However, we might want to keep it if the user types faster than debounce? 
    // Actually, we replace client-side filter with direct use of safeRecords

    const sortedRecords = [...safeRecords].sort((a, b) => {
        // Handle specialized sorts if needed, otherwise string/number compare
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE);
    const paginatedRecords = sortedRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || amount === '') return '0.00 DA';
        const num = parseFloat(amount);
        if (isNaN(num)) return 'Invalid Amount';
        try {
            return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(num);
        } catch (e) {
            return amount + ' DA';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) {
            return 'Date Error';
        }
    };

    return (
        <div className="px-4 py-6 animate-in fade-in duration-300">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Link to={`/states/${stateId}`} className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to State
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                        State {stateId} - {fileType === 'ivf' ? 'IVF' : fileType} Records
                    </h1>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors"
                    >
                        <FileText className="w-4 h-4 mr-2" /> Download PDF
                    </button>
                    <button
                        onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Record
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                        placeholder="Search by CCP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-200 px-4 py-3 rounded-md text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                {loading ? (
                    <div className="p-10 flex justify-center"><Loader className="animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                        onClick={() => handleSort('treatment_date')}
                                    >
                                        Date {sortConfig.key === 'treatment_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                        onClick={() => handleSort('employee_name')}
                                    >
                                        Employee {sortConfig.key === 'employee_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CCP Account</th>
                                    <th
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                        onClick={() => handleSort('amount')}
                                    >
                                        Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes / Reason</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedRecords.length > 0 ? paginatedRecords.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {record.status === 'incomplete' ? (
                                                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" title="Incomplete" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" title="Completed" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{formatDate(record.treatment_date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.employee_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{record.postal_account}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-semibold">{formatCurrency(record.amount)}</td>
                                        <td className="px-6 py-4 text-sm max-w-xs truncate">
                                            {record.status === 'incomplete' ? (
                                                <span className="text-red-600 dark:text-red-300 font-medium">{record.notes}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">--</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => promptDelete(record.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(page * PAGE_SIZE, sortedRecords.length)}</span> of <span className="font-medium">{sortedRecords.length}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === i + 1 ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-200' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <RecordModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                record={editingRecord}
                stateId={stateId}
                fileType={fileType}
                onSave={handleSave}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />
        </div>
    );
}

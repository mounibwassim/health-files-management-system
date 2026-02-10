import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import RecordModal from '../components/RecordModal';
import DeleteModal from '../components/DeleteModal';
import ExportModal from '../components/ExportModal';
import { Plus, Search, Trash2, Edit, ArrowLeft, Loader, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_SIZE = 20;

export default function FileRecords() {
    const { stateId, fileType } = useParams();
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

    // Export Filter State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Translation Map
    const translationMap = {
        'surgery': 'العمليات الجراحية',
        'cns': 'الصندوق الوطني',
        'casnos': 'كازنوس',
        'ivf': 'التلقيح الاصطناعي',
        'lab': 'المخبر',
        'ophthalmology': 'طب العيون',
        'radiology': 'الأشعة',
        'transport': 'النقل الصحي',
        'dialysis': 'تصفية الدم'
    };

    // Handle Download (PDF)
    const handleDownloadClick = () => {
        setIsExportModalOpen(true);
    };

    const generatePDF = async (filterScope) => {
        setIsExportModalOpen(false);

        try {
            const doc = new jsPDF();

            // Filter Data based on Scope
            let exportData = [...records];
            if (filterScope === 'completed') {
                exportData = exportData.filter(r => r.status === 'completed');
            } else if (filterScope === 'incomplete') {
                exportData = exportData.filter(r => r.status === 'incomplete' || r.status === 'pending');
            }

            // Load Arabic Font
            try {
                const response = await fetch('/fonts/Amiri-Regular.ttf');
                if (response.ok) {
                    const blob = await response.blob();
                    const reader = new FileReader();

                    await new Promise((resolve, reject) => {
                        reader.onloadend = () => {
                            if (!reader.result) { console.warn("Empty font"); resolve(); return; }
                            const base64data = reader.result.toString().split(',')[1];
                            if (base64data) {
                                doc.addFileToVFS('Amiri-Regular.ttf', base64data);
                                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                                doc.setFont('Amiri');
                            }
                            resolve();
                        };
                        reader.onerror = resolve; // Continue even if font fails
                        reader.readAsDataURL(blob);
                    });
                }
            } catch (e) {
                console.warn("Font load failed", e);
            }

            // Title Logic
            const arabicTitle = translationMap[fileType] || fileType.toUpperCase();

            doc.setFontSize(18);
            // Right-align Arabic title for better look, or Center
            doc.text(`${arabicTitle} - ${stateId}`, 200, 20, { align: 'right', lang: 'ar' });

            doc.setFontSize(10);
            doc.text(`Scope: ${filterScope.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

            // Columns
            // 1. Serial Number (الرقم التسلسلي)
            // 2. Status
            // 3. Date
            // 4. Employee Name
            // 5. CCP
            // 6. Reimbursement (If Surgery)
            // 7. Amount
            // 8. Notes

            const isSurgery = fileType === 'surgery' || fileType === 'operations';

            const tableColumn = ["#", "الرقم التسلسلي", "Status", "Date", "Employee Name", "CCP"];

            if (isSurgery) {
                tableColumn.push("Reimbursement (60%)");
            }

            tableColumn.push("Amount");
            tableColumn.push("Notes");

            const tableRows = [];

            exportData.forEach((record, index) => {
                const row = [
                    index + 1, // Local Index
                    record.serial_number || (index + 1), // DB Serial Number
                    record.status === 'completed' ? 'Done' : 'Pending',
                    new Date(record.treatment_date).toLocaleDateString(),
                    record.employee_name,
                    record.postal_account
                ];

                if (isSurgery) {
                    // Logic: Use stored reimbursement OR calculate on fly
                    const reimb = record.reimbursement_amount || (record.amount * 0.60);
                    row.push(`${new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(reimb)}`);
                }

                row.push(`${record.amount} DA`);
                row.push(record.notes || '');

                tableRows.push(row);
            });

            // Generate Table
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                styles: {
                    fontSize: 9,
                    cellPadding: 2,
                    font: 'Amiri', // Use Arabic font
                    halign: 'right' // Arabic preference usually
                },
                headStyles: { fillColor: [79, 70, 229], halign: 'center' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 }, // Index
                    1: { halign: 'center', cellWidth: 20 }, // Serial
                    // Adjust others as needed
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 2) {
                        if (data.cell.raw === 'Done') data.cell.styles.textColor = [22, 163, 74];
                        else data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            });

            doc.save(`records_${stateId}_${fileType}_${filterScope}.pdf`);
        } catch (err) {
            console.error("PDF generation failed", err);
            alert("Failed to generate PDF.");
        }
    };

    console.log("Render Records:", records); // Debug Log

    // Optimistic Save Handler
    const handleSave = async (recordData) => {
        // Fix: If ID starts with 'temp-', it's a NEW record, not an edit.
        const isTempId = recordData.id && String(recordData.id).startsWith('temp-');
        const isEdit = !!recordData.id && !isTempId;

        // 1. Optimistic Update
        const optimisticRecord = {
            ...recordData,
            id: recordData.id || `temp-${Date.now()}`,
            treatment_date: recordData.treatmentDate,
            employee_name: recordData.employeeName,
            postal_account: recordData.postalAccount,
            status: recordData.status,
            notes: recordData.status === 'completed' ? '' : recordData.notes,
            // CRITICAL: Add user info for immediate "Created By" display
            user_id: user.id || 'me',
            username: user.username
        };

        setRecords(prev => {
            if (isEdit) {
                return prev.map(r => r.id === recordData.id ? optimisticRecord : r);
            }
            // Prepend new record (including temp-id ones we are about to save)
            return [optimisticRecord, ...prev];
        });

        setIsModalOpen(false);

        // 2. Background API Call
        try {
            let savedRecord;

            // Clean payload: Remove temp ID before sending to backend
            // CRITICAL FIX: Ensure stateId and fileType are present for backend validation
            const payload = { ...recordData, stateId, fileType };
            if (isTempId) delete payload.id;

            if (isEdit) {
                const res = await api.put(`/records/${recordData.id}`, payload);
                savedRecord = res.data;
            } else {
                const res = await api.post('/records', payload);
                savedRecord = res.data;
            }

            // Update state with REAL record from server AND inject Username (since API only returns record table data)
            const finalRecord = { ...savedRecord, username: user.username };

            setRecords(prev => {
                if (isEdit) {
                    return prev.map(r => r.id === savedRecord.id ? finalRecord : r);
                }
                // Replace the temporary optimistic record with the real one
                return prev.map(r => r.id === optimisticRecord.id ? finalRecord : r);
            });

            // Clear dashboard cache
            sessionStorage.removeItem('states_data');
            // Success Feedback (Toast/Alert)
            // console.log("Record Saved:", savedRecord);

        } catch (err) {
            console.error("Save failed", err);
            fetchRecords(); // Revert on error

            // ERROR REPORTING Logic
            let errorMsg = "Unknown Error";
            let showLogoutDetails = false;

            if (err.response) {
                if (err.response.data && err.response.data.details) errorMsg = err.response.data.details;
                else if (err.response.data && err.response.data.error) errorMsg = err.response.data.error;
                else errorMsg = JSON.stringify(err.response.data);

                if (err.response.data && err.response.data.code === 'INVALID_USER') {
                    showLogoutDetails = true;
                }
            } else {
                errorMsg = err.message;
            }

            if (showLogoutDetails) {
                alert(`⚠️ SESSION EXPIRED\n\nPlease Log Out and Log In again to refresh your session.\n\nServer Message: ${errorMsg}`);
            } else {
                alert(`❌ FAILED TO SAVE: ${errorMsg}\n\nTechnical Details: ${JSON.stringify(err.response?.data || {}, null, 2)}`);
            }
        }
    };

    const confirmDelete = async () => {
        // recordToDelete is the ID itself (string or number)
        const idToDelete = recordToDelete;
        if (!idToDelete) return;

        // If it's a temporary ID (unsaved), just remove from UI, don't hit backend
        if (String(idToDelete).startsWith('temp-') || String(idToDelete) === 'undefined') {
            setRecords(prev => prev.filter(r => r.id !== idToDelete));
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
            return;
        }

        try {
            await api.delete(`/records/${idToDelete}`);
            setRecords(prev => prev.filter(r => r.id !== idToDelete));
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);

            // Clear dashboard cache
            sessionStorage.removeItem('states_data');
        } catch (err) {
            const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message;
            alert(`Failed to delete record: ${errorMsg}`);
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

    const sortedRecords = [...safeRecords].sort((a, b) => {
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
                        onClick={handleDownloadClick}
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

            {/* STRICT VISIBILITY SUMMARY STATS */}
            <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                {user?.role === 'admin' ? (
                    <div className="flex flex-col sm:flex-row justify-between items-center text-indigo-900 dark:text-indigo-100">
                        <span className="font-bold text-lg">Total Records: {records.length}</span>
                        <span className="text-sm opacity-80 mt-1 sm:mt-0">
                            Viewing Global Data (Admin)
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-center text-indigo-900 dark:text-indigo-100">
                        <span className="font-bold text-lg">
                            {user?.role === 'manager' ? 'Total Records' : 'My Records'}: {records.length}
                        </span>
                        <span className="text-sm opacity-80 mt-1 sm:mt-0">
                            {user?.role === 'manager' ? 'Viewing Global Data (Manager)' : 'Viewing Your Data Only'}
                        </span>
                    </div>
                )}
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
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

                                    {/* REIMBURSEMENT COLUMN */}
                                    {(fileType === 'surgery' || fileType === 'operations') && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reimbursement (60%)</th>
                                    )}

                                    <th
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                        onClick={() => handleSort('amount')}
                                    >
                                        Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes / Reason</th>

                                    {/* STRICT VISIBILITY: ADMIN & MANAGER COLUMN */}
                                    {(user?.role === 'admin' || user?.role === 'manager') && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
                                    )}

                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedRecords.length > 0 ? paginatedRecords.map((record, index) => (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">

                                        {/* SERIAL NUMBER */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bg text-gray-500 dark:text-gray-400">
                                            {record.serial_number || ((page - 1) * PAGE_SIZE + index + 1)}
                                        </td>

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

                                        {/* REIMBURSEMENT VALUE */}
                                        {(fileType === 'surgery' || fileType === 'operations') && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-right font-semibold">
                                                {formatCurrency(record.reimbursement_amount || (record.amount * 0.60))}
                                            </td>
                                        )}

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-semibold">{formatCurrency(record.amount)}</td>
                                        <td className="px-6 py-4 text-sm max-w-xs truncate">
                                            {record.status === 'incomplete' ? (
                                                <span className="text-red-600 dark:text-red-300 font-medium">{record.notes}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">--</span>
                                            )}
                                        </td>

                                        {/* STRICT VISIBILITY: ADMIN & MANAGER COLUMN DATA */}
                                        {(user?.role === 'admin' || user?.role === 'manager') && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                                {/* Display Username or 'You' if it matches current user */}
                                                {record.username === user.username ? 'You' : (record.username || `User ${record.user_id}`)}
                                            </td>
                                        )}

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
                                        <td colSpan={(user?.role === 'admin' || user?.role === 'manager') ? 8 : 7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
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

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={generatePDF}
            />
        </div>
    );
}

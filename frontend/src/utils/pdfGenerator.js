import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Shared Font Loader
let fontBase64Cache = null;

const loadArabicFont = async (doc) => {
    if (fontBase64Cache) {
        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64Cache);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri');
        return;
    }

    try {
        const response = await fetch('/fonts/Amiri-Regular.ttf');
        if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();

            return new Promise((resolve) => {
                reader.onloadend = () => {
                    if (reader.result) {
                        const base64data = reader.result.toString().split(',')[1];
                        fontBase64Cache = base64data; // Cache it
                        doc.addFileToVFS('Amiri-Regular.ttf', base64data);
                        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                        doc.setFont('Amiri');
                    }
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        }
    } catch (e) {
        console.warn("Font load failed", e);
    }
};

export const generatePDFDoc = async ({ stateId, fileType, records, user }) => {
    const doc = new jsPDF();
    await loadArabicFont(doc);

    // Header
    doc.setFontSize(18);
    doc.text(`State ${stateId} - ${fileType.toUpperCase()} Records`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()} - by ${user?.username || 'Unknown'}`, 14, 30);

    // Columns
    const tableColumn = ["Status", "Date", "Employee Name", "CCP", "Amount", "Notes"];
    if (user?.role === 'admin') {
        tableColumn.push("Created By");
    }

    // Rows
    const tableRows = records.map(record => {
        const row = [
            record.status === 'completed' ? 'Completed' : 'Incomplete',
            new Date(record.treatment_date).toLocaleDateString(),
            record.employee_name,
            record.postal_account,
            `${record.amount} DA`,
            record.notes || '--'
        ];
        if (user?.role === 'admin') {
            row.push(record.username || `User ${record.user_id}`);
        }
        return row;
    });

    // Valid Records Check
    if (tableRows.length === 0) {
        doc.text("No records found.", 14, 40);
        return doc;
    }

    // Table
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: {
            fontSize: 10,
            cellPadding: 3,
            font: 'Amiri'
        },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
                const text = data.cell.raw;
                if (text === 'Completed') {
                    data.cell.styles.textColor = [22, 163, 74];
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    return doc;
};

import React, { forwardRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatPersonData } from '@/utils/formatPersonData';

const BaptismIndexPrintTemplate = forwardRef(({ data, parroquiaInfo, bookNumber }, ref) => {
    const { user } = useAuth();
    
    // --- DATOS PARROQUIALES ---
    const diocesis = (parroquiaInfo?.diocesis || user?.dioceseName || 'DIÓCESIS').toUpperCase();
    const nombreParroquia = (parroquiaInfo?.nombre || user?.parishName || 'PARROQUIA').toUpperCase();
    const ciudad = (parroquiaInfo?.ciudad || 'CIUDAD').toUpperCase();
    const departamento = (parroquiaInfo?.departamento || '').toUpperCase();
    const ubicacionHeader = [ciudad, departamento].filter(Boolean).join(', ') + ' - COLOMBIA';

    // --- ORDENAR DATOS ALFABÉTICAMENTE ---
    // El índice debe ir ordenado por Apellidos para que sea fácil buscar en el libro físico
    const sortedData = [...(data || [])].sort((a, b) => {
        const nameA = `${a.apellidos || a.lastName || ''} ${a.nombres || a.firstName || ''}`.trim().toLowerCase();
        const nameB = `${b.apellidos || b.lastName || ''} ${b.nombres || b.firstName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
    });

    const formatNumber = (val) => {
        if (!val || val === '---' || val === '0' || val === 0) return '-';
        return String(val).trim().padStart(4, '0');
    };

    // --- ESTILOS DE IMPRESIÓN ---
    const styles = {
        page: { 
            width: '8.5in', 
            padding: '0.5in 0.8in', 
            fontFamily: 'Arial, sans-serif', 
            color: '#000', 
            backgroundColor: 'white',
            boxSizing: 'border-box'
        },
        header: { textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' },
        title: { textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', letterSpacing: '1px' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
        th: { border: '1px solid #000', padding: '6px', backgroundColor: '#f3f4f6', fontWeight: 'bold', textAlign: 'center', fontSize: '11px' },
        td: { border: '1px solid #000', padding: '6px', fontSize: '11px', textTransform: 'uppercase' },
        tdCenter: { border: '1px solid #000', padding: '6px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }
    };

    return (
        <div ref={ref} style={styles.page}>
            <style media="print">{`
                @page { size: letter; margin: 0.5in; }
                body { margin: 0; background: white; -webkit-print-color-adjust: exact; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
            `}</style>
            
            <div style={styles.header}>
                <div>{diocesis}</div>
                <div>{nombreParroquia}</div>
                <div>{ubicacionHeader}</div>
            </div>
            
            <div style={styles.title}>
                ÍNDICE DE BAUTISMOS {bookNumber ? `- LIBRO ${bookNumber}` : ''}
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>N°</th>
                        <th style={styles.th}>APELLIDOS Y NOMBRES</th>
                        <th style={styles.th}>PADRES</th>
                        <th style={styles.th}>LIBRO</th>
                        <th style={styles.th}>FOLIO</th>
                        <th style={styles.th}>ACTA</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((record, index) => {
                        const apellidos = formatPersonData(record.apellidos || record.lastName || '');
                        const nombres = formatPersonData(record.nombres || record.firstName || '');
                        const padre = formatPersonData(record.nombrePadre || record.fatherName || record.padre || '---');
                        const madre = formatPersonData(record.nombreMadre || record.motherName || record.madre || '---');
                        
                        // Ignorar registros anulados en el índice principal, o marcarlos
                        const isAnulada = record.status === 'anulada' || record.isAnnulled || record.estado === 'anulada';

                        return (
                            <tr key={record.id || index} style={{ color: isAnulada ? '#666' : '#000', textDecoration: isAnulada ? 'line-through' : 'none' }}>
                                <td style={styles.tdCenter}>{index + 1}</td>
                                <td style={styles.td}>
                                    <strong>{apellidos}</strong> {nombres}
                                </td>
                                <td style={styles.td}>
                                    {padre} / {madre}
                                </td>
                                <td style={styles.tdCenter}>{formatNumber(record.libro || record.book_number || record.numeroLibro)}</td>
                                <td style={styles.tdCenter}>{formatNumber(record.folio || record.page_number)}</td>
                                <td style={styles.tdCenter}>{formatNumber(record.numero || record.entry_number || record.numeroActa)}</td>
                            </tr>
                        );
                    })}
                    
                    {sortedData.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{...styles.tdCenter, padding: '20px', color: '#666', textDecoration: 'none'}}>
                                NO HAY REGISTROS PARA MOSTRAR EN ESTE ÍNDICE
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});

BaptismIndexPrintTemplate.displayName = 'BaptismIndexPrintTemplate';
export default BaptismIndexPrintTemplate;
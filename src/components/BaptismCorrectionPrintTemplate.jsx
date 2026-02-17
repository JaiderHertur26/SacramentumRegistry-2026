
import React, { forwardRef } from 'react';
import { 
    convertDateToSpanishText, 
    convertNumberToSpanishWords,
    convertMonthToSpanishWords,
    convertYearToSpanishWords 
} from '@/utils/dateTimeFormatters';

const BaptismCorrectionPrintTemplate = forwardRef((props, ref) => {
    const {
        decreeNumber,
        decreeDate,
        originalPartidaSummary = {},
        newPartidaSummary = {},
        parroquiaInfo = {},
        parrocoNombre = '',
        parroquiaNombre = '',
        ciudad = ''
    } = props.data || {};

    // Helper to extract nested properties safely
    const original = {
        name: `${originalPartidaSummary.firstName || ''} ${originalPartidaSummary.lastName || ''}`.trim(),
        book: originalPartidaSummary.book || originalPartidaSummary.book_number || '---',
        page: originalPartidaSummary.page || originalPartidaSummary.page_number || '---',
        entry: originalPartidaSummary.entry || originalPartidaSummary.entry_number || '---'
    };

    const nuevo = {
        name: `${newPartidaSummary.firstName || ''} ${newPartidaSummary.lastName || ''}`.trim(),
        book: newPartidaSummary.book_number || '---',
        page: newPartidaSummary.page_number || '---',
        entry: newPartidaSummary.entry_number || '---',
        padre: newPartidaSummary.fatherName || '---',
        madre: newPartidaSummary.motherName || '---',
        nacimiento: newPartidaSummary.birthDate || '---',
        bautismo: newPartidaSummary.sacramentDate || '---'
    };

    const formatDateText = (dateStr) => {
        if (!dateStr) return '---';
        try {
            const date = new Date(dateStr);
            const day = convertNumberToSpanishWords(date.getDate());
            const month = convertMonthToSpanishWords(date.getMonth() + 1);
            const year = convertYearToSpanishWords(date.getFullYear());
            return `${day} días del mes de ${month} del año ${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    const currentDateText = formatDateText(decreeDate || new Date().toISOString());

    const styles = {
        page: {
            width: '8.5in',
            height: '11in',
            padding: '1in',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '12pt',
            lineHeight: '1.5',
            color: '#000',
            backgroundColor: '#fff'
        },
        header: {
            textAlign: 'center',
            marginBottom: '30px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
        },
        title: {
            textAlign: 'center',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '30px',
            textTransform: 'uppercase'
        },
        body: {
            textAlign: 'justify',
            marginBottom: '20px'
        },
        decreeSection: {
            marginBottom: '20px'
        },
        article: {
            marginBottom: '15px',
            textIndent: '30px'
        },
        footer: {
            marginTop: '50px',
            textAlign: 'center'
        },
        signature: {
            marginTop: '80px',
            textAlign: 'center',
            borderTop: '1px solid #000',
            width: '60%',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingTop: '10px'
        }
    };

    return (
        <div ref={ref} style={styles.page}>
            <div style={styles.header}>
                <div>GOBIERNO DE LA ARQUIDIÓCESIS</div>
                <div>PARROQUIA {parroquiaNombre || 'SANTO DOMINGO DE GUZMÁN'}</div>
                <div>{ciudad.toUpperCase() || 'CIUDAD'}</div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '20px' }}>
                DECRETO No. {decreeNumber || '---'}
            </div>

            <div style={styles.title}>
                POR MEDIO DEL CUAL SE CORRIGE UNA PARTIDA DE BAUTISMO
            </div>

            <div style={styles.body}>
                <p>
                    EL PÁRROCO DE LA PARROQUIA {parroquiaNombre || 'SANTO DOMINGO DE GUZMÁN'} DE {ciudad.toUpperCase() || 'CIUDAD'}, en uso de sus atribuciones canónicas, y
                </p>

                <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0' }}>CONSIDERANDO:</div>

                <p>
                    Que se ha presentado solicitud para corregir la partida de Bautismo correspondiente a <strong>{original.name}</strong>, la cual se encuentra registrada en el Libro {original.book}, Folio {original.page}, Partida {original.entry} de esta Parroquia.
                </p>
                <p>
                    Que analizados los documentos probatorios presentados, se ha verificado que existen errores en la partida original que ameritan ser subsanados para que el registro concuerde con la realidad jurídica y canónica del bautizado.
                </p>

                <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '20px 0' }}>DECRETA:</div>
            </div>

            <div style={styles.decreeSection}>
                <div style={styles.article}>
                    <strong>ARTÍCULO PRIMERO:</strong> Anúlese la Partida de Bautismo registrada en el Libro {original.book}, Folio {original.page}, Número {original.entry}, correspondiente a <strong>{original.name}</strong>.
                </div>
                <div style={styles.article}>
                    <strong>ARTÍCULO SEGUNDO:</strong> Inscríbase en el Libro Supletorio de Bautismos una nueva partida con los siguientes datos corregidos:
                    <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '10px', fontSize: '11pt' }}>
                        <li><strong>Nombre:</strong> {nuevo.name}</li>
                        <li><strong>Padres:</strong> {nuevo.padre} y {nuevo.madre}</li>
                        <li><strong>Fecha Nacimiento:</strong> {nuevo.nacimiento}</li>
                        <li><strong>Fecha Bautismo:</strong> {nuevo.bautismo}</li>
                    </ul>
                </div>
                <div style={styles.article}>
                    <strong>ARTÍCULO TERCERO:</strong> Colóquese la respectiva nota marginal de anulación en la partida original, haciendo referencia al presente Decreto.
                </div>
            </div>

            <div style={{ marginTop: '40px' }}>
                <p>
                    Dado en {ciudad || 'la Parroquia'} a los {currentDateText}.
                </p>
            </div>

            <div style={styles.footer}>
                <div style={{ display: 'inline-block', width: '45%', verticalAlign: 'top', marginTop: '60px' }}>
                    <div style={{ borderTop: '1px solid black', width: '80%', margin: '0 auto', paddingTop: '5px' }}>
                        <strong>{parrocoNombre}</strong><br />
                        PÁRROCO
                    </div>
                </div>
                <div style={{ display: 'inline-block', width: '45%', verticalAlign: 'top', marginTop: '60px' }}>
                    <div style={{ borderTop: '1px solid black', width: '80%', margin: '0 auto', paddingTop: '5px' }}>
                        <strong>NOTARIO / SECRETARIO(A)</strong><br />
                        DOY FE
                    </div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '1in', left: '0', right: '0', textAlign: 'center', fontSize: '10pt', color: '#555' }}>
                {parroquiaInfo.direccion && <span>{parroquiaInfo.direccion}</span>}
                {parroquiaInfo.telefono && <span> • Tel: {parroquiaInfo.telefono}</span>}
                {parroquiaInfo.email && <span> • Email: {parroquiaInfo.email}</span>}
            </div>
        </div>
    );
});

BaptismCorrectionPrintTemplate.displayName = 'BaptismCorrectionPrintTemplate';
export default BaptismCorrectionPrintTemplate;

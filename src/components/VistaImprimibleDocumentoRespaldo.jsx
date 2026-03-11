import React, { forwardRef } from 'react';

const VistaImprimibleDocumentoRespaldo = forwardRef(({ documento, emisorInfo, receptorInfo }, ref) => {

    if (!documento) return null;

    // --- BUSCADOR DE NOMBRES OFICIALES (MIS DATOS) ---
    const getOfficialData = (parishId, field, fallback) => {
        if (!parishId) return fallback;
        try {
            const misDatos = JSON.parse(localStorage.getItem(`misDatos_${parishId}`) || '[]');
            if (misDatos && misDatos.length > 0 && misDatos[0][field]) {
                return misDatos[0][field];
            }
        } catch (e) { }
        return fallback;
    };

    // --- BUSCADOR DE PÁRROCO ACTIVO ---
    const getActivePriest = (parishId) => {
        if (!parishId) return '';
        try {
            const parrocos = JSON.parse(localStorage.getItem(`parrocos_${parishId}`) || '[]');
            const activo = parrocos.find(p => String(p.estado) === "1");
            if (activo) {
                return `${activo.nombre || ''} ${activo.apellido || ''}`.trim();
            }
        } catch(e) {}
        return '';
    };

    // --- TRADUCTOR DE UUIDs ---
    const resolverNombreCatalogo = (idOrName, keyCatalogo) => {
        if (!idOrName || typeof idOrName !== 'string') return idOrName || '';
        if (idOrName.length === 36 && idOrName.includes('-')) {
            try {
                const items = JSON.parse(localStorage.getItem(keyCatalogo) || '[]');
                const encontrado = items.find(i => i.id === idOrName);
                return encontrado ? (encontrado.name || encontrado.nombre || idOrName) : idOrName;
            } catch (e) { return idOrName; }
        }
        return idOrName;
    };

    // --- FORMATEADOR DE FECHA EN LETRAS ---
    const getFechaExpedicionLetras = (fechaStr) => {
        if (!fechaStr) return '';
        const partes = fechaStr.split('T')[0].split('-');
        if (partes.length !== 3) return fechaStr;

        const dias = ['UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE', 'TREINTA', 'TREINTA Y UN'];
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        
        const dia = parseInt(partes[2], 10);
        const mes = parseInt(partes[1], 10);
        const year = parseInt(partes[0], 10);

        const getAnioLetras = (y) => {
            if (y === 2000) return 'DOS MIL';
            const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
            const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
            const veintes = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
            const decenas = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
            const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

            let res = '';
            const miles = Math.floor(y / 1000);
            if (miles === 1) res += 'MIL ';
            else if (miles === 2) res += 'DOS MIL ';

            const restMiles = y % 1000;
            const cents = Math.floor(restMiles / 100);
            if (cents > 0) res += centenas[cents] + ' ';

            const decUnits = restMiles % 100;
            if (decUnits > 0) {
                if (decUnits < 10) res += unidades[decUnits];
                else if (decUnits < 20) res += especiales[decUnits - 10];
                else if (decUnits < 30) res += veintes[decUnits - 20];
                else {
                    const d = Math.floor(decUnits / 10);
                    const u = decUnits % 10;
                    res += decenas[d];
                    if (u > 0) res += ' Y ' + unidades[u];
                }
            }
            return res.trim();
        };

        const diaLetra = dias[dia - 1] || String(dia);
        return `${diaLetra} DÍAS DEL MES DE ${meses[mes - 1]} DEL AÑO ${getAnioLetras(year)}`;
    };

    const isInterno = !documento.receiverParishId || documento.receiverParishId === documento.parishId;
    const emisorId = documento?.parishId || emisorInfo?.id;
    const receptorId = documento?.receiverParishId || receptorInfo?.id;

    // Obtenemos los nombres y ciudades directamente de "Mis Datos"
    const nombreEmisorOficial = getOfficialData(emisorId, 'nombre', emisorInfo?.name || documento?.parishName || '---').toUpperCase();
    const ciudadEmisorOficial = getOfficialData(emisorId, 'ciudad', emisorInfo?.city || '---').toUpperCase();
    const nombreParrocoEmisor = getActivePriest(emisorId); // <--- OBTENER PÁRROCO ACTIVO

    const nombreReceptorOficial = isInterno ? 'USO INTERNO (MISMA PARROQUIA)' : getOfficialData(receptorId, 'nombre', receptorInfo?.name || documento?.receiverParishName || '---').toUpperCase();
    const ciudadReceptorOficial = isInterno ? '' : getOfficialData(receptorId, 'ciudad', receptorInfo?.city || '---').toUpperCase();

    let marriageDate = documento?.matrimonio?.fecha || documento?.marriageDate || '';
    if (marriageDate && marriageDate.includes('T')) marriageDate = marriageDate.split('T')[0];

    const rawMarriageParish = documento?.matrimonio?.parroquia?.nombre || documento?.matrimonio?.parroquia || documento?.marriageParish || '';
    const rawMarriageDiocese = documento?.matrimonio?.diocesis?.nombre || documento?.matrimonio?.diocesis || documento?.marriageDiocese || '';

    const marriageParish = resolverNombreCatalogo(rawMarriageParish, 'parishes').toUpperCase();
    const marriageDiocese = resolverNombreCatalogo(rawMarriageDiocese, 'dioceses').toUpperCase();

    const spouseName = (documento?.matrimonio?.conyuge?.nombre || documento?.matrimonio?.conyuge || documento?.spouseName || '').toUpperCase();
    const marriageBook = documento?.matrimonio?.libro || documento?.marriageBook || '___';
    const marriageFolio = documento?.matrimonio?.folio || documento?.marriageFolio || '___';
    const marriageNumber = documento?.matrimonio?.numero || documento?.marriageNumber || '___';

    const fechaCreacionStr = (documento.createdAt || new Date().toISOString()).split('T')[0];

    const renderField = (label, value) => (
        <div className="mb-4">
            <span className="font-bold uppercase text-[11px] text-gray-800 block mb-1">{label}:</span>
            <span className="text-gray-900 border-b border-gray-400 block w-[90%] pb-1 min-h-[1.5rem] uppercase">{value || ''}</span>
        </div>
    );

    return (
        <div ref={ref} className="p-8 bg-white max-w-[8.5in] mx-auto print-container" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
            <div style={{ position: 'absolute', top: '15px', left: '15px', border: '2px solid black', padding: '5px 10px', fontWeight: 'bold', fontSize: '10pt', backgroundColor: '#f0f0f0', letterSpacing: '1px' }}>
                COPIA DE ARCHIVO PARROQUIAL
            </div>

            <div className="text-center mb-6 border-b-2 border-black pb-4 mt-8">
                <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">Aviso de Notificación Matrimonial</h1>
                <h2 className="text-lg uppercase text-gray-700 font-bold mb-2">{nombreEmisorOficial}</h2>
                <div className="flex justify-between items-center mt-4 text-[10pt]">
                    <span className="font-bold">Consecutivo: {documento.consecutivo || '---'}</span>
                    <span>Fecha Emisión: {new Date(fechaCreacionStr).toLocaleDateString('es-ES')}</span>
                </div>
            </div>

            <div className="mb-6 flex justify-between border border-gray-300 p-4 bg-gray-50">
                <div className="w-1/2 pr-4 border-r border-gray-300">
                    <h4 className="font-bold text-sm uppercase text-gray-600 mb-2">Parroquia Emisora (Origen)</h4>
                    <p className="font-semibold text-lg leading-tight">{nombreEmisorOficial}</p>
                    <p className="text-sm mt-1">{ciudadEmisorOficial}</p>
                </div>
                <div className="w-1/2 pl-4">
                    <h4 className="font-bold text-sm uppercase text-gray-600 mb-2">Parroquia Receptora (Destino)</h4>
                    <p className="font-semibold text-lg leading-tight">{nombreReceptorOficial}</p>
                    <p className="text-sm mt-1">{ciudadReceptorOficial}</p>
                </div>
            </div>

            <div className="mb-4 border border-gray-400 p-4 bg-white">
                <h4 className="font-bold text-lg border-b border-gray-400 mb-4 pb-1 uppercase">I. Datos de la Partida de Bautismo</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {renderField("Nombre del Bautizado/a", documento.personName)}
                    {renderField("Fecha de Nacimiento", documento.personBirthDate ? new Date(documento.personBirthDate).toLocaleDateString('es-ES') : '---')}
                    {renderField("Libro", documento.baptismBook)}
                    {renderField("Folio", documento.baptismFolio)}
                    {renderField("Número", documento.baptismNumber)}
                </div>
            </div>

            <div className="mb-4 border border-gray-400 p-4 bg-white">
                <h4 className="font-bold text-lg border-b border-gray-400 mb-4 pb-1 uppercase">II. Datos de la Celebración del Matrimonio</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {renderField("Contrajo Matrimonio con", spouseName)}
                    {renderField("Fecha de Matrimonio", marriageDate ? new Date(marriageDate).toLocaleDateString('es-ES') : '---')}
                    {renderField("Lugar de Celebración", [marriageParish, marriageDiocese].filter(Boolean).join(' - '))}
                    {renderField("Libro de Matrimonios", marriageBook)}
                    {renderField("Folio", marriageFolio)}
                    {renderField("Número", marriageNumber)}
                </div>
            </div>

            {documento.marginNoteText && (
                <div className="mb-6 bg-gray-50 p-4 border border-gray-300 italic text-sm">
                    <h5 className="font-bold not-italic mb-2 text-gray-800 uppercase">Nota Marginal Registrada/Enviada:</h5>
                    <p className="text-justify leading-relaxed uppercase font-semibold">{documento.marginNoteText}</p>
                </div>
            )}

            <div className="mb-6 text-sm text-gray-600 uppercase">
                <p>
                    DOCUMENTO GENERADO A LOS {getFechaExpedicionLetras(fechaCreacionStr)} POR EL USUARIO: {(documento.createdBy || 'SISTEMA').toUpperCase()}.
                </p>
            </div>

            {/* FIRMA EXACTA A LO SOLICITADO */}
            <div className="print-signatures mt-6 page-break-inside-avoid text-center">
                <p className="text-[11pt] text-black font-bold uppercase mb-1">
                    {nombreParrocoEmisor || '\u00A0'}
                </p>
                <div className="border-t border-black w-72 mx-auto"></div>
                <p className="font-bold uppercase mt-1 text-[10pt]">PÁRROCO</p>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: letter portrait; margin: 0.5in; }
                    body { background: white; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        margin: 0; 
                        padding: 0 !important; 
                        box-sizing: border-box;
                        font-family: "Courier New", Courier, monospace; 
                    }
                    .no-print { display: none !important; }
                    * { box-shadow: none !important; }
                }
            `}} />
        </div>
    );
});

VistaImprimibleDocumentoRespaldo.displayName = 'VistaImprimibleDocumentoRespaldo';

export default VistaImprimibleDocumentoRespaldo;
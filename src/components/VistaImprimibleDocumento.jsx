import React, { forwardRef } from 'react';

const VistaImprimibleDocumento = forwardRef(({ aviso, documento, partida, emisorInfo, receptorInfo }, ref) => {
    
    // --- BUSCADOR DE NOMBRES OFICIALES (MIS DATOS) ---
    const getOfficialData = (parishId, field, fallback) => {
        if (!parishId) return fallback;
        try {
            const misDatos = JSON.parse(localStorage.getItem(`misDatos_${parishId}`) || '[]');
            if (misDatos && misDatos.length > 0 && misDatos[0][field]) {
                return misDatos[0][field];
            }
        } catch(e) {}
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
            } catch(e) { return idOrName; }
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

    const isInterno = !documento?.receiverParishId || documento?.receiverParishId === documento?.parishId;
    const emisorId = documento?.parishId || emisorInfo?.id;
    const receptorId = documento?.receiverParishId || receptorInfo?.id;

    // Nombres Oficiales
    const nombreEmisorOficial = getOfficialData(emisorId, 'nombre', emisorInfo?.name || documento?.parishName || 'PARROQUIA EMISORA');
    const ciudadEmisorOficial = getOfficialData(emisorId, 'ciudad', emisorInfo?.city || '________________');
    const nombreParrocoEmisor = getActivePriest(emisorId); 
    const nombreReceptorOficial = isInterno ? 'USO INTERNO (MISMA PARROQUIA)' : getOfficialData(receptorId, 'nombre', receptorInfo?.name || documento?.receiverParishName || 'PARROQUIA RECEPTORA');

    // Extracción de datos
    let marriageDate = documento?.matrimonio?.fecha || documento?.marriageDate || '';
    if (marriageDate && marriageDate.includes('T')) marriageDate = marriageDate.split('T')[0];

    const rawMarriageParish = documento?.matrimonio?.parroquia?.nombre || documento?.matrimonio?.parroquia || documento?.marriageParish || '';
    const rawMarriageDiocese = documento?.matrimonio?.diocesis?.nombre || documento?.matrimonio?.diocesis || documento?.marriageDiocese || '';
    
    // UUIDs traducidos a nombres legibles
    const marriageParish = resolverNombreCatalogo(rawMarriageParish, 'parishes');
    const marriageDiocese = resolverNombreCatalogo(rawMarriageDiocese, 'dioceses');

    const spouseName = documento?.matrimonio?.conyuge?.nombre || documento?.matrimonio?.conyuge || documento?.spouseName || '';
    const marriageBook = documento?.matrimonio?.libro || documento?.marriageBook || '';
    const marriageFolio = documento?.matrimonio?.folio || documento?.marriageFolio || '';
    const marriageNumber = documento?.matrimonio?.numero || documento?.marriageNumber || '';

    const fechaCreacionStr = (aviso?.createdAt || documento?.createdAt || new Date().toISOString()).split('T')[0];

    const renderField = (label, value) => (
        <div className="mb-4">
            <span className="font-bold uppercase text-[11px] text-black block mb-1">{label}:</span>
            <span className="text-black border-b border-black block w-[90%] pb-1 min-h-[1.5rem] uppercase">{value || ''}</span>
        </div>
    );

    return (
        <div ref={ref} className="print-document p-[0.5in] bg-white text-black max-w-[8.5in] mx-auto" style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '11pt', lineHeight: 1.4 }}>
            
            <div className="print-header text-center mb-6 border-b-2 border-black pb-4">
                <h1 className="text-[14pt] font-bold uppercase tracking-widest mb-1">Aviso de Notificación Matrimonial</h1>
                <p className="text-[10pt] font-bold uppercase mb-2">{nombreEmisorOficial}</p>
                <div className="flex justify-between items-center mt-4 text-[10pt]">
                    <span className="font-bold">Consecutivo: {aviso?.consecutivo || documento?.consecutivo}</span>
                    <span>Fecha: {new Date(fechaCreacionStr).toLocaleDateString('es-ES')}</span>
                </div>
            </div>

            <div className="print-section mb-6">
                <p className="mb-2 uppercase">Señor Cura Párroco de:</p>
                <h2 className="text-[12pt] font-bold uppercase border-b border-black pb-1 mb-2">{nombreReceptorOficial}</h2>
                <p className="mt-2 text-justify uppercase">
                    Atentamente me dirijo a usted para notificarle, con el fin de que se sirva asentar la respectiva Nota Marginal, la celebración del siguiente matrimonio canónico de una persona bautizada en su jurisdicción.
                </p>
            </div>

            <div className="print-section mb-6 border border-black p-4">
                <h2 className="text-[12pt] font-bold border-b border-black mb-4 pb-1 uppercase">I. Datos de la Partida de Bautismo</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {renderField("Nombre del Bautizado/a", documento?.personName)}
                    {renderField("Libro", documento?.baptismBook)}
                    {renderField("Folio", documento?.baptismFolio)}
                    {renderField("Número", documento?.baptismNumber)}
                </div>
            </div>

            <div className="print-section mb-6 border border-black p-4">
                <h2 className="text-[12pt] font-bold border-b border-black mb-4 pb-1 uppercase">II. Datos de la Celebración del Matrimonio</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {renderField("Contrajo Matrimonio con", spouseName)}
                    {renderField("Fecha de Matrimonio", marriageDate)}
                    {renderField("Parroquia de Celebración", marriageParish)}
                    {renderField("Diócesis", marriageDiocese)}
                    {renderField("Libro de Matrimonios", marriageBook)}
                    {renderField("Folio", marriageFolio)}
                    {renderField("Número", marriageNumber)}
                </div>
            </div>

            {/* Redujimos el margen inferior aquí para que suba la firma */}
            <div className="print-section mb-8">
                <p className="uppercase">Expedido en {ciudadEmisorOficial} a los {getFechaExpedicionLetras(fechaCreacionStr)}.</p>
            </div>

            {/* FIRMA EXACTA A LO SOLICITADO */}
            <div className="print-signatures mt-8 page-break-inside-avoid text-center">
                <p className="text-[11pt] text-black font-bold uppercase mb-1">
                    {nombreParrocoEmisor || '\u00A0'}
                </p>
                <div className="border-t border-black w-72 mx-auto"></div>
                <p className="font-bold uppercase mt-1 text-[10pt]">PÁRROCO</p>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: letter portrait; margin: 0.5in; }
                    body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
                    body * { visibility: hidden; }
                    .print-document, .print-document * { visibility: visible; }
                    .print-document { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        font-family: "Courier New", Courier, monospace;
                        font-size: 11pt;
                        line-height: 1.4;
                        color: black;
                        background: white;
                        margin: 0;
                        padding: 0;
                    }
                    * { box-shadow: none !important; }
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );
});

VistaImprimibleDocumento.displayName = 'VistaImprimibleDocumento';
export default VistaImprimibleDocumento;
import React, { forwardRef } from 'react';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { formatPersonData } from '@/utils/formatPersonData';

const BaptismPrintTemplate = forwardRef((props, ref) => {
    const { user } = useAuth();
    const { getParrocos, obtenerNotasAlMargen } = useAppData() || {};
    const dataSource = props.data || props || {};

    // --- 1. EXTRACTOR DE IDENTIDAD ---
    const getSafeParishId = () => {
        if (dataSource.parishId) return dataSource.parishId;
        if (user?.parishId) return user.parishId;
        try { return JSON.parse(localStorage.getItem('user') || '{}').parishId; } catch (e) { return null; }
    };
    const safeParishId = getSafeParishId();

    // --- 2. BUSCADOR UNIVERSAL Y RECURSIVO ---
    const getOfficialData = (field, fallback) => {
        try {
            let misDatosRaw = safeParishId ? localStorage.getItem(`misDatos_${safeParishId}`) : null;
            
            if (!misDatosRaw || misDatosRaw === '[]' || misDatosRaw === '{}') {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('misDatos_')) {
                        const val = localStorage.getItem(k);
                        if (val && val !== '[]' && val !== '{}') {
                            misDatosRaw = val;
                            break;
                        }
                    }
                }
            }

            if (misDatosRaw) {
                const parsed = JSON.parse(misDatosRaw);
                const findField = (data, targetField) => {
                    if (!data) return null;
                    if (Array.isArray(data)) {
                        for (let item of data) {
                            const found = findField(item, targetField);
                            if (found) return found;
                        }
                        return null;
                    }
                    if (typeof data === 'object') {
                        const f = targetField.toLowerCase();
                        const val = data[f] || data[targetField] || data[targetField.toUpperCase()] || data[targetField.charAt(0).toUpperCase() + targetField.slice(1)];
                        if (val && String(val).trim() !== '' && String(val).toUpperCase() !== 'DESCONOCIDA') {
                            return String(val).trim();
                        }
                    }
                    return null;
                };

                const result = findField(parsed, field);
                if (result) return result;
            }
        } catch (e) {}
        return fallback;
    };

    // --- 3. FUNCIONES DE FORMATEO Y LIMPIEZA ---
    const formatDateText = (d) => {
        try {
            if (!d || d === '---' || d === '') return '---';
            return convertDateToSpanishText(d).toUpperCase();
        } catch (e) {
            return d ? String(d).toUpperCase() : '---';
        }
    };

    const clean = (val) => {
        if (!val) return '';
        const s = String(val).toUpperCase().trim();
        const placeholders = ['CIUDAD', 'DESCONOCIDA', 'UNDEFINED', 'NULL', 'N/A'];
        return placeholders.includes(s) ? '' : s;
    };

    // --- 4. PROCESAMIENTO DE MEMBRETE Y PIE ---
    const diocesis = getOfficialData('diocesis', user?.dioceseName || 'DIÓCESIS').toUpperCase();
    const nombreParroquia = getOfficialData('nombre', user?.parishName || 'PARROQUIA').toUpperCase();
    const ciudad = clean(getOfficialData('ciudad', ''));
    const departamento = clean(getOfficialData('region', ''));
    const direccion = clean(getOfficialData('direccion', ''));
    const telefono = clean(getOfficialData('telefono', ''));
    const email = (getOfficialData('email', '')).toLowerCase();

    const partesUbicacion = [ciudad, departamento].filter(Boolean);
    const ubicacionHeader = partesUbicacion.length > 0 ? `${partesUbicacion.join(', ')} - COLOMBIA` : 'COLOMBIA';

    const footerParts = [];
    if (direccion) footerParts.push(direccion);
    if (telefono) footerParts.push(`TEL: ${telefono}`);
    if (ubicacionHeader) footerParts.push(ubicacionHeader);
    const footerText = footerParts.join(' - ');

    // --- 5. DATOS DEL SACRAMENTO ---
    const libro = dataSource.numeroLibro || dataSource.libro || dataSource.book_number || '---';
    const folio = dataSource.folio || dataSource.page_number || '---';
    const numero = dataSource.numeroActa || dataSource.numero || dataSource.entry_number || '---';

    let rawLugarBautismo = dataSource.lugarBautismo || dataSource.lugarBautismoDetalle || dataSource.lugbau || '';
    if (!rawLugarBautismo || rawLugarBautismo === '---') rawLugarBautismo = nombreParroquia;

    const lugarBautismo = formatPersonData(rawLugarBautismo);
    const fechaBautismo = dataSource.fechaSacramento || dataSource.fechaBautismo || dataSource.fecbau || '';
    const apellidos = formatPersonData(dataSource.apellidos || dataSource.lastName || '');
    const nombres = formatPersonData(dataSource.nombres || dataSource.firstName || '');
    const fechaNacimiento = dataSource.fechaNacimiento || dataSource.birthDate || dataSource.fecnac || '';
    const lugarNacimiento = formatPersonData(dataSource.lugarNacimiento || dataSource.lugarNacimientoDetalle || dataSource.lugnac || '');

    let sexo = dataSource.sexo || dataSource.sex || '---';
    const strSex = String(sexo).toUpperCase().trim();
    if (strSex === '1' || strSex.includes('MASC') || strSex === 'M') sexo = 'MASCULINO';
    else if (strSex === '2' || strSex.includes('FEM') || strSex === 'F') sexo = 'FEMENINO';

    const padre = formatPersonData(dataSource.nombrePadre || dataSource.fatherName || dataSource.padre || '---');
    const madre = formatPersonData(dataSource.nombreMadre || dataSource.motherName || dataSource.madre || '---');

    const unionTypeMap = { '1': 'MATRIMONIO CATÓLICO', '2': 'MATRIMONIO CIVIL', '3': 'UNIÓN LIBRE', '4': 'MADRE SOLTERA', '5': 'OTRO' };
    const rawUnion = String(dataSource.tipoUnionPadres || dataSource.parentsUnionType || dataSource.tipohijo || '---').trim();
    const tipoUnion = formatPersonData(unionTypeMap[rawUnion] || rawUnion);

    const abuelosPaternos = formatPersonData(dataSource.abuelosPaternos || dataSource.paternalGrandparents || dataSource.abuepat || '---');
    const abuelosMaternos = formatPersonData(dataSource.abuelosMaternos || dataSource.maternalGrandparents || dataSource.abuemat || '---');
    const padrinos = formatPersonData(dataSource.padrinos || dataSource.godparents || '---');

    // Da Fe (Párroco Activo) y Traductor de Ministros
    const parrocos = (safeParishId && typeof getParrocos === 'function') ? getParrocos(safeParishId) : [];
    const parrocoActivo = parrocos.find(p => String(p.estado) === '1' || String(p.estado).toUpperCase() === 'ACTIVO');
    const nombreParrocoActivo = parrocoActivo ? `${parrocoActivo.nombre || ''} ${parrocoActivo.apellido || ''}`.trim() : 'PÁRROCO ENCARGADO';
    
    const resolvePriestName = (val, isDaFe = false) => {
        if (!val || val === '---') return null;
        const str = String(val).trim();
        const found = parrocos.find(p => String(p.id) === str || String(p.idcod) === str);
        if (found) return `${found.nombre || found.nombres || ''} ${found.apellido || found.apellidos || ''}`.trim();
        if (/^\d{1,5}$/.test(str) || (str.length === 36 && str.includes('-'))) {
            return isDaFe ? nombreParrocoActivo : '---';
        }
        return str; 
    };

    const rawMinistro = dataSource.ministro || dataSource.minister || '---';
    const rawDaFe = dataSource.daFe || dataSource.ministerFaith || dataSource.dafe || '---';

    const ministroStr = resolvePriestName(rawMinistro, false) || '---';
    let daFeStr = resolvePriestName(rawDaFe, true);
    if (!daFeStr || daFeStr === '---') daFeStr = nombreParrocoActivo;

    const ministro = formatPersonData(ministroStr);
    const daFe = formatPersonData(daFeStr);

    // --- 6. NOTA MARGINAL CON AÑO EN LETRAS ---
    const getFechaHoyLetras = () => {
        const date = new Date();
        const dia = date.getDate();
        const mes = date.getMonth() + 1;
        const anio = date.getFullYear();

        const dias = ['UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE', 'TREINTA', 'TREINTA Y UN'];
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

        const getAnioLetras = (year) => {
            if (year === 2000) return 'DOS MIL';
            const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
            const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
            const veintes = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
            const decenas = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
            const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

            let res = '';
            const miles = Math.floor(year / 1000);
            if (miles === 1) res += 'MIL ';
            else if (miles === 2) res += 'DOS MIL ';

            const restMiles = year % 1000;
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

        return `${dias[dia - 1]} DE ${meses[mes - 1]} DEL AÑO ${getAnioLetras(anio)}`;
    };

    const notasConfig = typeof obtenerNotasAlMargen === 'function' ? obtenerNotasAlMargen(safeParishId) : null;
    let rawMarginText = dataSource.notaMarginal || dataSource.marginNote || dataSource.notaAlMargen || dataSource.observaciones || "";

    if (!rawMarginText) {
        const isAnulada = dataSource.status === 'anulada' || dataSource.isAnnulled;
        const isDecreto = dataSource.isSupplementary || dataSource.correctionDecreeRef;
        rawMarginText = isAnulada ? notasConfig?.porCorreccion?.anulada : isDecreto ? notasConfig?.porCorreccion?.nuevaPartida : notasConfig?.estandar;
    }
    const finalNote = (typeof rawMarginText === 'string' ? rawMarginText : "").replace(/\[FECHA_EXPEDICION\]/g, getFechaHoyLetras()).toUpperCase();

    // --- 7. ESTILOS Y ESTRUCTURA ---
    const getText = (v) => (!v || v === '---') ? '---' : formatPersonData(v).toUpperCase();

    const styles = {
        page: { width: '8.5in', minHeight: '11in', padding: '0.6in 0.8in', fontFamily: '"Courier New", Courier, monospace', fontSize: '13px', lineHeight: '1.2', color: '#000', display: 'flex', flexDirection: 'column', backgroundColor: 'white', boxSizing: 'border-box' },
        header: { textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '25px', lineHeight: '1.4' },
        title: { textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px', letterSpacing: '2px' },
        bookSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', fontWeight: 'bold', marginBottom: '25px', fontSize: '14px' },
        bodySection: { paddingLeft: '0.2in', display: 'flex', flexDirection: 'column' },
        signatureSection: { marginTop: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', pageBreakInside: 'avoid' },
        footer: { marginTop: 'auto', textAlign: 'center', fontSize: '10px', paddingTop: '15px', lineHeight: '1.4', borderTop: '1px solid #eee' }
    };

    const Row = ({ label, value }) => (
        <div style={{ display: 'flex', marginBottom: '7px' }}>
            <span style={{ whiteSpace: 'pre' }}>{label.padEnd(18, '.')}: </span>
            <span style={{ marginLeft: '4px' }}>{String(value || '').toUpperCase()}</span>
        </div>
    );

    return (
        <div ref={ref} style={styles.page}>
            <style media="print">{`@page { size: letter; margin: 0; } body { margin: 0; background: white; -webkit-print-color-adjust: exact; }`}</style>

            <div style={styles.header}>
                <div>{diocesis}</div>
                <div>{nombreParroquia}</div>
                <div>{ubicacionHeader}</div>
            </div>

            <div style={styles.title}>PARTIDA DE BAUTISMO</div>

            <div style={styles.bookSection}>
                <div style={{ textAlign: 'left', whiteSpace: 'pre' }}>
                    <div>LIBRO.............: {String(libro).padStart(4, '0')}</div>
                    <div>FOLIO.............: {String(folio).padStart(4, '0')}</div>
                    <div>NUMERO............: {String(numero).padStart(4, '0')}</div>
                </div>
            </div>

            <div style={styles.bodySection}>
                <Row label="LUGAR BAUTISMO" value={getText(lugarBautismo)} />
                <Row label="FECHA BAUTISMO" value={formatDateText(fechaBautismo)} />
                <Row label="APELLIDOS" value={getText(apellidos)} />
                <Row label="NOMBRES" value={getText(nombres)} />
                <Row label="FECHA NACIMIENTO" value={formatDateText(fechaNacimiento)} />
                <Row label="LUGAR NACIMIENTO" value={getText(lugarNacimiento)} />
                <Row label="SEXO" value={getText(sexo)} />
                <Row label="NOMBRE PADRE" value={getText(padre)} />
                <Row label="NOMBRE MADRE" value={getText(madre)} />
                <Row label="TIPO DE UNION" value={getText(tipoUnion)} />
                <Row label="ABUELOS PATERNOS" value={getText(abuelosPaternos)} />
                <Row label="ABUELOS MATERNOS" value={getText(abuelosMaternos)} />
                <Row label="PADRINOS" value={getText(padrinos)} />
                <Row label="MINISTRO" value={getText(ministro)} />
                <Row label="DA FE" value={getText(daFe)} />
            </div>

            {finalNote && (
                <div style={{ marginTop: '25px' }}>
                    <div style={{ textAlign: 'center', fontSize: '13px', marginBottom: '8px' }}>- - - - NOTA AL MARGEN - - - -</div>
                    <div style={{ textAlign: 'justify', fontSize: '12px', lineHeight: '1.4', textTransform: 'uppercase' }}>{finalNote}</div>
                </div>
            )}

            <div style={styles.signatureSection}>
                <p className="font-bold uppercase mb-1" style={{ fontSize: '11pt' }}>{daFe.toUpperCase()}</p>
                <div style={{ borderTop: '1px solid black', width: '250px' }}></div>
                <p className="font-bold uppercase mt-1" style={{ fontSize: '10pt' }}>PÁRROCO</p>
            </div>

            <div style={styles.footer}>
                {footerText && <div>{footerText}</div>}
                {email && <div>{email}</div>}
            </div>
        </div>
    );
});

BaptismPrintTemplate.displayName = 'BaptismPrintTemplate';
export default BaptismPrintTemplate;
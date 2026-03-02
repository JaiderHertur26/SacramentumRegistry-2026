
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';

/**
 * Normalizes baptism record data from various sources (JSON import, local DB, manual entry)
 * into a standardized format expected by the BaptismPrintTemplate.
 */
export const normalizeBaptismPartida = (rawData) => {
    if (!rawData) return getEmptyPartida();

    try {
        const normalizeDate = (d) => d || '';
        const arrayToString = (val) => {
            if (!val) return '';
            if (Array.isArray(val)) return val.map(item => (typeof item === 'object' ? item.name : item)).join(', ');
            return String(val);
        };

        const normalizeSexo = (val) => {
            if (!val) return 'NO ESPECIFICADO';
            const v = String(val).toUpperCase();
            if (v === '1' || v === 'M' || v.startsWith('MASC')) return 'MASCULINO';
            if (v === '2' || v === 'F' || v.startsWith('FEM')) return 'FEMENINO';
            return v;
        };

        return {
            id: rawData.id || '',
            libro: String(rawData.book_number || rawData.libro || rawData.Libro || '---'),
            folio: String(rawData.page_number || rawData.folio || rawData.Folio || '---'),
            numero: String(rawData.entry_number || rawData.numero || rawData.Numero || '---'),
            fechaBautismo: normalizeDate(rawData.sacramentDate || rawData.fechaBautismo || rawData.FecBau),
            lugarBautismoDetalle: rawData.lugarBautismoDetalle || rawData.lugarBautismo || rawData.sacramentPlace || '',
            ministro: rawData.minister || rawData.ministro || '',
            daFe: rawData.daFe || rawData.ministerFaith || '',
            nombres: rawData.firstName || rawData.nombres || '',
            apellidos: rawData.lastName || rawData.apellidos || '',
            fechaNacimiento: normalizeDate(rawData.birthDate || rawData.fechaNacimiento || rawData.FecNac),
            lugarNacimientoDetalle: rawData.lugarNacimientoDetalle || rawData.lugarNacimiento || rawData.birthPlace || '',
            sexo: normalizeSexo(rawData.sex || rawData.sexo),
            nombrePadre: rawData.fatherName || rawData.nombrePadre || '',
            cedulaPadre: rawData.fatherId || rawData.cedulaPadre || '',
            nombreMadre: rawData.motherName || rawData.nombreMadre || '',
            cedulaMadre: rawData.motherId || rawData.cedulaMadre || '',
            tipoUnionPadres: rawData.tipoUnionPadres || rawData.parentsUnionType || '',
            abuelosPaternos: arrayToString(rawData.paternalGrandparents || rawData.abuelosPaternos),
            abuelosMaternos: arrayToString(rawData.maternalGrandparents || rawData.abuelosMaternos),
            padrinos: arrayToString(rawData.godparents || rawData.padrinos),
            notaAlMargen: rawData.notaMarginal || rawData.notaAlMargen || '',
            notaMarginalMatrimonio: rawData.notaMarginalMatrimonio || '',
            isMarried: rawData.isMarried || false,
            oficinaRegistroCivil: rawData.registryOffice || '',
            parroquiaInfo: rawData.parroquiaInfo || {}
        };
    } catch (e) {
        console.error("Normalization error:", e);
        return getEmptyPartida();
    }
};

export const enrichBaptismPartidaWithAuxiliaryData = (partida, auxiliaryData) => {
    if (!partida || !auxiliaryData) return partida;
    return {
        ...partida,
        parroquiaInfo: {
            ...partida.parroquiaInfo,
            nombre: auxiliaryData.nombre || auxiliaryData.parishName || '',
            direccion: auxiliaryData.direccion || auxiliaryData.address || '',
            telefono: auxiliaryData.telefono || auxiliaryData.phone || '',
            email: auxiliaryData.email || '',
            ciudad: auxiliaryData.ciudad || auxiliaryData.city || '',
            departamento: auxiliaryData.departamento || auxiliaryData.state || '',
            diocesis: auxiliaryData.diocesis || auxiliaryData.dioceseName || ''
        }
    };
};

const getEmptyPartida = () => ({
    libro: '---', folio: '---', numero: '---',
    fechaBautismo: '', nombres: '', apellidos: '',
    sexo: '', notaAlMargen: '', notaMarginalMatrimonio: '',
    parroquiaInfo: {}
});

export const validateBaptismPartidaStructure = (data) => {
    const missing = [];
    if (!data.nombres && !data.apellidos) missing.push('Nombre/Apellido');
    if (!data.fechaBautismo) missing.push('Fecha');
    return { isValid: missing.length === 0, missingFields: missing };
};

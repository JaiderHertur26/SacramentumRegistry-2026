
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';

/**
 * Normalizes baptism record data from various sources (JSON import, local DB, manual entry)
 * into a standardized format expected by the BaptismPrintTemplate.
 */
export const normalizeBaptismPartida = (rawData) => {
    if (!rawData) {
        console.warn("normalizeBaptismPartida received null or undefined data");
        return getEmptyPartida();
    }

    try {
        const normalizeDate = (dateVal) => {
            if (!dateVal) return '';
            return dateVal;
        };

        const fechaBautismo = normalizeDate(rawData.sacramentDate || rawData.fechaBautismo || rawData.FecBau);
        const fechaNacimiento = normalizeDate(rawData.birthDate || rawData.fechaNacimiento || rawData.FecNac);

        const arrayToString = (val) => {
            if (!val) return '';
            if (Array.isArray(val)) {
                return val.map(item => (typeof item === 'object' ? item.name : item)).join(', ');
            }
            return String(val);
        };

        const normalizeSexo = (val) => {
            if (!val) return 'NO ESPECIFICADO';
            const v = String(val).toUpperCase();
            if (v === '1' || v === 'M' || v.startsWith('MASC')) return 'MASCULINO';
            if (v === '2' || v === 'F' || v.startsWith('FEM')) return 'FEMENINO';
            return v;
        };

        const normalized = {
            id: rawData.id || '',
            libro: String(rawData.book_number || rawData.libro || rawData.Libro || '---'),
            folio: String(rawData.page_number || rawData.folio || rawData.Folio || '---'),
            numero: String(rawData.entry_number || rawData.numero || rawData.Numero || '---'),
            fechaBautismo: fechaBautismo,
            lugarBautismoDetalle: rawData.lugarBautismoDetalle || rawData.lugarBautismo || rawData.sacramentPlace || rawData.place || '',
            ministro: rawData.minister || rawData.ministro || '',
            daFe: rawData.daFe || rawData.ministerFaith || rawData.DaFe || '', 
            nombres: rawData.firstName || rawData.nombres || rawData.Nombres || '',
            apellidos: rawData.lastName || rawData.apellidos || rawData.Apellidos || '',
            fechaNacimiento: fechaNacimiento,
            lugarNacimientoDetalle: rawData.lugarNacimientoDetalle || rawData.lugarNacimiento || rawData.birthPlace || '',
            sexo: normalizeSexo(rawData.sex || rawData.sexo),
            nombrePadre: rawData.fatherName || rawData.nombrePadre || rawData.Padre || '',
            cedulaPadre: rawData.fatherId || rawData.cedulaPadre || '',
            nombreMadre: rawData.motherName || rawData.nombreMadre || rawData.Madre || '',
            cedulaMadre: rawData.motherId || rawData.cedulaMadre || '',
            tipoUnionPadres: rawData.tipoUnionPadres || rawData.parentsUnionType || '',
            abuelosPaternos: arrayToString(rawData.paternalGrandparents || rawData.abuelosPaternos),
            abuelosMaternos: arrayToString(rawData.maternalGrandparents || rawData.abuelosMaternos),
            padrinos: arrayToString(rawData.godparents || rawData.padrinos),
            
            // CRITICAL: Ensure marginal notes are carried over
            notaAlMargen: rawData.notaMarginal || rawData.notaAlMargen || rawData.NotaMarginal || '',
            notaMarginalMatrimonio: rawData.notaMarginalMatrimonio || '',
            isMarried: rawData.isMarried || false,

            oficinaRegistroCivil: rawData.registryOffice || rawData.oficinaRegistroCivil || '',
            parroquiaInfo: rawData.parroquiaInfo || {}
        };

        return normalized;

    } catch (error) {
        console.error("Error normalizing baptism data:", error);
        return getEmptyPartida();
    }
};

/**
 * Enriches a normalized partida with auxiliary data (parish details).
 */
export const enrichBaptismPartidaWithAuxiliaryData = (partida, auxiliaryData) => {
    if (!partida) return null;
    if (!auxiliaryData) return partida;
    
    return {
        ...partida,
        parroquiaInfo: {
            ...partida.parroquiaInfo,
            nombre: auxiliaryData.nombre || auxiliaryData.parishName || partida.parroquiaInfo?.nombre || '',
            direccion: auxiliaryData.direccion || auxiliaryData.address || partida.parroquiaInfo?.direccion || '',
            telefono: auxiliaryData.telefono || auxiliaryData.phone || partida.parroquiaInfo?.telefono || '',
            email: auxiliaryData.email || partida.parroquiaInfo?.email || '',
            ciudad: auxiliaryData.ciudad || auxiliaryData.city || partida.parroquiaInfo?.ciudad || '',
            departamento: auxiliaryData.departamento || auxiliaryData.state || partida.parroquiaInfo?.departamento || '',
            diocesis: auxiliaryData.diocesis || auxiliaryData.dioceseName || partida.parroquiaInfo?.diocesis || ''
        }
    };
};

const getEmptyPartida = () => ({
    libro: '---', folio: '---', numero: '---',
    fechaBautismo: '', lugarBautismoDetalle: '',
    nombres: '', apellidos: '',
    fechaNacimiento: '', lugarNacimientoDetalle: '', sexo: '',
    nombrePadre: '', nombreMadre: '',
    abuelosPaternos: '', abuelosMaternos: '', padrinos: '',
    ministro: '', notaAlMargen: '',
    notaMarginalMatrimonio: '',
    parroquiaInfo: {}
});

/**
 * Validates the minimum structure required for a baptism record.
 */
export const validateBaptismPartidaStructure = (normalizedData) => {
    const missing = [];
    if (!normalizedData.nombres && !normalizedData.apellidos) missing.push('Nombres/Apellidos');
    if (!normalizedData.fechaBautismo) missing.push('Fecha de Bautismo');

    return {
        isValid: missing.length === 0,
        missingFields: missing
    };
};

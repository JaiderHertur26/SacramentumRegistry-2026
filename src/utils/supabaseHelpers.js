import { TABLE_NAMES } from '@/config/supabaseConfig';

/**
 * Generates a UUID v4 string for local usage or fallback
 */
export const generateUUID = () => {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
};

/**
 * Validates that a JSON object has the required structure for imports
 * Required: { "data": [...] }
 * @param {Object} jsonData 
 * @returns {Object} { isValid: boolean, message: string, data: Array }
 */
export const validateJSONStructure = (jsonData) => {
    if (!jsonData || typeof jsonData !== 'object') {
        return { isValid: false, message: "El archivo no contiene un objeto JSON válido." };
    }
    
    if (!('data' in jsonData)) {
        return { isValid: false, message: "La estructura del JSON es incorrecta: falta la propiedad 'data'." };
    }

    if (!Array.isArray(jsonData.data)) {
        return { isValid: false, message: "La propiedad 'data' debe ser un arreglo." };
    }

    if (jsonData.data.length === 0) {
        return { isValid: false, message: "El arreglo 'data' está vacío. No hay registros para importar." };
    }

    return { isValid: true, data: jsonData.data };
};

/**
 * Normalizes a value, ensuring it is a string and providing a fallback.
 */
export const normalizePaddedValue = (value, fallback = '1') => {
    const raw = String(value ?? '').trim();
    return raw === '' ? String(fallback) : raw;
};

/**
 * Parses a potentially padded string number into an integer.
 */
export const parsePaddedNumber = (value, fallback = 1) => {
    const normalized = normalizePaddedValue(value, String(fallback));
    const num = parseInt(normalized, 10);
    return Number.isNaN(num) ? fallback : num;
};

/**
 * Formats a number as a string, preserving leading zeros based on a template.
 */
export const formatNumberLike = (numberValue, templateValue, fallbackWidth = 1) => {
    const template = normalizePaddedValue(templateValue, '1');
    // Extract digit length to determine padding
    const width = Math.max(fallbackWidth, template.replace(/\D/g, '').length || 1);
    return String(numberValue).padStart(width, '0');
};

/**
 * Increments a padded string value by a step, preserving formatting.
 */
export const incrementPaddedValue = (value, step = 1) => {
    const template = normalizePaddedValue(value, '1');
    const current = parsePaddedNumber(template, 0);
    return formatNumberLike(current + step, template);
};

/**
 * Calculates the next sequence of Book, Folio, and Entry numbers.
 * Preserves padding from the template strings.
 *
 * Logic:
 * - Increments Entry number.
 * - If Entry reaches Folio capacity, increments Folio.
 * - If 'reiniciarPorFolio' is true, Entry resets to 1 on new Folio.
 */
export const calculateNextSeatingNumbers = ({
    book,
    folio,
    entry,
    partidasPerFolio = 1,
    reiniciarPorFolio = false
}) => {
    const tBook = normalizePaddedValue(book, '1');
    const tFolio = normalizePaddedValue(folio, '1');
    const tEntry = normalizePaddedValue(entry, '1');

    let nBook = parsePaddedNumber(tBook, 1);
    let nFolio = parsePaddedNumber(tFolio, 1);
    let nEntry = parsePaddedNumber(tEntry, 1);
    const capacity = Math.max(1, parsePaddedNumber(partidasPerFolio, 1));

    let nextEntry = nEntry + 1;
    let nextFolio = nFolio;
    let nextBook = nBook;

    // Determine if the entry we just used (nEntry) was the last one for the folio.
    // Case 1: Entry restarts every folio (e.g. 1, 2, 1, 2)
    // Case 2: Entry is a global sequence (e.g. 1, 2, 3, 4)
    const isEndOfFolio = reiniciarPorFolio
        ? (nEntry >= capacity)
        : (nEntry % capacity === 0);

    if (isEndOfFolio) {
        nextFolio = nFolio + 1;
        if (reiniciarPorFolio) {
            nextEntry = 1;
        }
    }

    return {
        book: formatNumberLike(nextBook, tBook),
        folio: formatNumberLike(nextFolio, tFolio),
        entry: formatNumberLike(nextEntry, tEntry)
    };
};

/**
 * Helper to convert Sexo enum
 */
const mapSexo = (val) => {
    if (val === 1 || val === "1" || val === "M") return "Masculino";
    if (val === 2 || val === "2" || val === "F") return "Femenino";
    return val || "Desconocido";
};

/**
 * Helper to convert Date strings
 */
const mapDate = (val) => {
    if (!val) return null;
    try {
        return new Date(val).toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

/**
 * Maps a Baptism JSON record
 */
export const mapBaptismJSON = (r) => {
    // Helper for boolean conversion (null -> false)
    const toBool = (val) => val === true || val === "true" || val === 1;

    // Helper for TipoHijo (1 -> Legítimo, 2 -> Natural, 3 -> Adoptivo)
    const mapTipoHijo = (val) => {
        if (val === 1 || val === "1") return "Legítimo";
        if (val === 2 || val === "2") return "Natural";
        if (val === 3 || val === "3") return "Adoptivo";
        return val || "Natural"; 
    };

    const parents = [];
    if (r.Padre || r.padre) parents.push({ name: r.Padre || r.padre, type: 'padre' });
    if (r.Madre || r.madre) parents.push({ name: r.Madre || r.madre, type: 'madre' });

    const godparents = [];
    if (r.Padrino || r.padrino) godparents.push({ name: r.Padrino || r.padrino, type: 'padrino' });
    if (r.Madrina || r.madrina) godparents.push({ name: r.Madrina || r.madrina, type: 'madrina' });

    return {
        id: generateUUID(),
        type: 'baptism',
        origin: 'imported',
        book_number: String(r.Libro || r.libro || ''),
        page_number: String(r.Folio || r.folio || ''),
        entry_number: String(r.Numero || r.numero || ''),
        firstName: r.Nombres || r.nombres || '',
        lastName: r.Apellidos || r.apellidos || '',
        gender: mapSexo(r.Sexo || r.sexo),
        sacramentDate: mapDate(r.FecBau || r.fecbau || r.FechaBautismo),
        birthDate: mapDate(r.FecNac || r.fechnac || r.FechaNacimiento),
        birthPlace: r.LugNac || r.lugnac || r.LugarNacimiento || '',
        place: r.LugBau || r.lugbau || r.LugarBautismo || '', // Specific place of sacrament if different
        parents: parents,
        godparents: godparents,
        civilStatus: mapTipoHijo(r.TipoHijo || r.tipohijo), 
        minister: r.Ministro || r.ministro || '',
        status: 'confirmed', 
        metadata: {
            imported: true,
            daFe: r.DaFe || r.dafe || '',
            notaMarginal: r.NotaMarginal || r.notamarginal || '',
            abueloPaterno: r.AbueloPaterno || r.abuelopaterno,
            abuelaPaterna: r.AbuelaPaterna || r.abuelapaterna,
            abueloMaterno: r.AbueloMaterno || r.abuelomaterno,
            abuelaMaterna: r.AbuelaMaterna || r.abuelamaterna,
            legitimo: toBool(r.Legitimo || r.legitimo),
            docu1: toBool(r.Docu1 || r.docu1),
            docu2: toBool(r.Docu2 || r.docu2),
            docu3: toBool(r.Docu3 || r.docu3),
            docu4: toBool(r.Docu4 || r.docu4),
            confirmacion: toBool(r.Confirmacion || r.confirmacion),
            comunion: toBool(r.Comunion || r.comunion),
            anulado: toBool(r.Anulado || r.anulado),
            adulto: toBool(r.Adulto || r.adulto)
        }
    };
};

/**
 * Maps a Confirmation JSON record
 */
export const mapConfirmationJSON = (r) => {
    const parents = [];
    if (r.Padre || r.padre) parents.push({ name: r.Padre || r.padre, type: 'padre' });
    if (r.Madre || r.madre) parents.push({ name: r.Madre || r.madre, type: 'madre' });

    const godparents = [];
    if (r.Padrino || r.padrino) godparents.push({ name: r.Padrino || r.padrino, type: 'padrino' });
    if (r.Madrina || r.madrina) godparents.push({ name: r.Madrina || r.madrina, type: 'madrina' });

    return {
        id: generateUUID(),
        type: 'confirmation',
        origin: 'imported',
        book_number: String(r.Libro || r.libro || ''),
        page_number: String(r.Folio || r.folio || ''),
        entry_number: String(r.Numero || r.numero || ''),
        firstName: r.Nombres || r.nombres || '',
        lastName: r.Apellidos || r.apellidos || '',
        gender: mapSexo(r.Sexo || r.sexo),
        sacramentDate: mapDate(r.FecConf || r.fecconf || r.FechaConfirmacion),
        birthDate: mapDate(r.FecNac || r.fechnac || r.FechaNacimiento),
        birthPlace: r.LugNac || r.lugnac || '',
        place: r.LugConf || r.lugconf || '',
        parents: parents,
        godparents: godparents,
        minister: r.Ministro || r.ministro || '',
        status: 'confirmed',
        metadata: {
            imported: true,
            daFe: r.DaFe || r.dafe || '',
            notaMarginal: r.NotaMarginal || r.notamarginal || '',
            age: r.Edad || r.edad
        }
    };
};

/**
 * Maps a Death JSON record
 */
export const mapDeathJSON = (r) => {
    const parents = [];
    if (r.Padre || r.padre) parents.push({ name: r.Padre || r.padre, type: 'padre' });
    if (r.Madre || r.madre) parents.push({ name: r.Madre || r.madre, type: 'madre' });

    return {
        id: generateUUID(),
        type: 'death',
        origin: 'imported',
        book_number: String(r.Libro || r.libro || ''),
        page_number: String(r.Folio || r.folio || ''),
        entry_number: String(r.Numero || r.numero || ''),
        firstName: r.Nombres || r.nombres || '',
        lastName: r.Apellidos || r.apellidos || '',
        gender: mapSexo(r.Sexo || r.sexo),
        sacramentDate: mapDate(r.FecDif || r.fecdif || r.FechaDifunto),
        birthDate: mapDate(r.FecNac || r.fechnac || r.FechaNacimiento),
        place: r.LugDif || r.lugdif || '',
        parents: parents,
        partner: r.Conyuge || r.conyuge || '',
        minister: r.Ministro || r.ministro || '',
        status: 'confirmed',
        metadata: {
            imported: true,
            causaMuerte: r.CausaMuerte || r.causamuerte || '',
            cementerio: r.Cementerio || r.cementerio || '',
            daFe: r.DaFe || r.dafe || '',
            notaMarginal: r.NotaMarginal || r.notamarginal || ''
        }
    };
};

/**
 * Maps a Marriage JSON record
 */
export const mapMarriageJSON = (r) => {
    const witnesses = [];
    if (r.Testigo1 || r.testigo1) witnesses.push({ name: r.Testigo1 || r.testigo1 });
    if (r.Testigo2 || r.testigo2) witnesses.push({ name: r.Testigo2 || r.testigo2 });

    return {
        id: generateUUID(),
        type: 'marriage',
        origin: 'imported',
        book_number: String(r.Libro || r.libro || ''),
        page_number: String(r.Folio || r.folio || ''),
        entry_number: String(r.Numero || r.numero || ''),
        
        // Groom
        groomName: r.Nombres1 || r.nombres1 || '',
        groomSurname: r.Apellidos1 || r.apellidos1 || '',
        groomFather: r.Padre1 || r.padre1 || '',
        groomMother: r.Madre1 || r.madre1 || '',
        
        // Bride
        brideName: r.Nombres2 || r.nombres2 || '',
        brideSurname: r.Apellidos2 || r.apellidos2 || '',
        brideFather: r.Padre2 || r.padre2 || '',
        brideMother: r.Madre2 || r.madre2 || '',

        sacramentDate: mapDate(r.FecMat || r.fecmat || r.FechaMatrimonio),
        place: r.LugMat || r.lugmat || '',
        witnesses: witnesses,
        minister: r.Ministro || r.ministro || '',
        status: 'confirmed',
        metadata: {
            imported: true,
            daFe: r.DaFe || r.dafe || '',
            notaMarginal: r.NotaMarginal || r.notamarginal || ''
        }
    };
};

export const mapJSONToSupabaseRecord = (jsonRecord, entityType) => {
    // ... kept for compatibility if used elsewhere
    return jsonRecord;
};

export const handleSupabaseError = (error) => {
    if (!error) return "Error desconocido";
    return error.message || "Error de conexión.";
};
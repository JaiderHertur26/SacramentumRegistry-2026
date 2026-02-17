
import { generateUUID } from './supabaseHelpers';

/**
 * Maps a raw legacy JSON record to the internal Baptism structure.
 */
export const mapBaptismJSON = (rawData) => {
    // Helper to format date if needed (DD/MM/YYYY to YYYY-MM-DD or keep as is if compatible)
    const formatDate = (d) => d || '';

    const mapSex = (s) => {
        if (String(s) === '1') return 'MASCULINO';
        if (String(s) === '2') return 'FEMENINO';
        return String(s) || 'NO ESPECIFICADO';
    };

    return {
        id: generateUUID(),
        status: 'confirmed', 
        
        // Registry Info
        book_number: String(rawData.libro || ''),
        page_number: String(rawData.folio || ''),
        entry_number: String(rawData.numero || ''),
        
        // Sacrament Data
        sacramentDate: formatDate(rawData.fecbau),
        sacramentPlace: rawData.lugarBautismoDetalle || rawData.lugbau || '', // Mapped to detail/lugbau
        lugarBautismo: rawData.lugbau || '', // Explicit mapping
        lugarBautismoDetalle: rawData.lugbau || '',
        
        // Person Data
        firstName: rawData.nombres || '',
        lastName: rawData.apellidos || '',
        birthDate: formatDate(rawData.fecnac),
        birthPlace: rawData.lugarn || rawData.lugnac || '', // lugarn takes precedence
        lugarNacimientoDetalle: rawData.lugarn || '',
        sex: mapSex(rawData.sexo),
        
        // Parents & Union
        fatherName: rawData.padre || '',
        fatherId: rawData.cedupad || '', // New
        motherName: rawData.madre || '',
        motherId: rawData.cedumad || '', // New
        tipoUnionPadres: rawData.tipohijo || '', // Existing tipohijo
        parentsUnionType: rawData.tipohijo || '', // Aliased
        
        // Grandparents
        paternalGrandparents: rawData.abuepat || rawData.abupa || '', // Mapped abuepat
        maternalGrandparents: rawData.abuemat || rawData.abuemat || rawData.abuma || '', // Mapped abuemat
        
        // Godparents
        godfather: rawData.padri || '', // Legacy
        godmother: rawData.madri || '', // Legacy
        godparents: rawData.padrinos || ((rawData.padri || '') + (rawData.madri ? ' y ' + rawData.madri : '')).trim() || '', // New field padrinos
        
        // Minister
        minister: rawData.ministro || '',
        ministerFaith: rawData.dafe || '',
        
        // Civil Registry (New fields)
        registrySerial: rawData.regciv || '',
        nuip: rawData.nuip || '',
        registryOffice: rawData.notaria || '',
        registryDate: rawData.fecregis || '',

        // Notes & Meta
        notes: rawData.nota || '',
        notaMarginal: rawData.nota || '',
        importedAt: new Date().toISOString(),
        isAnulado: rawData.anulado === true || rawData.anulado === '1',
        lastUpdated: rawData.actualizad || new Date().toISOString(),
        
        // Other legacy fields
        numinsc: rawData.numinsc,
        direccion: rawData.direccion,
        responsable: rawData.responsa,
        documentos: [rawData.docu1, rawData.docu2, rawData.docu3, rawData.docu4].filter(Boolean)
    };
};

/**
 * Validates the overall structure of the imported JSON file.
 */
export const validateBaptismStructure = (jsonData) => {
    if (!jsonData || typeof jsonData !== 'object') {
        return { isValid: false, message: 'El archivo no es un JSON válido.' };
    }
    
    if (!Array.isArray(jsonData.data)) {
        return { isValid: false, message: 'El JSON debe contener una propiedad "data" que sea un arreglo.' };
    }

    if (jsonData.data.length === 0) {
        return { isValid: false, message: 'El arreglo "data" está vacío.' };
    }

    return { isValid: true, count: jsonData.data.length };
};

/**
 * Validates a single record row for required fields and data types.
 */
export const validateBaptismData = (record) => {
    const errors = [];
    
    // Required Identity
    if (!record.libro) errors.push('Falta Libro');
    if (!record.folio) errors.push('Falta Folio');
    if (!record.numero) errors.push('Falta Número');
    if (!record.nombres) errors.push('Faltan Nombres');
    if (!record.apellidos) errors.push('Faltan Apellidos');

    // Date Format Validation (YYYY-MM-DD or DD/MM/YYYY)
    const dateRegex = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/;
    
    if (record.fecbau && !String(record.fecbau).match(dateRegex)) {
        errors.push(`Formato fecha bautismo inválido (${record.fecbau})`);
    }
    if (record.fecnac && !String(record.fecnac).match(dateRegex)) {
        errors.push(`Formato fecha nacimiento inválido (${record.fecnac})`);
    }
    if (record.fecregis && !String(record.fecregis).match(dateRegex)) {
        errors.push(`Formato fecha registro civil inválido (${record.fecregis})`);
    }

    // Number Validations
    if (record.sexo && !['1', '2', '3', '4', '5'].includes(String(record.sexo))) {
        errors.push('Sexo debe ser 1-5');
    }
    
    if (record.tipohijo && !['1', '2', '3'].includes(String(record.tipohijo))) {
        // Strict validation requested 1-3, though sometimes 1-5 is used. Sticking to request.
        errors.push('Tipo Hijo debe ser 1-3');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

export const handleBaptismImportError = (error) => {
    console.error("Baptism Import Error:", error);
    if (error instanceof SyntaxError) {
        return "Error de sintaxis en el archivo JSON. Verifique el formato.";
    }
    return error.message || "Error desconocido durante la importación.";
};

export const detectDuplicateBaptisms = (importedRecords, existingRecords) => {
    const newRecords = [];
    const duplicateRecords = [];

    const existingKeys = new Set(existingRecords.map(r => {
        const b = String(r.book_number || '').trim().toLowerCase();
        const p = String(r.page_number || '').trim().toLowerCase();
        const e = String(r.entry_number || '').trim().toLowerCase();
        return `${b}-${p}-${e}`;
    }));

    importedRecords.forEach(record => {
        const b = String(record.book_number || '').trim().toLowerCase();
        const p = String(record.page_number || '').trim().toLowerCase();
        const e = String(record.entry_number || '').trim().toLowerCase();
        const key = `${b}-${p}-${e}`;

        if (existingKeys.has(key)) {
            duplicateRecords.push(record);
        } else {
            newRecords.push(record);
        }
    });

    return { newRecords, duplicateRecords };
};

export const separateNewAndDuplicateBaptisms = (importedRecords, existingRecords) => {
    const { newRecords, duplicateRecords } = detectDuplicateBaptisms(importedRecords, existingRecords);
    
    return {
        newBaptisms: newRecords,
        duplicateBaptisms: duplicateRecords,
        summary: {
            newCount: newRecords.length,
            duplicateCount: duplicateRecords.length
        }
    };
};

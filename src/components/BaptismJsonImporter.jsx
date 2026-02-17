
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, AlertCircle, CheckCircle, Save, Info, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAppData } from '@/context/AppDataContext';
import { 
    validateBaptismStructure, 
    validateBaptismData, 
    mapBaptismJSON,
    handleBaptismImportError,
    separateNewAndDuplicateBaptisms
} from '@/utils/baptismJsonMapper';
import Table from '@/components/ui/Table';

const BaptismJsonImporter = () => {
    const { addBaptismsFromJSON, getBaptisms } = useAppData();
    const { toast } = useToast();
    
    const [file, setFile] = useState(null);
    const [records, setRecords] = useState([]); // Contains only NEW records ready to be added
    const [duplicates, setDuplicates] = useState([]); // Contains duplicate records for display
    const [validationStats, setValidationStats] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importComplete, setImportComplete] = useState(false);
    const [showDuplicates, setShowDuplicates] = useState(false);

    const getParishId = () => {
        const authUser = JSON.parse(localStorage.getItem('user'));
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (authUser && authUser.parishId) return authUser.parishId;
        if (currentUser && currentUser.parishId) return currentUser.parishId;
        const parishes = JSON.parse(localStorage.getItem('parishes') || '[]');
        return parishes.length > 0 ? parishes[0].id : null;
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;

        // Filename Validation
        const fileName = selectedFile.name.toUpperCase();
        if (fileName !== 'BAUTIZOS' && fileName !== 'BAUTIZOS.JSON') {
            toast({
                title: "Nombre de archivo incorrecto",
                description: "El archivo debe llamarse 'BAUTIZOS' o 'BAUTIZOS.json'",
                variant: "destructive"
            });
            event.target.value = ''; // Reset input to allow re-selection
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setRecords([]);
        setDuplicates([]);
        setValidationStats(null);
        setImportComplete(false);
        setIsProcessing(true);
        setShowDuplicates(false);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                
                // 1. Validate Structure
                const structureCheck = validateBaptismStructure(json);
                if (!structureCheck.isValid) {
                    throw new Error(structureCheck.message);
                }

                // 2. Process Records
                const validRawRecords = [];
                const invalidRawRecords = [];

                json.data.forEach((item, index) => {
                    // WORKAROUND: Extend tipohijo validation to include values 4 and 5
                    // The standard validateBaptismData may strictly enforce 1-3 range.
                    // We temporarily mask 4/5 as 3 (Unión Libre) to pass validation, then restore correct mapping.
                    let validationItem = { ...item };
                    let originalTipohijo = null;
                    
                    const tipohijoVal = String(item.tipohijo || '');
                    
                    // Check for expanded values: 4 (Madre Soltera) and 5 (Otro)
                    if (tipohijoVal === '4' || tipohijoVal === '5') {
                        validationItem.tipohijo = 3; // Mask as '3' (Unión Libre) to bypass legacy validation range
                        originalTipohijo = tipohijoVal;
                    }

                    const validation = validateBaptismData(validationItem);
                    
                    if (validation.isValid) {
                        if (originalTipohijo) {
                            // Keep the validationItem (which has tipohijo=3) but attach original value for mapping
                            validRawRecords.push({ ...validationItem, _originalTipohijo: originalTipohijo });
                        } else {
                            validRawRecords.push(item);
                        }
                    } else {
                        // If invalid, report errors on the original item structure
                        invalidRawRecords.push({ ...item, _errors: validation.errors, _index: index + 1 });
                    }
                });

                // 3. Map Valid Records to Internal Format
                const mappedRecords = validRawRecords.map(record => {
                    const mapped = mapBaptismJSON(record);
                    
                    // FIX: Restore correct mapping for extended tipohijo values
                    if (record._originalTipohijo) {
                        if (record._originalTipohijo === '4') {
                            mapped.tipoUnionPadres = 4; // Import as number 4
                        } else if (record._originalTipohijo === '5') {
                            mapped.tipoUnionPadres = 5; // Import as number 5
                        }
                    }
                    return mapped;
                });

                // 4. Check for Duplicates
                const parishId = getParishId();
                const existingBaptisms = parishId ? getBaptisms(parishId) : [];
                
                const { newBaptisms, duplicateBaptisms } = separateNewAndDuplicateBaptisms(mappedRecords, existingBaptisms);

                setRecords(newBaptisms);
                setDuplicates(duplicateBaptisms);

                setValidationStats({
                    total: json.data.length,
                    valid: validRawRecords.length,
                    invalid: invalidRawRecords.length,
                    new: newBaptisms.length,
                    duplicates: duplicateBaptisms.length,
                    errors: invalidRawRecords.slice(0, 5) // Store first 5 errors for display
                });

            } catch (error) {
                toast({
                    title: "Error de lectura",
                    description: handleBaptismImportError(error),
                    variant: "destructive"
                });
                setFile(null);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleImport = async () => {
        if (!records.length) return;

        setIsProcessing(true);
        
        try {
            const result = await addBaptismsFromJSON(records, true);
            
            if (result.success) {
                toast({
                    title: "Importación Exitosa",
                    description: result.message,
                    className: "bg-green-50 border-green-200"
                });
                setImportComplete(true);
                setFile(null); 
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
             toast({
                title: "Error de Importación",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const previewColumns = [
        { header: 'L/F/N', render: r => `${r.book_number}/${r.page_number}/${r.entry_number}` },
        { header: 'Apellidos', accessor: 'lastName' },
        { header: 'Nombres', accessor: 'firstName' },
        { header: 'Lugar Nac.', accessor: 'lugarNacimientoDetalle' }, // lugarn
        { header: 'Fecha Baut.', accessor: 'sacramentDate' },
        { header: 'Lugar Baut.', accessor: 'lugarBautismo' }, // lugbau
        { header: 'Cédula Padre', accessor: 'fatherId' }, // cedupad
        { header: 'Cédula Madre', accessor: 'motherId' }, // cedumad
        { header: 'Padrinos', accessor: 'godparents' }, // padrinos
        { header: 'NUIP', accessor: 'nuip' }, // nuip
        { header: 'Serial Reg.', accessor: 'registrySerial' } // regciv
    ];

    const duplicateColumns = [
        { header: 'L/F/N', render: r => <span className="font-mono bg-red-50 text-red-700 px-1 rounded">{r.book_number}/{r.page_number}/{r.entry_number}</span> },
        { header: 'Persona', render: r => `${r.lastName}, ${r.firstName}` },
        { header: 'Fecha', accessor: 'sacramentDate' }
    ];

    return (
        <div className="bg-white border rounded-lg p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-1/3">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500 font-semibold">Click para subir JSON</p>
                            <p className="text-xs text-gray-500">Formato: {`{ "data": [...] }`}</p>
                        </div>
                        <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
                    </label>
                    
                    {file && (
                        <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-blue-500" />
                            <span className="truncate">{file.name}</span>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-2/3 space-y-4">
                    <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Estado de Importación</h3>
                    
                    {!validationStats ? (
                        <p className="text-gray-500 italic text-sm">Seleccione un archivo para validar, detectar duplicados y previsualizar los datos.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                    <span className="block text-xl font-bold text-gray-700">{validationStats.total}</span>
                                    <span className="text-xs text-gray-600 uppercase">Total</span>
                                </div>
                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                    <span className="block text-xl font-bold text-green-700">{validationStats.new}</span>
                                    <span className="text-xs text-green-600 uppercase">Nuevos</span>
                                </div>
                                <div className={`p-2 rounded border ${validationStats.duplicates > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <span className={`block text-xl font-bold ${validationStats.duplicates > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>{validationStats.duplicates}</span>
                                    <span className={`text-xs uppercase ${validationStats.duplicates > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>Duplicados</span>
                                </div>
                                <div className={`p-2 rounded border ${validationStats.invalid > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <span className={`block text-xl font-bold ${validationStats.invalid > 0 ? 'text-red-700' : 'text-gray-400'}`}>{validationStats.invalid}</span>
                                    <span className={`text-xs uppercase ${validationStats.invalid > 0 ? 'text-red-600' : 'text-gray-400'}`}>Inválidos</span>
                                </div>
                            </div>

                            {validationStats.duplicates > 0 && (
                                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p>
                                        Se han detectado <strong>{validationStats.duplicates} registros</strong> que ya existen en la base de datos (mismo Libro, Folio y Número). Estos serán ignorados.
                                    </p>
                                </div>
                            )}

                            {validationStats.invalid > 0 && (
                                <div className="bg-red-50 p-3 rounded text-xs text-red-800 border border-red-100">
                                    <p className="font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Errores de formato (Primeros 5):</p>
                                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        {validationStats.errors.map((err, idx) => (
                                            <li key={idx}>Fila {err._index}: {err._errors.join(', ')}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button 
                                    onClick={handleImport} 
                                    disabled={records.length === 0 || isProcessing || importComplete}
                                    className="bg-[#4B7BA7] hover:bg-[#365d80] text-white w-full"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isProcessing ? 'Procesando...' : `Importar ${records.length} Registros Nuevos`}
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {importComplete && (
                        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-2 border border-green-200 animate-in fade-in duration-300">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                                <p className="font-bold">¡Proceso finalizado!</p>
                                <p className="text-xs">Los registros nuevos han sido añadidos correctamente.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {duplicates.length > 0 && (
                <div className="mt-4 border rounded-md overflow-hidden">
                    <button 
                        onClick={() => setShowDuplicates(!showDuplicates)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            Ver {duplicates.length} registros duplicados ignorados
                        </span>
                        {showDuplicates ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    {showDuplicates && (
                        <div className="p-4 bg-white border-t border-gray-200 max-h-60 overflow-y-auto">
                            <Table 
                                columns={duplicateColumns} 
                                data={duplicates} 
                                className="text-xs"
                            />
                        </div>
                    )}
                </div>
            )}

            {records.length > 0 && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        Vista Previa (Primeros 10 registros nuevos con campos adicionales)
                    </h4>
                    <div className="overflow-x-auto">
                        <Table 
                            columns={previewColumns} 
                            data={records.slice(0, 10)} 
                            className="text-xs min-w-max"
                        />
                    </div>
                    {records.length > 10 && (
                        <p className="text-center text-xs text-gray-400 mt-2">... y {records.length - 10} más</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default BaptismJsonImporter;

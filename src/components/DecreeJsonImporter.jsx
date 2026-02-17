import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, AlertCircle, CheckCircle, Save, AlertTriangle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAppData } from '@/context/AppDataContext';
import { 
    validateDecreeStructure, 
    validateDecreeData, 
    mapDecreeJSON,
    handleDecreeImportError,
    separateNewAndDuplicateDecrees
} from '@/utils/decreeJsonMapper';
import Table from '@/components/ui/Table';

const DecreeJsonImporter = ({ sacramentType }) => {
    const { addDecreesFromJSON, getDecrees, processBaptismDecreeBatch, getBaptisms, getBaptismCorrections } = useAppData();
    const { toast } = useToast();
    
    const [file, setFile] = useState(null);
    const [records, setRecords] = useState([]); // Valid records to process
    const [errors, setErrors] = useState([]); // Validation errors
    const [duplicates, setDuplicates] = useState([]);
    const [validationStats, setValidationStats] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importComplete, setImportComplete] = useState(false);
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

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
        if (fileName !== 'ANULACION' && fileName !== 'ANULACION.JSON') {
            toast({
                title: "Nombre de archivo incorrecto",
                description: "El archivo debe llamarse 'ANULACION' o 'ANULACION.json'",
                variant: "destructive"
            });
            event.target.value = ''; // Reset input to allow re-selection
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setRecords([]);
        setErrors([]);
        setDuplicates([]);
        setValidationStats(null);
        setImportComplete(false);
        setIsProcessing(true);
        setShowDuplicates(false);
        setShowErrors(false);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                const parishId = getParishId();
                if (!parishId) throw new Error("No se pudo identificar la parroquia.");

                // Specific Logic for Baptism Decrees (Legacy Migration)
                if (sacramentType === 'baptism') {
                    const baptisms = getBaptisms(parishId) || [];
                    const corrections = getBaptismCorrections(parishId) || [];
                    
                    const validItems = [];
                    const errorItems = [];
                    const duplicateItems = [];
                    const existingDecrees = new Set(corrections.map(c => String(c.decreeNumber)));

                    if (!Array.isArray(json.data)) throw new Error("Formato inválido: se espera { data: [...] }");

                    json.data.forEach((item, index) => {
                        const rowId = index + 1;
                        
                        // Basic field check
                        if (!item.decreto || !item.fecha) {
                            errorItems.push({ ...item, _error: "Falta decreto o fecha", _row: rowId });
                            return;
                        }

                        // Duplicate check
                        if (existingDecrees.has(String(item.decreto))) {
                            duplicateItems.push({ ...item, _row: rowId });
                            return;
                        }

                        // Find Original
                        const origExists = baptisms.some(b => 
                            String(b.book_number) === String(item.libro) &&
                            String(b.page_number) === String(item.folio) &&
                            String(b.entry_number) === String(item.numero)
                        );

                        // Find New
                        const newExists = baptisms.some(b => 
                            String(b.book_number) === String(item.newlib) &&
                            String(b.page_number) === String(item.newfol) &&
                            String(b.entry_number) === String(item.newnum)
                        );

                        if (!origExists) {
                             errorItems.push({ ...item, _error: `Original no encontrado (L:${item.libro}/F:${item.folio}/N:${item.numero})`, _row: rowId });
                        } else if (!newExists) {
                             errorItems.push({ ...item, _error: `Nueva no encontrada (L:${item.newlib}/F:${item.newfol}/N:${item.newnum})`, _row: rowId });
                        } else {
                            // Valid Item Structure for Batch Processor
                            validItems.push({
                                decreeNumber: item.decreto,
                                decreeDate: item.fecha,
                                annulmentConceptCode: item.codiconcep,
                                observations: item.observacio,
                                createdBy: item.usuario,
                                originalData: { libro: item.libro, folio: item.folio, numero: item.numero },
                                newData: { libro: item.newlib, folio: item.newfol, numero: item.newnum }
                            });
                        }
                    });

                    setRecords(validItems);
                    setErrors(errorItems);
                    setDuplicates(duplicateItems);
                    setValidationStats({
                        total: json.data.length,
                        valid: validItems.length,
                        invalid: errorItems.length,
                        duplicates: duplicateItems.length
                    });

                } else {
                    // GENERIC LOGIC (For Confirmation/Marriage if needed later)
                    // ... (Keeps existing logic structure for fallback)
                     const structureCheck = validateDecreeStructure(json);
                     if (!structureCheck.isValid) throw new Error(structureCheck.message);

                     const validRawRecords = [];
                     const invalidRawRecords = [];

                     json.data.forEach((item, index) => {
                         const validation = validateDecreeData(item, sacramentType);
                         if (validation.isValid) validRawRecords.push(item);
                         else invalidRawRecords.push({ ...item, _errors: validation.errors, _index: index + 1 });
                     });

                     const mappedRecords = validRawRecords.map(r => mapDecreeJSON(r, sacramentType));
                     const existingDecrees = getDecrees(parishId, sacramentType);
                     const { newDecrees, duplicateDecrees } = separateNewAndDuplicateDecrees(mappedRecords, existingDecrees);

                     setRecords(newDecrees);
                     setDuplicates(duplicateDecrees);
                     setValidationStats({
                         total: json.data.length,
                         valid: validRawRecords.length,
                         invalid: invalidRawRecords.length,
                         new: newDecrees.length,
                         duplicates: duplicateDecrees.length,
                         errors: invalidRawRecords.slice(0, 5)
                     });
                }

            } catch (error) {
                toast({ title: "Error de lectura", description: handleDecreeImportError(error), variant: "destructive" });
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
            let result;
            if (sacramentType === 'baptism') {
                 const parishId = getParishId();
                 result = await processBaptismDecreeBatch(records, parishId);
            } else {
                 result = await addDecreesFromJSON(records, sacramentType);
            }
            
            if (result.success) {
                toast({ title: "Importación Exitosa", description: result.message, className: "bg-green-50 border-green-200" });
                setImportComplete(true);
                setFile(null); 
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
             toast({ title: "Error de Importación", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    // Columns for Baptism Decree Preview
    const baptismPreviewColumns = [
        { header: 'Decreto', accessor: 'decreeNumber' },
        { header: 'Fecha', accessor: 'decreeDate' },
        { header: 'Original (L/F/N)', render: r => `${r.originalData.libro}/${r.originalData.folio}/${r.originalData.numero}` },
        { header: 'Nueva (L/F/N)', render: r => `${r.newData.libro}/${r.newData.folio}/${r.newData.numero}` },
        { header: 'Concepto', accessor: 'annulmentConceptCode' },
    ];

    // Columns for Generic Preview
    const genericPreviewColumns = [
        { header: 'N° Decreto', accessor: 'decreeNumber' },
        { header: 'Fecha', accessor: 'decreeDate' },
        { header: 'Lib/Fol/Num', render: r => `${r.book || '-'}/${r.folio || '-'}/${r.entry || '-'}` },
        { header: 'Solicitante', accessor: 'applicantName' }
    ];

    const currentColumns = sacramentType === 'baptism' ? baptismPreviewColumns : genericPreviewColumns;

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
                    <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Estado de Importación ({sacramentType === 'baptism' ? 'Bautismo - Migración' : sacramentType})</h3>
                    
                    {!validationStats ? (
                        <p className="text-gray-500 italic text-sm">Seleccione un archivo para validar.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                    <span className="block text-xl font-bold text-gray-700">{validationStats.total}</span>
                                    <span className="text-xs text-gray-600 uppercase">Total</span>
                                </div>
                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                    <span className="block text-xl font-bold text-green-700">{validationStats.valid}</span>
                                    <span className="text-xs text-green-600 uppercase">Válidos</span>
                                </div>
                                <div className={`p-2 rounded border ${validationStats.duplicates > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <span className={`block text-xl font-bold ${validationStats.duplicates > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>{validationStats.duplicates}</span>
                                    <span className={`text-xs uppercase ${validationStats.duplicates > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>Duplicados</span>
                                </div>
                                <div className={`p-2 rounded border ${validationStats.invalid > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <span className={`block text-xl font-bold ${validationStats.invalid > 0 ? 'text-red-700' : 'text-gray-400'}`}>{validationStats.invalid}</span>
                                    <span className={`text-xs uppercase ${validationStats.invalid > 0 ? 'text-red-600' : 'text-gray-400'}`}>Errores</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    onClick={handleImport} 
                                    disabled={records.length === 0 || isProcessing || importComplete}
                                    className="bg-[#4B7BA7] hover:bg-[#365d80] text-white w-full"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isProcessing ? 'Procesando...' : `Importar ${records.length} Decretos`}
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {importComplete && (
                        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-2 border border-green-200 animate-in fade-in duration-300">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                                <p className="font-bold">¡Proceso finalizado!</p>
                                <p className="text-xs">Los decretos han sido procesados.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ERROR DISPLAY */}
            {errors.length > 0 && (
                <div className="mt-4 border rounded-md overflow-hidden border-red-200">
                    <button 
                        onClick={() => setShowErrors(!showErrors)}
                        className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors text-sm font-medium text-red-800"
                    >
                        <span className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Ver {errors.length} errores de validación
                        </span>
                        {showErrors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {showErrors && (
                        <div className="p-4 bg-white max-h-60 overflow-y-auto">
                            <ul className="space-y-1 text-xs text-red-600">
                                {errors.map((err, i) => (
                                    <li key={i}>
                                        <span className="font-bold">Fila {err._row || err._index}:</span> {err._error || (err._errors ? err._errors.join(', ') : 'Error desconocido')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* DUPLICATE DISPLAY */}
            {duplicates.length > 0 && (
                <div className="mt-4 border rounded-md overflow-hidden border-yellow-200">
                    <button 
                        onClick={() => setShowDuplicates(!showDuplicates)}
                        className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition-colors text-sm font-medium text-yellow-800"
                    >
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Ver {duplicates.length} duplicados ignorados
                        </span>
                        {showDuplicates ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {showDuplicates && (
                        <div className="p-4 bg-white max-h-60 overflow-y-auto">
                             <ul className="space-y-1 text-xs text-yellow-700">
                                {duplicates.map((dup, i) => (
                                    <li key={i}>
                                        <span className="font-bold">Fila {dup._row}:</span> Decreto {dup.decreto || dup.decreeNumber} ya existe.
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* PREVIEW TABLE */}
            {records.length > 0 && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        Vista Previa (Primeros 10 registros válidos)
                    </h4>
                    <div className="overflow-x-auto">
                        <Table 
                            columns={currentColumns} 
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

export default DecreeJsonImporter;
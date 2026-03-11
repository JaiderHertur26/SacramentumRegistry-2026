import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, AlertCircle, CheckCircle, Save, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';

const DecreeJsonImporter = ({ sacramentType }) => {
    const { processBaptismDecreeBatch } = useAppData();
    const { toast } = useToast();
    
    const [file, setFile] = useState(null);
    const [records, setRecords] = useState([]);
    const [errors, setErrors] = useState([]);
    const [validationStats, setValidationStats] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importComplete, setImportComplete] = useState(false);

    const getParishId = () => {
        const authUser = JSON.parse(localStorage.getItem('user'));
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (authUser && authUser.parishId) return authUser.parishId;
        if (currentUser && currentUser.parishId) return currentUser.parishId;
        return null;
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;

        const fileName = selectedFile.name.toUpperCase();
        if (fileName !== 'ANULACION' && fileName !== 'ANULACION.JSON') {
            toast({ title: "Nombre incorrecto", description: "El archivo debe llamarse 'ANULACION.json'", variant: "destructive" });
            event.target.value = '';
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setRecords([]);
        setErrors([]);
        setValidationStats(null);
        setImportComplete(false);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (!Array.isArray(json.data)) throw new Error("Formato inválido: se espera { data: [...] }");

                const validRecords = [];
                const invalidRecords = [];

                json.data.forEach((item, index) => {
                    // Solo validamos que traiga lo mínimo para que el Robot pueda trabajar
                    if (!item.decreto || !item.fecha || !item.libro || !item.folio || !item.numero) {
                        invalidRecords.push({ fila: index + 1, error: "Faltan datos clave (decreto, fecha, libro, folio o numero)" });
                    } else {
                        validRecords.push(item);
                    }
                });

                setRecords(validRecords);
                setErrors(invalidRecords);
                setValidationStats({
                    total: json.data.length,
                    valid: validRecords.length,
                    invalid: invalidRecords.length
                });

            } catch (error) {
                toast({ title: "Error de archivo", description: error.message, variant: "destructive" });
                setFile(null);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleImport = async () => {
        if (!records.length) return;
        setIsProcessing(true);
        
        try {
            const parishId = getParishId();
            if (!parishId) throw new Error("No hay parroquia seleccionada.");

            // Le pasamos el arreglo puro al robot
            const result = await processBaptismDecreeBatch(records, parishId);
            
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

    const columns = [
        { header: 'Decreto', accessor: 'decreto' },
        { header: 'Fecha', accessor: 'fecha' },
        { header: 'Afecta Original', render: r => `L:${r.libro} F:${r.folio} N:${r.numero}` },
        { header: 'Apunta a Nueva', render: r => `L:${r.newlib} F:${r.newfol} N:${r.newnum}` },
        { header: 'Concepto', accessor: 'codiconcep' }
    ];

    return (
        <div className="bg-white border rounded-lg p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-1/3">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500 font-semibold">Click para subir JSON</p>
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
                    <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Importar Decretos Masivos</h3>
                    
                    {!validationStats ? (
                        <p className="text-gray-500 text-sm">Sube el archivo para validar los datos antes de inyectarlos.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                    <span className="block text-xl font-bold text-gray-700">{validationStats.total}</span>
                                    <span className="text-xs text-gray-600 uppercase">Total en Archivo</span>
                                </div>
                                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                    <span className="block text-xl font-bold text-blue-700">{validationStats.valid}</span>
                                    <span className="text-xs text-blue-600 uppercase">Listos para procesar</span>
                                </div>
                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                    <span className="block text-xl font-bold text-red-700">{validationStats.invalid}</span>
                                    <span className="text-xs text-red-600 uppercase">Filas con Error</span>
                                </div>
                            </div>

                            <Button 
                                onClick={handleImport} 
                                disabled={records.length === 0 || isProcessing || importComplete}
                                className="bg-[#4B7BA7] hover:bg-[#365d80] text-white w-full"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isProcessing ? 'Aplicando Decretos a las Partidas...' : `Aplicar ${records.length} Decretos a Base de Datos`}
                            </Button>
                        </div>
                    )}

                    {importComplete && (
                        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-2 border border-green-200">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                                <p className="font-bold">¡Magia Hecha!</p>
                                <p className="text-xs">Los decretos han anulado las originales y marcado las nuevas.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {records.length > 0 && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        Vista Previa (Qué vamos a aplicar)
                    </h4>
                    <div className="overflow-x-auto">
                        <Table columns={columns} data={records.slice(0, 10)} className="text-xs" />
                    </div>
                    {records.length > 10 && <p className="text-center text-xs text-gray-400 mt-2">... y {records.length - 10} más</p>}
                </div>
            )}
        </div>
    );
};

export default DecreeJsonImporter;
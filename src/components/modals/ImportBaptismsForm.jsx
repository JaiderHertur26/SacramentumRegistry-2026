import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, FileWarning, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Table from '@/components/ui/Table';

// --- HELPER FUNCTION: DETECCIÓN DE DUPLICADOS ---
const detectDuplicates = (newBaptisms, existingBaptisms) => {
    const duplicates = [];
    const newRecords = [];

    // Creamos un Set con las llaves existentes para búsqueda ultra rápida
    // Formato de la llave: "LIBRO-FOLIO-NUMERO"
    const existingKeys = new Set(existingBaptisms.map(b =>
        `${b.libro || b.book_number}-${b.folio || b.page_number}-${b.numero || b.entry_number}`
    ));

    // También rastreamos llaves dentro del nuevo lote para evitar duplicados internos
    const newKeys = new Set();

    newBaptisms.forEach(record => {
        const key = `${record.libro}-${record.folio}-${record.numero}`;

        if (existingKeys.has(key) || newKeys.has(key)) {
            duplicates.push(record);
        } else {
            newRecords.push(record);
            newKeys.add(key);
        }
    });

    return { duplicates, newRecords };
};

const ImportBaptismsForm = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    const handleImportBaptisms = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setLoading(true);
        setValidationResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                console.log("📂 Leyendo archivo JSON Transformado...");
                const json = JSON.parse(event.target.result);

                if (!json.data || !Array.isArray(json.data)) {
                    throw new Error('El archivo debe contener una propiedad "data" que sea un arreglo.');
                }

                const entityId = user.parishId || user.dioceseId;
                const storageKey = `baptisms_${entityId}`;
                const existingBaptisms = JSON.parse(localStorage.getItem(storageKey) || '[]');

                // MAPEO MÁGICO: Del JSON Transformado al Diccionario Unificado Dual
                const mappedRecords = json.data.map((item) => {
                    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    return {
                        id: uniqueId,
                        type: 'baptism',
                        parishId: entityId,
                        estado: 'Activo',
                        status: 'seated', // Legacy compatibility

                        // 1. Numeración (Unificada)
                        libro: item.libro,
                        book_number: item.libro,
                        folio: item.folio,
                        page_number: item.folio,
                        numero: item.numero,
                        numeroActa: item.numero,
                        entry_number: item.numero,

                        // 2. Datos del Sacramento
                        fechaSacramento: item.fechaSacramento,
                        fecbau: item.fechaSacramento,
                        sacramentDate: item.fechaSacramento,
                        lugarBautismo: item.lugarBautismo,
                        lugarBautismoDetalle: item.lugarBautismo,
                        lugbau: item.lugarBautismo,

                        // 3. Datos del Bautizado
                        nombres: item.nombres,
                        firstName: item.nombres,
                        apellidos: item.apellidos,
                        lastName: item.apellidos,
                        fechaNacimiento: item.fechaNacimiento,
                        fecnac: item.fechaNacimiento,
                        birthDate: item.fechaNacimiento,
                        lugarNacimiento: item.lugarNacimiento,
                        lugarNacimientoDetalle: item.lugarNacimiento,
                        lugnac: item.lugarNacimiento,
                        lugarn: item.lugarNacimiento,
                        sexo: item.sexo,
                        sex: item.sexo,

                        // 4. Datos de los Padres
                        tipoUnionPadres: item.tipoUnionPadres,
                        tipohijo: item.tipoUnionPadres,
                        nombrePadre: item.nombrePadre,
                        padre: item.nombrePadre,
                        fatherName: item.nombrePadre,
                        cedulaPadre: item.cedulaPadre,
                        cedupad: item.cedulaPadre,
                        fatherId: item.cedulaPadre,
                        nombreMadre: item.nombreMadre,
                        madre: item.nombreMadre,
                        motherName: item.nombreMadre,
                        cedulaMadre: item.cedulaMadre,
                        cedumad: item.cedulaMadre,
                        motherId: item.cedulaMadre,

                        // 5. Abuelos y Padrinos
                        abuelosPaternos: item.abuelosPaternos,
                        abuepat: item.abuelosPaternos,
                        paternalGrandparents: item.abuelosPaternos,
                        abuelosMaternos: item.abuelosMaternos,
                        abuemat: item.abuelosMaternos,
                        maternalGrandparents: item.abuelosMaternos,
                        padrinos: item.padrinos,
                        godparents: item.padrinos,

                        // 6. Ministro y Registro Legal
                        ministro: item.ministro,
                        minister: item.ministro,
                        daFe: item.daFe,
                        dafe: item.daFe,
                        ministerFaith: item.daFe,

                        serialRegistro: item.serialRegistro,
                        regciv: item.serialRegistro,
                        registrySerial: item.serialRegistro,
                        nuip: item.nuip,
                        oficinaRegistro: item.oficinaRegistro,
                        notaria: item.oficinaRegistro,
                        registryOffice: item.oficinaRegistro,
                        fechaExpedicionRegistro: item.fechaExpedicionRegistro,
                        fecregis: item.fechaExpedicionRegistro,
                        registryDate: item.fechaExpedicionRegistro,

                        // Notas Marginales
                        notaMarginal: item.notaMarginal || "",
                        notaAlMargen: item.notaMarginal || "",
                        marginNote: item.notaMarginal || "",

                        // Metadata
                        importedAt: new Date().toISOString(),
                        importedFrom: 'historical_json',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                });

                // Detectar Duplicados
                const { duplicates, newRecords } = detectDuplicates(mappedRecords, existingBaptisms);

                setValidationResult({
                    count: newRecords.length,
                    duplicates: duplicates,
                    newRecords: newRecords,
                    totalProcessed: mappedRecords.length
                });

            } catch (err) {
                console.error("❌ Error en validación:", err);
                toast({ title: "Error de Estructura", description: "El archivo no tiene el formato estándar esperado.", variant: "destructive" });
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleConfirm = () => {
        if (!validationResult || validationResult.newRecords.length === 0) {
            toast({ title: "Atención", description: "No hay registros nuevos para importar.", variant: "warning" });
            return;
        }

        try {
            const entityId = user.parishId || user.dioceseId;
            const storageKey = `baptisms_${entityId}`;
            const existingBaptisms = JSON.parse(localStorage.getItem(storageKey) || '[]');

            const updatedBaptisms = [...existingBaptisms, ...validationResult.newRecords];
            localStorage.setItem(storageKey, JSON.stringify(updatedBaptisms));

            toast({
                title: "Importación Completada",
                description: `Se importaron ${validationResult.newRecords.length} registros. Se ignoraron ${validationResult.duplicates.length} duplicados.`,
                className: "bg-green-50 border-green-200 text-green-900"
            });

            handleClose();

        } catch (error) {
            console.error("❌ Error guardando datos:", error);
            toast({ title: "Error", description: "No se pudieron guardar los datos.", variant: "destructive" });
        }
    };

    const handleClose = () => {
        setValidationResult(null);
        setLoading(false);
        onClose();
    };

    const columns = [
        { header: 'L / F / N', render: (row) => `${row.libro} / ${row.folio} / ${row.numero}` },
        { header: 'Apellidos', accessor: 'apellidos' },
        { header: 'Nombres', accessor: 'nombres' },
        { header: 'Sexo', accessor: 'sexo' },
        { header: 'Ministro', accessor: 'ministro' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Bautizos Históricos">
            <div className="space-y-6 min-w-[700px]">
                <p className="text-gray-900 text-sm">
                    Seleccione el archivo JSON <strong>transformado</strong> para importar. El sistema detectará automáticamente duplicados basándose en Libro, Folio y Número.
                </p>

                <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBaptisms}
                    className="hidden"
                    id="baptism-import-input"
                    ref={fileInputRef}
                />

                {!validationResult && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="w-10 h-10 text-[#4B7BA7] group-hover:scale-110 transition-transform" />
                            <span className="text-gray-900 font-bold">Seleccionar archivo JSON</span>
                            <span className="text-xs text-gray-700">Formato requerido: BAUTIZOS_transformado.json</span>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-4 border-[#4B7BA7] border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-gray-600 font-medium">Procesando archivo...</p>
                    </div>
                )}

                {validationResult && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                                <div className="text-xs text-green-900 uppercase font-bold tracking-wider">Nuevos a Importar</div>
                                <div className="text-3xl font-bold text-green-700 mt-1">{validationResult.newRecords.length}</div>
                            </div>
                            <div className="flex-1 bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                                <div className="text-xs text-yellow-900 uppercase font-bold tracking-wider">Duplicados (Ignorados)</div>
                                <div className="text-3xl font-bold text-yellow-700 mt-1">{validationResult.duplicates.length}</div>
                            </div>
                        </div>

                        {validationResult.duplicates.length > 0 && (
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-yellow-900 mb-3">
                                    <AlertTriangle className="w-4 h-4" />
                                    Registros Duplicados Detectados
                                </h4>
                                <div className="text-xs text-yellow-800 mb-2">
                                    Los siguientes registros ya existen (coincidencia de Libro/Folio/Número) y <strong>NO</strong> serán importados:
                                </div>
                                <ul className="list-disc list-inside text-xs text-yellow-900 space-y-1 bg-white/50 p-2 rounded max-h-32 overflow-y-auto">
                                    {validationResult.duplicates.slice(0, 5).map((dup, idx) => (
                                        <li key={idx}>
                                            <span className="font-semibold">{dup.apellidos} {dup.nombres}</span> - L:{dup.libro} F:{dup.folio} N:{dup.numero}
                                        </li>
                                    ))}
                                    {validationResult.duplicates.length > 5 && (
                                        <li className="font-medium italic pt-1">... y {validationResult.duplicates.length - 5} más</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {validationResult.newRecords.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-900 border-b border-gray-200 flex justify-between items-center">
                                    <span>VISTA PREVIA (Nuevos Registros)</span>
                                    <span className="text-[10px] text-gray-500 font-normal">Mostrando primeros 3</span>
                                </div>
                                <Table columns={columns} data={validationResult.newRecords.slice(0, 3)} />
                            </div>
                        )}

                        {validationResult.newRecords.length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                                Todos los registros del archivo ya existen en el sistema.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={handleClose} className="text-gray-900 border-gray-300 hover:bg-gray-100">
                        <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!validationResult || validationResult.newRecords.length === 0}
                        className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirmar Importación ({validationResult?.newRecords?.length || 0})
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ImportBaptismsForm;
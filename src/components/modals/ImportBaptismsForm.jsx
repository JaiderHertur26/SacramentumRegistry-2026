
import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, FileWarning, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Table from '@/components/ui/Table';

// --- HELPER FUNCTIONS ---

const convertirFecha = (fechaISO) => {
    if (!fechaISO) return '';
    // Check if already in DD/MM/YYYY
    if (fechaISO.match(/^\d{2}\/\d{2}\/\d{4}$/)) return fechaISO;
    
    // Expects YYYY-MM-DD and returns DD/MM/YYYY
    if (fechaISO.includes('T')) fechaISO = fechaISO.split('T')[0];
    const parts = fechaISO.split('-');
    if (parts.length !== 3) return fechaISO;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const convertirSexo = (sexoCode) => {
    // 1=MASCULINO, 2=FEMENINO
    if (sexoCode == 1 || sexoCode === '1') return 'MASCULINO';
    if (sexoCode == 2 || sexoCode === '2') return 'FEMENINO';
    
    // Check if already text
    if (sexoCode === 'MASCULINO' || sexoCode === 'FEMENINO') return sexoCode;
    
    return 'NO ESPECIFICADO';
};

const convertirTipoHijo = (tipoHijo) => {
    // 1=MATRIMONIO CATÓLICO, 2=MATRIMONIO CIVIL, 3=UNIÓN LIBRE, 4=MADRE SOLTERA, 5=OTRO
    if (tipoHijo == 1 || tipoHijo === '1') return 'MATRIMONIO CATÓLICO';
    if (tipoHijo == 2 || tipoHijo === '2') return 'MATRIMONIO CIVIL';
    if (tipoHijo == 3 || tipoHijo === '3') return 'UNIÓN LIBRE';
    if (tipoHijo == 4 || tipoHijo === '4') return 'MADRE SOLTERA';
    if (tipoHijo == 5 || tipoHijo === '5') return 'OTRO';
    
    // Check if already text
    const valid = ['MATRIMONIO CATÓLICO', 'MATRIMONIO CIVIL', 'UNIÓN LIBRE', 'MADRE SOLTERA', 'OTRO'];
    if (valid.includes(tipoHijo)) return tipoHijo;
    
    // Defaulting to NO ESPECIFICADO if unknown
    return 'NO ESPECIFICADO';
};

const detectDuplicates = (newBaptisms, existingBaptisms) => {
    const duplicates = [];
    const newRecords = [];
    
    // Create a Set of existing keys for efficient lookup
    // Key format: "LIBRO-FOLIO-NUMERO" (normalized)
    const existingKeys = new Set(existingBaptisms.map(b => 
        `${b.book_number}-${b.page_number}-${b.entry_number}`
    ));

    // Also track keys within the new batch to prevent internal duplicates
    const newKeys = new Set();

    newBaptisms.forEach(record => {
        const key = `${record.book_number}-${record.page_number}-${record.entry_number}`;
        
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
            console.log("📂 Leyendo archivo JSON...");
            const json = JSON.parse(event.target.result);
            
            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('El archivo debe contener una propiedad "data" que sea un array.');
            }

            console.log(`📋 Registros encontrados en JSON: ${json.data.length}`);

            const entityId = user.parishId || user.dioceseId;
            const storageKey = `baptisms_${entityId}`;
            const existingBaptisms = JSON.parse(localStorage.getItem(storageKey) || '[]');
            console.log(`✅ Registros existentes cargados: ${existingBaptisms.length}`);

            // Map Fields Complete with Correct JSON Mapping
            const mappedRecords = json.data.map((item, index) => {
                // Generate Unique ID
                const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Conversions
                const fecNac = item.fecnac ? convertirFecha(item.fecnac) : '';
                const fecBau = item.fecbau ? convertirFecha(item.fecbau) : '';
                const fecRegis = item.fecregis ? convertirFecha(item.fecregis) : '';

                return {
                    id: uniqueId,
                    // Registro
                    book_number: item.libro,
                    page_number: item.folio,
                    entry_number: item.numero,
                    
                    // Sacramento
                    sacramentDate: fecBau,
                    sacramentTime: '00:00AM', // Default requested
                    sacramentPlace: item.lugbau || '',
                    minister: item.ministro, // This maps correctly to the NAME of the minister
                    
                    // Updated mapping per user request
                    lugarBautismo: '',
                    lugarBautismoDetalle: item.lugbau || '',

                    // Bautizado
                    lastName: item.apellidos,
                    firstName: item.nombres,
                    birthDate: fecNac,
                    
                    // Updated birthplace mapping
                    birthPlace: '',
                    lugarNacimientoDetalle: item.lugarn || '',
                    
                    sex: convertirSexo(item.sexo),
                    
                    // Padres
                    fatherName: item.padre,
                    fatherId: item.cedupad,
                    motherName: item.madre,
                    motherId: item.cedumad,
                    parentsUnionType: convertirTipoHijo(item.tipohijo),
                    
                    // Abuelos y Padrinos
                    paternalGrandparents: item.abuepat,
                    maternalGrandparents: item.abuemat,
                    godparents: item.padrinos,
                    
                    // Datos Legales / Adicionales
                    registrySerial: item.regciv,
                    nuip: item.nuip,
                    registryOffice: item.notaria || '',
                    registrationDate: fecRegis,
                    
                    // UPDATED: Map ministerFaith (Da Fe) to item.ministro (Name) instead of item.dafe (Code)
                    ministerFaith: item.ministro, 
                    
                    // Metadata
                    importedAt: new Date().toISOString(),
                    importedFrom: 'historical_json',
                    createdAt: new Date().toISOString(),
                    registeredAt: new Date().toISOString(),
                    updatedAt: item.actualizad ? new Date(item.actualizad).toISOString() : new Date().toISOString(),
                    
                    // Legacy/Optional
                    inscriptionNumber: item.numinsc,
                    address: item.direccion,
                    isAnnulled: item.anulado,
                    isAdult: item.adulto,
                    
                    // Keep track of responsible signature just in case it's needed later or as fallback
                    responsibleSignature: item.responsa
                };
            });

            // Detect Duplicates
            const { duplicates, newRecords } = detectDuplicates(mappedRecords, existingBaptisms);
            
            if (duplicates.length > 0) {
                console.log(`⚠️ Se detectaron ${duplicates.length} duplicados.`);
            }
            console.log(`✅ Registros nuevos para importar: ${newRecords.length}`);

            setValidationResult({
                count: newRecords.length,
                duplicates: duplicates,
                newRecords: newRecords,
                totalProcessed: mappedRecords.length
            });

        } catch (err) {
            console.error("❌ Error en validación:", err);
            toast({ title: "Error de Validación", description: err.message, variant: "destructive" });
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
          
          console.log(`✅ Importación exitosa. Total registros ahora: ${updatedBaptisms.length}`);
          
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
      { header: 'L / F / N', render: (row) => `${row.book_number} / ${row.page_number} / ${row.entry_number}` },
      { header: 'Apellidos', accessor: 'lastName' },
      { header: 'Nombres', accessor: 'firstName' },
      { header: 'Sexo', accessor: 'sex' },
      { header: 'Ministro', accessor: 'minister' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Bautizos Históricos">
        <div className="space-y-6 min-w-[700px]">
            <p className="text-gray-900 text-sm">
                Seleccione un archivo JSON con los datos históricos para importar. El sistema detectará automáticamente duplicados basándose en Libro, Folio y Número.
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
                        <span className="text-xs text-gray-700">Formato requerido: {`{ "data": [...] }`}</span>
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
                                        <span className="font-semibold">{dup.lastName} {dup.firstName}</span> - L:{dup.book_number} F:{dup.page_number} N:{dup.entry_number}
                                    </li>
                                ))}
                                {validationResult.duplicates.length > 5 && (
                                    <li className="font-medium italic pt-1">... y {validationResult.duplicates.length - 5} más</li>
                                )}
                            </ul>
                            <div className="text-xs font-bold text-yellow-900 mt-3 border-t border-yellow-200 pt-2">
                                Solo se importarán los {validationResult.newRecords.length} registros nuevos.
                            </div>
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

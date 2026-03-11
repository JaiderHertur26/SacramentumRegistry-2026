import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Table from '@/components/ui/Table';

const ImportParrocosForm = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { importParrocos, validateJSONStructure, getParrocos } = useAppData();
  const { toast } = useToast();
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [normalizedContent, setNormalizedContent] = useState(null);

  // --- SEPARADOR INTELIGENTE DE NOMBRES ---
  const splitFullName = (fullName) => {
      if (!fullName) return { nombre: '', apellido: '' };
      
      const parts = fullName.trim().split(' ').filter(p => p);
      if (parts.length === 1) return { nombre: parts[0], apellido: '' };

      const titulos = ['PBRO.', 'PBRO', 'PADRE', 'FRAY', 'MONS.', 'MONS', 'OBISPO'];
      const firstWord = parts[0].toUpperCase();

      let nombreParts = [];
      let apellidoParts = [];

      // Si empieza con un título, el "Nombre" será el Título + El primer nombre real
      if (titulos.includes(firstWord) && parts.length > 1) {
          nombreParts = [parts[0], parts[1]];
          apellidoParts = parts.slice(2);
      } 
      // Si son 2 palabras: 1 nombre, 1 apellido
      else if (parts.length === 2) {
          nombreParts = [parts[0]];
          apellidoParts = [parts[1]];
      }
      // Si son 3 palabras: 1 nombre, 2 apellidos
      else if (parts.length === 3) {
          nombreParts = [parts[0]];
          apellidoParts = [parts[1], parts[2]];
      }
      // Si son 4 o más palabras: 2 nombres, resto apellidos
      else {
          nombreParts = [parts[0], parts[1]];
          apellidoParts = parts.slice(2);
      }

      return {
          nombre: nombreParts.join(' '),
          apellido: apellidoParts.join(' ')
      };
  };

  // Normalizador: Convierte el JSON crudo al estándar de la aplicación
  const normalizeItem = (item) => {
      const rawName = (item.Nombre || item.nombre || '').trim();
      const { nombre: calcNombre, apellido: calcApellido } = splitFullName(rawName);

      return {
          codigo: (item.Codigo || item.codigo || '').toString().trim(),
          nombre: item.Nombres || item.nombres || calcNombre,
          apellido: item.Apellidos || item.apellidos || item.apellido || calcApellido,
          fechaIngreso: item.fechaIngreso || item.FechaIngreso || item.fecing || item.fechaNombramiento || '',
          fechaSalida: item.fechaSalida || item.FechaSalida || item.fecsal || '',
          estado: item.Estado !== undefined ? item.Estado : (item.estado !== undefined ? item.estado : 1),
          email: item.Email || item.email || '',
          telefono: item.Telefono || item.telefono || ''
      };
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setPreview(null);
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target.result);
            const structureCheck = validateJSONStructure(json);
            if (!structureCheck.isValid) {
                throw new Error(structureCheck.message);
            }

            const existingData = getParrocos(user?.parishId) || [];
            const errors = [];
            const warnings = [];
            let validCount = 0;
            const normalizedData = [];

            json.data.forEach((item, index) => {
                const idx = index + 1;
                const normItem = normalizeItem(item);
                
                if (!normItem.nombre) {
                    errors.push({ index: idx, message: `Fila ${idx}: El Nombre es requerido.` });
                    return;
                }

                const isDuplicate = existingData.some(ex => {
                    const codeMatch = ex.codigo && normItem.codigo && ex.codigo === normItem.codigo;
                    const nameMatch = (ex.nombre || '').toLowerCase() === normItem.nombre.toLowerCase() && 
                                      (ex.apellido || '').toLowerCase() === normItem.apellido.toLowerCase();
                    return codeMatch || nameMatch;
                });
                
                if (isDuplicate) {
                    warnings.push({ index: idx, message: `Fila ${idx}: Párroco duplicado (${normItem.nombre} ${normItem.apellido}).` });
                } else {
                    validCount++;
                    normalizedData.push(normItem);
                }
            });

            setNormalizedContent(normalizedData);
            setValidationResult({ count: validCount, errors, warnings });
            setPreview(normalizedData.slice(0, 5));

        } catch (err) {
            toast({ title: "Error de Validación", description: err.message, variant: "destructive" });
            setValidationResult({ count: 0, errors: [{ message: err.message }], warnings: [] });
        } finally {
            setLoading(false);
            e.target.value = null; 
        }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirm = () => {
      if (!normalizedContent) return;
      
      setLoading(true);
      const duplicatesCount = validationResult?.warnings?.length || 0;
      
      let result;
      if (normalizedContent.length > 0) {
          const payload = { data: normalizedContent };
          // TRUE para asegurarnos de que NO borre los antiguos
          result = importParrocos(payload, user?.parishId, true); 
      } else {
          result = { success: true, count: 0 };
      }

      setLoading(false);

      if (result.success) {
           let msg = `${result.count} párrocos importados.`;
           if (duplicatesCount > 0) {
               msg = `${result.count} párrocos importados, ${duplicatesCount} duplicados ignorados.`;
           }
           
           toast({
               title: "Importación Completada",
               description: msg,
               className: "bg-green-50 border-green-200 text-green-900"
           });
           handleClose();
      } else {
           toast({ title: "Error", description: result.message, variant: "destructive" });
      }
  };

  const handleClose = () => {
      setFile(null);
      setPreview(null);
      setValidationResult(null);
      setNormalizedContent(null);
      onClose();
  };

  const columns = [
      { header: 'Nombre', accessor: 'nombre' },
      { header: 'Apellido', accessor: 'apellido' },
      { header: 'Fecha Ingreso', accessor: 'fechaIngreso' },
      { header: 'Fecha Salida', accessor: 'fechaSalida' },
      { 
          header: 'Estado', 
          render: (row) => String(row.estado) === '1' ? 'ACTIVO' : 'INACTIVO' 
      },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Párrocos">
        <div className="space-y-6 min-w-[700px]">
            <p className="text-gray-900 text-sm">
                Seleccione un archivo JSON con la lista de párrocos.
            </p>
            {!preview && !validationResult?.errors?.length && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input type="file" accept=".json" onChange={handleFileChange} className="hidden" id="parrocos-upload" />
                    <label htmlFor="parrocos-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="w-10 h-10 text-[#4B7BA7]" />
                        <span className="text-gray-900 font-bold">Seleccionar archivo JSON</span>
                        <span className="text-xs text-gray-700">Formato: {`{ "data": [...] }`}</span>
                    </label>
                </div>
            )}

            {loading && <div className="text-center text-gray-900 font-medium py-4">Procesando archivo...</div>}

            {validationResult && (
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 bg-green-50 p-3 rounded border border-green-200">
                             <div className="text-xs text-green-900 uppercase font-bold">Nuevos Registros</div>
                             <div className="text-2xl font-bold text-green-900">{validationResult.count}</div>
                        </div>
                        <div className="flex-1 bg-red-50 p-3 rounded border border-red-200">
                             <div className="text-xs text-red-900 uppercase font-bold">Errores Bloqueantes</div>
                             <div className="text-2xl font-bold text-red-900">{validationResult.errors?.length || 0}</div>
                        </div>
                        <div className="flex-1 bg-yellow-50 p-3 rounded border border-yellow-200">
                             <div className="text-xs text-yellow-900 uppercase font-bold">Duplicados (Ignorados)</div>
                             <div className="text-2xl font-bold text-yellow-900">{validationResult.warnings?.length || 0}</div>
                        </div>
                    </div>

                    {preview && preview.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-900 border-b border-gray-200">
                                VISTA PREVIA (Primeros 5 a importar)
                            </div>
                            <Table columns={columns} data={preview} />
                        </div>
                    )}

                    {validationResult.errors && validationResult.errors.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200 max-h-40 overflow-y-auto">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-red-800 mb-2">
                                <XCircle className="w-4 h-4" /> Errores
                            </h4>
                            <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                                {validationResult.errors.map((err, idx) => (
                                    <li key={idx}>{err.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {validationResult.warnings && validationResult.warnings.length > 0 && (
                         <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 max-h-40 overflow-y-auto">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-yellow-800 mb-2">
                                <AlertTriangle className="w-4 h-4" /> Advertencias
                            </h4>
                            <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1">
                                {validationResult.warnings.map((warn, idx) => (
                                    <li key={idx}>{warn.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={handleClose} className="text-gray-900 border-gray-300">
                    <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <Button 
                    onClick={handleConfirm} 
                    disabled={!validationResult || validationResult.errors?.length > 0 || normalizedContent?.length === 0}
                    className="bg-[#D4AF37] hover:bg-[#C4A027] text-white disabled:bg-gray-300"
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Importación
                </Button>
            </div>
        </div>
    </Modal>
  );
};

export default ImportParrocosForm;
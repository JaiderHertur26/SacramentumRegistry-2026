
import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Upload, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/components/ui/use-toast';

const ImportCatalogForm = ({ isOpen, onClose }) => {
  const { importCatalogData } = useAppData();
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectCatalogType = (fileName) => {
      const lower = fileName.toLowerCase();
      if (lower.includes('ciudades') || lower.includes('cities')) return 'ciudades';
      if (lower.includes('paises') || lower.includes('countries')) return 'paises';
      if (lower.includes('parroquias') || lower.includes('parishes')) return 'parroquias_externas';
      return 'general';
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith('.json')) {
        setError("Por favor seleccione un archivo JSON válido.");
        setFile(null);
        setPreview(null);
        return;
    }

    setFile(selectedFile);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target.result);
            if (!json.data || !Array.isArray(json.data)) {
                throw new Error("El archivo no tiene la estructura requerida: { \"data\": [...] }");
            }
            
            const type = detectCatalogType(selectedFile.name);

            setPreview({
                count: json.data.length,
                fields: json.data.length > 0 ? Object.keys(json.data[0]).join(', ') : 'Ninguno',
                type: type,
                data: json
            });
        } catch (err) {
            setError("Error al leer el archivo JSON: " + err.message);
            setFile(null);
            setPreview(null);
        }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!preview || !preview.data) return;
    
    setLoading(true);
    try {
        const result = await importCatalogData(preview.data, preview.type);
        
        if (result.success) {
            toast({
                title: "Catálogo Importado",
                description: result.message,
                className: "bg-green-50 border-green-200"
            });
            onClose();
            setFile(null);
            setPreview(null);
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        setError(err.message || "Error desconocido al importar.");
        toast({
            title: "Error de Importación",
            description: err.message,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Catálogos">
      <div className="space-y-4 font-sans">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="flex items-center gap-2 font-semibold mb-1">
                <AlertCircle className="w-4 h-4" /> Instrucciones
            </p>
            <p>Importe listas auxiliares (ej. ciudades, países) para usar en formularios.</p>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
            <input 
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                className="hidden" 
                id="catalog-file-upload"
            />
            <label htmlFor="catalog-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-gray-400" />
                <span className="text-gray-600 font-medium">Click para seleccionar archivo JSON</span>
            </label>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
            </div>
        )}

        {preview && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2">
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                    <FileJson className="w-4 h-4" />
                    Resumen del Archivo
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-500">Tipo detectado:</div>
                    <div className="font-medium text-blue-600 capitalize">{preview.type}</div>
                    <div className="text-gray-500">Registros:</div>
                    <div className="font-medium text-gray-900">{preview.count}</div>
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!preview || loading} className="bg-[#4B7BA7] hover:bg-[#3B6B97] text-white">
                {loading ? 'Importando...' : 'Confirmar Importación'}
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportCatalogForm;

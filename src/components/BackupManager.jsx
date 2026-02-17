import React, { useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { generateBackup, validateBackup } from '@/lib/backupHelpers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, RefreshCw } from 'lucide-react';

const BackupManager = () => {
  const { user } = useAuth();
  const { data, importFullData } = useAppData();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const handleBackup = () => {
    try {
      generateBackup(data, user);
      toast({
        title: "Backup Generado",
        description: "El archivo se ha descargado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el backup.",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      validateBackup(jsonData);
      
      if (window.confirm('¿Estás seguro? Esto reemplazará los datos actuales.')) {
        importFullData(jsonData);
        toast({
          title: "Restauración Exitosa",
          description: "Los datos han sido actualizados desde el backup.",
        });
      }
    } catch (error) {
      toast({
        title: "Error de Restauración",
        description: error.message || "Archivo de backup inválido.",
        variant: "destructive"
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-blue-600" />
        Gestión de Copias de Seguridad
      </h3>
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleBackup} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4" />
          Descargar Backup
        </Button>
        
        <div className="relative">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleRestore}
            className="hidden"
          />
          <Button 
            variant="outline" 
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Restaurar desde Backup
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        * El backup incluirá solo los datos permitidos para su rol ({user.role}).
      </p>
    </div>
  );
};

export default BackupManager;
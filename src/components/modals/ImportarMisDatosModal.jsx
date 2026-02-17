
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

const ImportarMisDatosModal = ({ isOpen, onClose, onConfirm, newRecords, duplicates }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resumen de Importación - Mis Datos">
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Revise el resumen de los registros encontrados en el archivo antes de confirmar la importación.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
          {/* Section: Registros Nuevos */}
          <div className="flex flex-col border border-green-200 rounded-lg overflow-hidden bg-green-50/30">
            <div className="p-3 bg-green-100 border-b border-green-200 flex justify-between items-center">
              <span className="text-sm font-bold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Registros a importar
              </span>
              <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                {newRecords.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {newRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic">No hay registros nuevos</div>
              ) : (
                newRecords.map((item, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border border-green-100 shadow-sm text-xs">
                    <div className="font-bold text-[#111111] truncate">{item.nombre || item.Nombre}</div>
                    <div className="flex justify-between mt-1 text-gray-500">
                      <span>NIT: {item.nronit || item.nit || item.Nronit || '-'}</span>
                      <span className="font-mono">{item.idcod || item.Idcod || '-'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Duplicados */}
          <div className="flex flex-col border border-amber-200 rounded-lg overflow-hidden bg-amber-50/30">
            <div className="p-3 bg-amber-100 border-b border-amber-200 flex justify-between items-center">
              <span className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Registros duplicados
              </span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
                {duplicates.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {duplicates.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic">No hay duplicados</div>
              ) : (
                duplicates.map((item, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border border-amber-100 shadow-sm text-xs opacity-75">
                    <div className="font-bold text-[#111111] truncate">{item.nombre || item.Nombre}</div>
                    <div className="flex justify-between mt-1 text-gray-500">
                      <span>NIT: {item.nronit || item.nit || item.Nronit || '-'}</span>
                      <span className="font-mono">{item.idcod || item.Idcod || '-'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} className="text-[#111111] border-gray-300">
                <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button 
                onClick={onConfirm} 
                disabled={newRecords.length === 0}
                className="bg-[#D4AF37] hover:bg-[#C4A027] text-[#111111] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Importación
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportarMisDatosModal;

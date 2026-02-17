
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Printer, MapPin, Phone, Building } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { validateBaptismPartidaStructure, normalizeBaptismPartida } from '@/utils/baptismDataNormalizer';

const DialogoImpresionPartida = ({ isOpen, onClose, onAccept, baptismData, auxiliaryData }) => {
    const { user } = useAuth();
    const { getParrocoActual } = useAppData();
    const params = useParams();
    const parishId = params.parishId || user?.parishId;

    const [nombreSacerdote, setNombreSacerdote] = useState('');
    const [validationError, setValidationError] = useState(null);
    
    const [formData, setFormData] = useState({
        cargo: 'Párroco',
        copias: 1,
        incluirNotaNacimiento: false
    });

    // Reset or prepopulate when opened
    useEffect(() => {
        if (isOpen) {
            const currentParishId = parishId;
            const priest = getParrocoActual(currentParishId);
            
            if (priest) {
                setNombreSacerdote(priest.nombreCompleto || `${priest.nombre} ${priest.apellido}`.trim());
            } else {
                setNombreSacerdote('');
            }

            setFormData(prev => ({
                ...prev,
                cargo: 'Párroco',
                copias: 1,
                incluirNotaNacimiento: false
            }));

            // Validate Data on Open
            setValidationError(null);
            if (baptismData) {
                // We normalize here just to check validity, but we rely on the parent to pass clean data or use the normalizer themselves
                const normalized = normalizeBaptismPartida(baptismData);
                const { isValid, missingFields } = validateBaptismPartidaStructure(normalized);
                if (!isValid) {
                    console.warn("Datos de partida incompletos para impresión:", missingFields);
                    setValidationError(`Faltan campos importantes: ${missingFields.join(', ')}. Puede imprimir, pero el documento estará incompleto.`);
                }
            }
        }
    }, [isOpen, parishId, user, getParrocoActual, baptismData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onAccept({
            ...formData,
            firma: nombreSacerdote
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Imprimir Partida de Bautismo">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {validationError && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">{validationError}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Imprimiendo partida para:</p>
                    <p className="font-bold text-gray-900">
                        {baptismData?.firstName || baptismData?.nombres} {baptismData?.lastName || baptismData?.apellidos}
                    </p>
                </div>

                {auxiliaryData && (
                     <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-xs text-blue-800">
                        <div className="font-semibold mb-1 flex items-center gap-1">
                            <Building className="w-3 h-3" /> Datos de la Parroquia (Encabezado)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><span className="font-semibold">Parroquia:</span> {auxiliaryData.nombre}</div>
                            <div><span className="font-semibold">Diócesis:</span> {auxiliaryData.diocesis || auxiliaryData.diocese}</div>
                            <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {auxiliaryData.ciudad}</div>
                            <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {auxiliaryData.telefono}</div>
                        </div>
                     </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Firma (Sacerdote)</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="Nombre del sacerdote que firma"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4AF37] outline-none"
                            value={nombreSacerdote}
                            onChange={(e) => setNombreSacerdote(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4AF37] outline-none bg-white"
                                value={formData.cargo}
                                onChange={e => setFormData({...formData, cargo: e.target.value})}
                            >
                                <option value="Párroco">Párroco</option>
                                <option value="Vicario">Vicario</option>
                                <option value="Administrador Parroquial">Admin. Parroquial</option>
                                <option value="Secretario(a)">Secretario(a)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nº Copias</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="10"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4AF37] outline-none"
                                value={formData.copias}
                                onChange={e => setFormData({...formData, copias: parseInt(e.target.value) || 1})}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="checkNota"
                            className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                            checked={formData.incluirNotaNacimiento}
                            onChange={e => setFormData({...formData, incluirNotaNacimiento: e.target.checked})}
                        />
                        <label htmlFor="checkNota" className="text-sm text-gray-700 cursor-pointer select-none">
                            Incluir espacio para datos de Registro Civil
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#C4A027] text-white gap-2">
                        <Printer className="w-4 h-4" /> Imprimir
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default DialogoImpresionPartida;

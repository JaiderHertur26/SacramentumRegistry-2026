
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/Input';

const CreateAnnulmentConceptModal = ({ isOpen, onClose, onSuccess }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { addConceptoAnulacion } = useAppData();
    
    const [formData, setFormData] = useState({
        codigo: '',
        concepto: '',
        expide: '',
        tipo: 'porCorreccion'
    });
    
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.codigo.trim() || !formData.concepto.trim() || !formData.expide.trim()) {
            toast({
                title: "Error",
                description: "Todos los campos son obligatorios",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            const contextId = user?.parishId || user?.dioceseId;
            const result = await addConceptoAnulacion(formData, contextId);
            
            if (result.success) {
                toast({
                    title: "Éxito",
                    description: "Concepto de anulación creado correctamente",
                    className: "bg-green-600 text-white"
                });
                onSuccess();
                onClose();
                setFormData({ codigo: '', concepto: '', expide: '', tipo: 'porCorreccion' });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Error al crear el concepto",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-lg shadow-xl w-full max-w-md"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">Nuevo Concepto de Anulación</h2>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
                            <X className="w-5 h-5 text-gray-500" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Código *</label>
                            <Input
                                type="text"
                                name="codigo"
                                value={formData.codigo}
                                onChange={handleChange}
                                placeholder="Ej: 001"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Concepto *</label>
                            <Input
                                type="text"
                                name="concepto"
                                value={formData.concepto}
                                onChange={handleChange}
                                placeholder="Ej: Error en nombre"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Expide *</label>
                            <Input
                                type="text"
                                name="expide"
                                value={formData.expide}
                                onChange={handleChange}
                                placeholder="Ej: Cancillería"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo de Concepto *</label>
                            <select
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            >
                                <option value="porCorreccion">Por Corrección</option>
                                <option value="porReposicion">Por Reposición</option>
                                <option value="porRepeticion">Por Repetición</option>
                                <option value="porNulidad">Por Nulidad</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.tipo === 'porCorreccion' 
                                    ? "Se aplicará automáticamente a decretos de corrección."
                                    : formData.tipo === 'porReposicion'
                                    ? "Se aplicará automáticamente a decretos de reposición."
                                    : formData.tipo === 'porRepeticion'
                                    ? "Se aplicará automáticamente a casos de repetición de registros."
                                    : "Se aplicará a casos de nulidad matrimonial."}
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                disabled={isLoading}
                            >
                                <Save className="w-4 h-4" />
                                {isLoading ? 'Guardando...' : 'Guardar Concepto'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateAnnulmentConceptModal;

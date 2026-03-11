
import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, Loader2 } from 'lucide-react';

const EditMisDatosFormModal = ({ isOpen, onClose, record, onSave, allItems = [] }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (record && isOpen) {
            setFormData({ ...record });
            setErrors({});
        } else if (!isOpen) {
            setFormData({});
            setErrors({});
            setIsSubmitting(false);
        }
    }, [record, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Código: required, no duplicates
        if (!formData.idcod || String(formData.idcod).trim() === '') {
            newErrors.idcod = 'El Código es obligatorio';
        } else {
            const isDuplicate = allItems.some(
                item => item.idcod === formData.idcod && item.id !== formData.id && item.idcod !== record?.idcod
            );
            if (isDuplicate) {
                newErrors.idcod = 'Este Código ya existe en otro registro';
            }
        }

        // Nombre: required
        if (!formData.nombre || String(formData.nombre).trim() === '') {
            newErrors.nombre = 'El Nombre es obligatorio';
        }

        // NIT: required, format
        if (!formData.nronit || String(formData.nronit).trim() === '') {
            newErrors.nronit = 'El NIT es obligatorio';
        } else if (!/^[a-zA-Z0-9]{8,12}$/.test(String(formData.nronit).trim())) {
            newErrors.nronit = 'El NIT debe ser alfanumérico entre 8 y 12 caracteres';
        }

        // Diócesis: required
        if (!formData.diocesis || String(formData.diocesis).trim() === '') {
            newErrors.diocesis = 'La Diócesis es obligatoria';
        }

        // Email: format
        if (formData.email && String(formData.email).trim() !== '') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.email).trim())) {
                newErrors.email = 'Formato de correo electrónico inválido';
            }
        }

        // Telefono/Fax: format (numeric with optional dashes/spaces)
        const phoneRegex = /^[\d\s-]+$/;
        if (formData.telefono && String(formData.telefono).trim() !== '' && !phoneRegex.test(String(formData.telefono).trim())) {
            newErrors.telefono = 'Formato inválido (solo números, espacios y guiones)';
        }
        if (formData.nrofax && String(formData.nrofax).trim() !== '' && !phoneRegex.test(String(formData.nrofax).trim())) {
            newErrors.nrofax = 'Formato inválido (solo números, espacios y guiones)';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast({ 
                title: 'Error de validación', 
                description: 'Por favor, corrija los errores marcados en rojo.', 
                variant: 'destructive' 
            });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        try {
            await onSave(formData);
            toast({ 
                title: 'Éxito', 
                description: 'Los cambios se han guardado exitosamente', 
                className: "bg-green-50 text-green-700 border-green-200" 
            });
            onClose();
        } catch (error) {
            console.error("Error saving record:", error);
            toast({ 
                title: 'Error al guardar', 
                description: error.message || 'Ocurrió un error inesperado al guardar los cambios.', 
                variant: 'destructive' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderInput = (name, label, required = false, className = "") => (
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
                {label} {required && '*'}
            </label>
            <Input 
                name={name} 
                value={formData[name] || ''} 
                onChange={handleChange} 
                className={`${className} ${errors[name] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={isSubmitting} 
            />
            {errors[name] && <span className="text-xs text-red-500 font-medium mt-1 block">{errors[name]}</span>}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={!isSubmitting ? onClose : undefined} title="Editar Registro de Mis Datos">
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderInput('idcod', 'Código', true, "border-l-4 border-l-blue-500")}
                    {renderInput('nombre', 'Nombre', true, "border-l-4 border-l-blue-500")}
                    {renderInput('nronit', 'NIT / Cédula', true, "border-l-4 border-l-blue-500")}
                    {renderInput('region', 'Región')}
                    <div className="md:col-span-2">
                        {renderInput('direccion', 'Dirección')}
                    </div>
                    {renderInput('ciudad', 'Ciudad')}
                    {renderInput('telefono', 'Teléfono')}
                    {renderInput('nrofax', 'Fax')}
                    {renderInput('email', 'Email')}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-2">
                    <h4 className="font-bold text-[#4B7BA7] mb-3 text-sm uppercase tracking-wider">Datos Eclesiásticos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('vicaria', 'Vicaría')}
                        {renderInput('decanato', 'Decanato')}
                        {renderInput('diocesis', 'Diócesis', true, "border-l-4 border-l-blue-500")}
                        {renderInput('obispo', 'Obispo')}
                        {renderInput('canciller', 'Canciller')}
                        {renderInput('serial', 'Serial')}
                        <div className="md:col-span-2">
                            {renderInput('ruta', 'Ruta')}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="border-gray-300 text-gray-700">
                        <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#4B7BA7] text-white hover:bg-[#3B6B97]">
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default EditMisDatosFormModal;

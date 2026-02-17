
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const CreateVicaryModal = ({ isOpen, onClose }) => {
  const { createVicary } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    vicarioName: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.vicarioName) {
        toast({ title: 'Error', description: 'Todos los campos son obligatorios', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
      createVicary({
        ...formData,
        dioceseId: user.dioceseId
      });
      toast({ title: 'Éxito', description: 'Vicaría creada correctamente.' });
      setFormData({ name: '', vicarioName: '' });
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear la vicaría.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Vicaría">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la Vicaría</label>
          <Input 
            placeholder="Ej: Vicaría Episcopal Territorial de San Pedro" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del Vicario</label>
          <Input 
            placeholder="Nombre del sacerdote a cargo" 
            value={formData.vicarioName} 
            onChange={e => setFormData({...formData, vicarioName: e.target.value})} 
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateVicaryModal;

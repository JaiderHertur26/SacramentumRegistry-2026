
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const CreateDecanateModal = ({ isOpen, onClose }) => {
  const { createDecanate, getVicariesByDiocese } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    decanName: '',
    vicaryId: ''
  });

  const vicaries = getVicariesByDiocese ? getVicariesByDiocese(user?.dioceseId || '') : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.decanName || !formData.vicaryId) {
        toast({ title: 'Error', description: 'Todos los campos son obligatorios', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
      createDecanate(formData);
      toast({ title: 'Éxito', description: 'Decanato creado correctamente.' });
      setFormData({ name: '', decanName: '', vicaryId: '' });
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear el decanato.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const vicaryOptions = vicaries.map(v => ({ value: v.id, label: v.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Decanato">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Vicaría</label>
          <Select 
            placeholder="Seleccionar Vicaría"
            options={vicaryOptions}
            value={formData.vicaryId}
            onChange={e => setFormData({...formData, vicaryId: e.target.value})}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del Decanato</label>
          <Input 
            placeholder="Ej: Decanato No. 1" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del Decano</label>
          <Input 
            placeholder="Nombre del sacerdote a cargo" 
            value={formData.decanName} 
            onChange={e => setFormData({...formData, decanName: e.target.value})} 
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

export default CreateDecanateModal;

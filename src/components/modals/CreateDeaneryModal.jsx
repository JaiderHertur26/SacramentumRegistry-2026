
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const CreateDeaneryModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { data, createItem } = useAppData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', description: '', vicariateId: '' });

  const vicariates = data.vicariates.filter(v => v.dioceseId === user.dioceseId);

  const handleSubmit = (e) => {
    e.preventDefault();
    createItem('deaneries', formData);
    toast({ title: 'Éxito', description: 'Decanato creado correctamente.' });
    setFormData({ name: '', description: '', vicariateId: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Decanato">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nombre del Decanato" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <Select 
          placeholder="Seleccionar Vicaría" 
          options={vicariates.map(v => ({ value: v.id, label: v.name }))}
          required 
          value={formData.vicariateId} 
          onChange={e => setFormData({...formData, vicariateId: e.target.value})} 
        />
        <Input placeholder="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateDeaneryModal;

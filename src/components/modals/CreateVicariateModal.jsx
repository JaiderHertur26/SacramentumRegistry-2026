import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const CreateVicariateModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { createItem } = useAppData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    createItem('vicariates', { ...formData, dioceseId: user.dioceseId });
    toast({ title: 'Éxito', description: 'Vicaría creada correctamente.' });
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Vicaría">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nombre de la Vicaría" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <Input placeholder="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateVicariateModal;
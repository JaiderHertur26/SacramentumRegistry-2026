
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/components/ui/use-toast';

const CreateDioceseModal = ({ isOpen, onClose }) => {
  const { createDiocese } = useAppData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', abbreviation: '', bishop: '', city: '', country: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.bishop || !formData.city) {
        toast({ title: 'Error', description: 'Campos obligatorios faltantes', variant: 'destructive' });
        return;
    }

    createDiocese(formData);
    toast({ title: 'Éxito', description: 'Diócesis creada correctamente.' });
    setFormData({ name: '', abbreviation: '', bishop: '', city: '', country: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Diócesis">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nombre de la Diócesis" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <Input placeholder="Abreviatura" required value={formData.abbreviation} onChange={e => setFormData({...formData, abbreviation: e.target.value})} />
        <Input placeholder="Obispo Titular" required value={formData.bishop} onChange={e => setFormData({...formData, bishop: e.target.value})} />
        <Input placeholder="Ciudad" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
        <Input placeholder="País" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateDioceseModal;


import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/components/ui/use-toast';

const CreateArchdioceseModal = ({ isOpen, onClose }) => {
  const { createArchdiocese } = useAppData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', abbreviation: '', bishop: '', city: '', region: '', phone: '', email: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.bishop || !formData.city) {
        toast({ title: 'Error', description: 'Campos obligatorios faltantes', variant: 'destructive' });
        return;
    }

    createArchdiocese(formData); 
    toast({ title: 'Éxito', description: 'Arquidiócesis creada correctamente.' });
    setFormData({ name: '', abbreviation: '', bishop: '', city: '', region: '', phone: '', email: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Arquidiócesis">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nombre de la Arquidiócesis" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <Input placeholder="Abreviatura" required value={formData.abbreviation} onChange={e => setFormData({...formData, abbreviation: e.target.value})} />
        <Input placeholder="Arzobispo Titular" required value={formData.bishop} onChange={e => setFormData({...formData, bishop: e.target.value})} />
        <Input placeholder="Ciudad" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
        <Input placeholder="Región" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} />
        <Input placeholder="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        <Input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateArchdioceseModal;

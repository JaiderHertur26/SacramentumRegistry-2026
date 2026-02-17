
import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/components/ui/use-toast';

const EditChancellorModal = ({ isOpen, onClose, chancellor }) => {
  const { updateChancellor, data } = useAppData();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (chancellor) {
      setName(chancellor.name);
      // Find associated user for read-only display
      const foundUser = data.users.find(u => u.id === chancellor.userId);
      setUser(foundUser);
    }
  }, [chancellor, data.users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      updateChancellor(chancellor.id, { name });
      toast({ title: 'Éxito', description: 'Canciller actualizado correctamente.' });
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely get username string
  const getSafeUsername = (u) => {
    if (!u) return 'N/A';
    if (typeof u.username === 'object' && u.username !== null) {
        return u.username.name || u.username.username || 'Usuario';
    }
    return u.username;
  };

  if (!chancellor) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Canciller">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del Canciller</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="border-t border-gray-100 pt-4 mt-4 bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-bold text-[#2C3E50] mb-3">Credenciales (Solo Lectura)</h4>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Usuario</label>
                    <p className="text-sm font-medium text-gray-900">{getSafeUsername(user)}</p>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Contraseña</label>
                    <p className="text-sm font-medium text-gray-900">******</p>
                 </div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditChancellorModal;


import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const CreateChancellorModal = ({ isOpen, onClose }) => {
  const { createChancellor, getChancellorByDiocese, getUserByUsername } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Requerido';
    if (!formData.username) newErrors.username = 'Requerido';
    else if (getUserByUsername(formData.username)) newErrors.username = 'Usuario ya existe';
    
    if (!formData.password) newErrors.password = 'Requerido';
    else if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Check if chancellor already exists for this diocese
    const existing = getChancellorByDiocese(user.dioceseId);
    if (existing) {
        toast({ title: 'Error', description: 'Ya existe un Canciller para esta diócesis.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
      const chancellorData = {
        name: formData.name,
        dioceseId: user.dioceseId
      };
      const userData = {
        username: formData.username,
        password: formData.password,
        email: `${formData.username.toLowerCase()}@eclesia.org` // Generate placeholder email
      };

      createChancellor(chancellorData, userData);
      toast({ title: 'Éxito', description: 'Canciller creado correctamente.' });
      handleClose();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear el canciller.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', username: '', password: '', confirmPassword: '' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear Canciller">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del Canciller</label>
          <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} error={errors.name} />
        </div>

        <div className="border-t border-gray-100 pt-4 mt-4">
            <h4 className="text-sm font-bold text-[#2C3E50] mb-3">Credenciales de Acceso</h4>
            
            <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Usuario</label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} error={errors.username} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700 block mb-1">Contraseña</label>
                        <div className="relative">
                            <Input 
                                type={showPassword ? "text" : "password"}
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                error={errors.password}
                                className="pr-10"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Confirmar</label>
                        <div className="relative">
                            <Input 
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword} 
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                                error={errors.confirmPassword}
                                className="pr-10"
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-gray-400">
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateChancellorModal;


import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import { Church, Users, FileText, LayoutDashboard, Database, Plus, Download, Mail, Edit, Trash2, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateBackup } from '@/lib/backupHelpers';
import CreateParishUserModal from '@/components/modals/CreateParishUserModal';
import CreateChanceryUserModal from '@/components/modals/CreateChanceryUserModal';
import EditParishUserModal from '@/components/modals/EditParishUserModal';
import EditChanceryUserModal from '@/components/modals/EditChanceryUserModal';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';

const DioceseDashboard = () => {
  const { data, getParishUsers, getChanceryUsers, deleteUser } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [modalState, setModalState] = useState({
      createParish: false,
      createChancery: false,
      editParish: false,
      editChancery: false,
      password: false
  });
  const [selectedUser, setSelectedUser] = useState(null);

  const menuItems = [
    { label: 'Dashboard', path: '/diocese/dashboard', icon: LayoutDashboard },
    { label: 'Gestionar Usuarios Parroquia', path: '/diocese/users/parish', icon: Users },
    { label: 'Gestionar Usuarios Cancillería', path: '/diocese/users/chancery', icon: Users },
    { label: 'Parroquias', path: '/diocese/parishes', icon: Church },
    { label: 'Vicarías', path: '/diocese/vicariates', icon: Church },
    { label: 'Decanatos', path: '/diocese/deaneries', icon: Church },
    { label: 'Cancillerías', path: '/diocese/chanceries', icon: FileText },
    { label: 'Comunicaciones', path: '/communications', icon: Mail },
    { label: 'Backups', path: '/backups', icon: Database },
  ];

  const safeParishes = data.parishes || [];
  const safeVicariates = data.vicariates || [];
  const safeDeaneries = data.deaneries || [];
  const safeSacraments = data.sacraments || [];

  const dioceseParishes = safeParishes.filter(p => p.dioceseId === user.dioceseId);
  const dioceseVicariates = safeVicariates.filter(v => v.dioceseId === user.dioceseId);
  const dioceseDeaneries = safeDeaneries.filter(d => {
    const vicariate = safeVicariates.find(v => v.id === d.vicariateId);
    return vicariate && vicariate.dioceseId === user.dioceseId;
  });
  const dioceseSacraments = safeSacraments.filter(s => s.dioceseId === user.dioceseId);
  
  const parishUsers = getParishUsers(user.dioceseId);
  const chanceryUsers = getChanceryUsers(user.dioceseId);

  const stats = [
    { label: 'Total Parroquias', value: dioceseParishes.length, icon: Church, color: 'bg-blue-600' },
    { label: 'Total Vicarías', value: dioceseVicariates.length, icon: Users, color: 'bg-indigo-600' },
    { label: 'Total Decanatos', value: dioceseDeaneries.length, icon: Users, color: 'bg-purple-600' },
    { label: 'Total Sacramentos', value: dioceseSacraments.length, icon: FileText, color: 'bg-green-600' },
  ];

  const safeString = (val) => {
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null) return val.name || val.label || '';
      return String(val || '');
  };

  const columnsParishes = [
    { header: 'Nombre', render: (row) => safeString(row.name) },
    { header: 'Ciudad', render: (row) => safeString(row.city) },
    { header: 'Párroco', render: (row) => safeString(row.priest) },
    { header: 'Dirección', render: (row) => safeString(row.address) }
  ];

  const columnsParishUsers = [
    { header: 'Usuario', accessor: 'username' },
    { header: 'Email', accessor: 'email' },
    { header: 'Parroquia', render: (row) => safeString(row.parishName) },
    {
        header: 'Acciones',
        render: (row) => (
          <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(row); setModalState(prev => ({...prev, editParish: true})); }} title="Editar">
                  <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(row); setModalState(prev => ({...prev, password: true})); }} title="Cambiar Contraseña">
                  <Key className="w-4 h-4 text-orange-500" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(row.id)} title="Eliminar">
                  <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
          </div>
        )
      }
  ];

  const columnsChanceryUsers = [
    { header: 'Usuario', accessor: 'username' },
    { header: 'Email', accessor: 'email' },
    { header: 'Cancillería', render: (row) => safeString(row.chancelleryName) },
    {
        header: 'Acciones',
        render: (row) => (
          <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(row); setModalState(prev => ({...prev, editChancery: true})); }} title="Editar">
                  <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(row); setModalState(prev => ({...prev, password: true})); }} title="Cambiar Contraseña">
                  <Key className="w-4 h-4 text-orange-500" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(row.id)} title="Eliminar">
                  <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
          </div>
        )
      }
  ];

  const handleDeleteUser = (id) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
        deleteUser(id);
        toast({ title: 'Usuario eliminado', description: 'El usuario ha sido eliminado correctamente.' });
    }
  };

  const handleBackup = () => {
    generateBackup(data, user);
    toast({ title: 'Backup Generado', description: 'La descarga comenzará automáticamente.' });
  };

  return (
    <DashboardLayout menuItems={menuItems} entityName={user.dioceseName}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[#2C3E50]">Panel de Gestión Diocesana</h1>
           <p className="text-gray-500 mt-1">{safeString(user.dioceseName)}</p>
        </div>
        <Button variant="outline" onClick={handleBackup} className="gap-2">
            <Download className="w-4 h-4" /> Backup
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
              <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#2C3E50] mb-4">Gestión Eclesiástica</h2>
        <div className="flex flex-wrap gap-4">
          <Button className="gap-2 bg-[#4B7BA7] hover:bg-[#3B6B97]">
            <Plus className="w-4 h-4" /> Crear Parroquia
          </Button>
          <Button variant="secondary" className="gap-2">
            <Plus className="w-4 h-4" /> Crear Vicaría
          </Button>
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Crear Cancillería
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-[#2C3E50] text-lg">Usuarios Parroquia</h3>
            <Button onClick={() => setModalState(prev => ({...prev, createParish: true}))} className="gap-2">
                <Plus className="w-4 h-4" /> Crear Usuario Parroquia
            </Button>
        </div>
        <Table columns={columnsParishUsers} data={parishUsers} />
      </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-[#2C3E50] text-lg">Usuarios Cancillería</h3>
            <Button onClick={() => setModalState(prev => ({...prev, createChancery: true}))} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Crear Usuario Cancillería
            </Button>
        </div>
        <Table columns={columnsChanceryUsers} data={chanceryUsers} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-[#2C3E50] mb-4">Parroquias Recientes</h3>
        <Table columns={columnsParishes} data={dioceseParishes.slice(-5)} />
      </div>

      <CreateParishUserModal 
        isOpen={modalState.createParish} 
        onClose={() => setModalState(prev => ({...prev, createParish: false}))}
        dioceseId={user.dioceseId}
      />
      <CreateChanceryUserModal 
        isOpen={modalState.createChancery} 
        onClose={() => setModalState(prev => ({...prev, createChancery: false}))}
        dioceseId={user.dioceseId}
      />
      
      {selectedUser && (
        <>
            <EditParishUserModal 
                isOpen={modalState.editParish}
                onClose={() => setModalState(prev => ({...prev, editParish: false}))}
                user={selectedUser}
                dioceseId={user.dioceseId}
                onSuccess={() => setSelectedUser(null)}
            />
            <EditChanceryUserModal 
                isOpen={modalState.editChancery}
                onClose={() => setModalState(prev => ({...prev, editChancery: false}))}
                user={selectedUser}
                dioceseId={user.dioceseId}
                onSuccess={() => setSelectedUser(null)}
            />
            <ChangePasswordModal 
                isOpen={modalState.password}
                onClose={() => setModalState(prev => ({...prev, password: false}))}
                user={selectedUser}
            />
        </>
      )}
    </DashboardLayout>
  );
};

export default DioceseDashboard;

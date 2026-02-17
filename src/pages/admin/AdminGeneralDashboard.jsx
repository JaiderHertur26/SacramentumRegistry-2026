
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import { Church, Users, FileText, LayoutDashboard, Database, Plus, Search, Edit, Trash2, Settings as SettingsIcon, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CreateDioceseArchdioceseModal from '@/components/modals/CreateDioceseArchdioceseModal';
import EditDioceseArchdioceseModal from '@/components/modals/EditDioceseArchdioceseModal';
import DetailsModal from '@/components/modals/DetailsModal';
import { ROLE_TYPES } from '@/config/supabaseConfig';
import UniversalBackupManager from '@/components/UniversalBackupManager';
import { motion } from 'framer-motion';

const AdminGeneralDashboard = () => {
  const { data, deleteDioceseArchdiocese } = useAppData();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDiocese, setSelectedDiocese] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for active view (dashboard vs backup)
  const [activeSection, setActiveSection] = useState('dashboard');

  const menuItems = [
    { label: 'Dashboard', path: '#', icon: LayoutDashboard, onClick: () => setActiveSection('dashboard') },
    { label: 'Copia de Seguridad Universal', path: '#', icon: Database, onClick: () => setActiveSection('backup') },
    { label: 'Diócesis/Arquidiócesis', path: '/admin/dioceses', icon: Church },
    { label: 'Ajustes', path: '/admin/settings', icon: SettingsIcon },
  ];

  const safeDioceses = data.dioceses || [];
  const safeUsers = data.users || [];
  const safeParishes = data.parishes || [];
  const safeSacraments = data.sacraments || [];

  const stats = [
    { label: 'Total Diócesis', value: safeDioceses.length, icon: Church, color: 'bg-blue-600', text: 'text-blue-700' },
    { label: 'Total Parroquias', value: safeParishes.length, icon: Church, color: 'bg-indigo-600', text: 'text-indigo-700' },
    { label: 'Total Sacramentos', value: safeSacraments.length, icon: FileText, color: 'bg-green-600', text: 'text-green-700' },
    { label: 'Total Usuarios', value: safeUsers.length, icon: Users, color: 'bg-purple-600', text: 'text-purple-700' },
  ];

  const filteredDioceses = safeDioceses.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.city && d.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const dioceseTableData = filteredDioceses.map(diocese => {
    const adminUser = safeUsers.find(u => u.dioceseId === diocese.id && u.role === ROLE_TYPES.DIOCESE);
    let displayUsername = 'Sin asignar';
    if (adminUser) {
        if (typeof adminUser.username === 'object' && adminUser.username !== null) {
            displayUsername = adminUser.username.name || adminUser.username.username || 'Usuario';
        } else {
            displayUsername = adminUser.username;
        }
    }

    return {
        ...diocese,
        username: displayUsername,
        userId: adminUser ? adminUser.id : null
    };
  });

  const handleEdit = (diocese) => {
    setSelectedDiocese(diocese);
    setIsEditModalOpen(true);
  };

  const handleDetails = (diocese) => {
    setSelectedDiocese(diocese);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteDiocese = (diocese) => {
    if (window.confirm('¿Deseas eliminar esta Diócesis/Arquidiócesis?')) {
        const result = deleteDioceseArchdiocese(diocese.id);
        if (result.success) {
            toast({ title: 'Eliminado', description: 'La diócesis ha sido eliminada correctamente.', variant: 'success' });
        } else {
            toast({ title: 'Error', description: 'Hubo un error al eliminar.', variant: 'destructive' });
        }
    }
  };

  const columnsDioceses = [
    { header: 'Nombre', accessor: 'name' },
    { 
        header: 'Tipo', 
        render: (row) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.type === 'archdiocese' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {row.type === 'archdiocese' ? 'Arquidiócesis' : 'Diócesis'}
            </span>
        ) 
    },
    { header: 'Obispo/Arzobispo', accessor: 'bishop' },
    { header: 'Usuario', accessor: 'username' },
    {
        header: 'Acciones',
        render: (row) => (
            <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" title="Ver Detalles" onClick={() => handleDetails(row)}>
                    <Eye className="w-4 h-4 text-gray-600" />
                </Button>
                <Button size="sm" variant="ghost" title="Editar" onClick={() => handleEdit(row)}>
                    <Edit className="w-4 h-4 text-blue-700" />
                </Button>
                <Button size="sm" variant="ghost" title="Eliminar" onClick={() => handleDeleteDiocese(row)}>
                    <Trash2 className="w-4 h-4 text-red-700" />
                </Button>
            </div>
        )
    }
  ];

  return (
    <DashboardLayout menuItems={menuItems} entityName="Administración General">
      
      {activeSection === 'dashboard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#111111]">Panel de Administrador General</h1>
              <p className="text-gray-500 mt-1">Gestión global de Eclesia Digital</p>
            </div>
            
            {/* Added Quick Action Button for Backup Visibility */}
            <Button 
              variant="outline" 
              className="md:hidden flex items-center gap-2 border-blue-200 text-blue-700 bg-blue-50"
              onClick={() => setActiveSection('backup')}
            >
              <Database className="w-4 h-4" /> Gestión de Backups
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <stat.icon className={`w-6 h-6 ${stat.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111111]">{stat.value}</p>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
            
            {/* Backup Stats Card - acts as button too */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setActiveSection('backup')}
            >
              <div className="p-3 rounded-lg bg-orange-100 bg-opacity-50">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#111111]">Backups</p>
                <p className="text-sm text-blue-600 font-medium hover:underline">Gestionar sistema</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="font-bold text-[#111111] text-lg">Diócesis y Arquidiócesis</h3>
                
                <div className="flex flex-1 md:flex-none gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-[#D4AF37] hover:bg-[#C4A027] text-[#111111] font-medium whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Crear Nueva
                    </Button>
                </div>
            </div>
            
            <Table columns={columnsDioceses} data={dioceseTableData} />
          </div>
        </motion.div>
      )}

      {activeSection === 'backup' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#111111]">Copia de Seguridad Universal</h1>
              <p className="text-gray-500 mt-1">Gestión completa de snapshots del sistema.</p>
            </div>
            <Button variant="ghost" onClick={() => setActiveSection('dashboard')}>
              Volver al Dashboard
            </Button>
          </div>
          <UniversalBackupManager />
        </motion.div>
      )}

      <CreateDioceseArchdioceseModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      <EditDioceseArchdioceseModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        diocese={selectedDiocese}
      />
      
      <DetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        data={selectedDiocese}
      />
    </DashboardLayout>
  );
};

export default AdminGeneralDashboard;

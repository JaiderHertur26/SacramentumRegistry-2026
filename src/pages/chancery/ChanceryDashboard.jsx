
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import { ScrollText, Mail, LayoutDashboard, Database, AlertCircle, FileCheck, CheckCircle, Download, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateBackup } from '@/lib/backupHelpers';
import { useNavigate } from 'react-router-dom';

const ChanceryDashboard = () => {
  const { data, getBaptismCorrections } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Dashboard', path: '/chancery/dashboard', icon: LayoutDashboard },
    { label: 'Decretos Corrección', path: '/chancery/decretos/correcciones', icon: FileText },
    { label: 'Decretos Reposición', path: '/chancery/decretos/reposiciones', icon: ScrollText },
    { label: 'Sacramentos Pendientes', path: '/chancery/pending', icon: AlertCircle },
    { label: 'Certificaciones', path: '/chancery/certifications', icon: FileCheck },
    { label: 'Comunicaciones', path: '/communications', icon: Mail },
    { label: 'Backups', path: '/backups', icon: Database },
  ];

  // Calculate Aggregated Stats for Diocese
  const dioceseParishes = data.parishes.filter(p => p.dioceseId === user.dioceseId);
  
  // 1. Pending Sacraments (Global)
  const pendingSacraments = data.sacraments.filter(s => s.dioceseId === user.dioceseId && s.status === 'pending');
  
  // 2. Decrees Count (Global Aggregation)
  let totalCorrections = 0;
  let totalReplacements = 0;

  dioceseParishes.forEach(p => {
      const corrections = getBaptismCorrections(p.id);
      totalCorrections += corrections.length;
      
      const replacements = JSON.parse(localStorage.getItem(`decrees_replacement_${p.id}`) || '[]');
      totalReplacements += replacements.length;
  });

  const communications = data.communications || [];
  
  const stats = [
    { label: 'Sacramentos Pendientes', value: pendingSacraments.length, icon: AlertCircle, color: 'bg-orange-500' },
    { label: 'Comunicaciones Recibidas', value: communications.length, icon: Mail, color: 'bg-blue-500' },
    { label: 'Decretos Corrección', value: totalCorrections, icon: FileText, color: 'bg-purple-500' },
    { label: 'Decretos Reposición', value: totalReplacements, icon: ScrollText, color: 'bg-teal-500' },
  ];

  const columns = [
    { header: 'Nombres', accessor: 'firstName' },
    { header: 'Apellidos', accessor: 'lastName' },
    { header: 'Tipo', render: (row) => row.type },
    { header: 'Fecha', accessor: 'sacramentDate' },
    { header: 'Acción', render: () => <Button size="sm" variant="outline">Revisar</Button> }
  ];

  const handleBackup = () => {
    generateBackup(data, user);
    toast({ title: 'Backup Generado', description: 'La descarga comenzará automáticamente.' });
  };

  return (
    <DashboardLayout menuItems={menuItems} entityName={`Cancillería - ${user.dioceseName}`}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[#2C3E50]">Panel de Cancillería</h1>
           <p className="text-gray-500 mt-1">Gestión documental y certificaciones</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Management Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-[#2C3E50] mb-4">Gestión Documental</h2>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => navigate('/chancery/pending')} className="gap-2 bg-[#4B7BA7] hover:bg-[#3B6B97]">
                <AlertCircle className="w-4 h-4" /> Ver Pendientes
              </Button>
              <Button onClick={() => navigate('/chancery/certifications')} variant="secondary" className="gap-2">
                <FileCheck className="w-4 h-4" /> Emitir Certificación
              </Button>
              <Button onClick={() => navigate('/communications')} variant="outline" className="gap-2">
                <Mail className="w-4 h-4" /> Ver Comunicaciones
              </Button>
            </div>
          </div>

          {/* Decree Quick Access */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-[#2C3E50] mb-4">Decretos y Anulaciones</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div 
                    className="p-4 bg-purple-50 border border-purple-100 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors" 
                    onClick={() => navigate('/chancery/decretos/correcciones')}
                >
                    <div className="text-2xl font-bold text-purple-700">{totalCorrections}</div>
                    <div className="text-xs text-purple-600 uppercase mt-1 font-semibold">Ver Correcciones</div>
                </div>
                <div 
                    className="p-4 bg-teal-50 border border-teal-100 rounded-lg cursor-pointer hover:bg-teal-100 transition-colors" 
                    onClick={() => navigate('/chancery/decretos/reposiciones')}
                >
                    <div className="text-2xl font-bold text-teal-700">{totalReplacements}</div>
                    <div className="text-xs text-teal-600 uppercase mt-1 font-semibold">Ver Reposiciones</div>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                 <Button variant="ghost" size="sm" onClick={() => navigate('/chancery/decree-annulment')} className="text-gray-500 hover:text-[#4B7BA7]">
                    Gestionar Conceptos de Anulación
                 </Button>
            </div>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-[#2C3E50] mb-4">Sacramentos Pendientes de Revisión</h3>
        {pendingSacraments.length > 0 ? (
            <Table columns={columns} data={pendingSacraments.slice(-5)} />
        ) : (
            <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                <p>No hay sacramentos pendientes de revisión.</p>
            </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ChanceryDashboard;

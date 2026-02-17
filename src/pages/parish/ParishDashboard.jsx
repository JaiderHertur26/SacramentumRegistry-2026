
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import { Church, ScrollText, Users, Activity, Plus, Download, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateBackup } from '@/lib/backupHelpers';

const ParishDashboard = () => {
  const { data, getBaptisms, getConfirmations, getMatrimonios } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [recentRecords, setRecentRecords] = useState([]);
  const [stats, setStats] = useState({
    baptisms: 0,
    confirmations: 0,
    marriages: 0,
    total: 0
  });
  const [hasPending, setHasPending] = useState(false);

  // Helper to parse diverse date formats for sorting
  const parseSortDate = (dateStr) => {
    if (!dateStr) return 0;
    // Format YYYY-MM-DD
    if (String(dateStr).match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(dateStr).getTime();
    }
    // Format DD/MM/YYYY
    if (String(dateStr).match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [d, m, y] = dateStr.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
    }
    return 0;
  };

  const updateDashboardData = () => {
    if (!user || !user.parishId) return;

    // 1. Fetch Seated Records (History)
    const bSeated = getBaptisms(user.parishId);
    const cSeated = getConfirmations(user.parishId);
    const mSeated = getMatrimonios(user.parishId);

    // 2. Fetch Pending Records (Queue) - Reading direct from Storage to ensure sync with Sentar pages
    const bPending = JSON.parse(localStorage.getItem(`pendingBaptisms_${user.parishId}`) || '[]');
    const cPending = JSON.parse(localStorage.getItem(`pendingConfirmations_${user.parishId}`) || '[]');
    const mPending = JSON.parse(localStorage.getItem(`pendingMatrimonios_${user.parishId}`) || '[]');

    // 3. Calculate Stats (Counts usually reflect completed/seated records)
    setStats({
      baptisms: bSeated.length,
      confirmations: cSeated.length,
      marriages: mSeated.length,
      total: bSeated.length + cSeated.length + mSeated.length
    });

    const pendingCount = bPending.length + cPending.length + mPending.length;
    setHasPending(pendingCount > 0);

    // 4. Normalize & Combine Data
    const mapRecord = (r, type, label, isPending) => {
        let nombres = r.firstName;
        let apellidos = r.lastName;

        if (type === 'marriage') {
            nombres = r.husbandName || r.nombres_esposo || r.husband?.nombres || 'Sin Nombre';
            apellidos = r.husbandSurname || r.apellidos_esposo || r.husband?.apellidos || '';
        }

        return {
            id: r.id,
            nombres: nombres || 'Sin Nombre',
            apellidos: apellidos || '',
            sacramento: label,
            fecha: r.sacramentDate || r.fecha || r.createdAt?.split('T')[0] || 'Sin Fecha',
            estado: isPending ? 'Pendiente' : 'Asentado',
            isPending: isPending,
            sortDate: parseSortDate(r.sacramentDate || r.registrationDate || r.createdAt)
        };
    };

    const allRecords = [
        // Pending (Force isPending = true)
        ...bPending.map(r => mapRecord(r, 'baptism', 'Bautismo', true)),
        ...cPending.map(r => mapRecord(r, 'confirmation', 'Confirmación', true)),
        ...mPending.map(r => mapRecord(r, 'marriage', 'Matrimonio', true)),
        
        // Seated (Force isPending = false)
        ...bSeated.map(r => mapRecord(r, 'baptism', 'Bautismo', false)),
        ...cSeated.map(r => mapRecord(r, 'confirmation', 'Confirmación', false)),
        ...mSeated.map(r => mapRecord(r, 'marriage', 'Matrimonio', false))
    ];

    // 5. Filter & Sort
    // Priority 1: Pending records
    // Priority 2: Most recent date
    allRecords.sort((a, b) => {
        if (a.isPending && !b.isPending) return -1;
        if (!a.isPending && b.isPending) return 1;
        return b.sortDate - a.sortDate;
    });

    // 6. Limit to top 10
    setRecentRecords(allRecords.slice(0, 10));
  };

  useEffect(() => {
    updateDashboardData();
    window.addEventListener('storage', updateDashboardData);
    return () => {
      window.removeEventListener('storage', updateDashboardData);
    };
  }, [user, data]);

  const statsCards = [
    { label: 'Total Bautizos', value: stats.baptisms, icon: Church, color: 'bg-blue-500' },
    { label: 'Total Confirmaciones', value: stats.confirmations, icon: ScrollText, color: 'bg-purple-500' },
    { label: 'Total Matrimonios', value: stats.marriages, icon: Users, color: 'bg-pink-500' },
    { label: 'Total Sacramentos', value: stats.total, icon: Activity, color: 'bg-green-500' },
  ];

  const columns = [
    { header: 'Nombres', accessor: 'nombres' },
    { header: 'Apellidos', accessor: 'apellidos' },
    { 
        header: 'Sacramento', 
        accessor: 'sacramento',
        render: (row) => (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                ${row.sacramento === 'Bautismo' ? 'bg-blue-50 text-blue-700' : 
                  row.sacramento === 'Confirmación' ? 'bg-purple-50 text-purple-700' : 
                  'bg-pink-50 text-pink-700'}`}>
                {row.sacramento}
            </span>
        )
    },
    { header: 'Fecha', accessor: 'fecha' },
    { 
      header: 'Estado', 
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
            ${row.isPending 
                ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
                : 'bg-green-50 text-green-800 border-green-200'}`}>
            {row.isPending ? (
                <>
                    <Clock className="w-3 h-3 mr-1" />
                    Pendiente
                </>
            ) : (
                <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Asentado
                </>
            )}
        </span>
      ) 
    }
  ];

  const handleBackup = () => {
    generateBackup(data, user);
    toast({ title: 'Backup Generado', description: 'La descarga comenzará automáticamente.' });
  };

  return (
    <DashboardLayout entityName={user?.parishName || 'Parroquia'}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[#2C3E50]">Panel Parroquial</h1>
           <div className="flex items-center gap-2 mt-1">
             <p className="text-gray-500">{user?.parishName}</p>
             {hasPending && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                   <AlertCircle className="w-3 h-3 mr-1" />
                   Registros Pendientes de Asentar
                </span>
             )}
           </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackup} className="gap-2">
                <Download className="w-4 h-4" /> Restaurar Backup
            </Button>
            <Button variant="outline" onClick={handleBackup} className="gap-2">
                <Download className="w-4 h-4" /> Descargar Backup
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, idx) => (
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
        <h2 className="text-xl font-bold text-[#2C3E50] mb-4">Acciones Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Button 
            className="gap-2 bg-[#D4AF37] text-white hover:bg-[#C4A027]"
            onClick={() => navigate('/parroquia/bautismo/nuevo')}
          >
            <Plus className="w-4 h-4" /> Nuevo Bautizo
          </Button>
          <Button 
            className="gap-2 bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate('/parroquia/confirmacion/nuevo')}
          >
            <Plus className="w-4 h-4" /> Nueva Confirmación
          </Button>
          <Button 
            className="gap-2 bg-pink-600 hover:bg-pink-700"
            onClick={() => navigate('/parroquia/matrimonio/nuevo')}
          >
            <Plus className="w-4 h-4" /> Nuevo Matrimonio
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#2C3E50]">Registros Recientes y Pendientes</h3>
            <span className="text-xs text-gray-400">Mostrando últimos 10 movimientos</span>
        </div>
        
        <Table columns={columns} data={recentRecords} />
        
        {recentRecords.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 mt-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Activity className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Sin actividad reciente</h3>
            <p className="mt-1 text-sm text-gray-500">No hay registros pendientes ni movimientos recientes para mostrar.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParishDashboard;

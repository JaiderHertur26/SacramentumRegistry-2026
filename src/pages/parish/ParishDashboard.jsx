
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import {
    Church, ScrollText, Users, Activity, Plus,
    Download, AlertCircle, Clock, CheckCircle2,
    ArrowUpRight, FileText, Calendar, Database
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ParishDashboard = () => {
  const { data, getBaptisms, getConfirmations, getMatrimonios, getMisDatosList } = useAppData();
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
  const [misDatosCount, setMisDatosCount] = useState(0);

  const parseSortDate = (dateStr) => {
    if (!dateStr) return 0;
    if (String(dateStr).match(/^\d{4}-\d{2}-\d{2}/)) return new Date(dateStr).getTime();
    if (String(dateStr).match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [d, m, y] = dateStr.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
    }
    return 0;
  };

  const updateDashboardData = () => {
    if (!user || !user.parishId) return;

    const bSeated = getBaptisms(user.parishId);
    const cSeated = getConfirmations(user.parishId);
    const mSeated = getMatrimonios(user.parishId);
    const mDatos = getMisDatosList(user.parishId);

    const bPending = JSON.parse(localStorage.getItem(`pendingBaptisms_${user.parishId}`) || '[]');
    const cPending = JSON.parse(localStorage.getItem(`pendingConfirmations_${user.parishId}`) || '[]');
    const mPending = JSON.parse(localStorage.getItem(`pendingMatrimonios_${user.parishId}`) || '[]');

    setStats({
      baptisms: bSeated.length,
      confirmations: cSeated.length,
      marriages: mSeated.length,
      total: bSeated.length + cSeated.length + mSeated.length
    });

    setMisDatosCount(mDatos.length);

    const pendingCount = bPending.length + cPending.length + mPending.length;
    setHasPending(pendingCount > 0);

    const mapRecord = (r, type, label, isPending) => {
        let nombres = r.firstName || r.nombres;
        let apellidos = r.lastName || r.apellidos;

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
        ...bPending.map(r => mapRecord(r, 'baptism', 'Bautismo', true)),
        ...cPending.map(r => mapRecord(r, 'confirmation', 'Confirmación', true)),
        ...mPending.map(r => mapRecord(r, 'marriage', 'Matrimonio', true)),
        ...bSeated.map(r => mapRecord(r, 'baptism', 'Bautismo', false)),
        ...cSeated.map(r => mapRecord(r, 'confirmation', 'Confirmación', false)),
        ...mSeated.map(r => mapRecord(r, 'marriage', 'Matrimonio', false))
    ];

    allRecords.sort((a, b) => {
        if (a.isPending && !b.isPending) return -1;
        if (!a.isPending && b.isPending) return 1;
        return b.sortDate - a.sortDate;
    });

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
    { label: 'Bautismos', value: stats.baptisms, icon: Church, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Confirmaciones', value: stats.confirmations, icon: ScrollText, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Matrimonios', value: stats.marriages, icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    { label: 'Registros Mis Datos', value: misDatosCount, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const columns = [
    {
        header: 'Persona / Pareja',
        render: (row) => (
            <div className="flex flex-col">
                <span className="font-bold text-[#111111]">{row.nombres}</span>
                <span className="text-xs text-gray-500 uppercase font-medium">{row.apellidos}</span>
            </div>
        )
    },
    { 
        header: 'Sacramento', 
        render: (row) => (
            <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                row.sacramento === 'Bautismo' ? 'bg-blue-100 text-blue-700' :
                row.sacramento === 'Confirmación' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
            )}>
                {row.sacramento}
            </span>
        )
    },
    {
        header: 'Fecha',
        render: (row) => (
            <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-3.5 h-3.5" />
                <span>{row.fecha}</span>
            </div>
        )
    },
    { 
      header: 'Estado', 
      render: (row) => (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
            row.isPending
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
        )}>
            {row.isPending ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {row.isPending ? 'Pendiente' : 'Asentado'}
        </span>
      ) 
    },
    {
        header: 'Acción',
        render: (row) => (
            <button
                onClick={() => navigate(row.isPending ? `/parroquia/${row.sacramento.toLowerCase()}/sentar` : `/parroquia/${row.sacramento.toLowerCase()}/ver/${row.id}`)}
                className="text-gray-400 hover:text-[#D4AF37] transition-colors"
            >
                <ArrowUpRight className="w-5 h-5" />
            </button>
        )
    }
  ];

  return (
    <DashboardLayout entityName={user?.parishName || 'Parroquia'}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h1 className="text-3xl font-black text-[#111111] tracking-tight">Panel de Control</h1>
             {hasPending && (
                <div className="animate-pulse flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase">
                   <AlertCircle className="w-3 h-3" />
                   Tareas Pendientes
                </div>
             )}
           </div>
           <p className="text-gray-500 font-medium">{user?.parishName} — Gestión Sacramental</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-2 hidden lg:flex">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base de Datos</span>
                <span className="text-sm font-black text-[#111111]">LOCAL STORAGE</span>
            </div>
            <Button
                variant="outline"
                onClick={() => navigate('/parroquia/ajustes')}
                className="gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-bold"
            >
                <Database className="w-4 h-4" /> Respaldo
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, idx) => (
          <div key={idx} className={cn(
              "relative overflow-hidden bg-white rounded-2xl p-6 border transition-all hover:shadow-lg hover:-translate-y-1 group",
              stat.border
          )}>
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-125", stat.bg.replace('bg-', 'bg-'))}></div>
            <div className="relative flex flex-col gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div>
                    <p className="text-3xl font-black text-[#111111]">{stat.value}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Recent Activity Table */}
        <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black text-[#111111] flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#D4AF37]" />
                    Actividad Reciente
                </h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">Últimos 10 registros</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table columns={columns} data={recentRecords} />
                </div>

                {recentRecords.length === 0 && (
                  <div className="text-center py-20 bg-gray-50/50">
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <Activity className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-[#111111]">Sin registros recientes</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-[250px] mx-auto">Comience agregando un nuevo sacramento para ver la actividad aquí.</p>
                  </div>
                )}
            </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
                <h3 className="text-lg font-black text-[#111111] px-2 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#D4AF37]" />
                    Acciones Rápidas
                </h3>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => navigate('/parroquia/bautismo/nuevo')}
                        className="flex items-center justify-between p-4 bg-[#D4AF37] hover:bg-[#C4A027] text-white rounded-xl transition-all font-bold group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <Church className="w-5 h-5" />
                            </div>
                            <span>Nuevo Bautismo</span>
                        </div>
                        <Plus className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                    </button>

                    <button
                        onClick={() => navigate('/parroquia/confirmacion/nuevo')}
                        className="flex items-center justify-between p-4 bg-[#111111] hover:bg-gray-800 text-white rounded-xl transition-all font-bold group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <ScrollText className="w-5 h-5" />
                            </div>
                            <span>Nueva Confirmación</span>
                        </div>
                        <Plus className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                    </button>

                    <button
                        onClick={() => navigate('/parroquia/matrimonio/nuevo')}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-[#D4AF37] hover:bg-gray-50 text-[#111111] rounded-xl transition-all font-bold group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <span>Nuevo Matrimonio</span>
                        </div>
                        <Plus className="w-5 h-5 text-gray-300 group-hover:text-[#D4AF37]" />
                    </button>
                </div>
            </div>

            {/* Quick Tips or Reminders */}
            <div className="bg-gradient-to-br from-[#111111] to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Database className="w-20 h-20" />
                </div>
                <h4 className="font-black text-sm uppercase tracking-widest mb-2 text-[#D4AF37]">Recordatorio de Seguridad</h4>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    Recuerde realizar una copia de seguridad semanal de sus datos. La información se almacena localmente en este navegador.
                </p>
                <button
                    onClick={() => navigate('/parroquia/ajustes')}
                    className="mt-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-[#D4AF37] transition-colors"
                >
                    Ir a configuración <ArrowUpRight className="w-3 h-3" />
                </button>
            </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ParishDashboard;

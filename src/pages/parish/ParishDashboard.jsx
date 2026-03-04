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

  // Función segura para leer arreglos desde el localStorage
  const safeParse = (key) => {
    try {
        const val = JSON.parse(localStorage.getItem(key));
        return Array.isArray(val) ? val : [];
    } catch {
        return [];
    }
  };

  // Función para determinar la ruta correcta según el estado y tipo de sacramento
  const getActionRoute = (sacramento, isPending) => {
    const rutaBase = sacramento === 'Confirmación' ? 'confirmacion' : sacramento.toLowerCase();
    
    return isPending 
        ? `/parroquia/${rutaBase}/sentar-registros` 
        : `/parroquia/${rutaBase}/editar`; 
  };

  const updateDashboardData = () => {
    if (!user || !user.parishId) return;

    // Aseguramos que siempre recibimos un array con el fallback || []
    const bSeated = getBaptisms(user.parishId) || [];
    const cSeated = getConfirmations(user.parishId) || [];
    const mSeated = getMatrimonios(user.parishId) || [];
    const mDatos = getMisDatosList(user.parishId) || [];

    // Extracción segura de pendientes
    const bPending = safeParse(`pendingBaptisms_${user.parishId}`);
    const cPending = safeParse(`pendingConfirmations_${user.parishId}`);
    const mPending = safeParse(`pendingMatrimonios_${user.parishId}`);

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
    { label: 'Bautismos', value: stats.baptisms, icon: Church, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Confirmaciones', value: stats.confirmations, icon: ScrollText, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Matrimonios', value: stats.marriages, icon: Users, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    { label: 'Registros Mis Datos', value: misDatosCount, icon: FileText, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ];

  const columns = [
    {
        header: 'Persona / Pareja',
        render: (row) => (
            <div className="flex flex-col">
                <span className="font-bold text-gray-900">{row.nombres}</span>
                <span className="text-[10px] text-gray-600 uppercase font-black tracking-tight">{row.apellidos}</span>
            </div>
        )
    },
    { 
        header: 'Sacramento', 
        render: (row) => (
            <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-tight border",
                row.sacramento === 'Bautismo' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                row.sacramento === 'Confirmación' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                'bg-rose-50 text-rose-800 border-rose-200'
            )}>
                {row.sacramento}
            </span>
        )
    },
    {
        header: 'Fecha',
        render: (row) => (
            <div className="flex items-center gap-2 text-gray-700 font-bold text-xs">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{row.fecha}</span>
            </div>
        )
    },
    { 
      header: 'Estado', 
      render: (row) => (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            row.isPending
                ? "bg-yellow-100 text-yellow-900 border-yellow-300"
                : "bg-emerald-100 text-emerald-900 border-emerald-300"
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
                onClick={() => navigate(getActionRoute(row.sacramento, row.isPending))}
                className="text-gray-500 hover:text-[#D4AF37] transition-colors p-1"
                title="Gestionar Registro"
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
             <h1 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control</h1>
             {hasPending && (
                <div className="animate-pulse flex items-center gap-1 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                   <AlertCircle className="w-3 h-3" />
                   Tareas Pendientes
                </div>
             )}
           </div>
           <p className="text-gray-600 font-bold text-sm tracking-tight">{user?.parishName} — Sistema de Gestión Sacramental</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-2 hidden lg:flex">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Base de Datos</span>
                <span className="text-xs font-black text-gray-900">MODO LOCAL</span>
            </div>
            <Button
                variant="outline"
                onClick={() => navigate('/parroquia/ajustes')}
                className="gap-2 border-gray-300 hover:bg-gray-100 text-gray-900 font-black text-xs uppercase tracking-widest px-4 py-5 shadow-sm"
            >
                <Database className="w-4 h-4" /> Respaldo
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, idx) => (
          <div key={idx} className={cn(
              "relative overflow-hidden bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-xl hover:-translate-y-1 group",
              stat.border
          )}>
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-125", stat.bg)}></div>
            <div className="relative flex flex-col gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mt-1">{stat.label}</p>
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
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-6 bg-[#D4AF37] rounded-full"></div>
                    Actividad Reciente
                </h3>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">Últimos 10 registros</span>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table columns={columns} data={recentRecords} />
                </div>

                {recentRecords.length === 0 && (
                  <div className="text-center py-24 bg-gray-50/50">
                    <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6 border border-gray-100">
                        <Activity className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900">Sin actividad detectada</h3>
                    <p className="text-sm text-gray-600 mt-2 font-bold max-w-[280px] mx-auto leading-relaxed">Comience agregando un nuevo sacramento para visualizar la actividad en tiempo real.</p>
                  </div>
                )}
            </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 px-2 flex items-center gap-2">
                    <div className="w-2 h-6 bg-gray-900 rounded-full"></div>
                    Acciones de Gestión
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => navigate('/parroquia/bautismo/nuevo')}
                        className="flex items-center justify-between p-5 bg-[#D4AF37] hover:bg-[#C4A027] text-white rounded-2xl transition-all shadow-lg hover:shadow-xl group overflow-hidden relative"
                    >
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Church className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] uppercase tracking-widest font-black opacity-80 text-white">Registro</span>
                                <span className="text-lg font-black tracking-tight text-white">Nuevo Bautismo</span>
                            </div>
                        </div>
                        <Plus className="w-6 h-6 opacity-30 group-hover:opacity-100 group-hover:scale-125 transition-all relative z-10 text-white" />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                    </button>

                    <button
                        onClick={() => navigate('/parroquia/confirmacion/nuevo')}
                        className="flex items-center justify-between p-5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-2xl transition-all shadow-lg hover:shadow-xl group overflow-hidden relative"
                    >
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                <ScrollText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] uppercase tracking-widest font-black opacity-80 text-white">Registro</span>
                                <span className="text-lg font-black tracking-tight text-white">Nueva Confirmación</span>
                            </div>
                        </div>
                        <Plus className="w-6 h-6 opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all relative z-10 text-white" />
                    </button>

                    <button
                        onClick={() => navigate('/parroquia/matrimonio/nuevo')}
                        className="flex items-center justify-between p-5 bg-white border-2 border-gray-100 hover:border-rose-200 hover:bg-rose-50/30 text-gray-900 rounded-2xl transition-all shadow-sm hover:shadow-lg group overflow-hidden relative"
                    >
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-100">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] uppercase tracking-widest font-black text-rose-400">Registro</span>
                                <span className="text-lg font-black tracking-tight text-gray-900">Nuevo Matrimonio</span>
                            </div>
                        </div>
                        <Plus className="w-6 h-6 text-gray-300 group-hover:text-rose-400 group-hover:scale-125 transition-all relative z-10" />
                    </button>
                </div>
            </div>

            {/* Quick Tips or Reminders */}
            <div className="bg-gray-900 rounded-2xl p-7 text-white relative overflow-hidden shadow-2xl border border-gray-800">
                <div className="absolute -right-8 -bottom-8 p-4 opacity-5">
                    <Database className="w-40 h-40" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse"></div>
                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Protocolo de Seguridad</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-bold">
                        La integridad de su información es nuestra prioridad. Realice copias de seguridad de forma periódica.
                    </p>
                    <button
                        onClick={() => navigate('/parroquia/ajustes')}
                        className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-white hover:text-[#D4AF37] transition-all bg-white/5 px-4 py-2.5 rounded-lg border border-white/10"
                    >
                        Configuración avanzada <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ParishDashboard;
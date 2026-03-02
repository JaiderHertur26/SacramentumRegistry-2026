
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Bell, Mail, User, CheckCircle2, Clock,
    ArrowRight, Building2, Trash2, ExternalLink,
    AlertCircle, MapPin, Calendar, Heart
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const NotificationWarningPage = () => {
    const { user } = useAuth();
    const { getParishNotifications, updateNotificationStatus, deleteNotification } = useAppData();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadNotifications = () => {
        setIsLoading(true);
        const allNotifs = getParishNotifications(user?.parishId) || [];
        const matrimonialNotifs = allNotifs.filter(n => n.type === 'matrimonial_notification');
        setNotifications(matrimonialNotifs);
        setIsLoading(false);
    };

    useEffect(() => {
        if (user?.parishId) {
            loadNotifications();
        }
    }, [user?.parishId]);

    const handleMarkAsRead = (id) => {
        const result = updateNotificationStatus(id, 'read');
        if (result.success) {
            handleDelete(id);
        }
    };

    const handleDelete = (id) => {
        deleteNotification(id, user?.parishId);
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({ title: "Aviso Gestionado", description: "La notificación ha sido archivada.", variant: "success" });
    };

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Bell className="w-8 h-8 text-[#D4AF37]" />
                        Aviso Notificación Matrimonial
                    </h1>
                    <p className="text-gray-600 font-bold text-sm mt-1 uppercase tracking-tight">
                        Bandeja de entrada de actualizaciones de bautismo por matrimonio.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                        {notifications.length} Avisos Pendientes
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sincronizando avisos...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 py-24 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Sin avisos nuevos</h3>
                        <p className="text-sm font-bold text-gray-400 mt-1 max-w-xs">No hay notificaciones matrimoniales pendientes de revisión.</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={cn(
                                "group bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden",
                                notif.status === 'unread' ? "border-emerald-100 shadow-emerald-50" : "border-gray-50 opacity-75"
                            )}
                        >
                            {notif.status === 'unread' && (
                                <div className="absolute top-0 right-0 p-3">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                <div className="lg:col-span-4 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner group-hover:scale-110 transition-transform">
                                        <Heart className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 tracking-tight leading-none mb-2 uppercase">Bautizado Actualizado</h4>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                                            <span className="text-gray-200">•</span>
                                            <Building2 className="w-3 h-3" />
                                            <span className="text-emerald-600 font-black">{notif.fromParish}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-5 bg-gray-50/50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cónyuge Registrado</p>
                                        <p className="text-sm font-black text-gray-900 uppercase">{notif.details?.nombreConyuge || 'No especificado'}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ref. Matrimonial</p>
                                        <p className="text-xs font-mono font-black text-gray-700">L:{notif.details?.libroMat} F:{notif.details?.folioMat} N:{notif.details?.numeroMat}</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-3 flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate(`/parroquia/bautismo/editar?id=${notif.baptismId}`)}
                                        className="gap-2 border-gray-300 hover:bg-gray-100 text-gray-900 font-black text-[10px] uppercase tracking-widest px-4 h-12 shadow-sm"
                                    >
                                        <ExternalLink className="w-4 h-4 text-[#D4AF37]" /> Ver Partida
                                    </Button>
                                    <Button
                                        onClick={() => handleMarkAsRead(notif.id)}
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-6 h-12 shadow-lg shadow-emerald-100"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Marcar Leído
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-12 bg-gray-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl border border-gray-800">
                <div className="absolute right-0 top-0 p-6 opacity-5">
                    <AlertCircle className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center text-gray-900 flex-shrink-0 shadow-lg shadow-yellow-900/20">
                        <Mail className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="text-lg font-black tracking-tight mb-2">Protocolo de Notificación</h4>
                        <p className="text-sm text-gray-400 leading-relaxed font-bold">
                            Este aviso confirma que se ha realizado una anotación marginal por matrimonio en sus archivos.
                            Verifique la partida para confirmar que la nota se ha insertado correctamente.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default NotificationWarningPage;

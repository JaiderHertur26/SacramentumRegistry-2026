
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Trash2, Eye, FileText, FileUp, AlertTriangle, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ParishNotificationsPage = () => {
    const { user } = useAuth();
    const { getParishNotifications, deleteNotification, updateNotificationStatus } = useAppData();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.parishId) {
            setIsLoading(true);
            const parishNotifs = getParishNotifications(user.parishId);
            // Sort notifications: unread first, then by most recent date
            const sortedNotifs = [...parishNotifs].sort((a, b) => {
                if (a.status === 'unread' && b.status !== 'unread') return -1;
                if (a.status !== 'unread' && b.status === 'unread') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            setNotifications(sortedNotifs);
            setIsLoading(false);
        }
    }, [user, getParishNotifications]);

    const handleDelete = (notificationId) => {
        deleteNotification(notificationId, user.parishId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    const handleViewDecree = (notification) => {
        // Change handleViewDecree to mark notification as read instead of deleting
        if (notification.status === 'unread') {
            updateNotificationStatus(notification.id, 'read');
            setNotifications(prev => 
                prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n)
            );
        }
        
        // Update navigation routes to Spanish
        if (notification.decree_type === 'correction') {
            navigate(`/parroquia/decretos-correccion/ver?highlight=${notification.decree_id}`);
        } else if (notification.decree_type === 'replacement') {
            navigate(`/parroquia/decretos-reposicion/ver?highlight=${notification.decree_id}`);
        } else {
            toast({
                title: "Atención",
                description: "El tipo de documento adjunto no es reconocido o es un aviso de texto plano.",
                variant: "warning",
            });
        }
    };
    
    const formatDateTime = (isoString) => {
        if (!isoString) return '';
        try {
            return format(new Date(isoString), "d 'de' MMMM, yyyy - HH:mm", { locale: es });
        } catch (e) {
            return isoString;
        }
    };
    
    const NotificationCard = ({ notification }) => {
        const isCorrection = notification.decree_type === 'correction';
        const isUnread = notification.status === 'unread';
        
        // Update UI styling: unread notifications have colored badges (blue/purple), read notifications are grayed out
        const badgeClass = isCorrection
            ? `border ${isUnread ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`
            : `border ${isUnread ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`;
            
        const Icon = isCorrection ? FileText : FileUp;
    
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className={`p-5 rounded-xl shadow-sm border flex items-start gap-4 transition-all duration-200 ${
                    isUnread 
                    ? 'bg-white border-blue-200 ring-1 ring-blue-100/50 hover:shadow-md' 
                    : 'bg-gray-50 border-gray-200 opacity-70 hover:opacity-100'
                }`}
            >
                <div className={`p-3 rounded-full mt-1 ${isUnread ? (isCorrection ? 'bg-blue-50' : 'bg-purple-50') : 'bg-gray-200'}`}>
                    <Icon className={`w-6 h-6 ${isUnread ? (isCorrection ? 'text-blue-500' : 'text-purple-500') : 'text-gray-500'}`} />
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeClass}`}>
                                {isCorrection ? 'Decreto de Corrección' : 'Decreto de Reposición'}
                            </span>
                            {isUnread && (
                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                    NUEVO
                                </span>
                            )}
                        </div>
                        <span className="text-[12px] text-gray-500 font-medium">{formatDateTime(notification.createdAt)}</span>
                    </div>
                    <p className={`text-[15px] leading-relaxed mt-2 mb-4 ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {notification.message}
                    </p>
                    <div className="flex items-center gap-3">
                        <Button
                            variant={isUnread ? "default" : "outline"}
                            size="sm"
                            className={`text-sm h-9 px-4 rounded-lg font-medium transition-colors ${isUnread ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'}`}
                            onClick={() => handleViewDecree(notification)}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            {isUnread ? 'Revisar Decreto' : 'Ver nuevamente'}
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-sm h-9 px-3 text-gray-400 hover:text-red-600 hover:bg-red-50 ml-auto rounded-lg"
                            onClick={() => {
                                handleDelete(notification.id);
                                toast({
                                    title: "Notificación eliminada",
                                    description: "La notificación ha sido removida de su bandeja.",
                                });
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <Helmet>
                <title>Notificaciones de Cancillería | Eclesia Digital</title>
                <meta name="description" content="Vea las notificaciones importantes de la cancillería." />
            </Helmet>

            <div className="mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-600 rounded-xl shadow-sm">
                        <Bell className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 font-serif tracking-tight">Notificaciones Oficiales</h1>
                        <p className="text-gray-500 text-[15px] mt-1">Bandeja de entrada de decretos emitidos por Cancillería para su parroquia.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto min-h-[500px]">
                {isLoading ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-[15px] font-medium text-gray-500">Sincronizando con Cancillería...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {notifications.length > 0 ? (
                            <div className="space-y-4">
                                {notifications.map(notif => (
                                    <NotificationCard key={notif.id} notification={notif} />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-24 px-8 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm"
                            >
                                <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-5 border border-green-100">
                                   <CheckCheck className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Su bandeja está al día</h3>
                                <p className="text-[15px] text-gray-500 max-w-md mx-auto leading-relaxed">
                                    Cuando la Cancillería emita un decreto de corrección o reposición que requiera asentar una nota en sus libros, aparecerá aquí.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ParishNotificationsPage;

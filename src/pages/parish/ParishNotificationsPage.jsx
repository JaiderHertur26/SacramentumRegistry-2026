
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
            setNotifications(parishNotifs);
            setIsLoading(false);
        }
    }, [user, getParishNotifications]);

    const handleDelete = (notificationId) => {
        deleteNotification(notificationId, user.parishId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    const handleMarkAsRead = (notificationId) => {
        updateNotificationStatus(notificationId, 'read');
        setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
        );
    };

    const handleViewDecree = (notification) => {
        // Auto-delete the notification when viewed
        deleteNotification(notification.id, user.parishId);
        
        // Navigate to the content
        if (notification.decree_type === 'correction') {
            navigate(`/parish/decree-correction/view?highlight=${notification.decree_id}`);
        } else if (notification.decree_type === 'replacement') {
            navigate(`/parish/decree-replacement/view?highlight=${notification.decree_id}`);
        } else {
            toast({
                title: "No se puede abrir",
                description: "El tipo de decreto no es reconocido.",
                variant: "destructive",
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
        
        const badgeClass = isCorrection
            ? 'bg-orange-100 text-orange-800 border-orange-200'
            : 'bg-sky-100 text-sky-800 border-sky-200';
        const Icon = isCorrection ? FileText : FileUp;
    
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-lg shadow-sm border flex items-start gap-4 transition-colors ${isUnread ? 'bg-white border-blue-200 ring-1 ring-blue-100' : 'bg-gray-50 border-gray-200'}`}
            >
                <div className={`p-2 rounded-full mt-1 ${isCorrection ? 'bg-orange-50' : 'bg-sky-50'}`}>
                    <Icon className={`w-5 h-5 ${isCorrection ? 'text-orange-500' : 'text-sky-500'}`} />
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                                {isCorrection ? 'Corrección' : 'Reposición'}
                            </span>
                            {isUnread && (
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    NUEVO
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500">{formatDateTime(notification.createdAt)}</span>
                    </div>
                    <p className={`text-sm mt-2 mb-3 ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {notification.message}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            className="text-xs h-8 bg-[#4B7BA7] hover:bg-[#3A6286]"
                            onClick={() => handleViewDecree(notification)}
                        >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Ver Decreto
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 ml-auto"
                            onClick={() => {
                                handleDelete(notification.id);
                                toast({
                                    title: "Notificación eliminada",
                                    description: "La notificación ha sido eliminada de su lista.",
                                });
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <DashboardLayout>
            <Helmet>
                <title>Notificaciones de Cancillería - Eclesia Digital</title>
                <meta name="description" content="Vea las notificaciones importantes de la cancillería." />
            </Helmet>

            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <Bell className="w-6 h-6 text-[#4B7BA7]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 font-serif">Notificaciones de Cancillería</h1>
                        <p className="text-gray-500 text-sm">Bandeja de entrada de decretos y comunicaciones oficiales.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto min-h-[500px]">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Cargando notificaciones...</p>
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
                                className="text-center py-16 px-6 bg-white rounded-lg border border-dashed border-gray-300"
                            >
                                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                   <Bell className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">No tiene notificaciones</h3>
                                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                                    Cuando la cancillería emita un decreto o comunicación que requiera su atención, aparecerá en esta lista.
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

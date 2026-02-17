import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Church, LogOut, Settings as SettingsIcon, LayoutDashboard, Users, Network, ChevronRight, Database, Sliders, HeartHandshake as Handshake, ScrollText, Heart, List, FileText, Bell, AlertCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLE_TYPES } from '@/config/supabaseConfig';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';

const SidebarItem = ({ item, isActive, isChild = false, badgeCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const location = useLocation();

  const getSafeLabel = (lbl) => {
      if (typeof lbl === 'string') return lbl;
      if (typeof lbl === 'object' && lbl !== null) {
          const candidate = lbl.name || lbl.label || 'Menu';
          return typeof candidate === 'object' ? 'Menu' : String(candidate);
      }
      return 'Menu';
  };

  const label = getSafeLabel(item.label);

  // Auto-expand if a child route is active
  useEffect(() => {
    if (hasChildren) {
      const childActive = item.children.some(child => child.path === location.pathname);
      if (childActive) setIsOpen(true);
    }
  }, [location.pathname, hasChildren, item.children]);

  const toggleOpen = (e) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };
  
  const content = (
      <>
        {item.icon && <item.icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-gray-400'}`} />}
        <span>{label}</span>
        {badgeCount > 0 && (
            <span className="ml-auto text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                {badgeCount}
            </span>
        )}
      </>
  );

  if (hasChildren) {
    return (
      <div className="mb-1">
        <button
          onClick={toggleOpen}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            isActive || isOpen
              ? 'bg-[#D4AF37]/10 text-[#111111]' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className={`w-4 h-4 ${isActive || isOpen ? 'text-[#D4AF37]' : 'text-gray-400'}`} />}
            <span>{label}</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </motion.div>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1">
                {item.children.map((child, idx) => (
                  <SidebarItem 
                    key={idx} 
                    item={child} 
                    isActive={
                      item.children
                        ? item.children.some(child => location.pathname.startsWith(child.path))
                        : location.pathname.startsWith(item.path)
                    }
                    isChild={true}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 py-2.5 mb-1 text-sm font-medium rounded-lg transition-all duration-200 ${
        isChild ? 'pl-12 pr-4' : 'px-4'
      } ${
        isActive 
          ? 'bg-[#D4AF37]/15 text-[#111111] border-r-4 border-[#D4AF37]' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-r-4 border-transparent'
      }`}
    >
      {content}
    </Link>
  );
};

const Sidebar = ({ isOpen, onClose, onLogout, role }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { getParishNotifications } = useAppData();
  
  let menuItems = [];

  const safeRole = typeof role === 'object' && role !== null 
    ? (role.role || role.name || '') 
    : String(role || '');
  
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (safeRole === ROLE_TYPES.PARISH && user?.parishId) {
        const notifications = getParishNotifications(user.parishId);
        setNotificationCount(notifications.length);
    }
  }, [location, getParishNotifications, user, safeRole]);


  if (menuItems.length === 0) {
    if (safeRole === ROLE_TYPES.ADMIN_GENERAL) {
        menuItems = [
            { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
            { label: 'Diócesis/Arquidiócesis', path: '/admin/dioceses', icon: Church },
            { label: 'Ajustes', path: '/admin/settings', icon: SettingsIcon }
        ];
    } else if (safeRole === ROLE_TYPES.DIOCESE) {
        menuItems = [
            { label: 'Dashboard', path: '/diocese/dashboard', icon: LayoutDashboard },
            { label: 'Organización Eclesiástica', path: '/diocese/ecclesiastical', icon: Network },
            { label: 'Comunicaciones', path: '/communications', icon: Users },
            { label: 'Ajustes', path: '/diocese/settings', icon: SettingsIcon }
        ];
    } else if (safeRole === ROLE_TYPES.PARISH) {
        menuItems = [
            { label: 'Dashboard', path: '/parish/dashboard', icon: LayoutDashboard },
            { label: 'Notificaciones Cancillería', path: '/parish/notifications', icon: Bell, badgeCount: notificationCount },
            { label: 'Aviso Notificación Matrimonial', path: '/parroquia/aviso-notificacion', icon: AlertCircle },
            {
                label: 'Bautismo',
                icon: Church,
                children: [
                    { label: 'Nuevo Bautizo', path: '/parroquia/bautismo/nuevo' },
                    { label: 'Bautismo ya Celebrado', path: '/parroquia/bautismo/celebrado' },
                    { label: 'Sentar Registros', path: '/parroquia/bautismo/sentar-registros' },
                    { label: 'Editar Bautizo', path: '/parroquia/bautismo/editar' },
                    { label: 'Partidas', path: '/parroquia/bautismo/partidas' },
                    { label: 'Índice General', path: '/parroquia/bautismo/indice', icon: List },
                ]
            },
            { 
                label: 'Confirmación',
                icon: Handshake, 
                children: [
                    { label: 'Nueva Confirmación', path: '/parroquia/confirmacion/nuevo' },
                    { label: 'Confirmación ya Celebrada', path: '/parroquia/confirmacion/celebrado' },
                    { label: 'Sentar Registros', path: '/parroquia/confirmacion/sentar-registros' },
                    { label: 'Editar Confirmación', path: '/parroquia/confirmacion/editar' },
                    { label: 'Partidas', path: '/parroquia/confirmacion/partidas' },
                    { label: 'Índice General', path: '/parroquia/confirmacion/indice', icon: List },
                ]
            },
            { 
                label: 'Matrimonio',
                icon: Heart, 
                children: [
                    { label: 'Nuevo Matrimonio', path: '/parroquia/matrimonio/nuevo' },
                    { label: 'Matrimonio ya Celebrado', path: '/parroquia/matrimonio/celebrado' },
                    { label: 'Sentar Registros', path: '/parroquia/matrimonio/sentar-registros' },
                    { label: 'Editar Matrimonio', path: '/parroquia/matrimonio/editar' },
                    { label: 'Partidas', path: '/parroquia/matrimonio/partidas' },
                    { label: 'Índice General', path: '/parroquia/matrimonio/indice', icon: List },
                    { label: 'Notificación Matrimonial', path: '/parroquia/matrimonio/notificacion', icon: Mail },
                ]
            },
            { label: 'Datos Auxiliares', path: '/datos-auxiliares', icon: Database },
            { label: 'Parámetros', path: '/parroquia/parametros', icon: Sliders },
            {
                label: 'Decretos',
                icon: FileText,
                children: [
                    { label: 'Nuevo D. Reposición', path: '/parish/decree-replacement/new' },
                    { label: 'Nuevo D. Corrección', path: '/parish/decree-correction/new' },
                    { label: 'Ver Reposición', path: '/parish/decree-replacement/view' },
                    { label: 'Ver Corrección', path: '/parish/decree-correction/view' },
                    { label: 'Editar Decreto Reposición', path: '/parish/decree-replacement/edit' },
                    { label: 'Editar Decreto Corrección', path: '/parish/decree-correction/edit' },
                    { label: 'Conceptos de Anulación', path: '/parish/annulment-concepts' },
                    { label: 'Nulidad Matrimonial', path: '/parroquia/decretos/nulidad', icon: Heart }
                ]
            },            
            { label: 'Ajustes', path: '/parroquia/ajustes', icon: SettingsIcon }
        ];
    } else if (safeRole === ROLE_TYPES.CHANCERY) {
        menuItems = [
            { label: 'Dashboard', path: '/chancery/dashboard', icon: LayoutDashboard },
            {
                label: 'Decretos',
                icon: FileText,
                children: [
                    { label: 'Corrección de Partidas', path: '/chancery/decree-correction/new' },
                    { label: 'Reposición de Partidas', path: '/chancery/decree-replacement/new' },
                    { label: 'Ver Reposición', path: '/chancery/decree-replacement/view' },
                    { label: 'Ver Corrección', path: '/chancery/decree-correction/view' },
                    { label: 'Editar Decreto Reposición', path: '/chancery/decree-replacement/edit' },
                    { label: 'Editar Decreto Corrección', path: '/chancery/decree-correction/edit' },
                    { label: 'Conceptos de Anulación', path: '/chancery/decree-annulment' }
                ]
            },
            { label: 'Sacramentos Pendientes', path: '/chancery/pending', icon: ScrollText },
            { label: 'Certificaciones', path: '/chancery/certifications', icon: Users },
            { label: 'Comunicaciones', path: '/communications', icon: Users }
        ];
    } else {
        menuItems = [
             { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        ];
    }
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
            <div className="w-8 h-8 bg-[#D4AF37] rounded-lg flex items-center justify-center mr-3 shadow-md">
              <Church className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[#111111]">Eclesia Digital</span>
            <button onClick={onClose} className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100">
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
            {menuItems.map((item, idx) => (
              <SidebarItem 
                key={idx} 
                item={item} 
                isActive={
                  item.children
                  ? item.children.some(child => location.pathname.startsWith(child.path))
                  : location.pathname.startsWith(item.path)
                }
                badgeCount={item.badgeCount}
              />
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
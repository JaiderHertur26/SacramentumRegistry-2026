
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Trash2, Search, Plus, Eye, Eraser } from 'lucide-react';

import EditMisDatosFormModal from '@/components/modals/EditMisDatosFormModal';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import ManualMisDatosModal from '@/components/modals/ManualMisDatosModal';
import ViewMisDatosModal from '@/components/modals/ViewMisDatosModal';

import { getMisDatosFromLocalStorage, saveMisDatosToLocalStorage, clearMisDatosFromLocalStorage } from '@/utils/misDatosStorageHelper';

const MisDatosList = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Modals state
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const LOCAL_STORAGE_KEY = 'misDatos_manual_records';
    const entityId = user?.parishId || user?.dioceseId || 'default';

    useEffect(() => {
        loadData();
    }, [entityId]);

    const loadData = () => {
        setIsLoading(true);
        try {
            const importedData = getMisDatosFromLocalStorage(entityId) || [];
            
            const savedManualData = localStorage.getItem(LOCAL_STORAGE_KEY);
            const manualData = savedManualData ? JSON.parse(savedManualData) : [];
            
            const combined = [...importedData];
            
            manualData.forEach(manualItem => {
                const existingIndex = combined.findIndex(item => item.id && item.id === manualItem.id);
                if (existingIndex >= 0) {
                    combined[existingIndex] = manualItem;
                } else {
                    combined.push(manualItem);
                }
            });
            
            setItems(combined);
        } catch (error) {
            console.error("Error loading data:", error);
            toast({ title: 'Error', description: 'Hubo un problema al cargar los datos.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearImportedData = () => {
        if (window.confirm("¿Está seguro de eliminar todos los datos importados? Solo se conservarán los agregados manualmente.")) {
            clearMisDatosFromLocalStorage(entityId);
            loadData();
            toast({ title: 'Limpiado', description: 'Datos importados eliminados.', className: "bg-blue-50 text-blue-700" });
        }
    };

    const saveManualDataToStorage = (updatedItems) => {
        try {
            const manualItems = updatedItems.filter(item => item.isManual);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(manualItems));
        } catch (error) {
            console.error("Error saving to localStorage:", error);
            throw error;
        }
    };

    const handleSaveManual = (newData) => {
        const updatedItems = [...items, newData];
        setItems(updatedItems);
        saveManualDataToStorage(updatedItems);
        toast({ title: 'Éxito', description: 'Registro manual agregado correctamente.', className: "bg-green-50 text-green-700" });
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setShowEditModal(true);
    };

    const handleEditSave = async (updatedData) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const isManual = items.find(i => i.id === updatedData.id)?.isManual;
                    const newItems = items.map(item => item.id === updatedData.id ? { ...updatedData, isManual } : item);
                    
                    if (isManual) {
                        saveManualDataToStorage(newItems);
                    } else {
                        const importedOnly = newItems.filter(i => !i.isManual);
                        saveMisDatosToLocalStorage(importedOnly, entityId);
                    }
                    
                    setItems(newItems);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 500); 
        });
    };

    const handleDeleteClick = (record) => {
        setDeleteTarget(record);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            const newItems = items.filter(item => item.id !== deleteTarget.id);
            
            if (deleteTarget.isManual) {
                saveManualDataToStorage(newItems);
            } else {
                const importedOnly = newItems.filter(i => !i.isManual);
                saveMisDatosToLocalStorage(importedOnly, entityId);
            }
            
            setItems(newItems);
            toast({ 
                title: 'Eliminado', 
                description: 'El registro ha sido eliminado correctamente', 
                className: "bg-green-50 text-green-700 border-green-200" 
            });
        } catch (error) {
            console.error("Error deleting record:", error);
            toast({ 
                title: 'Error', 
                description: 'No se pudo eliminar el registro. Intente nuevamente.', 
                variant: 'destructive' 
            });
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
            setShowDeleteConfirm(false);
        }
    };

    const filteredItems = items.filter(i => 
        (i.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.idcod || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.nronit || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const headers = [
        "Código", "Nombre", "NIT", "Región", "Dirección", "Ciudad", 
        "Teléfono", "Fax", "Email", "Vicaría", "Decanato", 
        "Diócesis", "Obispo", "Canciller", "Serial", "Ruta"
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Buscar por nombre o código..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <div className="text-sm text-gray-500 font-medium whitespace-nowrap hidden md:block mr-2">
                        Total: <span className="text-[#111111] font-bold">{filteredItems.length}</span> registros
                    </div>
                    <Button 
                        variant="outline"
                        onClick={handleClearImportedData}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                        title="Borra todos los datos importados masivamente"
                        disabled={isLoading || isDeleting}
                    >
                        <Eraser className="w-4 h-4 mr-2" /> Limpiar Importados
                    </Button>
                    <Button 
                        onClick={() => setIsManualModalOpen(true)}
                        className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white w-full sm:w-auto"
                        disabled={isLoading || isDeleting}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Cargar Manual
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white relative">
                {(isLoading || isDeleting) && (
                    <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B7BA7]"></div>
                    </div>
                )}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs uppercase bg-[#4B7BA7] text-white font-bold tracking-wider">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 bg-[#4B7BA7] z-10 w-32 text-center border-r border-[#3A6286]">Acciones</th>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="px-4 py-3 border-l border-[#3A6286]">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={headers.length + 1} className="px-6 py-12 text-center text-gray-500 italic bg-gray-50">
                                        No se encontraron registros. Importe datos desde Ajustes o agréguelos manualmente.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <tr key={item.id || item.idcod || index} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50/50 border-r border-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center justify-center gap-1">
                                                <button 
                                                    onClick={() => { setEditingRecord(item); setIsViewModalOpen(true); }}
                                                    className="p-1.5 text-gray-600 hover:text-[#4B7BA7] hover:bg-blue-100 rounded transition-colors"
                                                    title="Ver detalles"
                                                    disabled={isLoading || isDeleting}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                    title="Editar"
                                                    disabled={isLoading || isDeleting}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(item)}
                                                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                                                    title="Eliminar"
                                                    disabled={isLoading || isDeleting}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-600">{item.idcod || '-'}</td>
                                        <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                                            {item.nombre || '-'}
                                            {item.isManual && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">MANUAL</span>}
                                            {!item.isManual && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-bold">IMPORTADO</span>}
                                        </td>
                                        <td className="px-4 py-3">{item.nronit || '-'}</td>
                                        <td className="px-4 py-3">{item.region || '-'}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={item.direccion}>{item.direccion || '-'}</td>
                                        <td className="px-4 py-3">{item.ciudad || '-'}</td>
                                        <td className="px-4 py-3">{item.telefono || '-'}</td>
                                        <td className="px-4 py-3">{item.nrofax || '-'}</td>
                                        <td className="px-4 py-3 text-[#4B7BA7]">{item.email || '-'}</td>
                                        <td className="px-4 py-3">{item.vicaria || '-'}</td>
                                        <td className="px-4 py-3">{item.decanato || '-'}</td>
                                        <td className="px-4 py-3">{item.diocesis || '-'}</td>
                                        <td className="px-4 py-3">{item.obispo || '-'}</td>
                                        <td className="px-4 py-3">{item.canciller || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.serial || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-xs max-w-[150px] truncate" title={item.ruta}>{item.ruta || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ManualMisDatosModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSave={handleSaveManual}
            />

            <ViewMisDatosModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                data={editingRecord}
            />

            <EditMisDatosFormModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                record={editingRecord}
                onSave={handleEditSave}
                allItems={items}
            />

            <ConfirmationDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteConfirm}
                title="Confirmar Eliminación"
                message={`¿Está seguro de eliminar el registro "${deleteTarget?.nombre}"? Esta acción es irreversible.`}
                confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
                isDestructive={true}
            />
        </div>
    );
};

export default MisDatosList;

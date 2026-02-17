
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

// Modals
import CreateParrocoModal from '@/components/modals/CreateParrocoModal';
import EditParrocoModal from '@/components/modals/EditParrocoModal';
import DeleteParrocoModal from '@/components/modals/DeleteParrocoModal';

const ParrocosList = () => {
    const { user } = useAuth();
    const { getParrocos, actualizarEstadoParrocos, addParroco, updateParroco, deleteParroco } = useAppData();
    const { toast } = useToast();

    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [modals, setModals] = useState({
        create: false,
        edit: false,
        delete: false
    });
    const [selectedParroco, setSelectedParroco] = useState(null);

    // Initial load and logic application
    useEffect(() => {
        if (user?.parishId) {
            setLoading(true);
            // CRITICAL: Update logic must run before rendering to ensure correct statuses
            // This function (defined in context) recalculates Active/Inactive status and Exit Dates
            actualizarEstadoParrocos(user.parishId);
            loadData();
            setLoading(false);
        }
    }, [user?.parishId]);

    const loadData = () => {
        // 1. Get raw list
        let parrocos = [...(getParrocos(user?.parishId) || [])];
        
        // 2. Sort Ascending (Oldest First) to calculate sequential codes
        parrocos.sort((a, b) => 
            new Date(a.fechaIngreso || a.fechaNombramiento || '1900-01-01') - 
            new Date(b.fechaIngreso || b.fechaNombramiento || '1900-01-01')
        );

        // 3. Assign Codes (0001, 0002, etc.) based on chronological order
        const withCodes = parrocos.map((p, index) => ({
            ...p,
            calculatedCode: String(index + 1).padStart(4, '0')
        }));

        // 4. Sort Descending (Newest First) for display
        const sortedForDisplay = withCodes.sort((a, b) => 
            new Date(b.fechaIngreso || b.fechaNombramiento || '1900-01-01') - 
            new Date(a.fechaIngreso || a.fechaNombramiento || '1900-01-01')
        );

        setItems(sortedForDisplay);
    };

    // --- Modal Handlers ---

    const handleCreate = (data) => {
        const result = addParroco(data, user?.parishId);
        if (result.success) {
            toast({ title: 'Éxito', description: 'Párroco agregado correctamente.', variant: 'success' });
            actualizarEstadoParrocos(user.parishId); // Re-run logic to update statuses
            loadData();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    const handleUpdate = (id, data) => {
        const result = updateParroco(id, data, user?.parishId);
        if (result.success) {
            toast({ title: 'Éxito', description: 'Párroco actualizado correctamente.', variant: 'success' });
            actualizarEstadoParrocos(user.parishId); // Re-run logic to update statuses
            loadData();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    const handleDelete = (id) => {
        const result = deleteParroco(id, user?.parishId);
        if (result.success) {
            toast({ title: 'Eliminado', description: 'Párroco eliminado correctamente.', variant: 'success' });
            actualizarEstadoParrocos(user.parishId); // Re-run logic to update statuses
            loadData();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    // --- UI Actions ---

    const openEditModal = (parroco) => {
        setSelectedParroco(parroco);
        setModals(prev => ({ ...prev, edit: true }));
    };

    const openDeleteModal = (parroco) => {
        setSelectedParroco(parroco);
        setModals(prev => ({ ...prev, delete: true }));
    };

    // --- Filter & Render ---

    const filteredItems = items.filter(i => 
        (i.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.apellido || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.calculatedCode || '').includes(searchTerm)
    );

    const headers = ["Código Da Fe", "Nombre", "Apellido", "Email", "Teléfono", "Fecha Ingreso", "Fecha Salida", "Estado"];

    if (!user) return <div className="p-4 text-center text-red-500">Sesión no iniciada</div>;
    if (loading) return <div className="p-8 text-center text-gray-500">Cargando párrocos...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Buscar por código, nombre o apellido..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500 font-medium hidden sm:block">
                        Total: <span className="text-[#111111] font-bold">{filteredItems.length}</span> registros
                    </div>
                    <Button 
                        onClick={() => setModals(prev => ({ ...prev, create: true }))} 
                        className="bg-[#4B7BA7] text-white hover:bg-[#3B6B97] gap-2"
                    >
                        <Plus className="w-4 h-4" /> Agregar Párroco
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs uppercase bg-[#D4AF37] text-[#111111] font-bold">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 bg-[#D4AF37] z-10 w-24 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Acciones</th>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="px-4 py-3 border-l border-[#C4A027]">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={headers.length + 1} className="px-6 py-12 text-center text-gray-500 italic">
                                        No hay párrocos registrados o que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, index) => {
                                    const isActive = item.estado === 1 || item.estado === 'Activo' || item.estado === '1';
                                    return (
                                        <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 sticky left-0 bg-white border-r border-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button 
                                                        onClick={() => openEditModal(item)}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(item)}
                                                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            {/* Nuevo campo Código Da Fe */}
                                            <td className="px-4 py-2 font-mono font-bold text-[#4B7BA7] bg-blue-50/50">
                                                {item.calculatedCode}
                                            </td>
                                            <td className="px-4 py-2 font-bold text-[#111111]">{item.nombre}</td>
                                            <td className="px-4 py-2 font-bold text-[#111111]">{item.apellido}</td>
                                            <td className="px-4 py-2 text-blue-600">{item.email}</td>
                                            <td className="px-4 py-2">{item.telefono}</td>
                                            <td className="px-4 py-2">{item.fechaIngreso || item.fechaNombramiento}</td>
                                            <td className="px-4 py-2">
                                                {isActive 
                                                    ? <span className="text-green-700 font-medium">{new Date().toISOString().split('T')[0]}</span> 
                                                    : <span className="text-gray-500">{item.fechaSalida}</span>}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isActive ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                        ACTIVO
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                        INACTIVO
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <CreateParrocoModal 
                isOpen={modals.create} 
                onClose={() => setModals(prev => ({ ...prev, create: false }))} 
                onCreate={handleCreate} 
            />

            <EditParrocoModal 
                isOpen={modals.edit} 
                onClose={() => setModals(prev => ({ ...prev, edit: false }))} 
                onUpdate={handleUpdate}
                parroco={selectedParroco}
            />

            <DeleteParrocoModal 
                isOpen={modals.delete} 
                onClose={() => setModals(prev => ({ ...prev, delete: false }))} 
                onDelete={handleDelete}
                parroco={selectedParroco}
            />
        </div>
    );
};

export default ParrocosList;

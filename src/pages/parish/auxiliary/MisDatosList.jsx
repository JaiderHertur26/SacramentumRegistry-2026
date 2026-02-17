import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Trash2, Search } from 'lucide-react';
import EditMisDatosModal from '@/components/modals/EditMisDatosModal';

const MisDatosList = () => {
    const { user } = useAuth();
    const { getMisDatosList, deleteMisDatos } = useAppData();
    const { toast } = useToast();

    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (user?.parishId) {
            loadData();
        }
    }, [user?.parishId, isEditModalOpen]); // Reload when modal closes

    const loadData = () => {
        setItems(getMisDatosList(user?.parishId) || []);
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const handleDelete = (item) => {
        if (window.confirm(`¿Está seguro de eliminar el registro de "${item.nombre}"? Esta acción no se puede deshacer.`)) {
            const result = deleteMisDatos(item.id, user?.parishId);
            if (result.success) {
                toast({ title: 'Eliminado', description: 'Registro eliminado exitosamente.', variant: 'success' });
                loadData();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        }
    };

    const filteredItems = items.filter(i => 
        (i.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.idcod || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const headers = [
        "Código", "Nombre", "NIT", "Región", "Dirección", "Ciudad", 
        "Teléfono", "Fax", "Email", "Vicaría", "Decanato", 
        "Diócesis", "Obispo", "Canciller", "Serial", "Ruta"
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Buscar por nombre o código..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    Total: <span className="text-[#111111] font-bold">{filteredItems.length}</span> registros
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs uppercase bg-[#D4AF37] text-[#111111] font-bold">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 bg-[#D4AF37] z-10 w-24">Acciones</th>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="px-4 py-3 border-l border-[#C4A027]">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={headers.length + 1} className="px-6 py-12 text-center text-gray-500 italic">
                                        No se encontraron registros. Importe datos desde Ajustes.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 sticky left-0 bg-white border-r border-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-gray-600">{item.idcod || '-'}</td>
                                        <td className="px-4 py-2 font-bold text-[#111111]">{item.nombre || '-'}</td>
                                        <td className="px-4 py-2">{item.nronit || '-'}</td>
                                        <td className="px-4 py-2">{item.region || '-'}</td>
                                        <td className="px-4 py-2 max-w-[200px] truncate" title={item.direccion}>{item.direccion || '-'}</td>
                                        <td className="px-4 py-2">{item.ciudad || '-'}</td>
                                        <td className="px-4 py-2">{item.telefono || '-'}</td>
                                        <td className="px-4 py-2">{item.nrofax || '-'}</td>
                                        <td className="px-4 py-2 text-blue-600">{item.email || '-'}</td>
                                        <td className="px-4 py-2">{item.vicaria || '-'}</td>
                                        <td className="px-4 py-2">{item.decanato || '-'}</td>
                                        <td className="px-4 py-2">{item.diocesis || '-'}</td>
                                        <td className="px-4 py-2">{item.obispo || '-'}</td>
                                        <td className="px-4 py-2">{item.canciller || '-'}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{item.serial || '-'}</td>
                                        <td className="px-4 py-2 font-mono text-xs max-w-[150px] truncate" title={item.ruta}>{item.ruta || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <EditMisDatosModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                data={selectedItem} 
            />
        </div>
    );
};

export default MisDatosList;
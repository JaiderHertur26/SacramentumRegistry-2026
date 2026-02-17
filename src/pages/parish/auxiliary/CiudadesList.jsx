
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

const CiudadesList = () => {
    const { user } = useAuth();
    // Utilizar métodos de AppData, importante pasar dioceseId
    const { getCiudadesList, addCiudad, updateCiudad, deleteCiudad } = useAppData();
    const { toast } = useToast();

    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({ 
        nombre: '', 
        source: '', 
        count: '', 
        weight: '',
        fechaCreacion: '',
        fechaActualizacion: '',
        usuario: ''
    });

    useEffect(() => {
        if (user) {
            // --- DEBUGGING START ---
            console.group("🔍 Debugging CiudadesList (Investigación de Carga)");
            console.log("👤 Usuario Contexto:", { 
                username: user.username, 
                dioceseId: user.dioceseId, 
                parishId: user.parishId 
            });

            // Escanear todas las claves de localStorage
            const allKeys = Object.keys(localStorage);
            const cityKeys = allKeys.filter(k => k.toLowerCase().includes('ciudad'));
            
            console.log(`🔑 Claves encontradas en localStorage (${cityKeys.length}):`, cityKeys);
            
            if (cityKeys.length === 0) {
                console.warn("⚠️ ALERTA: No se encontraron claves de ciudades en localStorage.");
            }

            cityKeys.forEach(key => {
                try {
                    const raw = localStorage.getItem(key);
                    const parsed = JSON.parse(raw);
                    console.log(`📦 Contenido de [${key}]:`, {
                        tipo: Array.isArray(parsed) ? 'Array' : typeof parsed,
                        cantidad: Array.isArray(parsed) ? parsed.length : 'N/A',
                        ejemplo: Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 'Vacío'
                    });
                } catch (e) {
                    console.error(`❌ Error leyendo clave [${key}]:`, e);
                }
            });
            console.groupEnd();
            // --- DEBUGGING END ---

            loadData();
        }
    }, [user]);

    const loadData = () => {
        if (!user) return;
        
        // 1. Intentar cargar con dioceseId (Estándar)
        let data = getCiudadesList(user.dioceseId);
        let source = 'diocese';

        // 2. Si no hay datos, intentar cargar con parishId (Fallback por si se importó mal)
        if ((!data || data.length === 0) && user.parishId) {
            const parishKey = `ciudades_${user.parishId}`;
            const parishDataRaw = localStorage.getItem(parishKey);
            if (parishDataRaw) {
                try {
                    const parishData = JSON.parse(parishDataRaw);
                    if (Array.isArray(parishData) && parishData.length > 0) {
                        console.warn(`⚠️ Cargando ciudades desde scope PARROQUIAL (${user.parishId}) porque el Diocesano está vacío.`);
                        data = parishData;
                        source = 'parish';
                    }
                } catch(e) {
                    console.error("Error parsing parish fallback data", e);
                }
            }
        }

        console.log(`📊 Ciudades cargadas en State: ${data.length} (Fuente: ${source})`);
        setItems(data);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setCurrentItem(item);
            setFormData({ ...item });
        } else {
            setCurrentItem(null);
            setFormData({ 
                nombre: '', 
                source: 'manual', 
                count: '0', 
                weight: '0',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                usuario: user?.username || 'sistema'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.nombre) {
            toast({ title: 'Error', description: 'El nombre es requerido.', variant: 'destructive' });
            return;
        }

        if (!user?.dioceseId) {
             toast({ title: 'Error', description: 'No se identificó la diócesis del usuario.', variant: 'destructive' });
             return;
        }

        // Siempre guardar en dioceseId para mantener el estándar, a menos que estemos en modo "parish only" forzado
        // Por ahora usamos la lógica del context que guarda en el ID pasado.
        const contextId = user.dioceseId; 

        let result;
        if (currentItem) {
            result = updateCiudad(currentItem.id, formData, contextId);
        } else {
            result = addCiudad(formData, contextId);
        }

        if (result.success) {
             toast({ title: 'Éxito', description: result.message, className: "bg-green-50 border-green-200 text-green-900" });
             setIsModalOpen(false);
             loadData();
        } else {
             toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    const handleDelete = (item) => {
        if (!user?.dioceseId) return;

        if (window.confirm('¿Está seguro de eliminar esta ciudad?')) {
            deleteCiudad(item.id, user.dioceseId);
            toast({ title: 'Eliminado', description: 'Registro eliminado exitosamente.', className: "bg-green-50 border-green-200 text-green-900" });
            loadData();
        }
    };

    const filteredItems = items.filter(i => (i.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const headers = ["Nombre", "Fuente", "Contador", "Peso", "Fecha Creación", "Usuario"];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Buscar ciudad..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500 font-medium hidden sm:block">
                        Total: <span className="text-[#111111] font-bold">{filteredItems.length}</span> registros
                    </div>
                    <Button onClick={() => handleOpenModal()} className="bg-[#4B7BA7] text-white gap-2">
                        <Plus className="w-4 h-4" /> Agregar Ciudad
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
                                        No hay ciudades registradas para esta diócesis. 
                                        {/* Hint for user in UI */}
                                        <br/><span className="text-xs text-gray-400">Verifique la consola (F12) para detalles de depuración.</span>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 sticky left-0 bg-white border-r border-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center gap-1 justify-center">
                                                <button 
                                                    onClick={() => handleOpenModal(item)}
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
                                        <td className="px-4 py-2 font-bold text-[#111111]">{item.nombre}</td>
                                        <td className="px-4 py-2">{item.source}</td>
                                        <td className="px-4 py-2 font-mono">{item.count}</td>
                                        <td className="px-4 py-2 font-mono">{item.weight}</td>
                                        <td className="px-4 py-2">{item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-2">{item.usuario}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentItem ? 'Editar Ciudad' : 'Nueva Ciudad'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Nombre *</label>
                        <Input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Fuente</label>
                            <Input value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Contador</label>
                            <Input type="number" value={formData.count} onChange={e => setFormData({...formData, count: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Peso</label>
                            <Input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Usuario</label>
                            <Input value={formData.usuario} onChange={e => setFormData({...formData, usuario: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-[#4B7BA7] text-white">Guardar</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CiudadesList;

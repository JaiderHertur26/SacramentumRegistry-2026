import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { 
    Search, 
    Printer, 
    Eye,
    Baby, 
    Flame, 
    Heart, 
    BookOpen, 
    Calendar,
    FileText,
    Loader2
} from 'lucide-react';

const PartidasSearchPage = () => {
    const { user } = useAuth();
    const { getBaptisms, getConfirmations, getMatrimonios } = useAppData();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('bautismo');
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.parishId) {
            loadData();
        }
    }, [user?.parishId, activeTab]);

    const loadData = () => {
        setLoading(true);
        // Pequeño delay simulado para suavizar la transición de UI
        setTimeout(() => {
            let results = [];
            if (activeTab === 'bautismo') {
                results = getBaptisms(user.parishId) || [];
            } else if (activeTab === 'confirmacion') {
                results = getConfirmations(user.parishId) || [];
            } else if (activeTab === 'matrimonio') {
                results = getMatrimonios(user.parishId) || [];
            }
            
            // Ordenar por fecha de creación o celebración (más reciente primero)
            results.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.fechaCelebracion || 0);
                const dateB = new Date(b.createdAt || b.fechaCelebracion || 0);
                return dateB - dateA;
            });
            
            setData(results);
            setLoading(false);
        }, 300);
    };

    const getFilteredData = () => {
        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        
        return data.filter(item => {
            // Búsqueda por referencia (Libro/Folio/Número)
            const book = String(item.book_number || item.libro || '').toLowerCase();
            const page = String(item.page_number || item.folio || '').toLowerCase();
            const entry = String(item.entry_number || item.numero || '').toLowerCase();
            
            if (book.includes(lowerTerm) || page.includes(lowerTerm) || entry.includes(lowerTerm)) return true;

            // Búsqueda por Nombres
            if (activeTab === 'matrimonio') {
                const husband = (item.esposo?.nombres || item.esposoNombre || item.husbandName || '').toLowerCase();
                const wife = (item.esposa?.nombres || item.esposaNombre || item.wifeName || item.spouseName || '').toLowerCase();
                return husband.includes(lowerTerm) || wife.includes(lowerTerm);
            } else {
                const name = (item.nombres || item.firstName || item.nombre || '').toLowerCase();
                const surname = (item.apellidos || item.lastName || item.apellido || '').toLowerCase();
                const fullname = `${name} ${surname}`;
                return name.includes(lowerTerm) || surname.includes(lowerTerm) || fullname.includes(lowerTerm);
            }
        });
    };

    const filteredItems = getFilteredData();

    const handleAction = (id, action) => {
        // Navegación a las vistas de detalle existentes
        const routeBase = `/parroquia/${activeTab}`; // ej: /parroquia/bautismo
        navigate(`${routeBase}/${id}`);
    };

    const tabs = [
        { id: 'bautismo', label: 'Bautismo', icon: Baby, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'confirmacion', label: 'Confirmación', icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
        { id: 'matrimonio', label: 'Matrimonio', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' }
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Archivo Sacramental</h1>
                    <p className="text-gray-500 mt-1">Consulta, gestión e impresión de partidas centralizada.</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200
                                ${activeTab === tab.id 
                                    ? 'bg-[#4B7BA7] text-white shadow-md' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }
                            `}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Section */}
            <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                    type="text"
                    placeholder={`Buscar en ${tabs.find(t => t.id === activeTab)?.label}... (Nombre, Apellido, Libro, Folio)`}
                    className="pl-11 h-14 text-lg shadow-sm border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4B7BA7]/20 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Results Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Resultados encontrados
                    </h2>
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-bold border border-[#D4AF37]/20">
                        {filteredItems.length} registros
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center items-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No se encontraron resultados</h3>
                        <p className="text-gray-500 mt-1">Intenta con otro término de búsqueda o cambia de sacramento.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Referencia</th>
                                    <th className="px-6 py-4">
                                        {activeTab === 'matrimonio' ? 'Esposos' : 'Titular'}
                                    </th>
                                    <th className="px-6 py-4">Fecha Celebración</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tabs.find(t => t.id === activeTab)?.bg}`}>
                                                    <BookOpen className={`w-4 h-4 ${tabs.find(t => t.id === activeTab)?.color}`} />
                                                </div>
                                                <div>
                                                    <div className="font-mono text-xs text-gray-500">
                                                        L:{item.book_number || item.libro} • F:{item.page_number || item.folio} • N:{item.entry_number || item.numero}
                                                    </div>
                                                    {item.status === 'anulada' && (
                                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold">
                                                            ANULADA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {activeTab === 'matrimonio' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">
                                                        {item.esposo?.nombres || item.esposoNombre || item.husbandName || 'Esposo Desconocido'}
                                                    </span>
                                                    <span className="text-gray-500 text-xs flex items-center gap-1">
                                                        & <Heart className="w-3 h-3 text-pink-400" />
                                                        {item.esposa?.nombres || item.esposaNombre || item.wifeName || item.spouseName || 'Esposa Desconocida'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="font-bold text-gray-900">
                                                        {item.nombres || item.firstName || item.nombre} {item.apellidos || item.lastName || item.apellido}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {item.fechaCelebracion || item.sacramentDate || item.createdAt?.split('T')[0]}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                    onClick={() => handleAction(item.id, 'view')}
                                                    title="Ver Detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 gap-2 bg-[#D4AF37] hover:bg-[#C4A027] text-[#111111] font-bold border border-[#B49017]"
                                                    onClick={() => handleAction(item.id, 'print')}
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Imprimir</span>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartidasSearchPage;
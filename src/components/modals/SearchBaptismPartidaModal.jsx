
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/ui/Table';

const SearchBaptismPartidaModal = ({ isOpen, onClose, onSelectPartida }) => {
    const { user } = useAuth();
    const { getBaptisms, getMisDatosList } = useAppData();
    
    // Search Criteria State
    const [criteria, setCriteria] = useState({
        nombre: '',
        libro: '',
        folio: '',
        numero: ''
    });

    // Results State
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = () => {
        setIsLoading(true);
        setHasSearched(true);
        
        // Simulate network delay for UX and processing
        setTimeout(() => {
            const parishId = user?.parishId || user?.dioceseId;
            const allBaptisms = getBaptisms(parishId);
            
            const filtered = allBaptisms.filter(record => {
                const fullName = `${record.nombres || record.firstName || ''} ${record.apellidos || record.lastName || ''}`.toLowerCase();
                const searchName = criteria.nombre.toLowerCase();
                
                const matchName = !criteria.nombre || fullName.includes(searchName);
                
                // Flexible matching for numbers (exact match if provided)
                const matchLibro = !criteria.libro || String(record.book_number) === String(criteria.libro);
                const matchFolio = !criteria.folio || String(record.page_number) === String(criteria.folio);
                const matchNumero = !criteria.numero || String(record.entry_number) === String(criteria.numero);

                return matchName && matchLibro && matchFolio && matchNumero;
            });

            setResults(filtered);
            setIsLoading(false);
        }, 300);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCriteria(prev => ({ ...prev, [name]: value }));
    };

    const clearSearch = () => {
        setCriteria({ nombre: '', libro: '', folio: '', numero: '' });
        setResults([]);
        setHasSearched(false);
    };

    // Modified Selection Handler to format the church/city string
    const handleSelectRow = (row) => {
        // Extract church from the record
        const church = row.iglesia || row.church || row.lugarBautismo || 'Iglesia Desconocida';
        
        // Extract city from logged-in user's Mis Datos
        let city = '';
        if (user?.parishId) {
             const misDatos = getMisDatosList(user.parishId);
             if (misDatos && misDatos.length > 0) {
                 city = misDatos[0].ciudad || '';
             }
        }

        // Fallback to row city if misDatos city is missing
        if (!city) {
            city = row.ciudad || row.city || row.municipio || '';
        }
        
        // Format as "CHURCH_NAME - CITY_NAME" in uppercase
        let formattedLocation = church.trim().toUpperCase();
        if (city && city.trim()) {
            formattedLocation = `${formattedLocation} - ${city.trim().toUpperCase()}`;
        }

        // Create a processed object to pass back, ensuring lugarBautismo is the formatted string
        const processedPartida = {
            ...row,
            lugarBautismo: formattedLocation
        };

        onSelectPartida(processedPartida);
    };

    // Columns matching the requested format: Empty Selection, Name, Date
    const columns = [
        {
            header: '', // Empty selection column header
            className: 'w-16 text-center', // Fixed small width
            render: (row) => (
                <div className="flex justify-center items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-[#4B7BA7] group-hover:border-[#4B7BA7] transition-all cursor-pointer">
                        <CheckCircle2 className="w-5 h-5 text-gray-300 group-hover:text-white" />
                    </div>
                </div>
            )
        },
        {
            header: 'APELLIDO Y NOMBRE',
            className: 'w-full', // Take remaining space
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 uppercase">
                        {row.apellidos || row.lastName} {row.nombres || row.firstName}
                    </span>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                        L:{row.book_number} F:{row.page_number} N:{row.entry_number}
                    </div>
                </div>
            )
        },
        {
            header: 'FECHA DE BAUTISMO',
            className: 'whitespace-nowrap min-w-[150px]',
            render: (row) => (
                <span className="text-gray-600 font-medium">
                    {row.fechaBautismo || row.sacramentDate || row.celebrationDate || '-'}
                </span>
            )
        }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="bg-[#4B7BA7] p-4 flex justify-between items-center shrink-0">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Buscar Partida de Bautismo
                        </h2>
                        <button 
                            onClick={onClose} 
                            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Search Form */}
                    <div className="p-6 bg-gray-50 border-b border-gray-200 shrink-0">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre / Apellidos</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={criteria.nombre}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Buscar por nombre..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Libro</label>
                                <input
                                    type="text"
                                    name="libro"
                                    value={criteria.libro}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Folio</label>
                                <input
                                    type="text"
                                    name="folio"
                                    value={criteria.folio}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número</label>
                                <input
                                    type="text"
                                    name="numero"
                                    value={criteria.numero}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                                <Button 
                                    onClick={handleSearch} 
                                    disabled={isLoading}
                                    className="bg-[#4B7BA7] hover:bg-[#3a5f8a] text-white w-full font-bold"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                                    Buscar
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Results Table Area */}
                    <div className="flex-1 overflow-auto bg-white relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                                <Loader2 className="w-10 h-10 text-[#4B7BA7] animate-spin mb-3" />
                                <span className="text-[#4B7BA7] font-medium">Buscando registros...</span>
                            </div>
                        ) : null}

                        {results.length > 0 ? (
                            <Table 
                                columns={columns}
                                data={results}
                                onRowClick={handleSelectRow}
                                className="w-full"
                            />
                        ) : (
                            !isLoading && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                                    {hasSearched ? (
                                        <>
                                            <span className="text-lg font-semibold text-gray-400 mb-1">Sin resultados</span>
                                            <p className="text-sm">No se encontraron partidas con los criterios ingresados.</p>
                                            <Button variant="link" onClick={clearSearch} className="mt-2 text-[#4B7BA7]">
                                                Limpiar búsqueda
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-12 h-12 text-gray-300 mb-2 opacity-50" />
                                            <p className="opacity-70">Ingrese criterios para buscar una partida</p>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center shrink-0">
                         <span className="text-xs text-gray-500 font-medium">
                            {results.length > 0 ? `${results.length} registros encontrados` : ''}
                         </span>
                        <Button variant="outline" onClick={onClose} className="border-gray-300 hover:bg-gray-100">
                            Cerrar Ventana
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SearchBaptismPartidaModal;

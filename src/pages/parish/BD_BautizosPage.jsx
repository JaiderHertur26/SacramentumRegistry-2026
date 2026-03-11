import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/use-toast';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { 
    Search, Plus, Edit, Trash2, Eye, 
    AlertCircle, Loader2, Database, BookOpen, Clock, ArrowUpDown
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const BD_BautizosPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // --- CORRECCIÓN: Importamos generarNotaAlMargenEstandar ---
    const { getBaptisms, getPendingBaptisms, generarNotaAlMargenEstandar } = useAppData();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [pendingRecords, setPendingRecords] = useState([]);
    const [permanentRecords, setPermanentRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'baptismDate', direction: 'desc' });

    // Modals State
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [deleteConfig, setDeleteConfig] = useState({
        isOpen: false,
        recordId: null,
        type: null,
        recordName: ''
    });

    const parishId = user?.parishId;

    const loadData = async () => {
        if (!parishId) return;
        setLoading(true);
        setError(null);
        try {
            const pending = await getPendingBaptisms(parishId);
            const permanent = getBaptisms(parishId);
            
            setPendingRecords(Array.isArray(pending) ? pending : []);
            setPermanentRecords(Array.isArray(permanent) ? permanent : []);
        } catch (err) {
            console.error("Error loading baptisms:", err);
            setError("Ocurrió un error al cargar los registros. Por favor, intente nuevamente.");
            toast({
                title: "Error de carga",
                description: "No se pudieron cargar los registros de bautismo.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [parishId]);

    // Robust Date Formatter to DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString) return '---';
        try {
            if (dateString.includes('T')) {
                const parsed = parseISO(dateString);
                if (isValid(parsed)) return format(parsed, 'dd/MM/yyyy');
            }
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [y, m, d] = dateString.split('-');
                return `${d}/${m}/${y}`;
            }
            if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString;
            
            const parsed = new Date(dateString);
            if (isValid(parsed)) return format(parsed, 'dd/MM/yyyy');
            
            return dateString;
        } catch (e) {
            return dateString;
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ label, sortKey }) => (
        <div 
            onClick={() => handleSort(sortKey)} 
            className="flex items-center gap-1 cursor-pointer hover:text-blue-700 transition-colors select-none"
        >
            {label}
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
    );

    // LECTORES BLINDADOS AL ESTÁNDAR UNIFICADO
    const getNames = (r) => `${r.apellidos || r.lastName || ''}, ${r.nombres || r.firstName || ''}`.trim().replace(/^,|,$/g, '').trim();
    const getFather = (r) => r.nombrePadre || r.padre || r.fatherName || '';
    const getMother = (r) => r.nombreMadre || r.madre || r.motherName || '';
    const getParents = (r) => {
        const father = getFather(r);
        const mother = getMother(r);
        if (father && mother) return `${father} / ${mother}`;
        if (father) return father;
        if (mother) return mother;
        return '---';
    };
    
    const getBaptismDate = (r) => r.fechaSacramento || r.sacramentDate || r.baptismDate || r.fecbau || '';
    const getBirthDate = (r) => r.fechaNacimiento || r.birthDate || r.fecnac || '';
    const getMinister = (r) => r.ministro || r.minister || '---';

    const filterRecords = (records) => {
        if (!searchTerm) return records;
        const term = searchTerm.toLowerCase();
        return records.filter(r => {
            const fullName = getNames(r).toLowerCase();
            const padre = getFather(r).toLowerCase();
            const madre = getMother(r).toLowerCase();
            const bookInfo = `${r.book_number || r.libro || ''}:${r.page_number || r.folio || ''}:${r.entry_number || r.numero || ''}`.toLowerCase();
            const dateBaut = getBaptismDate(r);
            
            return fullName.includes(term) || 
                   padre.includes(term) || 
                   madre.includes(term) || 
                   bookInfo.includes(term) ||
                   dateBaut.includes(term);
        });
    };

    const filteredPending = useMemo(() => filterRecords(pendingRecords), [pendingRecords, searchTerm]);
    const filteredPermanent = useMemo(() => filterRecords(permanentRecords), [permanentRecords, searchTerm]);

    const sortedPermanent = useMemo(() => {
        let items = [...filteredPermanent];
        if (sortConfig.key) {
            items.sort((a, b) => {
                let aVal = '';
                let bVal = '';
                
                if (sortConfig.key === 'archivo') {
                    aVal = `${(a.book_number || a.libro || '0').toString().padStart(5, '0')}-${(a.page_number || a.folio || '0').toString().padStart(5, '0')}-${(a.entry_number || a.numero || '0').toString().padStart(5, '0')}`;
                    bVal = `${(b.book_number || b.libro || '0').toString().padStart(5, '0')}-${(b.page_number || b.folio || '0').toString().padStart(5, '0')}-${(b.entry_number || b.numero || '0').toString().padStart(5, '0')}`;
                } else if (sortConfig.key === 'bautizado') {
                    aVal = getNames(a);
                    bVal = getNames(b);
                } else if (sortConfig.key === 'baptismDate') {
                    aVal = getBaptismDate(a);
                    bVal = getBaptismDate(b);
                } else if (sortConfig.key === 'birthDate') {
                    aVal = getBirthDate(a);
                    bVal = getBirthDate(b);
                } else {
                    aVal = a[sortConfig.key] || '';
                    bVal = b[sortConfig.key] || '';
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredPermanent, sortConfig]);

    const handleDeleteClick = (record, type) => {
        const name = getNames(record) || 'Registro sin nombre';
        setDeleteConfig({
            isOpen: true,
            recordId: record.id,
            type,
            recordName: name
        });
    };

    const confirmDelete = async () => {
        if (!parishId || !deleteConfig.recordId) return;

        try {
            const storageKey = deleteConfig.type === 'pending' 
                ? `pendingBaptisms_${parishId}` 
                : `baptisms_${parishId}`;
            
            const currentRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updatedRecords = currentRecords.filter(r => r.id !== deleteConfig.recordId);
            
            localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
            
            toast({
                title: "Registro eliminado",
                description: `El registro de ${deleteConfig.recordName} ha sido eliminado exitosamente.`,
                className: "bg-green-50 border-green-200 text-green-900"
            });
            
            loadData();
        } catch (err) {
            toast({
                title: "Error",
                description: "No se pudo eliminar el registro.",
                variant: "destructive"
            });
        } finally {
            setDeleteConfig({ isOpen: false, recordId: null, type: null, recordName: '' });
        }
    };

    const pendingColumns = [
        { header: 'Nombres', accessor: 'nombres', render: (row) => row.nombres || row.firstName || '-' },
        { header: 'Apellidos', accessor: 'apellidos', render: (row) => row.apellidos || row.lastName || '-' },
        { header: 'Fecha Bautismo', accessor: 'baptismDate', render: (row) => formatDate(getBaptismDate(row)) }
    ];

    const permanentColumns = [
        { 
            header: <SortableHeader label="Archivo" sortKey="archivo" />, 
            accessor: 'archivo', 
            render: (row) => <span className="font-mono font-bold text-gray-700">{row.book_number || row.libro || '-'}:{row.page_number || row.folio || '-'}:{row.entry_number || row.numero || '-'}</span> 
        },
        { 
            header: <SortableHeader label="Bautizado" sortKey="bautizado" />, 
            accessor: 'bautizado', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className={`font-bold ${row.isAnnulled || row.status === 'anulada' ? 'text-red-500 line-through' : 'text-gray-900'}`}>
                        {getNames(row) || '---'}
                    </span>
                </div>
            ) 
        },
        { 
            header: <SortableHeader label="Nacimiento" sortKey="birthDate" />, 
            accessor: 'birthDate', 
            render: (row) => formatDate(getBirthDate(row)) 
        },
        { 
            header: <SortableHeader label="Bautismo" sortKey="baptismDate" />, 
            accessor: 'baptismDate', 
            render: (row) => formatDate(getBaptismDate(row)) 
        },
        { 
            header: 'Padres', 
            accessor: 'padres', 
            render: (row) => {
                const p = getParents(row);
                return (
                    <div className="max-w-[180px] truncate" title={p}>
                        {p}
                    </div>
                );
            } 
        },
        { 
            header: 'Ministro', 
            accessor: 'ministro', 
            render: (row) => {
                const m = getMinister(row);
                return (
                    <div className="max-w-[150px] truncate" title={m}>
                        {m}
                    </div>
                );
            } 
        }
    ];

    const DetailValue = ({ label, value }) => (
        <div>
            <div className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</div>
            <div className="text-sm text-gray-900 font-medium whitespace-pre-wrap">{value || '---'}</div>
        </div>
    );

    const DetailSectionHeader = ({ title }) => (
        <h4 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider py-3 border-b-2 border-gray-100 mb-4 mt-6 first:mt-0">
            {title}
        </h4>
    );

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Database className="w-6 h-6 text-[#4B7BA7]" />
                            Base de Datos de Bautismos
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Gestione los registros sacramentales temporales y permanentes de su parroquia.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button 
                            onClick={() => navigate('/parroquia/bautismo/nuevo')}
                            className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Registro
                        </Button>
                        <Button 
                            onClick={() => navigate('/parroquia/bautismo/sentar-registros')}
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <BookOpen className="w-4 h-4 mr-2 text-amber-600" />
                            Sentar Registros
                        </Button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="relative max-w-2xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Buscar por nombres, apellidos, padres o archivo (Ej: 1:12:45)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 py-6 text-base bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center gap-3 border border-red-100">
                        <AlertCircle className="w-6 h-6" />
                        <p className="font-medium">{error}</p>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <Loader2 className="w-10 h-10 text-[#4B7BA7] animate-spin mb-4" />
                        <p className="text-gray-500 font-medium">Cargando registros...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <Tabs defaultValue="permanentes" className="w-full">
                            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                                <TabsList className="bg-gray-200/50 p-1">
                                    <TabsTrigger value="permanentes" className="data-[state=active]:bg-white data-[state=active]:text-[#4B7BA7] data-[state=active]:shadow-sm rounded-md px-6 py-2 transition-all font-medium">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            Permanentes
                                            <span className="bg-gray-100 text-gray-600 text-xs py-0.5 px-2 rounded-full ml-1 font-semibold">
                                                {sortedPermanent.length}
                                            </span>
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger value="temporales" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-md px-6 py-2 transition-all font-medium">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Temporales
                                            <span className="bg-amber-100 text-amber-700 text-xs py-0.5 px-2 rounded-full ml-1 font-semibold">
                                                {filteredPending.length}
                                            </span>
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-0">
                                <TabsContent value="permanentes" className="m-0 border-none outline-none">
                                    {sortedPermanent.length === 0 ? (
                                        <div className="text-center py-16 px-4">
                                            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay registros permanentes</h3>
                                            <p className="text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados para su búsqueda.' : 'Aún no hay bautismos asentados en los libros.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table 
                                                columns={permanentColumns} 
                                                data={sortedPermanent}
                                                actions={[
                                                    {
                                                        label: 'Ver Detalle',
                                                        icon: <Eye className="w-4 h-4" />,
                                                        onClick: (row) => setSelectedRecord(row),
                                                        className: "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                                                        title: "Ver detalles completos"
                                                    },
                                                    {
                                                        label: 'Editar',
                                                        icon: <Edit className="w-4 h-4" />,
                                                        onClick: (row) => navigate(`/parroquia/bautismo/editar?id=${row.id}`),
                                                        className: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
                                                        title: "Editar registro"
                                                    },
                                                    {
                                                        label: 'Eliminar',
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: (row) => handleDeleteClick(row, 'permanent'),
                                                        className: "text-red-600 hover:text-red-800 hover:bg-red-50",
                                                        title: "Eliminar registro"
                                                    }
                                                ]}
                                            />
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="temporales" className="m-0 border-none outline-none">
                                    {filteredPending.length === 0 ? (
                                        <div className="text-center py-16 px-4">
                                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay registros temporales</h3>
                                            <p className="text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados para su búsqueda.' : 'No hay bautismos pendientes por asentar.'}
                                            </p>
                                            {!searchTerm && (
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => navigate('/parroquia/bautismo/nuevo')}
                                                    className="mt-4"
                                                >
                                                    Crear registro temporal
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table 
                                                columns={pendingColumns} 
                                                data={filteredPending}
                                                actions={[
                                                    {
                                                        label: 'Editar',
                                                        icon: <Edit className="w-4 h-4" />,
                                                        onClick: (row) => navigate(`/parroquia/bautismo/editar?id=${row.id}`),
                                                        className: "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                    },
                                                    {
                                                        label: 'Eliminar',
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: (row) => handleDeleteClick(row, 'pending'),
                                                        className: "text-red-600 hover:text-red-800 hover:bg-red-50"
                                                    }
                                                ]}
                                            />
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <Modal 
                isOpen={!!selectedRecord} 
                onClose={() => setSelectedRecord(null)} 
                title={<div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#4B7BA7]"/> Detalles del Registro de Bautismo</div>}
            >
                {selectedRecord && (
                    <div className="space-y-2 pb-6">
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                            <h3 className={`text-lg font-bold ${selectedRecord.isAnnulled || selectedRecord.status === 'anulada' ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                                {getNames(selectedRecord)}
                            </h3>
                            <div className="text-sm text-gray-500 font-mono mt-1">
                                ID: {selectedRecord.id}
                            </div>
                        </div>

                        {/* Sección 1: Datos del Registro */}
                        <DetailSectionHeader title="Sección 1: Datos del Registro" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <DetailValue label="Libro" value={selectedRecord.book_number || selectedRecord.libro} />
                            <DetailValue label="Folio" value={selectedRecord.page_number || selectedRecord.folio} />
                            <DetailValue label="Número / Acta" value={selectedRecord.entry_number || selectedRecord.numero} />
                            
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Indicador de Decreto</span>
                                {selectedRecord.isAnnulled || selectedRecord.status === 'anulada' ? (
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200" title={`Decreto: ${selectedRecord.annulmentDecree || 'S/N'}`}>
                                        SÍ (ANULADA POR DECRETO)
                                    </span>
                                ) : selectedRecord.isSupplementary || selectedRecord.correctionDecreeRef ? (
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200" title={`Decreto: ${selectedRecord.correctionDecreeRef || 'S/N'}`}>
                                        SÍ (CREADA POR DECRETO)
                                    </span>
                                ) : (
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                                        NO
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Sección 2: Datos del Bautizado */}
                        <DetailSectionHeader title="Sección 2: Datos del Bautizado" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <DetailValue label="Apellidos" value={selectedRecord.apellidos || selectedRecord.lastName} />
                            <DetailValue label="Nombres" value={selectedRecord.nombres || selectedRecord.firstName} />
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Sexo</span>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    String(selectedRecord.sexo || selectedRecord.sex).toUpperCase().includes('MASC') || String(selectedRecord.sexo) === '1' ? 'bg-blue-100 text-blue-800' : 
                                    String(selectedRecord.sexo || selectedRecord.sex).toUpperCase().includes('FEM') || String(selectedRecord.sexo) === '2' ? 'bg-pink-100 text-pink-800' : 
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {String(selectedRecord.sexo || selectedRecord.sex).toUpperCase().includes('MASC') || String(selectedRecord.sexo) === '1' ? 'MASCULINO' : 
                                     String(selectedRecord.sexo || selectedRecord.sex).toUpperCase().includes('FEM') || String(selectedRecord.sexo) === '2' ? 'FEMENINO' : 'NO ESPECIFICADO'}
                                </span>
                            </div>
                            <DetailValue label="Fecha Nacimiento" value={formatDate(getBirthDate(selectedRecord))} />
                            <div className="md:col-span-2">
                                <DetailValue label="Lugar Nacimiento" value={selectedRecord.lugarNacimiento || selectedRecord.lugarNacimientoDetalle || selectedRecord.birthPlace || selectedRecord.lugnac || selectedRecord.lugarn} />
                            </div>
                        </div>

                        {/* Sección 3: Datos del Bautismo */}
                        <DetailSectionHeader title="Sección 3: Datos del Bautismo" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <DetailValue label="Fecha Bautismo" value={formatDate(getBaptismDate(selectedRecord))} />
                            <DetailValue label="Ministro" value={getMinister(selectedRecord)} />
                            <div className="md:col-span-2">
                                <DetailValue label="Lugar Bautismo" value={selectedRecord.lugarBautismo || selectedRecord.lugarBautismoDetalle || selectedRecord.sacramentPlace || selectedRecord.lugbau} />
                            </div>
                        </div>

                        {/* Sección 4: Datos de los Padres */}
                        <DetailSectionHeader title="Sección 4: Datos de los Padres" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <DetailValue label="Nombre Padre" value={getFather(selectedRecord)} />
                            <DetailValue label="Cédula Padre" value={selectedRecord.cedulaPadre || selectedRecord.fatherId || selectedRecord.cedupad} />
                            <DetailValue label="Nombre Madre" value={getMother(selectedRecord)} />
                            <DetailValue label="Cédula Madre" value={selectedRecord.cedulaMadre || selectedRecord.motherId || selectedRecord.cedumad} />
                            <div className="md:col-span-2">
                                <DetailValue label="Tipo de Unión de Padres" value={
                                    selectedRecord.tipoUnionPadres === 1 || String(selectedRecord.tipoUnionPadres) === '1' ? 'MATRIMONIO CATÓLICO' :
                                    selectedRecord.tipoUnionPadres === 2 || String(selectedRecord.tipoUnionPadres) === '2' ? 'MATRIMONIO CIVIL' :
                                    selectedRecord.tipoUnionPadres === 3 || String(selectedRecord.tipoUnionPadres) === '3' ? 'UNIÓN LIBRE' :
                                    selectedRecord.tipoUnionPadres === 4 || String(selectedRecord.tipoUnionPadres) === '4' ? 'MADRE SOLTERA' :
                                    selectedRecord.tipoUnionPadres === 5 || String(selectedRecord.tipoUnionPadres) === '5' ? 'OTRO' :
                                    selectedRecord.tipoUnionPadres || selectedRecord.tipohijo || '---'
                                } />
                            </div>
                        </div>

                        {/* Sección 5: Abuelos y Padrinos */}
                        <DetailSectionHeader title="Sección 5: Abuelos y Padrinos" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <DetailValue label="Abuelos Paternos" value={selectedRecord.abuelosPaternos || selectedRecord.paternalGrandparents || selectedRecord.abuepat} />
                            <DetailValue label="Abuelos Maternos" value={selectedRecord.abuelosMaternos || selectedRecord.maternalGrandparents || selectedRecord.abuemat} />
                            <div className="md:col-span-2">
                                <DetailValue label="Padrinos" value={selectedRecord.padrinos || selectedRecord.godparents} />
                            </div>
                        </div>

                        {/* Sección 6: Datos Legales y Registro Civil */}
                        <DetailSectionHeader title="Sección 6: Datos Legales y Registro Civil" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <DetailValue label="Da Fe / Firma Responsable" value={selectedRecord.daFe || selectedRecord.ministerFaith || selectedRecord.dafe} />
                            <DetailValue label="Serial Registro Civil" value={selectedRecord.serialRegistro || selectedRecord.registrySerial || selectedRecord.regciv} />
                            <DetailValue label="NUIP / NUIT" value={selectedRecord.nuip} />
                            <DetailValue label="Oficina Registro" value={selectedRecord.oficinaRegistro || selectedRecord.registryOffice || selectedRecord.notaria} />
                            <DetailValue label="Fecha Expedición" value={formatDate(selectedRecord.fechaExpedicionRegistro || selectedRecord.registryDate || selectedRecord.fecregis)} />
                        </div>

                        {/* --- CORRECCIÓN SECCIÓN 7: INYECCIÓN DE NOTA ESTÁNDAR CON FECHA EN LETRAS --- */}
                        <DetailSectionHeader title="Sección 7: Notas Marginales y Observaciones" />
                        <div className={`p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap ${
                            selectedRecord.isAnnulled || selectedRecord.status === 'anulada' 
                                ? 'bg-red-50 border-red-200 text-red-900' 
                                : selectedRecord.isSupplementary || selectedRecord.correctionDecreeRef 
                                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                                    : 'bg-yellow-50 border-yellow-200 text-yellow-900'
                        }`}>
                            {(() => {
                                // 1. Buscamos si la partida tiene una nota especial guardada
                                const savedNote = selectedRecord.notaMarginal || selectedRecord.marginNote || selectedRecord.notaAlMargen || selectedRecord.observaciones || selectedRecord.observations || selectedRecord.notes;
                                if (savedNote) return savedNote;
                                
                                // 2. Si no tiene nota especial y es una partida NORMAL (no anulada ni supletoria), inyectamos la estándar CON LETRAS
                                if (!selectedRecord.isAnnulled && !selectedRecord.isSupplementary && !selectedRecord.correctionDecreeRef) {
                                    
                                    // TRADUCTOR DE FECHA DE HOY A LETRAS
                                    const getFechaHoyLetras = () => {
                                        const date = new Date();
                                        const dia = date.getDate();
                                        const mes = date.getMonth() + 1;
                                        const anio = date.getFullYear();

                                        const dias = ['UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE', 'TREINTA', 'TREINTA Y UN'];
                                        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

                                        const getAnioLetras = (year) => {
                                            if (year === 2000) return 'DOS MIL';
                                            const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
                                            const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
                                            const veintes = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
                                            const decenas = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
                                            const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

                                            let res = '';
                                            const miles = Math.floor(year / 1000);
                                            if (miles === 1) res += 'MIL ';
                                            else if (miles === 2) res += 'DOS MIL ';

                                            const restMiles = year % 1000;
                                            const cents = Math.floor(restMiles / 100);
                                            if (cents > 0) res += centenas[cents] + ' ';

                                            const decUnits = restMiles % 100;
                                            if (decUnits > 0) {
                                                if (decUnits < 10) res += unidades[decUnits];
                                                else if (decUnits < 20) res += especiales[decUnits - 10];
                                                else if (decUnits < 30) res += veintes[decUnits - 20];
                                                else {
                                                    const d = Math.floor(decUnits / 10);
                                                    const u = decUnits % 10;
                                                    res += decenas[d];
                                                    if (u > 0) res += ' Y ' + unidades[u];
                                                }
                                            }
                                            return res.trim();
                                        };

                                        return `${dias[dia - 1] || dia} DE ${meses[mes - 1] || mes} DE ${getAnioLetras(anio)}`;
                                    };

                                    const stdNoteTemplate = generarNotaAlMargenEstandar(parishId);
                                    const todayStrLetras = getFechaHoyLetras();
                                    return stdNoteTemplate.replace('[FECHA_EXPEDICION]', todayStrLetras);
                                }
                                
                                return '--- SIN NOTAS MARGINALES ---';
                            })()}
                        </div>

                        {/* Modal Actions */}
                        <div className="pt-6 mt-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                                Cerrar
                            </Button>
                            <Button 
                                className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white"
                                onClick={() => navigate(`/parroquia/bautismo/editar?id=${selectedRecord.id}`)}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Registro
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {deleteConfig.isOpen && (
                <ConfirmationDialog
                    isOpen={deleteConfig.isOpen}
                    onClose={() => setDeleteConfig({ isOpen: false, recordId: null, type: null, recordName: '' })}
                    onConfirm={confirmDelete}
                    title="Eliminar Registro de Bautismo"
                    message={
                        <span>
                            ¿Está seguro de que desea eliminar el registro de <strong>{deleteConfig.recordName}</strong>? 
                            Esta acción no se puede deshacer.
                        </span>
                    }
                    confirmText="Sí, Eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                />
            )}
        </DashboardLayout>
    );
};

export default BD_BautizosPage;
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import BaptismTicket from '@/components/BaptismTicket';
import { 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight, 
    Save, 
    LogOut, 
    Printer,
    Users,
    User,
    CheckCircle2
} from 'lucide-react';
import { normalizeBaptismPartida, enrichBaptismPartidaWithAuxiliaryData } from '@/utils/baptismDataNormalizer';
import { normalizePaddedValue, parsePaddedNumber, formatNumberLike } from '@/utils/supabaseHelpers';

// --- HELPER FUNCTIONS ---

// Helper to convert input format (YYYY-MM-DD) to storage format (DD/MM/YYYY)
const toStorageDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

// Helper to convert storage format (DD/MM/YYYY) to input format (YYYY-MM-DD)
const toInputDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m}-${d}`;
    }
    return '';
};

const isDateValid = (dateString) => {
    if (!dateString) return true; 
    
    // Normalize to YYYY-MM-DD for check
    const checkStr = toInputDate(dateString) || dateString;
    
    const [y, m, d] = checkStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (isNaN(date.getTime())) return false;

    // Normalize comparison to dates only (ignore time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return checkDate <= today;
};

// Helper to safely format godparents for display in textarea
const formatGodparentsForDisplay = (godparentsData) => {
    if (!godparentsData) return '';
    
    // If it's already a string, return it (unless it's [object Object])
    if (typeof godparentsData === 'string') {
        if (godparentsData === '[object Object]') return '';
        return godparentsData;
    }
    
    // If it's an array of objects (common structure)
    if (Array.isArray(godparentsData)) {
        return godparentsData.map(gp => {
            if (typeof gp === 'string') return gp;
            // Try to extract name from common fields
            return gp.fullName || gp.name || gp.nombre || '';
        }).filter(Boolean).join(', ');
    }
    
    // If it's a single object
    if (typeof godparentsData === 'object') {
        return godparentsData.fullName || godparentsData.name || godparentsData.nombre || '';
    }
    
    return '';
};

// --- LOGIC HELPERS ---

const getPartidaParameters = (entityId) => {
    const key = `baptismParameters_${entityId}`;
    const params = JSON.parse(localStorage.getItem(key) || '{}');
    const libroRaw = normalizePaddedValue(params.ordinarioLibro, '1');
    const folioRaw = normalizePaddedValue(params.ordinarioFolio, '1');
    const numeroRaw = normalizePaddedValue(params.ordinarioNumero, '1');

    return {
        libro: parsePaddedNumber(libroRaw, 1),
        folio: parsePaddedNumber(folioRaw, 1),
        numero: parsePaddedNumber(numeroRaw, 1),
        libroRaw,
        folioRaw,
        numeroRaw,
        partidasPerFolio: parsePaddedNumber(params.ordinarioPartidas, 1),
        reiniciarPorFolio: Boolean(params.ordinarioRestartNumber)
    };
};

const formatEntryNumber = (value, originalValue = '1') => {
    const originalWidth = String(originalValue || '1').replace(/\D/g, '').length;
    const width = Math.max(4, originalWidth || 1);
    return String(value).padStart(width, '0');
};

const updatePartidaParameters = (entityId, newLibro, newFolio, newNumero) => {
    const key = `baptismParameters_${entityId}`;
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    const updated = {
        ...current,
        ordinarioLibro: newLibro,
        ordinarioFolio: newFolio,
        ordinarioNumero: newNumero
    };
    localStorage.setItem(key, JSON.stringify(updated));
    console.log(`✅ Parámetros actualizados: L:${newLibro} F:${newFolio} N:${newNumero}`);
};

const calculateNextPartidaValuesByParameters = ({
    currentLibro,
    currentFolio,
    currentNumero,
    partidasPerFolio,
    reiniciarPorFolio
}) => {

    let newLibro = currentLibro;
    let newFolio = currentFolio;
    let newNumero = currentNumero + 1; 

    const capacity = Math.max(1, parseInt(partidasPerFolio || 1));
    if (currentNumero % capacity === 0) {
        newFolio = currentFolio + 1;
       if (reiniciarPorFolio) {
            newNumero = 1;
        }
    }

    return { newLibro, newFolio, newNumero };
};


const BaptismSentarRegistrosPage = () => {
    const { user } = useAuth();
    const { getMisDatosList } = useAppData();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'batch'
    const [pendingBaptisms, setPendingBaptisms] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [parameters, setParameters] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Ticket Printing States
    const [showTicket, setShowTicket] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [parishInfo, setParishInfo] = useState({ name: '', address: '', phone: '', city: '', diocesis: '' });

    // Initial Load
    useEffect(() => {
        if (!user?.parishId && !user?.dioceseId) return;
        loadData();
        loadParishData();
    }, [user]);

    const loadParishData = () => {
        if (!user?.parishId) return;

        try {
            const misDatos = getMisDatosList(user.parishId);
            let parishData = {};
            
            if (misDatos && misDatos.length > 0) {
                // Use first record as primary
                const mainRecord = misDatos[0];
                parishData = {
                    name: mainRecord.nombre,
                    address: mainRecord.direccion,
                    phone: mainRecord.telefono,
                    city: mainRecord.ciudad,
                    diocesis: mainRecord.diocesis,
                    email: mainRecord.email
                };
            } else {
                 parishData = {
                    name: user.parishName || '',
                    city: user.city || '',
                    diocesis: user.dioceseName || ''
                 };
            }

            setParishInfo(parishData);

        } catch (error) {
            console.error("Error leyendo Mis Datos:", error);
        }
    };

    const loadData = () => {
        setIsLoading(true);
        const entityId = user.parishId || user.dioceseId;
        
        // Load Pending Baptisms
        const pendingKey = `pendingBaptisms_${entityId}`;
        const storedPending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
        
        // Sanitize pending baptisms: ensure ministerFaith is populated
        const sanitizedPending = storedPending.map(b => ({
            ...b,
            ministerFaith: b.ministerFaith || b.minister || '',
            lugarBautismo: b.lugarBautismo || '',
            lugarBautismoDetalle: b.lugarBautismoDetalle || b.lugarBautismo || '',
            lugarNacimientoDetalle: b.lugarNacimientoDetalle || b.birthPlace || '',
            sex: b.sex || '',
            tipoUnionPadres: b.tipoUnionPadres || b.parentsUnionType || '',
            registryOffice: b.registryOffice || '',
            // Ensure godparents is readable string if it was loaded as object
            godparents: formatGodparentsForDisplay(b.godparents) 
        }));
        
        setPendingBaptisms(sanitizedPending);

        // Load Parameters for numbering
        const currentParams = getPartidaParameters(entityId);
        
        setParameters({
            ordinarioLibro: currentParams.libroRaw,
            ordinarioFolio: currentParams.folioRaw,
            ordinarioNumero: currentParams.numeroRaw,
            ordinarioPartidas: currentParams.partidasPerFolio
        });
        setIsLoading(false);
    };

    // --- PRINTING LOGIC ---

    const handlePrintTicketIndividual = () => {
        const currentBaptism = pendingBaptisms[currentIndex];
        
        if (!currentBaptism || !currentBaptism.id) {
            toast({
                title: "Error",
                description: "No hay datos válidos para imprimir.",
                variant: "destructive"
            });
            return;
        }

        const dataToPrint = {
            ...currentBaptism,
            numero: currentBaptism.numero || 'PEND',
            inscriptionDate: currentBaptism.inscriptionDate || new Date().toISOString()
        };

        setTicketData(dataToPrint);
        setShowTicket(true);

        setTimeout(() => {
            window.print();
        }, 500);
    };

    const handlePrintTicketBatch = () => {
        if (selectedIds.length !== 1) {
             toast({
                title: "Selección Inválida",
                description: "Por favor seleccione exactamente un registro para imprimir la boleta.",
                variant: "destructive"
            });
            return;
        }

        const selectedBaptism = pendingBaptisms.find(b => b.id === selectedIds[0]);

        if (!selectedBaptism) {
            toast({
                title: "Error",
                description: "Registro no encontrado.",
                variant: "destructive"
            });
            return;
        }

        const dataToPrint = {
            ...selectedBaptism,
            numero: selectedBaptism.numero || 'PEND',
            inscriptionDate: selectedBaptism.inscriptionDate || new Date().toISOString()
        };

        setTicketData(dataToPrint);
        setShowTicket(true);

        setTimeout(() => {
            window.print();
        }, 500);
    };


    // --- INDIVIDUAL VIEW LOGIC ---

    const currentBaptism = pendingBaptisms[currentIndex];

    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        let finalValue = value;
        
        // Store dates as DD/MM/YYYY to match system consistency
        if (type === 'date') {
            finalValue = toStorageDate(value);
        }

        const updatedBaptisms = [...pendingBaptisms];
        updatedBaptisms[currentIndex] = {
            ...updatedBaptisms[currentIndex],
            [name]: finalValue
        };
        setPendingBaptisms(updatedBaptisms);
        // Update local storage immediately to save drafts
        const entityId = user.parishId || user.dioceseId;
        localStorage.setItem(`pendingBaptisms_${entityId}`, JSON.stringify(updatedBaptisms));
    };

    const handleRegisterIndividual = () => {
        if (!currentBaptism) return;

        // Validation
        if (currentBaptism.sacramentDate) {
            if (!isDateValid(currentBaptism.sacramentDate)) {
                 toast({
                    title: "Error",
                    description: "La fecha de bautismo no puede ser futura.",
                    variant: "destructive"
                 });
                 return;
            }
        }
        
        const entityId = user.parishId || user.dioceseId;
        
        // 1. Get Current Parameters
        const { libro, folio, numero, libroRaw, folioRaw, numeroRaw, partidasPerFolio, reiniciarPorFolio } = getPartidaParameters(entityId);
        
        // Format today
        const today = new Date();
        const formattedToday = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

        // 2. Create Record with CURRENT parameters
        const baseRecord = {
            ...currentBaptism,
            status: 'celebrated',
            book_number: libroRaw,
            page_number: folioRaw,
            entry_number: numeroRaw,
            registrationDate: formattedToday,
            sex: currentBaptism.sex || 'MASCULINO'
        };

        // ENRICHMENT: Add parish info snapshot to the record
        // This ensures historical accuracy if parish details change later
        // We first normalize to get the structure right, then enrich
        const normalizedForEnrichment = normalizeBaptismPartida(baseRecord);
        const enriched = enrichBaptismPartidaWithAuxiliaryData(normalizedForEnrichment, {
            nombre: parishInfo.name,
            direccion: parishInfo.address,
            telefono: parishInfo.phone,
            ciudad: parishInfo.city,
            departamento: parishInfo.state, // if available
            diocesis: parishInfo.diocesis,
            email: parishInfo.email
        });

        // Merge back the enriched parroquiaInfo into the raw object for storage
        // We store RAW data primarily, but embed the parroquiaInfo snapshot
        const recordToSave = {
            ...baseRecord,
            parroquiaInfo: enriched.parroquiaInfo
        };

        // 3. Save to Final Registry
        const finalKey = `baptisms_${entityId}`;
        const currentFinal = JSON.parse(localStorage.getItem(finalKey) || '[]');
        
        localStorage.setItem(finalKey, JSON.stringify([...currentFinal, recordToSave]));

        // 4. Calculate NEXT values
        const { newLibro, newFolio, newNumero } = calculateNextPartidaValuesByParameters({
            currentLibro: libro,
            currentFolio: folio,
            currentNumero: numero,
            partidasPerFolio,
            reiniciarPorFolio
        });

        // 5. Update Parameters
        const nextLibroRaw = formatNumberLike(newLibro, libroRaw);
        const nextFolioRaw = formatNumberLike(newFolio, folioRaw);
        const nextNumeroRaw = formatNumberLike(newNumero, numeroRaw);

        updatePartidaParameters(entityId, nextLibroRaw, nextFolioRaw, nextNumeroRaw);
        
        // Update local state for display
        setParameters({
            ordinarioLibro: nextLibroRaw,
            ordinarioFolio: nextFolioRaw,
            ordinarioNumero: nextNumeroRaw,
            ordinarioPartidas: partidasPerFolio
        });

        // 6. Remove from Pending
        const updatedPending = pendingBaptisms.filter((_, idx) => idx !== currentIndex);
        localStorage.setItem(`pendingBaptisms_${entityId}`, JSON.stringify(updatedPending));
        setPendingBaptisms(updatedPending);

        // 7. Feedback and Navigation
        toast({
            title: "Registro Exitoso",
            description: `Bautismo registrado: Libro ${libro}, Folio ${folio}, Número ${numero}`,
            className: "bg-green-50 border-green-200 text-green-900"
        });

        if (currentIndex >= updatedPending.length) {
            setCurrentIndex(Math.max(0, updatedPending.length - 1));
        }
    };

    // --- BATCH VIEW LOGIC ---

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === pendingBaptisms.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingBaptisms.map(b => b.id));
        }
    };

    const handleRegisterBatch = () => {
        if (selectedIds.length === 0) return;

        const selectedBaptisms = pendingBaptisms.filter(b => selectedIds.includes(b.id));

        // 1. Validation
        const invalidBaptisms = [];
        selectedBaptisms.forEach(baptism => {
             if (baptism.sacramentDate && !isDateValid(baptism.sacramentDate)) {
                 invalidBaptisms.push(baptism);
             }
        });

        if (invalidBaptisms.length > 0) {
             toast({
                title: "Error de Validación",
                description: `Hay ${invalidBaptisms.length} registros con fechas futuras. Revise los datos.`,
                variant: "destructive",
                duration: 6000
             });
             return;
        }

        const entityId = user.parishId || user.dioceseId;
        
        // 2. Get Initial Parameters
        let { libro, folio, numero, libroRaw, folioRaw, numeroRaw, partidasPerFolio, reiniciarPorFolio } = getPartidaParameters(entityId);
        
        // Load existing records to count in-memory during loop
        const finalKey = `baptisms_${entityId}`;
        const existingRecords = JSON.parse(localStorage.getItem(finalKey) || '[]');
        
        const today = new Date();
        const formattedToday = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
        
        const newFinalRecords = [];
        const recordsToSave = [...existingRecords]; // Working copy

        // 3. Process Batch
        selectedBaptisms.forEach(baptism => {
            // Assign Current Values
            const baseRecord = {
                ...baptism,
                status: 'celebrated',
                book_number: libroRaw,
                page_number: folioRaw,
                entry_number: numeroRaw,
                registrationDate: formattedToday,
                sex: baptism.sex || 'MASCULINO'
            };

            // ENRICHMENT Logic for Batch
            const normalizedForEnrichment = normalizeBaptismPartida(baseRecord);
            const enriched = enrichBaptismPartidaWithAuxiliaryData(normalizedForEnrichment, {
                nombre: parishInfo.name,
                direccion: parishInfo.address,
                telefono: parishInfo.phone,
                ciudad: parishInfo.city,
                diocesis: parishInfo.diocesis,
                email: parishInfo.email
            });

            const record = {
                ...baseRecord,
                parroquiaInfo: enriched.parroquiaInfo
            };
            
            newFinalRecords.push(record);
            recordsToSave.push(record); // Add to working copy for count logic

            const next = calculateNextPartidaValuesByParameters({
                currentLibro: libro,
                currentFolio: folio,
                currentNumero: numero,
                partidasPerFolio,
                reiniciarPorFolio
            });

            libro = next.newLibro;
            folio = next.newFolio;
            numero = next.newNumero;
            libroRaw = formatNumberLike(libro, libroRaw);
            folioRaw = formatNumberLike(folio, folioRaw);
            numeroRaw = formatNumberLike(numero, numeroRaw);
        });

        // 4. Save All
        localStorage.setItem(finalKey, JSON.stringify(recordsToSave));

        // 5. Update Parameters with FINAL values
        updatePartidaParameters(entityId, libroRaw, folioRaw, numeroRaw);
        setParameters({
            ordinarioLibro: libroRaw,
            ordinarioFolio: folioRaw,
            ordinarioNumero: numeroRaw,
            ordinarioPartidas: partidasPerFolio
        });

        // 6. Remove from Pending
        const updatedPending = pendingBaptisms.filter(b => !selectedIds.includes(b.id));
        localStorage.setItem(`pendingBaptisms_${entityId}`, JSON.stringify(updatedPending));
        setPendingBaptisms(updatedPending);
        setSelectedIds([]);

        toast({
            title: "Lote Registrado",
            description: `Se han asentado ${newFinalRecords.length} registros exitosamente.`,
            className: "bg-green-50 border-green-200 text-green-900"
        });
    };

    // --- RENDER HELPERS ---

    if (isLoading) {
        return (
            <DashboardLayout entityName={user?.parishName || "Parroquia"}>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">Cargando registros pendientes...</p>
                </div>
            </DashboardLayout>
        );
    }

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-100 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">¡Todo al día!</h3>
            <p className="text-gray-500 mt-2">No hay bautizos pendientes para registrar en este momento.</p>
        </div>
    );

    return (
        <>
            <div className="print:hidden">
                <DashboardLayout entityName={user?.parishName || "Parroquia"}>
                    {/* Header Area */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[#4B7BA7] font-serif">Sentar Registros de Bautismo</h1>
                            <p className="text-sm text-gray-600">Gestione y legalice los bautismos pendientes en los libros parroquiales.</p>
                        </div>
                        
                        {/* View Toggles */}
                        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                            <button
                                onClick={() => setViewMode('individual')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'individual' 
                                        ? 'bg-[#4B7BA7] text-white shadow-sm' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <User className="w-4 h-4" />
                                Individual
                            </button>
                            <button
                                onClick={() => setViewMode('batch')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'batch' 
                                        ? 'bg-[#4B7BA7] text-white shadow-sm' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                Por Lote
                            </button>
                        </div>
                    </div>

                    {pendingBaptisms.length === 0 ? (
                        <EmptyState />
                    ) : viewMode === 'individual' ? (
                        // --- INDIVIDUAL VIEW ---
                        <div className="space-y-4">
                            {/* Navigation Bar */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0}>
                                        <ChevronsLeft className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                </div>
                                <span className="font-mono font-bold text-gray-700">
                                    {currentIndex + 1} / {pendingBaptisms.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setCurrentIndex(prev => Math.min(pendingBaptisms.length - 1, prev + 1))} disabled={currentIndex === pendingBaptisms.length - 1}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => setCurrentIndex(pendingBaptisms.length - 1)} disabled={currentIndex === pendingBaptisms.length - 1}>
                                        <ChevronsRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Form Content */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                    {/* Auto-assigned fields (Read-Only Preview) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Libro (Auto)</label>
                                        <div className="p-2 bg-gray-100 rounded border border-gray-200 font-mono text-gray-700">{parameters?.ordinarioLibro}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Folio (Auto)</label>
                                        <div className="p-2 bg-gray-100 rounded border border-gray-200 font-mono text-gray-700">{parameters?.ordinarioFolio}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Número (Auto)</label>
                                        <div className="p-2 bg-gray-100 rounded border border-gray-200 font-mono text-gray-700">{parameters?.ordinarioNumero}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#4B7BA7] uppercase">Fecha Bautismo</label>
                                        <Input 
                                            name="sacramentDate" 
                                            type="date"
                                            value={toInputDate(currentBaptism.sacramentDate)} 
                                            onChange={handleFormChange}
                                            className="border-gray-300 focus:border-[#4B7BA7]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-900 border-b pb-2">Datos del Bautizado</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Nombres</label>
                                                <Input name="firstName" value={currentBaptism.firstName} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Apellidos</label>
                                                <Input name="lastName" value={currentBaptism.lastName} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Fecha Nacimiento</label>
                                                <Input name="birthDate" type="date" value={toInputDate(currentBaptism.birthDate)} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Sexo</label>
                                                <select 
                                                    name="sex" 
                                                    value={currentBaptism.sex || ''} 
                                                    onChange={handleFormChange}
                                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B7BA7]"
                                                >
                                                    <option value="MASCULINO">MASCULINO</option>
                                                    <option value="FEMENINO">FEMENINO</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600">Lugar Nacimiento</label>
                                                <Input name="lugarNacimientoDetalle" value={currentBaptism.lugarNacimientoDetalle} onChange={handleFormChange} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-900 border-b pb-2">Datos de los Padres</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Padre</label>
                                                <Input name="fatherName" value={currentBaptism.fatherName} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Madre</label>
                                                <Input name="motherName" value={currentBaptism.motherName} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600">Tipo de Unión</label>
                                                <select 
                                                    name="tipoUnionPadres" 
                                                    value={currentBaptism.tipoUnionPadres || currentBaptism.parentsUnionType} 
                                                    onChange={handleFormChange}
                                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B7BA7] bg-white text-gray-900"
                                                >
                                                    <option value="">Seleccione...</option>
                                                    <option value="MATRIMONIO CATÓLICO">Matrimonio Católico</option>
                                                    <option value="MATRIMONIO CIVIL">Matrimonio Civil</option>
                                                    <option value="UNIÓN LIBRE">Unión Libre</option>
                                                    <option value="MADRE SOLTERA">Madre Soltera</option>
                                                    <option value="OTRO">Otro</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-600">Abuelos Paternos</label>
                                        <textarea 
                                            name="paternalGrandparents" 
                                            value={currentBaptism.paternalGrandparents || ''} 
                                            onChange={handleFormChange}
                                            className="w-full rounded-md border border-gray-300 p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-600">Abuelos Maternos</label>
                                        <textarea 
                                            name="maternalGrandparents" 
                                            value={currentBaptism.maternalGrandparents || ''} 
                                            onChange={handleFormChange}
                                            className="w-full rounded-md border border-gray-300 p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <label className="text-xs font-semibold text-gray-600">Padrinos</label>
                                    <textarea 
                                        name="godparents" 
                                        value={formatGodparentsForDisplay(currentBaptism.godparents)} 
                                        onChange={handleFormChange}
                                        className="w-full rounded-md border border-gray-300 p-2 text-sm h-16 resize-none focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600">Ministro (Sacerdote)</label>
                                            <Input name="minister" value={currentBaptism.minister} onChange={handleFormChange} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600">Lugar Bautismo</label>
                                            <Input name="lugarBautismoDetalle" value={currentBaptism.lugarBautismoDetalle} onChange={handleFormChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600">Da Fe (Firma)</label>
                                            <Input 
                                                name="ministerFaith" 
                                                value={currentBaptism.ministerFaith || ''} 
                                                onChange={handleFormChange}
                                                placeholder="Nombre del párroco"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600">Oficina Registro Civil</label>
                                            <Input name="registryOffice" value={currentBaptism.registryOffice} onChange={handleFormChange} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-100" onClick={() => {/* Handle exit logic */}}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Salir
                                </Button>
                                <Button className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold" onClick={handlePrintTicketIndividual}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir Boleta
                                </Button>
                                <Button className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white" onClick={handleRegisterIndividual}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Registrar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // --- BATCH VIEW ---
                        <div className="space-y-4">
                            {/* Counters */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-[#4B7BA7]">{selectedIds.length}</span>
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Seleccionadas</span>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-400">{pendingBaptisms.length - selectedIds.length}</span>
                                    <span className="text-xs text-gray-500 uppercase font-semibold">No Seleccionadas</span>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-900">{pendingBaptisms.length}</span>
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                                            <tr>
                                                <th className="px-6 py-3 w-10">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIds.length === pendingBaptisms.length && pendingBaptisms.length > 0}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 text-[#4B7BA7] rounded border-gray-300 focus:ring-[#4B7BA7]"
                                                    />
                                                </th>
                                                <th className="px-6 py-3">#</th>
                                                <th className="px-6 py-3">Apellidos</th>
                                                <th className="px-6 py-3">Nombres</th>
                                                <th className="px-6 py-3">Fecha Bautismo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {pendingBaptisms.map((baptism, idx) => (
                                                <tr key={baptism.id || idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedIds.includes(baptism.id)}
                                                            onChange={() => toggleSelection(baptism.id)}
                                                            className="w-4 h-4 text-[#4B7BA7] rounded border-gray-300 focus:ring-[#4B7BA7]"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 font-mono text-gray-500">{idx + 1}</td>
                                                    <td className="px-6 py-3 font-semibold text-gray-900">{baptism.lastName}</td>
                                                    <td className="px-6 py-3 text-gray-700">{baptism.firstName}</td>
                                                    <td className="px-6 py-3 text-gray-500">{baptism.sacramentDate || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="outline" className="text-gray-600" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
                                    Cancelar Selección
                                </Button>
                                <Button 
                                    className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold" 
                                    onClick={handlePrintTicketBatch}
                                    disabled={selectedIds.length !== 1}
                                    title={selectedIds.length !== 1 ? "Seleccione exactamente un registro para imprimir" : "Imprimir Boleta"}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir Boleta
                                </Button>
                                <Button 
                                    className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white" 
                                    onClick={handleRegisterBatch}
                                    disabled={selectedIds.length === 0}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Registrar ({selectedIds.length})
                                </Button>
                            </div>
                        </div>
                    )}
                </DashboardLayout>
            </div>
            
            {/* --- HIDDEN TICKET CONTAINER (Visible only in print) --- */}
            <div className="hidden print:block">
                 {ticketData && <BaptismTicket baptismData={ticketData} parishInfo={parishInfo} />}
            </div>
        </>
    );
};

export default BaptismSentarRegistrosPage;
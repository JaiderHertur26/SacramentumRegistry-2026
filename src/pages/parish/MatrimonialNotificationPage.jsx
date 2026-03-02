
import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Search, Mail, User, BookOpen, MapPin,
    CheckCircle2, AlertCircle, Send, FileText,
    ArrowRight, Globe, Building2, Printer, X, History, Eye
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';

const MatrimonialNotificationPage = () => {
    const { user } = useAuth();
    const {
        data,
        obtenerNotasAlMargen,
        addNotificationToParish
    } = useAppData();
    const { toast } = useToast();

    const printRef = useRef();
    const historyPrintRef = useRef();

    // Search filters
    const [filters, setFilters] = useState({
        libro: '',
        folio: '',
        numero: '',
        nombres: '',
        apellidos: '',
        scope: 'diocese'
    });

    // Search results
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedBaptism, setSelectedBaptism] = useState(null);

    // Notification Details
    const [notifDetails, setNotifDetails] = useState({
        fechaMatrimonio: '',
        nombreConyuge: '',
        libroMat: '',
        folioMat: '',
        numeroMat: ''
    });

    const [step, setStep] = useState(1); // 1: Search, 2: Details, 3: Success
    const [history, setHistory] = useState([]);

    // View Support Modal
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);

    useEffect(() => {
        loadHistory();
    }, [user?.parishId, step]);

    const loadHistory = () => {
        if (user?.parishId) {
            const senderDocsKey = `sentNotifications_${user?.parishId}`;
            const receivedDocsKey = `receivedNotifications_${user?.parishId}`;
            const sent = JSON.parse(localStorage.getItem(senderDocsKey) || '[]');
            const received = JSON.parse(localStorage.getItem(receivedDocsKey) || '[]');
            // Standardize and sort
            const combined = [
                ...sent.map(d => ({ ...d, type: 'SENT' })),
                ...received.map(d => ({ ...d, type: 'RECEIVED' }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistory(combined);
        }
    };

    const handleSearch = () => {
        setIsSearching(true);
        setSelectedBaptism(null);

        const allParishes = data.parishes || [];
        let searchResults = [];

        const targetParishes = filters.scope === 'all'
            ? allParishes
            : allParishes.filter(p => p.dioceseId === user?.dioceseId);

        targetParishes.forEach(parish => {
            const baptisms = JSON.parse(localStorage.getItem(`baptisms_${parish.id}`) || '[]');
            const filtered = baptisms.filter(b => {
                const bLibro = String(b.book_number || b.libro || '').padStart(4, '0');
                const bFolio = String(b.page_number || b.folio || '').padStart(4, '0');
                const bNumero = String(b.entry_number || b.numero || '').padStart(4, '0');

                const matchLibro = !filters.libro || bLibro === filters.libro.padStart(4, '0');
                const matchFolio = !filters.folio || bFolio === filters.folio.padStart(4, '0');
                const matchNumero = !filters.numero || bNumero === filters.numero.padStart(4, '0');

                const bNombres = (b.firstName || b.nombres || '').toLowerCase();
                const bApellidos = (b.lastName || b.apellidos || '').toLowerCase();

                const matchNombres = !filters.nombres || bNombres.includes(filters.nombres.toLowerCase());
                const matchApellidos = !filters.apellidos || bApellidos.includes(filters.apellidos.toLowerCase());

                return matchLibro && matchFolio && matchNumero && matchNombres && matchApellidos;
            });

            filtered.forEach(b => {
                searchResults.push({
                    ...b,
                    parishName: parish.name,
                    parishId: parish.id
                });
            });
        });

        setTimeout(() => {
            setResults(searchResults);
            setIsSearching(false);
            if (searchResults.length === 0) {
                toast({ title: "Sin resultados", description: "No se encontró ninguna partida con esos criterios.", variant: "destructive" });
            }
        }, 800);
    };

    const handleApplyNotification = () => {
        if (!selectedBaptism) return;

        const targetParishId = selectedBaptism.parishId;
        const baptismsKey = `baptisms_${targetParishId}`;
        const targetBaptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');

        const baptismIndex = targetBaptisms.findIndex(b => b.id === selectedBaptism.id);
        if (baptismIndex === -1) {
            toast({ title: "Error", description: "La partida ya no existe.", variant: "destructive" });
            return;
        }

        // HEREDAR NOTA CONFIGURADA
        const notesTemplates = obtenerNotasAlMargen(targetParishId);
        let template = notesTemplates.porNotificacionMatrimonial || "EL [FECHA_NOTIFICACION], SE RECIBIÓ NOTIFICACIÓN DE MATRIMONIO CELEBRADO EL DÍA [FECHA_MATRIMONIO] EN LA PARROQUIA [PARROQUIA_MATRIMONIO], CON [NOMBRE_CONYUGE]. REGISTRADO EN EL LIBRO [LIBRO_MAT], FOLIO [FOLIO_MAT], NUMERO [NUMERO_MAT].";

        const fechaNotifStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

        // Find Diocese Name for the replacement
        const senderParish = (data.parishes || []).find(p => p.id === user?.parishId);
        const senderDiocese = (data.dioceses || []).find(d => d.id === user?.dioceseId);

        const marginalNoteText = template
            .replace(/\[FECHA_NOTIFICACION\]/g, fechaNotifStr)
            .replace(/\[FECHA_MATRIMONIO\]/g, notifDetails.fechaMatrimonio.toUpperCase())
            .replace(/\[PARROQUIA_MATRIMONIO\]/g, user?.parishName.toUpperCase())
            .replace(/\[DIOCESIS_MATRIMONIO\]/g, (senderDiocese?.name || user?.dioceseName || '').toUpperCase())
            .replace(/\[NOMBRE_CONYUGE\]/g, notifDetails.nombreConyuge.toUpperCase())
            .replace(/\[LIBRO_MAT\]/g, notifDetails.libroMat)
            .replace(/\[FOLIO_MAT\]/g, notifDetails.folioMat)
            .replace(/\[NUMERO_MAT\]/g, notifDetails.numeroMat);

        // AFECTAR LA PARTIDA REALMENTE
        const updatedBaptism = {
            ...targetBaptisms[baptismIndex],
            notaMarginalMatrimonio: marginalNoteText,
            isMarried: true,
            updatedAt: new Date().toISOString()
        };
        targetBaptisms[baptismIndex] = updatedBaptism;
        localStorage.setItem(baptismsKey, JSON.stringify(targetBaptisms));

        // Enviar aviso a la parroquia receptora
        addNotificationToParish(targetParishId, {
            type: 'matrimonial_notification',
            title: 'Notificación Matrimonial Recibida',
            message: `Se ha aplicado una nota de matrimonio a la partida de ${selectedBaptism.nombres || selectedBaptism.firstName} ${selectedBaptism.apellidos || selectedBaptism.lastName}.`,
            baptismId: selectedBaptism.id,
            fromParish: user?.parishName,
            details: notifDetails
        });

        const supportDoc = {
            id: `DOC-${Date.now()}`,
            date: new Date().toISOString(),
            targetBaptism: {
                id: selectedBaptism.id,
                nombres: selectedBaptism.firstName || selectedBaptism.nombres,
                apellidos: selectedBaptism.lastName || selectedBaptism.apellidos,
                libro: selectedBaptism.book_number || selectedBaptism.libro,
                folio: selectedBaptism.page_number || selectedBaptism.folio,
                numero: selectedBaptism.entry_number || selectedBaptism.numero,
                parishName: selectedBaptism.parishName
            },
            details: notifDetails,
            fromParish: user?.parishName,
            dioceseName: user?.dioceseName || senderDiocese?.name || 'DIÓCESIS'
        };

        // Guardar respaldo en emisor
        const senderDocsKey = `sentNotifications_${user?.parishId}`;
        const sentDocs = JSON.parse(localStorage.getItem(senderDocsKey) || '[]');
        sentDocs.push(supportDoc);
        localStorage.setItem(senderDocsKey, JSON.stringify(sentDocs));

        // Guardar respaldo en receptor
        const receiverDocsKey = `receivedNotifications_${targetParishId}`;
        const receivedDocs = JSON.parse(localStorage.getItem(receiverDocsKey) || '[]');
        receivedDocs.push(supportDoc);
        localStorage.setItem(receiverDocsKey, JSON.stringify(receivedDocs));

        setStep(3);
        toast({ title: "Notificación Aplicada", description: "La nota marginal ha sido actualizada y la parroquia notificada.", variant: "success" });
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const handleHistoryPrint = useReactToPrint({
        content: () => historyPrintRef.current,
    });

    const handleViewDocument = (doc) => {
        setViewingDoc(doc);
        setIsViewModalOpen(true);
    };

    // Componente de Formato de Impresión (Tamaño Carta)
    const PrintFormat = ({ doc, reference }) => {
        if (!doc) return null;
        return (
            <div className="hidden print:block">
                <div ref={reference} className="p-16 bg-white text-black font-serif text-[12pt] leading-relaxed w-[8.5in] h-[11in] mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-2xl font-bold uppercase mb-2">{doc.dioceseName || 'DIÓCESIS'}</h1>
                        <h2 className="text-xl font-bold uppercase mb-1">{doc.fromParish}</h2>
                        <p className="text-xs italic">Notificación de Matrimonio Contraído</p>
                        <div className="w-full h-px bg-black mt-4"></div>
                    </div>

                    <div className="mb-10 text-right">
                        <p className="font-bold">FECHA: {new Date(doc.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="mb-10">
                        <p className="mb-4">Señor Párroco de la Parroquia:</p>
                        <p className="font-bold uppercase underline">{doc.targetBaptism?.parishName}</p>
                        <p className="mt-4">Estimado hermano en el sacerdocio,</p>
                    </div>

                    <div className="mb-10 text-justify">
                        <p>Por la presente, notifico a usted que en los Libros de Matrimonios de esta Parroquia se ha registrado el sacramento contraído por:</p>
                        <div className="my-6 p-6 border-2 border-black rounded-lg bg-gray-50/10">
                            <p className="mb-2 uppercase"><span className="font-bold">Contraente:</span> {doc.targetBaptism?.nombres} {doc.targetBaptism?.apellidos}</p>
                            <p className="mb-2 uppercase"><span className="font-bold">Con:</span> {doc.details?.nombreConyuge}</p>
                            <p className="mb-2 uppercase"><span className="font-bold">Fecha de Celebración:</span> {doc.details?.fechaMatrimonio}</p>
                            <p className="uppercase"><span className="font-bold">Registro Matrimonial:</span> Libro {doc.details?.libroMat}, Folio {doc.details?.folioMat}, Número {doc.details?.numeroMat}</p>
                        </div>
                        <p>Se solicita amablemente realizar la anotación correspondiente en el margen de la Partida de Bautismo de la persona mencionada, la cual se encuentra registrada bajo los siguientes datos en sus archivos:</p>
                        <p className="mt-6 font-bold text-center text-lg uppercase border-y border-black py-2">
                            Libro: {doc.targetBaptism?.libro} | Folio: {doc.targetBaptism?.folio} | Número: {doc.targetBaptism?.numero}
                        </p>
                    </div>

                    <div className="mt-32 grid grid-cols-2 gap-12 text-center">
                        <div className="space-y-2">
                            <div className="w-full h-px bg-black mb-2"></div>
                            <p className="font-bold uppercase">{user?.username}</p>
                            <p className="text-xs uppercase">Párroco / Encargado</p>
                        </div>
                        <div className="flex flex-col items-center justify-center opacity-30">
                            <div className="w-28 h-24 border-2 border-black rounded-full flex items-center justify-center text-[10px] font-bold text-center px-2">
                                SELLO PARROQUIAL
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-16 left-16 right-16 text-[8pt] text-gray-400 italic border-t border-gray-100 pt-4 text-center">
                        Documento generado por el Sistema Sacramentum Registry. Respaldo oficial de comunicación eclesiástica.
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            {/* Elementos ocultos para impresión */}
            <PrintFormat doc={{ ...notifDetails, targetBaptism: selectedBaptism, fromParish: user?.parishName, dioceseName: user?.dioceseName, date: new Date().toISOString() }} reference={printRef} />
            <PrintFormat doc={viewingDoc} reference={historyPrintRef} />

            <div className="mb-6">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Notificación Matrimonial</h1>
                <p className="text-gray-500 font-bold text-sm">Gestión de comunicaciones y actualizaciones marginales.</p>
            </div>

            <Tabs defaultValue="nueva" className="w-full">
                <TabsList className="grid grid-cols-2 max-w-md mb-8 bg-gray-100 p-1 rounded-xl shadow-inner">
                    <TabsTrigger value="nueva" className="rounded-lg font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Nueva Notificación</TabsTrigger>
                    <TabsTrigger value="archivo" className="rounded-lg font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Archivo de Respaldos</TabsTrigger>
                </TabsList>

                <TabsContent value="nueva">
                    {step === 1 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <Search className="w-4 h-4 text-[#D4AF37]" />
                                        Búsqueda de Bautizado
                                    </h3>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Libro</label>
                                            <Input placeholder="0001" value={filters.libro} onChange={e => setFilters({...filters, libro: e.target.value})} className="font-mono font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Folio</label>
                                            <Input placeholder="0001" value={filters.folio} onChange={e => setFilters({...filters, folio: e.target.value})} className="font-mono font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Número</label>
                                            <Input placeholder="0001" value={filters.numero} onChange={e => setFilters({...filters, numero: e.target.value})} className="font-mono font-bold" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Nombres</label>
                                        <Input placeholder="Nombre del bautizado" value={filters.nombres} onChange={e => setFilters({...filters, nombres: e.target.value})} />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Apellidos</label>
                                        <Input placeholder="Apellidos del bautizado" value={filters.apellidos} onChange={e => setFilters({...filters, apellidos: e.target.value})} />
                                    </div>

                                    <div className="pt-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block mb-2">Alcance de Búsqueda</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setFilters({...filters, scope: 'diocese'})} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-[10px] font-black uppercase transition-all", filters.scope === 'diocese' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-100")}>
                                                <Building2 className="w-3 h-3" /> Diócesis
                                            </button>
                                            <button onClick={() => setFilters({...filters, scope: 'all'})} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-[10px] font-black uppercase transition-all", filters.scope === 'all' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-100")}>
                                                <Globe className="w-3 h-3" /> Global
                                            </button>
                                        </div>
                                    </div>

                                    <Button onClick={handleSearch} disabled={isSearching} className="w-full bg-[#111111] hover:bg-gray-800 text-white font-black py-6 rounded-xl uppercase tracking-[0.2em] shadow-lg mt-4">
                                        {isSearching ? "Buscando..." : "Realizar Búsqueda"}
                                    </Button>
                                </div>
                            </div>

                            <div className="lg:col-span-8">
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-full flex flex-col min-h-[450px]">
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Resultados</h3>
                                        <span className="text-[10px] font-black text-gray-400 bg-white px-3 py-1 rounded-full border">{results.length} coincidencias</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                        {results.length === 0 && !isSearching && (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                                                <User className="w-16 h-16 mb-4 text-gray-300" />
                                                <p className="font-black text-gray-900 uppercase tracking-widest text-sm">Sin resultados</p>
                                            </div>
                                        )}

                                        {results.map((b) => (
                                            <div key={b.id} onClick={() => setSelectedBaptism(b)} className={cn("p-5 rounded-2xl border-2 transition-all cursor-pointer group relative overflow-hidden", selectedBaptism?.id === b.id ? "border-emerald-500 bg-emerald-50/50 shadow-md" : "border-gray-100 hover:border-emerald-200 hover:bg-gray-50")}>
                                                <div className="flex items-start justify-between relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm", selectedBaptism?.id === b.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-500")}>
                                                            <User className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-lg leading-tight uppercase">{b.firstName || b.nombres} {b.lastName || b.apellidos}</p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> {b.parishName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Referencia</p>
                                                        <p className="font-mono text-xs font-black text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">L:{b.book_number || b.libro} F:{b.page_number || b.folio} N:{b.entry_number || b.numero}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedBaptism && (
                                        <div className="p-4 border-t border-emerald-100 bg-emerald-50 flex items-center justify-between animate-in slide-in-from-bottom-4">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                <p className="text-xs font-black text-emerald-800 uppercase tracking-tight">Seleccionado: {selectedBaptism.firstName || selectedBaptism.nombres}</p>
                                            </div>
                                            <Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-5 rounded-xl shadow-lg">
                                                Continuar <ArrowRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
                            <div className="bg-white rounded-3xl border-2 border-emerald-100 shadow-2xl overflow-hidden">
                                <div className="bg-emerald-600 p-8 text-white relative">
                                    <div className="absolute right-0 top-0 p-8 opacity-10"><Send className="w-20 h-20" /></div>
                                    <h3 className="text-2xl font-black uppercase tracking-widest">Detalle Matrimonial</h3>
                                    <p className="text-emerald-100 text-xs font-bold mt-2 uppercase tracking-widest border-t border-emerald-500 pt-2 inline-block">Bautizado: {selectedBaptism.firstName || selectedBaptism.nombres} {selectedBaptism.lastName || selectedBaptism.apellidos}</p>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fecha de Celebración</label>
                                            <Input type="date" value={notifDetails.fechaMatrimonio} onChange={e => setNotifDetails({...notifDetails, fechaMatrimonio: e.target.value})} className="h-12 text-gray-900 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nombre del Cónyuge</label>
                                            <Input placeholder="Nombre Completo" value={notifDetails.nombreConyuge} onChange={e => setNotifDetails({...notifDetails, nombreConyuge: e.target.value})} className="h-12 font-black uppercase" />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 space-y-6">
                                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                                            Referencia del Libro Matrimonial
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Libro Nº</label>
                                                <Input placeholder="0001" value={notifDetails.libroMat} onChange={e => setNotifDetails({...notifDetails, libroMat: e.target.value})} className="font-mono font-black h-12" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Folio Nº</label>
                                                <Input placeholder="0001" value={notifDetails.folioMat} onChange={e => setNotifDetails({...notifDetails, folioMat: e.target.value})} className="font-mono font-black h-12" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Número Nº</label>
                                                <Input placeholder="0001" value={notifDetails.numeroMat} onChange={e => setNotifDetails({...notifDetails, numeroMat: e.target.value})} className="font-mono font-black h-12" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button variant="outline" onClick={() => setStep(1)} className="flex-1 font-black text-[10px] uppercase tracking-widest py-7 rounded-2xl">Volver</Button>
                                        <Button onClick={handleApplyNotification} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] py-7 rounded-2xl shadow-xl shadow-emerald-100 transition-all hover:-translate-y-1">
                                            Aplicar y Notificar Parroquia
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in zoom-in-95">
                            <div className="w-28 h-28 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-4 border-white ring-8 ring-emerald-50">
                                <CheckCircle2 className="w-14 h-14" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Éxito Total!</h2>
                                <p className="text-gray-500 font-bold mt-2">La nota marginal ha sido insertada y el documento de respaldo está listo.</p>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border-2 border-emerald-100 shadow-xl text-left space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><FileText className="w-16 h-16" /></div>
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Soporte Generado</span>
                                    <Button onClick={handlePrint} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 h-10 px-6 font-black text-[10px] uppercase tracking-widest border border-emerald-200">
                                        <Printer className="w-4 h-4 mr-2" /> Imprimir Carta
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between"><span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Enviado a</span><span className="text-xs font-black text-gray-900 uppercase">{selectedBaptism.parishName}</span></div>
                                    <div className="flex justify-between"><span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Contraente</span><span className="text-xs font-black text-gray-900 uppercase">{selectedBaptism.firstName} {selectedBaptism.apellidos}</span></div>
                                    <div className="flex justify-between"><span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Cónyuge</span><span className="text-xs font-black text-gray-900 uppercase">{notifDetails.nombreConyuge}</span></div>
                                </div>
                            </div>

                            <Button onClick={() => { setStep(1); setResults([]); setSelectedBaptism(null); }} className="w-full bg-[#111111] hover:bg-gray-800 text-white font-black py-7 rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95">
                                Realizar Nueva Operación
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="archivo">
                    <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden shadow-2xl">
                        <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                                <History className="w-6 h-6 text-[#D4AF37]" />
                                Archivo de Respaldos Oficiales
                            </h3>
                            <span className="text-xs font-black text-gray-400 bg-white px-4 py-1.5 rounded-full border shadow-sm">{history.length} Documentos en Total</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <div className="p-24 text-center text-gray-400 italic flex flex-col items-center gap-4">
                                    <FileText className="w-16 h-16 opacity-10" />
                                    <p className="font-bold uppercase tracking-widest text-sm">No se han registrado comunicaciones aún</p>
                                </div>
                            ) : (
                                history.map((doc) => (
                                    <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-gray-50/80 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className={cn(
                                                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform border",
                                                doc.type === 'SENT' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            )}>
                                                {doc.type === 'SENT' ? <Send className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 uppercase tracking-[0.1em] flex items-center gap-2">
                                                    {doc.type === 'SENT' ? 'Enviado a:' : 'Recibido de:'}
                                                    <span className={cn(doc.type === 'SENT' ? "text-blue-700" : "text-emerald-700")}>
                                                        {doc.type === 'SENT' ? doc.targetBaptism?.parishName : doc.fromParish}
                                                    </span>
                                                </p>
                                                <p className="text-sm font-black text-gray-600 uppercase mt-1 tracking-tight">{doc.targetBaptism?.nombres} {doc.targetBaptism?.apellidos}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[10px] text-gray-400 font-black uppercase bg-white px-2 py-0.5 rounded border">{new Date(doc.date).toLocaleDateString()}</span>
                                                    <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">L:{doc.details?.libroMat} F:{doc.details?.folioMat} N:{doc.details?.numeroMat}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleViewDocument(doc)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
                                                <Eye className="w-4 h-4" /> Ver
                                            </button>
                                            <button onClick={() => {
                                                setViewingDoc(doc);
                                                setSelectedBaptism(doc.targetBaptism);
                                                setNotifDetails(doc.details);
                                                setTimeout(() => handleHistoryPrint(), 150);
                                            }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm border border-[#D4AF37]/20">
                                                <Printer className="w-4 h-4" /> Imprimir
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* MODAL DE VISUALIZACIÓN DE DOCUMENTO */}
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Documento de Respaldo Matrimonial">
                {viewingDoc && (
                    <div className="space-y-8 max-w-2xl mx-auto p-4">
                        <div className="bg-gray-50 p-8 rounded-3xl border-2 border-gray-100 shadow-inner relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-5"><FileText className="w-32 h-32" /></div>
                            <div className="text-center mb-8 border-b border-gray-200 pb-6">
                                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{viewingDoc.dioceseName}</h4>
                                <p className="text-sm font-black text-[#D4AF37] uppercase tracking-widest mt-1">{viewingDoc.fromParish}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 text-xs font-bold text-gray-600 uppercase tracking-widest">
                                <div className="space-y-4">
                                    <div className="space-y-1"><span className="text-[10px] font-black opacity-50 block">Contraente</span><span className="text-sm font-black text-gray-900">{viewingDoc.targetBaptism?.nombres} {viewingDoc.targetBaptism?.apellidos}</span></div>
                                    <div className="space-y-1"><span className="text-[10px] font-black opacity-50 block">Cónyuge</span><span className="text-sm font-black text-gray-900">{viewingDoc.details?.nombreConyuge}</span></div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <div className="space-y-1"><span className="text-[10px] font-black opacity-50 block">Fecha Matrimonio</span><span className="text-sm font-black text-gray-900">{viewingDoc.details?.fechaMatrimonio}</span></div>
                                    <div className="space-y-1"><span className="text-[10px] font-black opacity-50 block">Destino</span><span className="text-sm font-black text-emerald-600 underline">{viewingDoc.targetBaptism?.parishName}</span></div>
                                </div>
                            </div>

                            <div className="mt-8 bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-black text-xs">REF</div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registro en Libro</p>
                                        <p className="font-mono text-sm font-black text-gray-900">Libro {viewingDoc.details?.libroMat}, Folio {viewingDoc.details?.folioMat}, Número {viewingDoc.details?.numeroMat}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Envío</p>
                                    <p className="text-xs font-black text-gray-900">{new Date(viewingDoc.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="flex-1 font-black text-[10px] uppercase py-6 rounded-2xl">Cerrar Archivo</Button>
                            <Button onClick={() => {
                                setViewingDoc(viewingDoc);
                                setSelectedBaptism(viewingDoc.targetBaptism);
                                setNotifDetails(viewingDoc.details);
                                setTimeout(() => handleHistoryPrint(), 150);
                            }} className="flex-1 bg-gray-900 hover:bg-black text-white font-black text-[10px] uppercase py-6 rounded-2xl gap-2 shadow-xl">
                                <Printer className="w-4 h-4" /> Ejecutar Impresión Carta
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default MatrimonialNotificationPage;

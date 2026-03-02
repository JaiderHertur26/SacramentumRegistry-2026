
import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Search, Mail, User, BookOpen, MapPin,
    CheckCircle2, AlertCircle, Send, FileText,
    ArrowRight, Globe, Building2, Printer, X, History
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

const MatrimonialNotificationPage = () => {
    const { user } = useAuth();
    const {
        data,
        obtenerNotasAlMargen,
        addNotificationToParish
    } = useAppData();
    const { toast } = useToast();
    const printRef = useRef();

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

    useEffect(() => {
        if (user?.parishId) {
            const senderDocsKey = `sentNotifications_${user?.parishId}`;
            const receivedDocsKey = `receivedNotifications_${user?.parishId}`;
            const sent = JSON.parse(localStorage.getItem(senderDocsKey) || '[]');
            const received = JSON.parse(localStorage.getItem(receivedDocsKey) || '[]');
            setHistory([...sent, ...received].sort((a, b) => new Date(b.date) - new Date(a.date)));
        }
    }, [user?.parishId, step]);

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

        const notes = obtenerNotasAlMargen(targetParishId);
        let template = notes.porNotificacionMatrimonial || "EL [FECHA_NOTIFICACION], SE RECIBIO NOTIFICACION DE MATRIMONIO CELEBRADO EL DIA [FECHA_MATRIMONIO] EN LA PARROQUIA [PARROQUIA_MATRIMONIO], CON [NOMBRE_CONYUGE]. LIBRO [LIBRO_MAT], FOLIO [FOLIO_MAT], NUMERO [NUMERO_MAT].";

        const marginalNoteText = template
            .replace("[FECHA_NOTIFICACION]", new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase())
            .replace("[FECHA_MATRIMONIO]", notifDetails.fechaMatrimonio.toUpperCase())
            .replace("[PARROQUIA_MATRIMONIO]", user?.parishName.toUpperCase())
            .replace("[NOMBRE_CONYUGE]", notifDetails.nombreConyuge.toUpperCase())
            .replace("[LIBRO_MAT]", notifDetails.libroMat)
            .replace("[FOLIO_MAT]", notifDetails.folioMat)
            .replace("[NUMERO_MAT]", notifDetails.numeroMat);

        // Afectar la partida: Nota marginal y estado
        targetBaptisms[baptismIndex] = {
            ...targetBaptisms[baptismIndex],
            notaMarginalMatrimonio: marginalNoteText,
            isMarried: true,
            updatedAt: new Date().toISOString()
        };
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
            dioceseName: user?.dioceseName
        };

        // Guardar respaldo en emisor
        const senderDocsKey = `sentNotifications_${user?.parishId}`;
        const sentDocs = JSON.parse(localStorage.getItem(senderDocsKey) || '[]');
        sentDocs.push({ ...supportDoc, type: 'SENT' });
        localStorage.setItem(senderDocsKey, JSON.stringify(sentDocs));

        // Guardar respaldo en receptor
        const receiverDocsKey = `receivedNotifications_${targetParishId}`;
        const receivedDocs = JSON.parse(localStorage.getItem(receiverDocsKey) || '[]');
        receivedDocs.push({ ...supportDoc, type: 'RECEIVED' });
        localStorage.setItem(receiverDocsKey, JSON.stringify(receivedDocs));

        setStep(3);
        toast({ title: "Notificación Aplicada", description: "La nota marginal ha sido actualizada y la parroquia notificada.", variant: "success" });
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const PrintFormat = () => (
        <div className="hidden">
            <div ref={printRef} className="p-16 bg-white text-black font-serif text-[12pt] leading-relaxed w-[8.5in] h-[11in] mx-auto border border-gray-100">
                <div className="text-center mb-12">
                    <h1 className="text-2xl font-bold uppercase mb-2">{user?.dioceseName || 'DIÓCESIS'}</h1>
                    <h2 className="text-xl font-bold uppercase mb-1">{user?.parishName}</h2>
                    <p className="text-xs italic">Notificación de Matrimonio Contraído</p>
                    <div className="w-full h-px bg-black mt-4"></div>
                </div>

                <div className="mb-10 text-right">
                    <p className="font-bold">FECHA: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="mb-10">
                    <p className="mb-4">Señor Párroco de la Parroquia:</p>
                    <p className="font-bold uppercase underline">{selectedBaptism?.parishName}</p>
                    <p className="mt-4">Estimado hermano en el sacerdocio,</p>
                </div>

                <div className="mb-10 text-justify">
                    <p>Por la presente, notifico a usted que en los Libros de Matrimonios de esta Parroquia se ha registrado el sacramento contraído por:</p>
                    <div className="my-6 p-4 border border-black rounded-lg">
                        <p className="mb-2 uppercase"><span className="font-bold">Contraente:</span> {selectedBaptism?.firstName || selectedBaptism?.nombres} {selectedBaptism?.lastName || selectedBaptism?.apellidos}</p>
                        <p className="mb-2 uppercase"><span className="font-bold">Con:</span> {notifDetails.nombreConyuge}</p>
                        <p className="mb-2 uppercase"><span className="font-bold">Fecha de Celebración:</span> {notifDetails.fechaMatrimonio}</p>
                        <p className="uppercase"><span className="font-bold">Registro:</span> Libro {notifDetails.libroMat}, Folio {notifDetails.folioMat}, Número {notifDetails.numeroMat}</p>
                    </div>
                    <p>Se solicita amablemente realizar la anotación correspondiente en el margen de la Partida de Bautismo de la persona mencionada, la cual se encuentra registrada bajo los siguientes datos en sus archivos:</p>
                    <p className="mt-4 font-bold text-center uppercase">Libro: {selectedBaptism?.book_number || selectedBaptism?.libro} | Folio: {selectedBaptism?.page_number || selectedBaptism?.folio} | Número: {selectedBaptism?.entry_number || selectedBaptism?.numero}</p>
                </div>

                <div className="mt-24 grid grid-cols-2 gap-12 text-center">
                    <div className="space-y-2">
                        <div className="w-full h-px bg-black mb-2"></div>
                        <p className="font-bold uppercase">{user?.username}</p>
                        <p className="text-xs uppercase">Párroco / Encargado</p>
                        <p className="text-[10px] text-gray-500">{user?.parishName}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center opacity-20">
                        <div className="w-24 h-24 border-4 border-black rounded-full flex items-center justify-center text-[10px] font-bold">
                            SELLO PARROQUIAL
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-16 left-16 right-16 text-[8pt] text-gray-400 italic border-t border-gray-100 pt-4">
                    Documento generado por el Sistema Eclesia Digital. Este documento constituye un respaldo oficial de la comunicación matrimonial entre parroquias.
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <PrintFormat />

            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Notificación Matrimonial</h1>
                    <p className="text-gray-500 font-bold text-sm">Búsqueda, envío y archivo de comunicaciones matrimoniales.</p>
                </div>
            </div>

            <Tabs defaultValue="nueva" className="w-full">
                <TabsList className="grid grid-cols-2 max-w-md mb-8 bg-gray-100 p-1 rounded-xl">
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
                                        Criterios de Búsqueda
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
                                        <Input placeholder="Ej: Juan Antonio" value={filters.nombres} onChange={e => setFilters({...filters, nombres: e.target.value})} />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Apellidos</label>
                                        <Input placeholder="Ej: Perez Rodriguez" value={filters.apellidos} onChange={e => setFilters({...filters, apellidos: e.target.value})} />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block">Alcance de Búsqueda</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setFilters({...filters, scope: 'diocese'})}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                                    filters.scope === 'diocese' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                                                )}
                                            >
                                                <Building2 className="w-3 h-3" /> Diócesis
                                            </button>
                                            <button
                                                onClick={() => setFilters({...filters, scope: 'all'})}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                                    filters.scope === 'all' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                                                )}
                                            >
                                                <Globe className="w-3 h-3" /> Global
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="w-full bg-[#111111] hover:bg-gray-800 text-white font-black py-6 rounded-xl uppercase tracking-[0.2em] shadow-lg mt-4"
                                    >
                                        {isSearching ? "Buscando..." : "Realizar Búsqueda"}
                                    </Button>
                                </div>
                            </div>

                            <div className="lg:col-span-8">
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-full flex flex-col min-h-[400px]">
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Resultados de Búsqueda</h3>
                                        <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded">{results.length} coincidencias</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                        {results.length === 0 && !isSearching && (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                                                <User className="w-16 h-16 mb-4 text-gray-300" />
                                                <p className="font-black text-gray-900 uppercase tracking-widest text-sm">Inicie una búsqueda</p>
                                                <p className="text-xs font-bold text-gray-500 mt-1">Los resultados aparecerán en esta sección.</p>
                                            </div>
                                        )}

                                        {results.map((b) => (
                                            <div
                                                key={b.id}
                                                onClick={() => setSelectedBaptism(b)}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 transition-all cursor-pointer group",
                                                    selectedBaptism?.id === b.id
                                                        ? "border-emerald-500 bg-emerald-50"
                                                        : "border-gray-100 hover:border-emerald-200 hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                            selectedBaptism?.id === b.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-500"
                                                        )}>
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 leading-none">{b.firstName || b.nombres} {b.lastName || b.apellidos}</p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight mt-1">{b.parishName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubicación Partida</p>
                                                        <p className="font-mono text-xs font-bold text-gray-900">L:{b.book_number || b.libro} F:{b.page_number || b.folio} N:{b.entry_number || b.numero}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedBaptism && (
                                        <div className="p-4 border-t border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                <p className="text-xs font-bold text-emerald-700">Partida seleccionada: <span className="font-black">{selectedBaptism.firstName || selectedBaptism.nombres}</span></p>
                                            </div>
                                            <Button
                                                onClick={() => setStep(2)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6"
                                            >
                                                Continuar <ArrowRight className="ml-2 w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-white rounded-2xl border-2 border-emerald-100 shadow-xl overflow-hidden">
                                <div className="bg-emerald-500 p-6 text-white">
                                    <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                                        <Send className="w-6 h-6" /> Detalle de Notificación
                                    </h3>
                                    <p className="text-emerald-100 text-xs font-bold mt-1 uppercase tracking-tight">Aplicando matrimonio para: {selectedBaptism.firstName || selectedBaptism.nombres} {selectedBaptism.lastName || selectedBaptism.apellidos}</p>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Matrimonio</label>
                                            <Input type="date" value={notifDetails.fechaMatrimonio} onChange={e => setNotifDetails({...notifDetails, fechaMatrimonio: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Cónyuge</label>
                                            <Input placeholder="Nombre Completo" value={notifDetails.nombreConyuge} onChange={e => setNotifDetails({...notifDetails, nombreConyuge: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2">Referencia de Libro Matrimonial</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Libro Nº</label>
                                                <Input placeholder="0001" value={notifDetails.libroMat} onChange={e => setNotifDetails({...notifDetails, libroMat: e.target.value})} className="font-mono font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Folio Nº</label>
                                                <Input placeholder="0001" value={notifDetails.folioMat} onChange={e => setNotifDetails({...notifDetails, folioMat: e.target.value})} className="font-mono font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Número Nº</label>
                                                <Input placeholder="0001" value={notifDetails.numeroMat} onChange={e => setNotifDetails({...notifDetails, numeroMat: e.target.value})} className="font-mono font-bold" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-4">
                                        <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Acción de Alta Importancia</p>
                                            <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
                                                Al aplicar esta notificación, se actualizará permanentemente la nota marginal de la partida de bautismo seleccionada en la parroquia {selectedBaptism.parishName}.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="flex-1 font-black text-[10px] uppercase tracking-widest py-6"
                                        >
                                            Volver Atrás
                                        </Button>
                                        <Button
                                            onClick={handleApplyNotification}
                                            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] py-6 shadow-lg shadow-emerald-100"
                                        >
                                            Aplicar Notificación Matrimonial
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="max-w-md mx-auto py-12 text-center space-y-6">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">¡Proceso Completado!</h2>
                                <p className="text-gray-500 font-bold mt-2">La notificación matrimonial ha sido enviada y la partida de bautismo actualizada correctamente.</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-sm text-left space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-gray-400" />
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Soporte Generado</span>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={handlePrint} className="h-8 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50">
                                        <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Notificado a:</span>
                                        <span className="text-xs font-black text-gray-900 uppercase">{selectedBaptism.parishName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Cónyuge:</span>
                                        <span className="text-xs font-black text-gray-900 uppercase">{notifDetails.nombreConyuge}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Ref. Matrimonial:</span>
                                        <span className="text-xs font-mono font-black text-gray-900 uppercase">L:{notifDetails.libroMat} F:{notifDetails.folioMat} N:{notifDetails.numeroMat}</span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => { setStep(1); setResults([]); setSelectedBaptism(null); }}
                                className="w-full bg-[#111111] hover:bg-gray-800 text-white font-black py-6 rounded-xl uppercase tracking-[0.2em]"
                            >
                                Realizar Nueva Notificación
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="archivo">
                    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-400" />
                                Historial de Comunicaciones
                            </h3>
                            <span className="text-[10px] font-black text-gray-400">{history.length} Documentos</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <div className="p-20 text-center text-gray-400 italic">No hay documentos registrados.</div>
                            ) : (
                                history.map((doc) => (
                                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                doc.type === 'SENT' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                {doc.type === 'SENT' ? <Send className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                                    {doc.type === 'SENT' ? 'Enviado a: ' : 'Recibido de: '}
                                                    {doc.type === 'SENT' ? doc.targetBaptism?.parishName : doc.fromParish}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">{doc.targetBaptism?.nombres} {doc.targetBaptism?.apellidos}</p>
                                                <p className="text-[9px] text-gray-400 font-black">{new Date(doc.date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-black text-gray-400 mr-4">L:{doc.details?.libroMat} F:{doc.details?.folioMat} N:{doc.details?.numeroMat}</span>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                                                setSelectedBaptism(doc.targetBaptism);
                                                setNotifDetails(doc.details);
                                                setTimeout(() => handlePrint(), 100);
                                            }}>
                                                <Printer className="w-4 h-4 text-gray-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
};

export default MatrimonialNotificationPage;


import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, Loader2, Search, Trash2, FileText, UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

const EditDecreeReplacementSheet = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { 
        getDecreeReplacementsBySacrament, 
        updateDecreeReplacement, 
        deleteDecreeReplacement, 
        getMisDatosList, 
        getParrocoActual,
        getConceptosAnulacion
    } = useAppData();

    const [activeTab, setActiveTab] = useState("bautismo");
    const [decrees, setDecrees] = useState([]);
    const [selectedDecreeId, setSelectedDecreeId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [conceptos, setConceptos] = useState([]);

    const [decreeData, setDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: '',
        targetName: '',
        conceptoAnulacionId: '' 
    });

    const [newPartida, setNewPartida] = useState({
        sacramentDate: '', firstName: '', lastName: '', birthDate: '', lugarNacimientoDetalle: '', lugarBautismo: '',
        fatherName: '', ceduPadre: '', motherName: '', ceduMadre: '', tipoUnionPadres: '1', sex: '1',
        paternalGrandparents: '', maternalGrandparents: '', godparents: '', minister: '', ministerFaith: '',
        serialRegCivil: '', nuipNuit: '', oficinaRegistro: '', fechaExpedicion: '',
        book: '', page: '', entry: '' 
    });

    const [activePriest, setActivePriest] = useState(null);

    // 1. Carga inicial de Decretos y Catálogos
    useEffect(() => {
        if (user?.parishId || user?.dioceseId) {
            const parishId = user.parishId || user.dioceseId;
            loadDecrees();
            
            const allConcepts = getConceptosAnulacion(parishId);
            setConceptos(allConcepts.filter(c => c.tipo === 'porReposicion' || c.tipo === 'porCorreccion'));

            const misDatos = getMisDatosList(parishId);
            let parishLabel = `${user.parishName || 'Parroquia'} - ${user.city || 'Ciudad'}`;
            if (misDatos && misDatos.length > 0) {
                parishLabel = `${misDatos[0].nombre || user.parishName} - ${misDatos[0].ciudad || user.city}`;
            }
            setDecreeData(prev => ({ ...prev, parroquia: parishLabel }));

            const priest = getParrocoActual(parishId);
            if (priest) {
                setActivePriest(`${priest.nombre} ${priest.apellido || ''}`.trim());
            }
        }
    }, [user, activeTab, searchParams]);

    const loadDecrees = () => {
        const allDecrees = getDecreeReplacementsBySacrament(activeTab, user?.parishId || user?.dioceseId);
        setDecrees(allDecrees);

        const idParam = searchParams.get('id');
        if (idParam && allDecrees.some(d => d.id === idParam)) {
            setSelectedDecreeId(idParam);
        }
    };

    // 2. Mapeo profundo al seleccionar un decreto del listado
    useEffect(() => {
        if (selectedDecreeId) {
            const decree = decrees.find(d => d.id === selectedDecreeId);
            if (decree) {
                setDecreeData({
                    parroquia: decree.parroquia || decreeData.parroquia,
                    decreeNumber: decree.decreeNumber || decree.numeroDecreto || '',
                    decreeDate: decree.decreeDate || decree.fechaDecreto || '',
                    targetName: decree.targetName || '',
                    conceptoAnulacionId: decree.conceptoAnulacionId || ''
                });

                const bd = decree.datosNuevaPartida || {};
                const summary = decree.newPartidaSummary || {};

                setNewPartida({
                    sacramentDate: bd.fechaSacramento || bd.sacramentDate || bd.fecbau || summary.sacramentDate || '',
                    lugarBautismo: bd.lugarBautismo || bd.sacramentPlace || bd.lugbau || '',
                    firstName: bd.nombres || bd.firstName || summary.firstName || '',
                    lastName: bd.apellidos || bd.lastName || summary.lastName || '',
                    birthDate: bd.fechaNacimiento || bd.birthDate || bd.fecnac || summary.birthDate || '',
                    lugarNacimientoDetalle: bd.lugarNacimiento || bd.lugarNacimientoDetalle || bd.lugarn || '',
                    fatherName: bd.nombrePadre || bd.fatherName || bd.padre || '',
                    ceduPadre: bd.cedulaPadre || bd.cedupad || '',
                    motherName: bd.nombreMadre || bd.motherName || bd.madre || '',
                    ceduMadre: bd.cedulaMadre || bd.cedumad || '',
                    tipoUnionPadres: String(bd.tipoUnionPadres || bd.tipohijo || '1'),
                    sex: String(bd.sexo || bd.sex || '1'),
                    paternalGrandparents: bd.abuelosPaternos || bd.paternalGrandparents || bd.abuepat || '',
                    maternalGrandparents: bd.abuelosMaternos || bd.maternalGrandparents || bd.abuemat || '',
                    godparents: bd.padrinos || bd.godparents || '',
                    minister: bd.ministro || bd.minister || '',
                    ministerFaith: bd.daFe || bd.ministerFaith || bd.dafe || '',
                    // Registro Civil mapeado al estándar de la Parroquia
                    serialRegCivil: bd.serialRegistro || bd.serialRegCivil || bd.regciv || '',
                    nuipNuit: bd.nuip || bd.nuipNuit || '',
                    oficinaRegistro: bd.oficinaRegistro || bd.notaria || '',
                    fechaExpedicion: bd.fechaExpedicionRegistro || bd.fechaExpedicion || bd.fecregis || '',
                    book: summary.book || bd.libro || bd.book_number || '',
                    page: summary.page || bd.folio || bd.page_number || '',
                    entry: summary.entry || bd.numero || bd.entry_number || ''
                });
            }
        }
    }, [selectedDecreeId, decrees]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedDecreeId) return;
        setIsSubmitting(true);
        
        try {
            // TRADUCCIÓN PARA LA BASE PERMANENTE (Arregla Modal de Detalles)
            const standardPartidaData = {
                ...newPartida,
                nombres: newPartida.firstName,
                apellidos: newPartida.lastName,
                fecbau: newPartida.sacramentDate,
                fecnac: newPartida.birthDate,
                lugarn: newPartida.lugarNacimientoDetalle,
                padre: newPartida.fatherName,
                cedupad: newPartida.ceduPadre,
                madre: newPartida.motherName,
                cedumad: newPartida.ceduMadre,
                tipohijo: newPartida.tipoUnionPadres,
                sexo: newPartida.sex,
                abuepat: newPartida.paternalGrandparents,
                abuemat: newPartida.maternalGrandparents,
                padrinos: newPartida.godparents,
                ministro: newPartida.minister,
                dafe: newPartida.ministerFaith,
                // Registro Civil Estándar
                serialRegistro: newPartida.serialRegCivil,
                regciv: newPartida.serialRegCivil,
                nuip: newPartida.nuipNuit,
                oficinaRegistro: newPartida.oficinaRegistro,
                notaria: newPartida.oficinaRegistro,
                fechaExpedicionRegistro: newPartida.fechaExpedicion,
                fecregis: newPartida.fechaExpedicion
            };

            const updatedDecree = {
                ...decreeData,
                newPartidaSummary: { book: newPartida.book, page: newPartida.page, entry: newPartida.entry },
                datosNuevaPartida: standardPartidaData,
                targetName: `${newPartida.firstName} ${newPartida.lastName}`.toUpperCase()
            };

            const result = updateDecreeReplacement(selectedDecreeId, updatedDecree, user?.parishId);

            if (result.success) {
                // ACTUALIZACIÓN FÍSICA DE LA PARTIDA EN BAUTISMOS
                const registryKey = `baptisms_${user.parishId}`;
                const allRecords = JSON.parse(localStorage.getItem(registryKey) || '[]');
                const decree = decrees.find(d => d.id === selectedDecreeId);
                const partId = decree?.newBaptismIdRepo || decree?.newPartidaId;

                const idx = allRecords.findIndex(b => b.id === partId);
                if (idx !== -1) {
                    allRecords[idx] = { 
                        ...allRecords[idx], 
                        ...standardPartidaData,
                        replacementDecreeRef: decreeData.decreeNumber,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem(registryKey, JSON.stringify(allRecords));
                }

                loadDecrees();
                toast({ title: "Cambios Guardados", description: "El decreto y la partida fueron actualizados.", className: "bg-green-50 border-green-200 text-green-900" });
            }
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!selectedDecreeId) return;
        const result = deleteDecreeReplacement(selectedDecreeId, user?.parishId);
        if (result.success) {
            setDecrees(prev => prev.filter(d => d.id !== selectedDecreeId));
            setSelectedDecreeId("");
            setShowDeleteModal(false);
            toast({ title: "Eliminado", description: "El decreto ha sido borrado." });
        }
    };

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/parroquia/bautismo/decreto-reposicion')} className="p-0 hover:bg-transparent">
                    <ArrowLeft className="w-6 h-6 text-gray-500" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Editar Decreto Reposición (Hoja)</h1>
                    <p className="text-gray-500 text-sm">Gestión integral de decretos y partidas supletorias.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[calc(100vh-200px)] min-h-[600px] flex gap-6 overflow-hidden">
                {/* LISTADO LATERAL */}
                <div className="w-1/4 border-r border-gray-100 pr-4 flex flex-col h-full">
                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input placeholder="Buscar..." className="pl-8 text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                        {decrees.filter(d => `${d.targetName} ${d.decreeNumber}`.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
                            <button key={d.id} onClick={() => setSelectedDecreeId(d.id)} className={cn("w-full text-left p-3 rounded-lg border text-xs transition-all", selectedDecreeId === d.id ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300" : "bg-white hover:bg-gray-50")}>
                                <div className="font-bold text-blue-900">{d.decreeNumber || d.numeroDecreto}</div>
                                <div className="truncate font-medium text-gray-600">{d.targetName}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* FORMULARIO DE EDICIÓN */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
                    {!selectedDecreeId ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50"><Search className="w-10 h-10 mb-2 opacity-20" /><p>Seleccione un decreto para editar</p></div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-300 pb-10">
                            {/* SECCIÓN 1 */}
                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                                <h3 className="text-sm font-bold text-blue-800 uppercase mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> 1. Datos del Decreto</h3>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="col-span-3"><label className="text-[10px] font-bold text-gray-500 uppercase">Parroquia</label><Input value={decreeData.parroquia} readOnly className="bg-gray-200/50" /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Número</label><Input name="decreeNumber" value={decreeData.decreeNumber} onChange={e => setDecreeData({...decreeData, decreeNumber: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Fecha</label><Input type="date" name="decreeDate" value={decreeData.decreeDate} onChange={e => setDecreeData({...decreeData, decreeDate: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Concepto</label>
                                        <select name="conceptoAnulacionId" value={decreeData.conceptoAnulacionId} onChange={e => setDecreeData({...decreeData, conceptoAnulacionId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                                            <option value="">Seleccionar...</option>
                                            {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2 */}
                            <div className="bg-white rounded-lg p-6 border-l-4 border-green-600 shadow-sm border">
                                <h3 className="text-sm font-bold text-gray-800 uppercase mb-4 flex items-center gap-2 border-b pb-2"><UserPlus className="w-4 h-4 text-green-600" /> 2. Datos de Nueva Partida (Supletorio)</h3>
                                <div className="grid grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded border">
                                    <div><label className="text-[10px] font-bold text-gray-400">Libro</label><Input name="book" value={newPartida.book} onChange={e => setNewPartida({...newPartida, book: e.target.value})} className="font-mono text-center" /></div>
                                    <div><label className="text-[10px] font-bold text-gray-400">Folio</label><Input name="page" value={newPartida.page} onChange={e => setNewPartida({...newPartida, page: e.target.value})} className="font-mono text-center" /></div>
                                    <div><label className="text-[10px] font-bold text-gray-400">Número</label><Input name="entry" value={newPartida.entry} onChange={e => setNewPartida({...newPartida, entry: e.target.value})} className="font-mono text-center" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-gray-500">Nombres</label><Input name="firstName" value={newPartida.firstName} onChange={e => setNewPartida({...newPartida, firstName: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500">Apellidos</label><Input name="lastName" value={newPartida.lastName} onChange={e => setNewPartida({...newPartida, lastName: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500">Fec. Nacimiento</label><Input type="date" name="birthDate" value={newPartida.birthDate} onChange={e => setNewPartida({...newPartida, birthDate: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500">Padre</label><Input name="fatherName" value={newPartida.fatherName} onChange={e => setNewPartida({...newPartida, fatherName: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500">Madre</label><Input name="motherName" value={newPartida.motherName} onChange={e => setNewPartida({...newPartida, motherName: e.target.value})} /></div>
                                    
                                    <div className="col-span-2 grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border">
                                        <h4 className="col-span-4 text-[10px] font-bold text-blue-600 uppercase border-b pb-1">Registro Civil</h4>
                                        <div><label className="text-[9px] font-bold text-gray-400">Serial</label><Input name="serialRegCivil" value={newPartida.serialRegCivil} onChange={e => setNewPartida({...newPartida, serialRegCivil: e.target.value})} /></div>
                                        <div><label className="text-[9px] font-bold text-gray-400">NUIP</label><Input name="nuipNuit" value={newPartida.nuipNuit} onChange={e => setNewPartida({...newPartida, nuipNuit: e.target.value})} /></div>
                                        <div><label className="text-[9px] font-bold text-gray-400">Oficina</label><Input name="oficinaRegistro" value={newPartida.oficinaRegistro} onChange={e => setNewPartida({...newPartida, oficinaRegistro: e.target.value})} /></div>
                                        <div><label className="text-[9px] font-bold text-gray-400">Fecha Exp.</label><Input type="date" name="fechaExpedicion" value={newPartida.fechaExpedicion} onChange={e => setNewPartida({...newPartida, fechaExpedicion: e.target.value})} /></div>
                                    </div>
                                    
                                    <div className="col-span-2 flex justify-between gap-4 mt-6 border-t pt-4">
                                        <Button type="button" variant="destructive" onClick={() => setShowDeleteModal(true)}><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cerrar</Button>
                                            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Guardar Cambios</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmar Eliminación">
                <div className="p-4 text-center">
                    <p className="mb-6 text-gray-600">¿Desea borrar este decreto? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-center gap-4"><Button variant="outline" onClick={() => setShowDeleteModal(false)}>No, Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Sí, Eliminar</Button></div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default EditDecreeReplacementSheet;

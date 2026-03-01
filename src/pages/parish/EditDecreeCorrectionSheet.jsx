import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, Loader2, Search, Trash2, FileText, UserPlus, AlertCircle, CheckCircle2, Heart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { updateBaptismPartidaMarginalNote } from '@/utils/updateBaptismPartidaMarginalNote.js';

const EditDecreeCorrectionSheet = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { 
        getBaptismCorrections, 
        updateBaptismCorrection, 
        deleteBaptismCorrection, 
        getBaptisms, 
        getConfirmations,
        getMatrimonios,
        getMisDatosList,
        getParrocoActual,
        getConceptosAnulacion
    } = useAppData();

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState("bautizos");
    const [decrees, setDecrees] = useState([]);
    const [selectedDecreeId, setSelectedDecreeId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [conceptos, setConceptos] = useState([]);

    // Section 1: Decree Data (Shared state structure, though values change)
    const [decreeData, setDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: '',
        targetName: '',
        book: '',
        page: '',
        entry: '',
        conceptoAnulacionId: '' 
    });

    // Search Result
    const [foundRecord, setFoundRecord] = useState(null);
    const [searchMessage, setSearchMessage] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Section 2: Forms for each sacrament
    const [newBaptismPartida, setNewBaptismPartida] = useState({
        sacramentDate: '', firstName: '', lastName: '', birthDate: '', lugarNacimientoDetalle: '',
        fatherName: '', motherName: '', tipoUnionPadres: '1', sex: '1',
        paternalGrandparents: '', maternalGrandparents: '', godparents: '', minister: '', ministerFaith: ''
    });

    const [newConfPartida, setNewConfPartida] = useState({
        sacramentDate: '', firstName: '', lastName: '', birthDate: '', lugarNacimientoDetalle: '',
        fatherName: '', motherName: '', padrino: '', madrina: '', minister: '', ministerFaith: ''
    });

    const [newMarPartida, setNewMarPartida] = useState({
        sacramentDate: '', husbandName: '', husbandSurname: '', wifeName: '', wifeSurname: '',
        husbandFather: '', husbandMother: '', wifeFather: '', wifeMother: '',
        witnesses: '', minister: '', ministerFaith: ''
    });

    const [activePriest, setActivePriest] = useState(null);

    // --- INITIALIZATION ---

    useEffect(() => {
        if (user?.parishId) {
            // Load Decrees based on active tab
            let allDecrees = [];
            if (activeTab === 'bautizos') allDecrees = getBaptismCorrections(user.parishId);
            else if (activeTab === 'confirmaciones') allDecrees = JSON.parse(localStorage.getItem(`confirmationCorrections_${user.parishId}`) || '[]');
            else if (activeTab === 'matrimonios') allDecrees = JSON.parse(localStorage.getItem(`marriageCorrections_${user.parishId}`) || '[]');

            setDecrees(allDecrees);

            // Load Concepts
            setConceptos(getConceptosAnulacion(user.parishId).filter(c => c.tipo === 'porCorreccion'));

            // Prepare Parish Name
            const misDatos = getMisDatosList(user.parishId);
            let parishLabel = (misDatos?.[0]?.nombre || user.parishName || 'Parroquia') + " - " + (misDatos?.[0]?.ciudad || user.city || 'Ciudad');
            setDecreeData(prev => ({ ...prev, parroquia: parishLabel }));

            const priest = getParrocoActual(user.parishId);
            if (priest) setActivePriest(`${priest.nombre} ${priest.apellido || ''}`.trim());

            // Handle URL params
            const idParam = searchParams.get('id');
            const sacramentParam = searchParams.get('sacrament');
            if (sacramentParam) {
                const map = { baptism: 'bautizos', confirmation: 'confirmaciones', marriage: 'matrimonios' };
                if (map[sacramentParam]) setActiveTab(map[sacramentParam]);
            }
            if (idParam && allDecrees.some(d => d.id === idParam)) setSelectedDecreeId(idParam);
            else setSelectedDecreeId("");
        }
    }, [user, activeTab, searchParams]);

    // --- LOAD SELECTED DECREE ---
    useEffect(() => {
        if (selectedDecreeId) {
            const decree = decrees.find(d => d.id === selectedDecreeId);
            if (decree) {
                setDecreeData({
                    parroquia: decreeData.parroquia,
                    decreeNumber: decree.decreeNumber || '',
                    decreeDate: decree.decreeDate || '',
                    targetName: decree.targetName || '',
                    book: decree.book || (decree.originalPartidaSummary?.book_number || decree.originalPartidaSummary?.libro || ''),
                    page: decree.page || (decree.originalPartidaSummary?.page_number || decree.originalPartidaSummary?.folio || ''),
                    entry: decree.entry || (decree.originalPartidaSummary?.entry_number || decree.originalPartidaSummary?.numero || ''),
                    conceptoAnulacionId: decree.conceptoAnulacionId || ''
                });

                if (activeTab === 'bautizos') {
                    const data = decree.baptismData || decree.newPartidaSummary || {};
                    setNewBaptismPartida({
                        sacramentDate: data.sacramentDate || data.fecbau || '',
                        firstName: data.firstName || data.nombres || '',
                        lastName: data.lastName || data.apellidos || '',
                        birthDate: data.birthDate || data.fecnac || '',
                        lugarNacimientoDetalle: data.lugarNacimientoDetalle || data.lugarn || '',
                        fatherName: data.fatherName || data.padre || '',
                        motherName: data.motherName || data.madre || '',
                        tipoUnionPadres: data.tipoUnionPadres || data.tipohijo || '1',
                        sex: data.sex || data.sexo || '1',
                        paternalGrandparents: data.paternalGrandparents || data.abuepat || '',
                        maternalGrandparents: data.maternalGrandparents || data.abuemat || '',
                        godparents: data.godparents || data.padrinos || '',
                        minister: data.minister || data.ministro || '',
                        ministerFaith: data.ministerFaith || data.dafe || ''
                    });
                } else if (activeTab === 'confirmaciones') {
                    const data = decree.newPartidaSummary || decree.confirmationData || {};
                    setNewConfPartida({
                        sacramentDate: data.sacramentDate || data.feccof || '',
                        firstName: data.firstName || data.nombres || '',
                        lastName: data.lastName || data.apellidos || '',
                        birthDate: data.birthDate || data.fecnac || '',
                        lugarNacimientoDetalle: data.lugarNacimientoDetalle || data.lugarNacimiento || '',
                        fatherName: data.fatherName || data.padre || '',
                        motherName: data.motherName || data.madre || '',
                        padrino: data.padrino || '',
                        madrina: data.madrina || '',
                        minister: data.minister || data.ministro || '',
                        ministerFaith: data.ministerFaith || data.dafe || ''
                    });
                } else if (activeTab === 'matrimonios') {
                    const data = decree.newPartidaSummary || decree.marriageData || {};
                    setNewMarPartida({
                        sacramentDate: data.sacramentDate || data.fechaCelebracion || '',
                        husbandName: data.husbandName || data.esposoNombres || '',
                        husbandSurname: data.husbandSurname || data.esposoApellidos || '',
                        wifeName: data.wifeName || data.esposaNombres || '',
                        wifeSurname: data.wifeSurname || data.esposaApellidos || '',
                        husbandFather: data.husbandFather || '',
                        husbandMother: data.husbandMother || '',
                        wifeFather: data.wifeFather || '',
                        wifeMother: data.wifeMother || '',
                        witnesses: data.witnesses || '',
                        minister: data.minister || data.ministro || '',
                        ministerFaith: data.ministerFaith || data.dafe || ''
                    });
                }
            }
        }
    }, [selectedDecreeId, decrees, activeTab]);

    // --- HANDLERS ---

    const handleDecreeChange = (e) => {
        const { name, value } = e.target;
        setDecreeData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedDecreeId) return;
        setIsSubmitting(true);
        
        try {
            const parishId = user?.parishId;
            let updatedDecree = { ...decreeData };

            if (activeTab === 'bautizos') {
                const result = updateBaptismCorrection(selectedDecreeId, { ...decreeData, newPartidaSummary: newBaptismPartida }, parishId);
                if (!result.success) throw new Error(result.message);

                // Update actual Baptism records (Anulada & Supletoria)
                const allBaptisms = getBaptisms(parishId);
                const decree = decrees.find(d => d.id === selectedDecreeId);
                const updated = allBaptisms.map(b => {
                    if (b.id === decree.newPartidaId) return { ...b, ...newBaptismPartida, updatedAt: new Date().toISOString() };
                    if (b.id === decree.originalPartidaId) return { ...b, conceptoAnulacionId: decreeData.conceptoAnulacionId, updatedAt: new Date().toISOString() };
                    return b;
                });
                localStorage.setItem(`baptisms_${parishId}`, JSON.stringify(updated));

            } else if (activeTab === 'confirmaciones') {
                const key = `confirmationCorrections_${parishId}`;
                const all = JSON.parse(localStorage.getItem(key) || '[]');
                const idx = all.findIndex(d => d.id === selectedDecreeId);
                all[idx] = { ...all[idx], ...decreeData, newPartidaSummary: newConfPartida, updatedAt: new Date().toISOString() };
                localStorage.setItem(key, JSON.stringify(all));

                const confKey = `confirmations_${parishId}`;
                const allConf = JSON.parse(localStorage.getItem(confKey) || '[]');
                const updatedConf = allConf.map(c => {
                    if (c.id === all[idx].newPartidaId) return { ...c, ...newConfPartida, updatedAt: new Date().toISOString() };
                    return c;
                });
                localStorage.setItem(confKey, JSON.stringify(updatedConf));

            } else if (activeTab === 'matrimonios') {
                const key = `marriageCorrections_${parishId}`;
                const all = JSON.parse(localStorage.getItem(key) || '[]');
                const idx = all.findIndex(d => d.id === selectedDecreeId);
                all[idx] = { ...all[idx], ...decreeData, newPartidaSummary: newMarPartida, updatedAt: new Date().toISOString() };
                localStorage.setItem(key, JSON.stringify(all));

                const marKey = `matrimonios_${parishId}`;
                const allMar = JSON.parse(localStorage.getItem(marKey) || '[]');
                const updatedMar = allMar.map(m => {
                    if (m.id === all[idx].newPartidaId) return { ...m, ...newMarPartida, updatedAt: new Date().toISOString() };
                    return m;
                });
                localStorage.setItem(marKey, JSON.stringify(updatedMar));
            }

            toast({ title: "Guardado", description: "Cambios guardados correctamente.", className: "bg-green-50" });
            navigate('/parroquia/decretos/ver-correcciones');
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!selectedDecreeId) return;
        const parishId = user?.parishId;

        if (activeTab === 'bautizos') {
            deleteBaptismCorrection(selectedDecreeId, parishId);
        } else {
            const key = activeTab === 'confirmaciones' ? `confirmationCorrections_${parishId}` : `marriageCorrections_${parishId}`;
            const all = JSON.parse(localStorage.getItem(key) || '[]');
            localStorage.setItem(key, JSON.stringify(all.filter(d => d.id !== selectedDecreeId)));
        }

        toast({ title: "Eliminado", description: "Decreto eliminado." });
        setSelectedDecreeId("");
        setShowDeleteModal(false);
        navigate('/parroquia/decretos/ver-correcciones');
    };

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/parroquia/decretos/ver-correcciones')} className="p-0 hover:bg-transparent">
                    <X className="w-6 h-6 text-gray-500" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Editar Decreto Corrección</h1>
                    <p className="text-gray-500 text-sm">Modifique los datos del decreto y la partida supletoria.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-[1400px] mx-auto p-6 h-[calc(100vh-180px)] min-h-[600px]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg shrink-0">
                        <TabsTrigger value="bautizos" className="font-bold data-[state=active]:text-blue-600">Bautizos</TabsTrigger>
                        <TabsTrigger value="confirmaciones" className="font-bold data-[state=active]:text-red-600">Confirmaciones</TabsTrigger>
                        <TabsTrigger value="matrimonios" className="font-bold data-[state=active]:text-purple-600">Matrimonios</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden min-h-0">
                        {/* SIDEBAR */}
                        <div className="lg:col-span-1 border-r border-gray-200 pr-4 flex flex-col h-full overflow-hidden">
                             <div className="relative mb-4 shrink-0">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <input placeholder="Buscar..." className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {decrees.filter(d => (d.targetName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.decreeNumber || '').toLowerCase().includes(searchTerm.toLowerCase())).map((decree) => (
                                    <button key={decree.id} onClick={() => setSelectedDecreeId(decree.id)} className={cn("w-full text-left p-3 rounded-lg text-sm border", selectedDecreeId === decree.id ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300" : "bg-white border-gray-100 hover:bg-gray-50")}>
                                        <div className="font-bold text-gray-800 flex justify-between"><span>{decree.decreeNumber}</span><span className="text-[10px] text-gray-400">{decree.decreeDate}</span></div>
                                        <div className="text-gray-600 truncate text-xs mt-1">{decree.targetName}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* FORM */}
                        <div className="lg:col-span-3 h-full overflow-y-auto custom-scrollbar px-2">
                            {selectedDecreeId ? (
                                <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto pb-20">
                                    <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-blue-600" /> DATOS DEL DECRETO</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label><Input value={decreeData.parroquia} readOnly className="bg-gray-100" /></div>
                                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">No. Decreto</label><Input name="decreeNumber" value={decreeData.decreeNumber} onChange={handleDecreeChange} /></div>
                                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Decreto</label><Input type="date" name="decreeDate" value={decreeData.decreeDate} onChange={handleDecreeChange} /></div>
                                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto Anulación</label><select name="conceptoAnulacionId" value={decreeData.conceptoAnulacionId} onChange={handleDecreeChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Seleccione...</option>{conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}</select></div>
                                        </div>
                                    </div>

                                    <TabsContent value="bautizos" className="mt-0">{renderBaptismForm()}</TabsContent>
                                    <TabsContent value="confirmaciones" className="mt-0">{renderConfirmationForm()}</TabsContent>
                                    <TabsContent value="matrimonios" className="mt-0">{renderMarriageForm()}</TabsContent>

                                    <div className="flex justify-between gap-4 pt-4 border-t border-gray-200 sticky bottom-0 bg-white p-4 shadow-lg rounded-t-lg z-10">
                                        <Button type="button" variant="destructive" onClick={() => setShowDeleteModal(true)} disabled={isSubmitting}><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
                                        <div className="flex gap-4">
                                            <Button type="button" variant="outline" onClick={() => navigate('/parroquia/decretos/ver-correcciones')} disabled={isSubmitting}>Cancelar</Button>
                                            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6">{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Guardar</Button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50"><Search className="w-12 h-12 mb-2 opacity-20" /><p>Seleccione un decreto para editar</p></div>
                            )}
                        </div>
                    </div>
                </Tabs>
            </div>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Decreto"><div className="space-y-4"><p className="text-gray-600">¿Desea eliminar este decreto? Esta acción no se puede deshacer.</p><div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Confirmar</Button></div></div></Modal>
        </DashboardLayout>
    );

    function renderBaptismForm() {
        return (
            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5 text-green-600" /> DATOS NUEVA PARTIDA (BAUTISMO)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha</label><Input type="date" value={newBaptismPartida.sacramentDate} onChange={(e) => setNewBaptismPartida({...newBaptismPartida, sacramentDate: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres</label><Input value={newBaptismPartida.firstName} onChange={(e) => setNewBaptismPartida({...newBaptismPartida, firstName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos</label><Input value={newBaptismPartida.lastName} onChange={(e) => setNewBaptismPartida({...newBaptismPartida, lastName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padre</label><Input value={newBaptismPartida.fatherName} onChange={(e) => setNewBaptismPartida({...newBaptismPartida, fatherName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madre</label><Input value={newBaptismPartida.motherName} onChange={(e) => setNewBaptismPartida({...newBaptismPartida, motherName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrinos</label><Input value={newBaptismPartida.godparents} onChange={(e) => setNewBaptismPartida({...newBaptismPartida, godparents: e.target.value})} /></div>
                </div>
            </div>
        );
    }

    function renderConfirmationForm() {
        return (
            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5 text-green-600" /> DATOS NUEVA PARTIDA (CONFIRMACIÓN)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha</label><Input type="date" value={newConfPartida.sacramentDate} onChange={(e) => setNewConfPartida({...newConfPartida, sacramentDate: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres</label><Input value={newConfPartida.firstName} onChange={(e) => setNewConfPartida({...newConfPartida, firstName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos</label><Input value={newConfPartida.lastName} onChange={(e) => setNewConfPartida({...newConfPartida, lastName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrino</label><Input value={newConfPartida.padrino} onChange={(e) => setNewConfPartida({...newConfPartida, padrino: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madrina</label><Input value={newConfPartida.madrina} onChange={(e) => setNewConfPartida({...newConfPartida, madrina: e.target.value})} /></div>
                </div>
            </div>
        );
    }

    function renderMarriageForm() {
        return (
            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><Heart className="w-5 h-5 text-green-600" /> DATOS NUEVA PARTIDA (MATRIMONIO)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha</label><Input type="date" value={newMarPartida.sacramentDate} onChange={(e) => setNewMarPartida({...newMarPartida, sacramentDate: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Novio</label><Input value={`${newMarPartida.husbandName} ${newMarPartida.husbandSurname}`} readOnly className="bg-gray-50" /></div>
                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Novia</label><Input value={`${newMarPartida.wifeName} ${newMarPartida.wifeSurname}`} readOnly className="bg-gray-50" /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Testigos</label><Input value={newMarPartida.witnesses} onChange={(e) => setNewMarPartida({...newMarPartida, witnesses: e.target.value})} /></div>
                </div>
            </div>
        );
    }
};

export default EditDecreeCorrectionSheet;
import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, ArrowLeft, FileText, UserPlus, AlertCircle, CheckCircle2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateUUID } from '@/utils/supabaseHelpers';

const NewDecreeCorrectionPage = () => {
    const { user } = useAuth();
    const { 
        getBaptisms, 
        getConfirmations,
        getMatrimonios,
        createBaptismCorrection,
        getParrocoActual, 
        getBaptismCorrections,
        getConceptosAnulacion,
        getMisDatosList,
        createNotification,
        data 
    } = useAppData();
    const { toast } = useToast();
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---
    const [isLoading, setIsLoading] = useState(false);
    const [conceptos, setConceptos] = useState([]);
    const [activePriest, setActivePriest] = useState(null);

    // BAPTISM STATE
    const [decreeData, setDecreeData] = useState({
        parroquia: '', decreeNumber: '', decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', targetName: '', book: '', page: '', entry: ''
    });
    const [foundRecord, setFoundRecord] = useState(null);
    const [searchMessage, setSearchMessage] = useState(null);
    const [newPartida, setNewPartida] = useState({
        sacramentDate: '', firstName: '', lastName: '', birthDate: '', lugarNacimientoDetalle: '',
        lugarBautismo: '', fatherName: '', ceduPadre: '', motherName: '', ceduMadre: '',
        tipoUnionPadres: '1', sex: '1', paternalGrandparents: '', maternalGrandparents: '',
        godparents: '', minister: '', ministerFaith: '', serialRegCivil: '', nuipNuit: '',
        oficinaRegistro: '', fechaExpedicion: ''
    });

    // CONFIRMATION STATE
    const [confDecreeData, setConfDecreeData] = useState({
        parroquia: '', decreeNumber: '', decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', targetName: '', book: '', page: '', entry: ''
    });
    const [confFoundRecord, setConfFoundRecord] = useState(null);
    const [confSearchMessage, setConfSearchMessage] = useState(null);
    const [newConfPartida, setNewConfPartida] = useState({
        sacramentDate: '', firstName: '', lastName: '', birthDate: '', lugarNacimientoDetalle: '',
        lugarConfirmacion: '', fatherName: '', motherName: '', padrino: '', madrina: '', minister: '', ministerFaith: ''
    });

    // MARRIAGE STATE
    const [marDecreeData, setMarDecreeData] = useState({
        parroquia: '', decreeNumber: '', decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', targetName: '', book: '', page: '', entry: ''
    });
    const [marFoundRecord, setMarFoundRecord] = useState(null);
    const [marSearchMessage, setMarSearchMessage] = useState(null);
    const [newMarPartida, setNewMarPartida] = useState({
        sacramentDate: '', lugarMatrimonio: '', husbandName: '', husbandSurname: '',
        wifeName: '', wifeSurname: '', witnesses: '', minister: '', ministerFaith: ''
    });

    const wrapperRef = useRef(null);

    // Initialization
    useEffect(() => {
        if (user) {
            const contextId = user.dioceseId || user.id;
            const allConceptos = getConceptosAnulacion(contextId);
            setConceptos(allConceptos.filter(c => c.tipo === 'porCorreccion'));

            const misDatosList = getMisDatosList(contextId);
            const entityLabel = misDatosList?.[0]
                ? `${misDatosList[0].nombre} - ${misDatosList[0].ciudad}`.toUpperCase()
                : `${user.dioceseName || 'CANCILLERÍA'} - ${user.city || 'BARRANQUILLA'}`.toUpperCase();

            setDecreeData(prev => ({ ...prev, parroquia: entityLabel }));
            setConfDecreeData(prev => ({ ...prev, parroquia: entityLabel }));
            setMarDecreeData(prev => ({ ...prev, parroquia: entityLabel }));

            const priest = getParrocoActual(contextId);
            if (priest) {
                const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
                setActivePriest(name);
                setNewPartida(p => ({ ...p, ministerFaith: name }));
                setNewConfPartida(p => ({ ...p, ministerFaith: name }));
                setNewMarPartida(p => ({ ...p, ministerFaith: name }));
            }
        }
    }, [user]);

    const getAllDioceseParishes = () => data.parishes.filter(p => p.dioceseId === user.dioceseId);

    const getSafeValue = (obj, ...keys) => {
        for (const key of keys) { if (obj[key] !== undefined && obj[key] !== null) return obj[key]; }
        return '';
    };

    // SEARCH HANDLERS
    const handleSearch = (type) => {
        const d = type === 'baptism' ? decreeData : type === 'conf' ? confDecreeData : marDecreeData;
        if (!d.book || !d.page || !d.entry) {
            const msg = { type: 'error', text: "Ingrese Libro, Folio y Número." };
            if (type === 'baptism') setSearchMessage(msg); else if (type === 'conf') setConfSearchMessage(msg); else setMarSearchMessage(msg);
            return;
        }

        setIsLoading(true);
        const parishes = getAllDioceseParishes();
        let found = null;

        for (const p of parishes) {
            const list = type === 'baptism' ? getBaptisms(p.id) : type === 'conf' ? getConfirmations(p.id) : getMatrimonios(p.id);
            const match = list.find(r => String(r.book_number) === String(d.book) && String(r.page_number) === String(d.page) && String(r.entry_number) === String(d.entry));
            if (match) { found = { ...match, parishId: p.id }; break; }
        }

        if (found) {
            if (found.status === 'anulada') {
                const msg = { type: 'error', text: "Esta partida ya está ANULADA." };
                if (type === 'baptism') setSearchMessage(msg); else if (type === 'conf') setConfSearchMessage(msg); else setMarSearchMessage(msg);
            } else {
                if (type === 'baptism') {
                    setFoundRecord(found);
                    setSearchMessage({ type: 'success', text: "Partida encontrada." });
                    setNewPartida(prev => ({ ...prev, firstName: found.firstName || found.nombres, lastName: found.lastName || found.apellidos, fatherName: found.fatherName || found.padre, motherName: found.motherName || found.madre, sacramentDate: found.sacramentDate || found.fecbau, birthDate: found.birthDate || found.fecnac }));
                } else if (type === 'conf') {
                    setConfFoundRecord(found);
                    setConfSearchMessage({ type: 'success', text: "Partida encontrada." });
                    setNewConfPartida(prev => ({ ...prev, firstName: found.firstName || found.nombres, lastName: found.lastName || found.apellidos, fatherName: found.fatherName || found.padre, motherName: found.motherName || found.madre, sacramentDate: found.sacramentDate || found.feccof }));
                } else {
                    setMarFoundRecord(found);
                    setMarSearchMessage({ type: 'success', text: "Partida encontrada." });
                    setNewMarPartida(prev => ({ ...prev, husbandName: found.husbandName || found.esposoNombres, husbandSurname: found.husbandSurname || found.esposoApellidos, wifeName: found.wifeName || found.esposaNombres, wifeSurname: found.wifeSurname || found.esposaApellidos, sacramentDate: found.sacramentDate || found.fechaCelebracion }));
                }
            }
        } else {
            const msg = { type: 'error', text: "No se encontró la partida en la diócesis." };
            if (type === 'baptism') setSearchMessage(msg); else if (type === 'conf') setConfSearchMessage(msg); else setMarSearchMessage(msg);
        }
        setIsLoading(false);
    };

    // SAVE HANDLER
    const handleSave = async (type) => {
        const d = type === 'baptism' ? decreeData : type === 'conf' ? confDecreeData : marDecreeData;
        const fr = type === 'baptism' ? foundRecord : type === 'conf' ? confFoundRecord : marFoundRecord;
        const np = type === 'baptism' ? newPartida : type === 'conf' ? newConfPartida : newMarPartida;

        if (!d.decreeNumber || !d.conceptoAnulacionId || !fr) {
            toast({ title: "Validación", description: "Complete los datos y busque la partida.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const targetParishId = fr.parishId;
            const contextId = user.dioceseId || user.id;

            // Simple logic for dual-write/notification
            const result = await createBaptismCorrection(d, fr.id, np, targetParishId);

            if (result.success) {
                await createNotification({
                    decree_id: result.data?.id || generateUUID(),
                    decree_type: 'correction',
                    parish_id: targetParishId,
                    message: `Nuevo decreto de corrección (${type}) #${d.decreeNumber} generado por Cancillería.`,
                    status: 'unread'
                });
                toast({ title: "Éxito", description: "Decreto creado y parroquia notificada." });
                navigate('/chancery/decree-correction/view');
            } else throw new Error(result.message);
        } catch (e) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout entityName={user?.dioceseName || "Cancillería"}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/chancery/decree-correction/view')} className="p-0 hover:bg-transparent"><ArrowLeft className="w-6 h-6 text-gray-500" /></Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Corrección (Diocesano)</h1>
                    <p className="text-gray-500 text-sm">Emisión de decretos para corrección de partidas en la diócesis.</p>
                </div>
            </div>

            <Tabs defaultValue="bautizos" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 max-w-2xl mx-auto">
                    <TabsTrigger value="bautizos">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmaciones">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonios">Matrimonios</TabsTrigger>
                </TabsList>

                {/* BAUTIZOS */}
                <TabsContent value="bautizos">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-blue-600" /> DATOS DEL DECRETO</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><label className="text-xs font-bold uppercase">Entidad Emisora</label><Input value={decreeData.parroquia} readOnly className="bg-gray-50" /></div>
                                <div><label className="text-xs font-bold uppercase">No. Decreto</label><Input value={decreeData.decreeNumber} onChange={e => setDecreeData({...decreeData, decreeNumber: e.target.value})} /></div>
                                <div><label className="text-xs font-bold uppercase">Concepto</label><select className="w-full h-10 border rounded-md px-3" value={decreeData.conceptoAnulacionId} onChange={e => setDecreeData({...decreeData, conceptoAnulacionId: e.target.value})}><option value="">Seleccione...</option>{conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}</select></div>
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-800 mb-4">BÚSQUEDA DE PARTIDA (Toda la Diócesis)</h4>
                                <div className="grid grid-cols-4 gap-4 items-end">
                                    <Input placeholder="Libro" value={decreeData.book} onChange={e => setDecreeData({...decreeData, book: e.target.value})} />
                                    <Input placeholder="Folio" value={decreeData.page} onChange={e => setDecreeData({...decreeData, page: e.target.value})} />
                                    <Input placeholder="Número" value={decreeData.entry} onChange={e => setDecreeData({...decreeData, entry: e.target.value})} />
                                    <Button onClick={() => handleSearch('baptism')} disabled={isLoading}>Buscar</Button>
                                </div>
                                {searchMessage && <p className={`mt-2 text-sm ${searchMessage.type==='error'?'text-red-600':'text-green-600'}`}>{searchMessage.text}</p>}
                                {foundRecord && <p className="mt-2 text-sm font-bold">Encontrado: {foundRecord.firstName} {foundRecord.lastName} (Parroquia: {data.parishes.find(p=>p.id===foundRecord.parishId)?.name})</p>}
                            </div>
                        </div>
                        {foundRecord && (
                            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                                <h3 className="text-lg font-bold text-green-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5"/> DATOS NUEVA PARTIDA</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <Input label="Nombres" value={newPartida.firstName} onChange={e => setNewPartida({...newPartida, firstName: e.target.value})} />
                                    <Input label="Apellidos" value={newPartida.lastName} onChange={e => setNewPartida({...newPartida, lastName: e.target.value})} />
                                    <Input label="Padre" value={newPartida.fatherName} onChange={e => setNewPartida({...newPartida, fatherName: e.target.value})} />
                                    <Input label="Madre" value={newPartida.motherName} onChange={e => setNewPartida({...newPartida, motherName: e.target.value})} />
                                </div>
                                <Button className="mt-8 w-full bg-green-600 hover:bg-green-700" onClick={() => handleSave('baptism')} disabled={isLoading}>Guardar Decreto de Bautismo</Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* CONFIRMACIONES */}
                <TabsContent value="confirmaciones">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-red-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-red-600" /> DATOS DEL DECRETO</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><label className="text-xs font-bold uppercase">Entidad Emisora</label><Input value={confDecreeData.parroquia} readOnly className="bg-gray-50" /></div>
                                <div><label className="text-xs font-bold uppercase">No. Decreto</label><Input value={confDecreeData.decreeNumber} onChange={e => setConfDecreeData({...confDecreeData, decreeNumber: e.target.value})} /></div>
                                <div><label className="text-xs font-bold uppercase">Concepto</label><select className="w-full h-10 border rounded-md px-3" value={confDecreeData.conceptoAnulacionId} onChange={e => setConfDecreeData({...confDecreeData, conceptoAnulacionId: e.target.value})}><option value="">Seleccione...</option>{conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}</select></div>
                            </div>
                            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 mb-4">BÚSQUEDA DE PARTIDA (Toda la Diócesis)</h4>
                                <div className="grid grid-cols-4 gap-4 items-end">
                                    <Input placeholder="Libro" value={confDecreeData.book} onChange={e => setConfDecreeData({...confDecreeData, book: e.target.value})} />
                                    <Input placeholder="Folio" value={confDecreeData.page} onChange={e => setConfDecreeData({...confDecreeData, page: e.target.value})} />
                                    <Input placeholder="Número" value={confDecreeData.entry} onChange={e => setConfDecreeData({...confDecreeData, entry: e.target.value})} />
                                    <Button onClick={() => handleSearch('conf')} disabled={isLoading} className="bg-red-600 hover:bg-red-700">Buscar</Button>
                                </div>
                                {confSearchMessage && <p className={`mt-2 text-sm ${confSearchMessage.type==='error'?'text-red-600':'text-green-600'}`}>{confSearchMessage.text}</p>}
                                {confFoundRecord && <p className="mt-2 text-sm font-bold">Encontrado: {confFoundRecord.firstName} {confFoundRecord.lastName} (Parroquia: {data.parishes.find(p=>p.id===confFoundRecord.parishId)?.name})</p>}
                            </div>
                        </div>
                        {confFoundRecord && (
                            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                                <h3 className="text-lg font-bold text-green-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5"/> DATOS NUEVA PARTIDA</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <Input label="Nombres" value={newConfPartida.firstName} onChange={e => setNewConfPartida({...newConfPartida, firstName: e.target.value})} />
                                    <Input label="Apellidos" value={newConfPartida.lastName} onChange={e => setNewConfPartida({...newConfPartida, lastName: e.target.value})} />
                                    <Input label="Padrino" value={newConfPartida.padrino} onChange={e => setNewConfPartida({...newConfPartida, padrino: e.target.value})} />
                                    <Input label="Madrina" value={newConfPartida.madrina} onChange={e => setNewConfPartida({...newConfPartida, madrina: e.target.value})} />
                                </div>
                                <Button className="mt-8 w-full bg-green-600 hover:bg-green-700" onClick={() => handleSave('conf')} disabled={isLoading}>Guardar Decreto de Confirmación</Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* MATRIMONIOS */}
                <TabsContent value="matrimonios">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-purple-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><Heart className="w-5 h-5 text-purple-600" /> DATOS DEL DECRETO</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><label className="text-xs font-bold uppercase">Entidad Emisora</label><Input value={marDecreeData.parroquia} readOnly className="bg-gray-50" /></div>
                                <div><label className="text-xs font-bold uppercase">No. Decreto</label><Input value={marDecreeData.decreeNumber} onChange={e => setMarDecreeData({...marDecreeData, decreeNumber: e.target.value})} /></div>
                                <div><label className="text-xs font-bold uppercase">Concepto</label><select className="w-full h-10 border rounded-md px-3" value={marDecreeData.conceptoAnulacionId} onChange={e => setMarDecreeData({...marDecreeData, conceptoAnulacionId: e.target.value})}><option value="">Seleccione...</option>{conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}</select></div>
                            </div>
                            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-bold text-purple-800 mb-4">BÚSQUEDA DE PARTIDA (Toda la Diócesis)</h4>
                                <div className="grid grid-cols-4 gap-4 items-end">
                                    <Input placeholder="Libro" value={marDecreeData.book} onChange={e => setMarDecreeData({...marDecreeData, book: e.target.value})} />
                                    <Input placeholder="Folio" value={marDecreeData.page} onChange={e => setMarDecreeData({...marDecreeData, page: e.target.value})} />
                                    <Input placeholder="Número" value={marDecreeData.entry} onChange={e => setMarDecreeData({...marDecreeData, entry: e.target.value})} />
                                    <Button onClick={() => handleSearch('mar')} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">Buscar</Button>
                                </div>
                                {marSearchMessage && <p className={`mt-2 text-sm ${marSearchMessage.type==='error'?'text-red-600':'text-green-600'}`}>{marSearchMessage.text}</p>}
                                {marFoundRecord && <p className="mt-2 text-sm font-bold">Encontrado: {marFoundRecord.husbandName} & {marFoundRecord.wifeName} (Parroquia: {data.parishes.find(p=>p.id===marFoundRecord.parishId)?.name})</p>}
                            </div>
                        </div>
                        {marFoundRecord && (
                            <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                                <h3 className="text-lg font-bold text-green-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5"/> DATOS NUEVA PARTIDA</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <Input label="Novio" value={`${newMarPartida.husbandName} ${newMarPartida.husbandSurname}`} readOnly />
                                    <Input label="Novia" value={`${newMarPartida.wifeName} ${newMarPartida.wifeSurname}`} readOnly />
                                    <Input label="Testigos" value={newMarPartida.witnesses} onChange={e => setNewMarPartida({...newMarPartida, witnesses: e.target.value})} />
                                    <Input label="Ministro" value={newMarPartida.minister} onChange={e => setNewMarPartida({...newMarPartida, minister: e.target.value})} />
                                </div>
                                <Button className="mt-8 w-full bg-green-600 hover:bg-green-700" onClick={() => handleSave('mar')} disabled={isLoading}>Guardar Decreto de Matrimonio</Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
};

export default NewDecreeCorrectionPage;
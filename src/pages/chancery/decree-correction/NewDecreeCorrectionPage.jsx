import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, ArrowLeft, FileText, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateUUID } from '@/utils/supabaseHelpers';

const NewDecreeCorrectionPage = () => {
    const { user } = useAuth();
    const { 
        getBaptisms, 
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
    const [decreeData, setDecreeData] = useState({ 
        parroquia: '', 
        decreeNumber: '', 
        decreeDate: new Date().toISOString().split('T')[0], 
        conceptoAnulacionId: '', 
        targetName: '', 
        book: '', 
        page: '', 
        entry: '' 
    });
    
    const [foundRecord, setFoundRecord] = useState(null);
    const [searchMessage, setSearchMessage] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    const [newPartida, setNewPartida] = useState({ 
        sacramentDate: '', 
        firstName: '', 
        lastName: '', 
        birthDate: '', 
        lugarNacimientoDetalle: '', 
        lugarBautismo: '', 
        fatherName: '', 
        ceduPadre: '', 
        motherName: '', 
        ceduMadre: '', 
        tipoUnionPadres: '1', 
        sex: '1', 
        paternalGrandparents: '', 
        maternalGrandparents: '', 
        godparents: '', 
        minister: '', 
        ministerFaith: '', 
        serialRegCivil: '', 
        nuipNuit: '', 
        oficinaRegistro: '', 
        fechaExpedicion: '' 
    });
    
    const [conceptos, setConceptos] = useState([]);
    const [activePriest, setActivePriest] = useState(null);

    // Initialization
    useEffect(() => {
        if (user) {
            const contextId = user.dioceseId || user.id;
            const allConceptos = getConceptosAnulacion(contextId);
            setConceptos(allConceptos.filter(c => c.tipo === 'porCorreccion'));

            const misDatosList = getMisDatosList(contextId);
            let entityLabel = '';
            
            if (misDatosList && misDatosList.length > 0) {
                const dato = misDatosList[0];
                const nombre = (dato.nombre || user.dioceseName || 'CANCILLERÍA').toUpperCase();
                const ciudad = (dato.ciudad || user.city || 'BARRANQUILLA').toUpperCase();
                const departamento = (dato.departamento || 'ATLÁNTICO').toUpperCase(); 
                const pais = (dato.pais || 'COLOMBIA').toUpperCase();
                entityLabel = `${nombre} - ${ciudad}, ${departamento} - ${pais}`;
            } else {
                const nombre = (user.dioceseName || 'CANCILLERÍA').toUpperCase();
                const ciudad = (user.city || 'BARRANQUILLA').toUpperCase();
                entityLabel = `${nombre} - ${ciudad}, ATLÁNTICO - COLOMBIA`;
            }

            setDecreeData(prev => ({ ...prev, parroquia: entityLabel }));

            const priest = getParrocoActual(contextId);
            if (priest) {
                const priestName = `${priest.nombre} ${priest.apellido || ''}`.trim();
                setActivePriest(priestName);
                setNewPartida(prev => ({ ...prev, ministerFaith: priestName }));
            }
        }
    }, [user, getParrocoActual, getMisDatosList, getConceptosAnulacion]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const getAllDioceseParishes = () => data.parishes.filter(p => p.dioceseId === user.dioceseId);
    
    const formatParishLabel = (parishId) => {
        const misDatosList = getMisDatosList(parishId);
        if (misDatosList && misDatosList.length > 0) {
            const dato = misDatosList[0];
            return `${(dato.nombre || 'PARROQUIA').toUpperCase()} - ${(dato.ciudad || 'CIUDAD').toUpperCase()}`;
        }
        const parish = data.parishes.find(p => p.id === parishId);
        if (parish) {
            return `${parish.name.toUpperCase()} - ${parish.city.toUpperCase()}`;
        }
        return 'PARROQUIA DESCONOCIDA';
    };

    const handleDecreeChange = (e) => {
        const { name, value } = e.target;
        setDecreeData(prev => ({ ...prev, [name]: value }));
        
        if (['book', 'page', 'entry'].includes(name)) {
            setFoundRecord(null);
            setSearchMessage(null);
        }

        if (name === 'targetName') {
            if (value.length > 2) {
                const parishes = getAllDioceseParishes();
                let allRecords = [];
                parishes.forEach(p => {
                    const recs = getBaptisms(p.id) || [];
                    allRecords = [...allRecords, ...recs];
                });

                const filtered = allRecords.filter(b => {
                    const fullName = `${b.firstName || ''} ${b.lastName || ''} ${b.nombres || ''} ${b.apellidos || ''}`.toLowerCase();
                    return fullName.includes(value.toLowerCase());
                }).slice(0, 5); 
                setSuggestions(filtered);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }
    };

    const handleSuggestionClick = (record) => {
        const fullName = `${record.firstName || record.nombres} ${record.lastName || record.apellidos}`;
        setDecreeData(prev => ({ ...prev, targetName: fullName }));
        setShowSuggestions(false);
    };

    const handleNewPartidaChange = (e) => {
        const { name, value } = e.target;
        setNewPartida(prev => ({ ...prev, [name]: value }));
    };

    const getSafeValue = (obj, ...keys) => {
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        }
        return '';
    };

    const handleSearch = () => {
        const { book, page, entry } = decreeData;
        
        if (!book || !page || !entry) {
            setSearchMessage({ type: 'error', text: "Debe ingresar Libro, Folio y Número para buscar." });
            return;
        }

        setIsLoading(true);
        setSearchMessage(null);
        setFoundRecord(null);

        setTimeout(() => {
            const parishes = getAllDioceseParishes();
            let found = null;
            
            for (const parish of parishes) {
                const records = getBaptisms(parish.id) || [];
                const match = records.find(b => 
                    String(b.book_number) === String(book) &&
                    String(b.page_number) === String(page) &&
                    String(b.entry_number) === String(entry)
                );
                if (match) {
                    found = { ...match, parishId: parish.id };
                    break;
                }
            }

            if (found) {
                if (found.status === 'anulada') {
                    setSearchMessage({ type: 'error', text: "Esta partida ya se encuentra ANULADA." });
                } else {
                    setFoundRecord(found);
                    setSearchMessage({ type: 'success', text: "Partida encontrada exitosamente." });
                    
                    const parishLabel = formatParishLabel(found.parishId);
                    setDecreeData(prev => ({ ...prev, parroquia: parishLabel }));

                    const foundName = `${found.firstName || found.nombres || ''} ${found.lastName || found.apellidos || ''}`.trim();
                    if (!decreeData.targetName) {
                        setDecreeData(prev => ({ ...prev, targetName: foundName }));
                    }
                    
                    const rawSex = getSafeValue(found, 'sex', 'sexo', 'genero');
                    let mappedSex = '1';
                    if (String(rawSex) === '2' || String(rawSex).toUpperCase() === 'FEMENINO' || String(rawSex).toUpperCase() === 'F') {
                        mappedSex = '2';
                    } else if (String(rawSex) === '1' || String(rawSex).toUpperCase() === 'MASCULINO' || String(rawSex).toUpperCase() === 'M') {
                        mappedSex = '1';
                    }

                    setNewPartida(prev => ({
                        ...prev,
                        firstName: getSafeValue(found, 'firstName', 'nombres'),
                        lastName: getSafeValue(found, 'lastName', 'apellidos'),
                        sacramentDate: getSafeValue(found, 'sacramentDate', 'fecbau'),
                        birthDate: getSafeValue(found, 'birthDate', 'fecnac'),
                        lugarNacimientoDetalle: getSafeValue(found, 'lugarNacimientoDetalle', 'lugarn', 'lugnac'),
                        lugarBautismo: getSafeValue(found, 'lugarBautismo', 'lugbau', 'lugarBautismoDetalle'),
                        sex: mappedSex,
                        fatherName: getSafeValue(found, 'fatherName', 'padre'),
                        ceduPadre: getSafeValue(found, 'fatherId', 'cedupad', 'ceduPadre'),
                        motherName: getSafeValue(found, 'motherName', 'madre'),
                        ceduMadre: getSafeValue(found, 'motherId', 'cedumad', 'ceduMadre'),
                        tipoUnionPadres: getSafeValue(found, 'tipoUnionPadres', 'tipohijo') || '1',
                        paternalGrandparents: getSafeValue(found, 'paternalGrandparents', 'abuepat'),
                        maternalGrandparents: getSafeValue(found, 'maternalGrandparents', 'abuemat'),
                        godparents: Array.isArray(found.godparents) 
                            ? found.godparents.map(g => g.name).join(', ') 
                            : getSafeValue(found, 'godparents', 'padrinos'),
                        minister: getSafeValue(found, 'minister', 'ministro'),
                        ministerFaith: prev.ministerFaith || getSafeValue(found, 'ministerFaith', 'dafe', 'daFe'),
                        serialRegCivil: getSafeValue(found, 'registrySerial', 'regciv', 'serialRegCivil'),
                        nuipNuit: getSafeValue(found, 'nuip', 'nuipNuit'),
                        oficinaRegistro: getSafeValue(found, 'registryOffice', 'notaria', 'oficinaRegistro'),
                        fechaExpedicion: getSafeValue(found, 'registryDate', 'fecregis', 'fechaExpedicion')
                    }));
                }
            } else {
                setSearchMessage({ type: 'error', text: "No se encontró ninguna partida con esos datos en la diócesis." });
            }
            setIsLoading(false);
        }, 300);
    };

    const validateForm = () => {
        if (!decreeData.decreeNumber) return false;
        if (!decreeData.decreeDate) return false;
        if (!decreeData.conceptoAnulacionId) return false;
        if (!decreeData.targetName) return false;
        if (!foundRecord) return false;

        const required = [
            'sacramentDate', 'firstName', 'lastName', 'birthDate', 
            'lugarNacimientoDetalle', 'fatherName', 'motherName', 
            'minister', 'ministerFaith'
        ];
        for (const field of required) {
            if (!newPartida[field]) return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast({ 
                title: "Error de Validación", 
                description: "Por favor complete todos los campos requeridos, incluyendo el concepto de anulación, y asegúrese de buscar la partida.", 
                variant: "destructive" 
            });
            return;
        }

        const targetParishId = foundRecord?.parishId;
        if (!targetParishId) {
             toast({ title: "Error", description: "No se pudo identificar la parroquia destino.", variant: "destructive" });
             return;
        }

        const contextId = user.dioceseId || user.id;
        const existingDecrees = getBaptismCorrections(contextId); 
        
        if (existingDecrees.some(d => d.decreeNumber.toLowerCase() === decreeData.decreeNumber.toLowerCase())) {
            toast({ title: "Error", description: "Este número de decreto ya existe", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        const partidaToSave = {
            ...newPartida,
            nombres: newPartida.firstName,
            apellidos: newPartida.lastName,
            fecbau: newPartida.sacramentDate,
            fecnac: newPartida.birthDate,
            lugarn: newPartida.lugarNacimientoDetalle,
            lugnac: newPartida.lugarNacimientoDetalle,
            lugarBautismoDetalle: newPartida.lugarBautismo,
            lugbau: newPartida.lugarBautismo,
            sex: newPartida.sex,
            sexo: newPartida.sex,
            padre: newPartida.fatherName,
            cedupad: newPartida.ceduPadre,
            fatherId: newPartida.ceduPadre,
            madre: newPartida.motherName,
            cedumad: newPartida.ceduMadre,
            motherId: newPartida.ceduMadre,
            abuepat: newPartida.paternalGrandparents,
            abuemat: newPartida.maternalGrandparents,
            padrinos: newPartida.godparents,
            tipohijo: newPartida.tipoUnionPadres,
            ministro: newPartida.minister,
            dafe: newPartida.ministerFaith,
            regciv: newPartida.serialRegCivil,
            nuip: newPartida.nuipNuit,
            notaria: newPartida.oficinaRegistro,
            fecregis: newPartida.fechaExpedicion,
            registrySerial: newPartida.serialRegCivil,
            registryOffice: newPartida.oficinaRegistro,
            registryDate: newPartida.fechaExpedicion,
            anulado: false,
            adulto: false,
            actualizad: false,
            status: 'seated'
        };

        const result = await createBaptismCorrection(
            decreeData, 
            foundRecord.id, 
            partidaToSave, 
            targetParishId 
        );

        if (result.success) {
            await createNotification({
                decree_id: result.data ? result.data.id : generateUUID(),
                decree_type: 'correction',
                parish_id: targetParishId,
                created_by: user.id,
                message: `Nuevo decreto de corrección (Bautismo) #${decreeData.decreeNumber} para ${newPartida.firstName} ${newPartida.lastName}.`,
                status: 'unread'
            });

            setIsLoading(false);
            toast({ 
                title: "Éxito", 
                description: "Decreto guardado correctamente y notificación enviada a la parroquia.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/chancery/decree-correction/view'); 
        } else {
            setIsLoading(false);
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };

    const getConceptDetails = (id) => {
        if (!id) return null;
        return conceptos.find(c => c.id === id);
    };
    const selectedConcept = getConceptDetails(decreeData.conceptoAnulacionId);

    return (
        <DashboardLayout entityName={user?.dioceseName || "Cancillería"}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/chancery/decree-correction/view')} className="p-0 hover:bg-transparent">
                    <ArrowLeft className="w-6 h-6 text-gray-500" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Corrección</h1>
                    <p className="text-gray-500 text-sm">Proceso de anulación y registro en Libro Supletorio (Nivel Diocesano)</p>
                </div>
            </div>

            <Tabs defaultValue="bautizos" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 max-w-2xl mx-auto">
                    <TabsTrigger value="bautizos">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmaciones">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonios">Matrimonios</TabsTrigger>
                </TabsList>

                <TabsContent value="bautizos">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-blue-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label>
                                    <Input value={decreeData.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                                    <Input name="decreeNumber" value={decreeData.decreeNumber} onChange={handleDecreeChange} placeholder="Ej: 001-2025" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input type="date" name="decreeDate" value={decreeData.decreeDate} onChange={handleDecreeChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Anulación <span className="text-red-500">*</span></label>
                                    <select name="conceptoAnulacionId" value={decreeData.conceptoAnulacionId} onChange={handleDecreeChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Seleccionar Concepto de Anulación</option>
                                        {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                    </select>
                                    {selectedConcept && <div className="mt-1 text-xs text-blue-600">{selectedConcept.codigo} - {selectedConcept.concepto}</div>}
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mt-6">
                                <h4 className="text-sm font-bold text-blue-800 mb-4 uppercase">Búsqueda de Partida a Anular</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1 relative" ref={wrapperRef}>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre (Persona) <span className="text-red-500">*</span></label>
                                        <Input name="targetName" value={decreeData.targetName} onChange={handleDecreeChange} placeholder="Nombre completo" autoComplete="off" />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                                                {suggestions.map((record, idx) => (
                                                    <div key={idx} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700" onClick={() => handleSuggestionClick(record)}>
                                                        {record.firstName || record.nombres} {record.lastName || record.apellidos}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Libro <span className="text-red-500">*</span></label><Input name="book" value={decreeData.book} onChange={handleDecreeChange} placeholder="No." /></div>
                                    <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Folio <span className="text-red-500">*</span></label><Input name="page" value={decreeData.page} onChange={handleDecreeChange} placeholder="No." /></div>
                                    <div className="md:col-span-1 flex gap-2">
                                        <div className="flex-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número <span className="text-red-500">*</span></label><Input name="entry" value={decreeData.entry} onChange={handleDecreeChange} placeholder="No." /></div>
                                        <Button onClick={handleSearch} disabled={isLoading} className="mb-[2px] bg-[#4B7BA7] hover:bg-[#3A6286] text-white">{isLoading ? '...' : 'Buscar'}</Button>
                                    </div>
                                </div>
                                {searchMessage && <div className={`mt-4 p-3 rounded-md text-sm font-medium flex items-center gap-2 ${searchMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{searchMessage.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}{searchMessage.text}</div>}
                                {foundRecord && (
                                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Registro Encontrado</h5>
                                        <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><span className="font-semibold">Bautizado:</span> {foundRecord.firstName || foundRecord.nombres} {foundRecord.lastName || foundRecord.apellidos}</div>
                                            <div><span className="font-semibold">Padres:</span> {foundRecord.fatherName || foundRecord.padre} & {foundRecord.motherName || foundRecord.madre}</div>
                                            <div><span className="font-semibold">Fecha:</span> {foundRecord.sacramentDate || foundRecord.fecbau}</div>
                                            <div><span className="font-semibold text-blue-600">Origen:</span> {data.parishes.find(p => p.id === foundRecord.parishId)?.name || 'Parroquia Desconocida'}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION 2: FORMULARIO DE NUEVA PARTIDA */}
                        <div className={`bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6 transition-all duration-300 ${!foundRecord ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Bautismo <span className="text-red-500">*</span></label>
                                    <Input type="date" name="sacramentDate" value={newPartida.sacramentDate} onChange={handleNewPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Bautismo</label>
                                    <Input name="lugarBautismo" value={newPartida.lugarBautismo} onChange={handleNewPartidaChange} placeholder="Parroquia..." />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label>
                                    <Input name="firstName" value={newPartida.firstName} onChange={handleNewPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label>
                                    <Input name="lastName" value={newPartida.lastName} onChange={handleNewPartidaChange} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                                    <Input type="date" name="birthDate" value={newPartida.birthDate} onChange={handleNewPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento <span className="text-red-500">*</span></label>
                                    <Input name="lugarNacimientoDetalle" value={newPartida.lugarNacimientoDetalle} onChange={handleNewPartidaChange} />
                                </div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre <span className="text-red-500">*</span></label>
                                        <Input name="fatherName" value={newPartida.fatherName} onChange={handleNewPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula del Padre</label>
                                        <Input name="ceduPadre" value={newPartida.ceduPadre} onChange={handleNewPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre <span className="text-red-500">*</span></label>
                                        <Input name="motherName" value={newPartida.motherName} onChange={handleNewPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula de la Madre</label>
                                        <Input name="ceduMadre" value={newPartida.ceduMadre} onChange={handleNewPartidaChange} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipo de Unión <span className="text-red-500">*</span></label>
                                    <select 
                                        name="tipoUnionPadres" 
                                        value={newPartida.tipoUnionPadres}
                                        onChange={handleNewPartidaChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="1">1 - MATRIMONIO CATÓLICO</option>
                                        <option value="2">2 - MATRIMONIO CIVIL</option>
                                        <option value="3">3 - UNIÓN LIBRE</option>
                                        <option value="4">4 - MADRE SOLTERA</option>
                                        <option value="5">5 - OTRO</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Sexo <span className="text-red-500">*</span></label>
                                    <select 
                                        name="sex" 
                                        value={newPartida.sex}
                                        onChange={handleNewPartidaChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="1">1 - Masculino</option>
                                        <option value="2">2 - Femenino</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Paternos</label>
                                    <Input name="paternalGrandparents" value={newPartida.paternalGrandparents} onChange={handleNewPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Maternos</label>
                                    <Input name="maternalGrandparents" value={newPartida.maternalGrandparents} onChange={handleNewPartidaChange} />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrinos</label>
                                    <Input name="godparents" value={newPartida.godparents} onChange={handleNewPartidaChange} />
                                </div>
                                
                                {/* New Section: Registro Civil */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-4 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos Registro Civil</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Serial Reg. Civil</label>
                                        <Input name="serialRegCivil" value={newPartida.serialRegCivil} onChange={handleNewPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">NUIP / NUIT</label>
                                        <Input name="nuipNuit" value={newPartida.nuipNuit} onChange={handleNewPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Oficina Registro</label>
                                        <Input name="oficinaRegistro" value={newPartida.oficinaRegistro} onChange={handleNewPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Expedición</label>
                                        <Input type="date" name="fechaExpedicion" value={newPartida.fechaExpedicion} onChange={handleNewPartidaChange} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label>
                                    <Input name="minister" value={newPartida.minister} onChange={handleNewPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label>
                                    <select 
                                        name="ministerFaith" 
                                        value={newPartida.ministerFaith}
                                        onChange={handleNewPartidaChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                    >
                                        {activePriest && <option value={activePriest}>{activePriest}</option>}
                                        <option value="">Otro...</option>
                                    </select>
                                    {(!activePriest || newPartida.ministerFaith !== activePriest) && (
                                        <Input 
                                            name="ministerFaith"
                                            value={newPartida.ministerFaith}
                                            onChange={handleNewPartidaChange}
                                            className="mt-2"
                                            placeholder="Nombre manual..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* ACTION BUTTONS */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button variant="outline" onClick={() => navigate('/chancery/decree-correction/view')} className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</Button>
                        <Button onClick={handleSave} disabled={!foundRecord || isLoading} className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"><Save className="w-4 h-4 mr-2" /> {isLoading ? 'Guardando...' : 'Guardar Decreto'}</Button>
                    </div>
                </TabsContent>

                <TabsContent value="confirmaciones" className="p-8 text-center text-gray-500">
                    Funcionalidad para Confirmaciones próximamente.
                </TabsContent>

                <TabsContent value="matrimonios" className="p-8 text-center text-gray-500">
                    Funcionalidad para Matrimonios próximamente.
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
};

export default NewDecreeCorrectionPage;
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, ArrowLeft, FileText, UserPlus, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateUUID, incrementPaddedValue } from '@/utils/supabaseHelpers';

const BaptismRepositionNewPage = () => {
    const { user } = useAuth();
    const { 
        getParrocoActual, 
        getConceptosAnulacion,
        getMisDatosList
    } = useAppData();
    const { toast } = useToast();
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---

    const [isLoading, setIsLoading] = useState(false);
    const [conceptos, setConceptos] = useState([]);
    const [activePriest, setActivePriest] = useState(null);
    
    // --- BAPTISM STATE ---
    const [decreeData, setDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', 
    });

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
    
    // --- CONFIRMATION STATE ---
    const [confDecreeData, setConfDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', 
    });

    const [newConfPartida, setNewConfPartida] = useState({
        sacramentDate: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        lugarNacimientoDetalle: '',
        lugarConfirmacion: '',
        fatherName: '',
        motherName: '',
        padrino: '',
        madrina: '',
        minister: '',
        ministerFaith: ''
    });

    // --- MARRIAGE STATE ---
    const [marDecreeData, setMarDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', 
    });

    const [newMarPartida, setNewMarPartida] = useState({
        sacramentDate: '',
        lugarMatrimonio: '',
        husbandName: '',
        husbandSurname: '',
        husbandBirthDate: '',
        husbandPlaceOfBirth: '',
        husbandFather: '',
        husbandMother: '',
        wifeName: '',
        wifeSurname: '',
        wifeBirthDate: '',
        wifePlaceOfBirth: '',
        wifeFather: '',
        wifeMother: '',
        witnesses: '',
        minister: '',
        ministerFaith: ''
    });

    // --- INITIALIZATION ---

    useEffect(() => {
        if (user && user.parishId) {
            const allConceptos = getConceptosAnulacion(user.parishId);
            const repoConcepts = allConceptos.filter(c => c.tipo === 'porReposicion' || c.tipo === 'porCorreccion');
            setConceptos(repoConcepts.length > 0 ? repoConcepts : allConceptos);

            const misDatos = getMisDatosList(user.parishId);
            let parishLabel = '';
            
            if (misDatos && misDatos.length > 0) {
                const dato = misDatos[0];
                const nombre = dato.nombre || user.parishName || 'Parroquia';
                const ciudad = dato.ciudad || user.city || 'Ciudad';
                parishLabel = `${nombre} - ${ciudad}`;
            } else {
                parishLabel = `${user.parishName || 'Parroquia'} - ${user.city || 'Ciudad'}`;
            }

            setDecreeData(prev => ({ ...prev, parroquia: parishLabel }));
            setConfDecreeData(prev => ({ ...prev, parroquia: parishLabel }));
            setMarDecreeData(prev => ({ ...prev, parroquia: parishLabel }));

            const priest = getParrocoActual(user.parishId);
            if (priest) {
                const priestName = `${priest.nombre} ${priest.apellido || ''}`.trim();
                setActivePriest(priestName);
                setNewPartida(prev => ({ ...prev, ministerFaith: priestName }));
                setNewConfPartida(prev => ({ ...prev, ministerFaith: priestName }));
                setNewMarPartida(prev => ({ ...prev, ministerFaith: priestName }));
            }
        }
    }, [user, getParrocoActual, getMisDatosList, getConceptosAnulacion]);

    // --- HANDLERS (BAPTISM) ---

    const handleDecreeChange = (e) => {
        const { name, value } = e.target;
        setDecreeData(prev => ({ ...prev, [name]: value }));
    };

    const handleNewPartidaChange = (e) => {
        const { name, value } = e.target;
        setNewPartida(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!decreeData.decreeNumber) return false;
        if (!decreeData.decreeDate) return false;

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
                description: "Por favor complete todos los campos requeridos.", 
                variant: "destructive" 
            });
            return;
        }

        setIsLoading(true);

        try {
            const parishId = user.parishId;
            const baptismsKey = `baptisms_${parishId}`;
            const repositionsKey = `baptismRepositions_${parishId}`;
            const paramsKey = `baptismParameters_${parishId}`;
            
            const allBaptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
            let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
            const existingRepositions = JSON.parse(localStorage.getItem(repositionsKey) || '[]');
            if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

            const newBaptismRId = generateUUID();
            const partidaToSave = {
                ...newPartida,
                id: newBaptismRId,
                parishId,
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
                book_number: params.suplementarioLibro,
                page_number: params.suplementarioFolio,
                entry_number: params.suplementarioNumero,
                status: 'seated',
                isSupplementary: true,
                correctionDecreeRef: decreeData.decreeNumber,
                conceptoAnulacionId: decreeData.conceptoAnulacionId,
                tipoNotaAlMargen: 'porReposicion.nuevaPartida',
                createdAt: new Date().toISOString()
            };

            allBaptisms.push(partidaToSave);
            existingRepositions.push({
                id: generateUUID(),
                decreeNumber: decreeData.decreeNumber,
                decreeDate: decreeData.decreeDate,
                conceptoAnulacionId: decreeData.conceptoAnulacionId,
                parroquia: user.parishName,
                targetName: `${newPartida.firstName} ${newPartida.lastName}`,
                newBaptismRId: newBaptismRId,
                newPartidaSummary: { ...partidaToSave, book: partidaToSave.book_number, page: partidaToSave.page_number, entry: partidaToSave.entry_number },
                createdAt: new Date().toISOString()
            });

            localStorage.setItem(baptismsKey, JSON.stringify(allBaptisms));
            localStorage.setItem(repositionsKey, JSON.stringify(existingRepositions));
            localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

            toast({ 
                title: "Éxito", 
                description: "Decreto de reposición guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parish/decree-replacement/view');

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // --- HANDLERS (CONFIRMATION) ---

    const handleConfDecreeChange = (e) => {
        const { name, value } = e.target;
        setConfDecreeData(prev => ({ ...prev, [name]: value }));
    };

    const handleNewConfPartidaChange = (e) => {
        const { name, value } = e.target;
        setNewConfPartida(prev => ({ ...prev, [name]: value }));
    };

    const validateConfForm = () => {
        if (!confDecreeData.decreeNumber) return false;
        if (!confDecreeData.decreeDate) return false;

        const required = [
            'sacramentDate', 'firstName', 'lastName', 'birthDate', 
            'lugarNacimientoDetalle', 'fatherName', 'motherName', 
            'minister', 'ministerFaith'
        ];
        for (const field of required) {
            if (!newConfPartida[field]) return false;
        }
        return true;
    };

    const handleConfSave = async () => {
        if (!validateConfForm()) {
            toast({ 
                title: "Error de Validación", 
                description: "Por favor complete todos los campos requeridos.", 
                variant: "destructive" 
            });
            return;
        }

        setIsLoading(true);

        try {
            const parishId = user?.parishId;
            const key = `confirmations_${parishId}`;
            const repositionsKey = `confirmationRepositions_${parishId}`;
            const paramsKey = `confirmationParameters_${parishId}`;
            
            const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
            let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
            const existingRepositions = JSON.parse(localStorage.getItem(repositionsKey) || '[]');
            
            if (existingRepositions.some(c => c.decreeNumber === confDecreeData.decreeNumber)) {
                throw new Error("Este número de decreto ya existe para confirmaciones.");
            }

            if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

            const newConfirmationRId = generateUUID();
            const newRecord = {
                ...newConfPartida, 
                id: newConfirmationRId, 
                parishId,
                nombres: newConfPartida.firstName,
                apellidos: newConfPartida.lastName,
                feccof: newConfPartida.sacramentDate,
                fecnac: newConfPartida.birthDate,
                lugarNacimiento: newConfPartida.lugarNacimientoDetalle,
                padre: newConfPartida.fatherName,
                madre: newConfPartida.motherName,
                ministro: newConfPartida.minister,
                dafe: newConfPartida.ministerFaith,

                book_number: params.suplementarioLibro, 
                page_number: params.suplementarioFolio, 
                entry_number: params.suplementarioNumero,
                status: 'seated', 
                isSupplementary: true, 
                correctionDecreeRef: confDecreeData.decreeNumber,
                conceptoAnulacionId: confDecreeData.conceptoAnulacionId, 
                createdAt: new Date().toISOString()
            };
            
            allRecords.push(newRecord);
            existingRepositions.push({
                id: generateUUID(), 
                decreeNumber: confDecreeData.decreeNumber, 
                decreeDate: confDecreeData.decreeDate,
                conceptoAnulacionId: confDecreeData.conceptoAnulacionId, 
                targetName: `${newConfPartida.firstName} ${newConfPartida.lastName}`,
                newConfirmationRId: newConfirmationRId, 
                createdAt: new Date().toISOString()
            });

            localStorage.setItem(key, JSON.stringify(allRecords));
            localStorage.setItem(repositionsKey, JSON.stringify(existingRepositions));
            localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

            toast({ 
                title: "Éxito", 
                description: "Decreto de reposición de confirmación guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parish/decree-replacement/view');

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // --- HANDLERS (MATRIMONIO) ---

    const handleMarDecreeChange = (e) => {
        const { name, value } = e.target;
        setMarDecreeData(prev => ({ ...prev, [name]: value }));
    };

    const handleNewMarPartidaChange = (e) => {
        const { name, value } = e.target;
        setNewMarPartida(prev => ({ ...prev, [name]: value }));
    };

    const validateMarForm = () => {
        if (!marDecreeData.decreeNumber) return false;
        if (!marDecreeData.decreeDate) return false;

        const required = [
            'sacramentDate', 'husbandName', 'husbandSurname', 'wifeName', 'wifeSurname',
            'minister', 'ministerFaith'
        ];
        for (const field of required) {
            if (!newMarPartida[field]) return false;
        }
        return true;
    };

    const handleMarSave = async () => {
        if (!validateMarForm()) {
            toast({ 
                title: "Error de Validación", 
                description: "Por favor complete todos los campos requeridos.", 
                variant: "destructive" 
            });
            return;
        }

        setIsLoading(true);

        try {
            const parishId = user?.parishId;
            const key = `matrimonios_${parishId}`;
            const repositionsKey = `marriageRepositions_${parishId}`;
            const paramsKey = `matrimonioParameters_${parishId}`;
            
            const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
            let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
            const existingRepositions = JSON.parse(localStorage.getItem(repositionsKey) || '[]');
            
            if (existingRepositions.some(c => c.decreeNumber === marDecreeData.decreeNumber)) {
                throw new Error("Este número de decreto ya existe para matrimonios.");
            }

            if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

            const newMarriageRId = generateUUID();
            const newRecord = {
                ...newMarPartida, 
                id: newMarriageRId, 
                parishId,
                esposoNombres: newMarPartida.husbandName,
                esposoApellidos: newMarPartida.husbandSurname,
                esposaNombres: newMarPartida.wifeName,
                esposaApellidos: newMarPartida.wifeSurname,
                fechaCelebracion: newMarPartida.sacramentDate,
                ministro: newMarPartida.minister,
                dafe: newMarPartida.ministerFaith,

                book_number: params.suplementarioLibro, 
                page_number: params.suplementarioFolio, 
                entry_number: params.suplementarioNumero,
                status: 'celebrated', 
                isSupplementary: true, 
                correctionDecreeRef: marDecreeData.decreeNumber,
                conceptoAnulacionId: marDecreeData.conceptoAnulacionId, 
                createdAt: new Date().toISOString()
            };

            allRecords.push(newRecord);
            existingRepositions.push({
                id: generateUUID(), 
                decreeNumber: marDecreeData.decreeNumber, 
                decreeDate: marDecreeData.decreeDate,
                conceptoAnulacionId: marDecreeData.conceptoAnulacionId, 
                targetName: `${newMarPartida.husbandSurname} - ${newMarPartida.wifeSurname}`,
                newMarriageRId: newMarriageRId, 
                createdAt: new Date().toISOString()
            });

            localStorage.setItem(key, JSON.stringify(allRecords));
            localStorage.setItem(repositionsKey, JSON.stringify(existingRepositions));
            localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

            toast({ 
                title: "Éxito", 
                description: "Decreto de reposición de matrimonio guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parish/decree-replacement/view');

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const getConceptDetails = (id) => {
        if (!id) return null;
        return conceptos.find(c => c.id === id);
    };
    const selectedConcept = getConceptDetails(decreeData.conceptoAnulacionId);
    const selectedConfConcept = getConceptDetails(confDecreeData.conceptoAnulacionId);
    const selectedMarConcept = getConceptDetails(marDecreeData.conceptoAnulacionId);

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/parish/decree-replacement/view')} className="p-0 hover:bg-transparent">
                    <ArrowLeft className="w-6 h-6 text-gray-500" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Reposición</h1>
                    <p className="text-gray-500 text-sm">Registro de reposición de partidas perdidas o deterioradas</p>
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
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                                    <select
                                        name="conceptoAnulacionId"
                                        value={decreeData.conceptoAnulacionId}
                                        onChange={handleDecreeChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar Concepto (Opcional)</option>
                                        {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                    </select>
                                    {selectedConcept && <div className="mt-1 text-xs text-blue-600">{selectedConcept.codigo} - {selectedConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Bautismo <span className="text-red-500">*</span></label><Input type="date" name="sacramentDate" value={newPartida.sacramentDate} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Bautismo</label><Input name="lugarBautismo" value={newPartida.lugarBautismo} onChange={handleNewPartidaChange} placeholder="Parroquia..." /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input name="firstName" value={newPartida.firstName} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input name="lastName" value={newPartida.lastName} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label><Input type="date" name="birthDate" value={newPartida.birthDate} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento <span className="text-red-500">*</span></label><Input name="lugarNacimientoDetalle" value={newPartida.lugarNacimientoDetalle} onChange={handleNewPartidaChange} /></div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre <span className="text-red-500">*</span></label><Input name="fatherName" value={newPartida.fatherName} onChange={handleNewPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula del Padre</label><Input name="ceduPadre" value={newPartida.ceduPadre} onChange={handleNewPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre <span className="text-red-500">*</span></label><Input name="motherName" value={newPartida.motherName} onChange={handleNewPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula de la Madre</label><Input name="ceduMadre" value={newPartida.ceduMadre} onChange={handleNewPartidaChange} /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipo de Unión <span className="text-red-500">*</span></label><select name="tipoUnionPadres" value={newPartida.tipoUnionPadres} onChange={handleNewPartidaChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"><option value="1">1 - MATRIMONIO CATÓLICO</option><option value="2">2 - MATRIMONIO CIVIL</option><option value="3">3 - UNIÓN LIBRE</option><option value="4">4 - MADRE SOLTERA</option><option value="5">5 - OTRO</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Sexo <span className="text-red-500">*</span></label><select name="sex" value={newPartida.sex} onChange={handleNewPartidaChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"><option value="1">1 - Masculino</option><option value="2">2 - Femenino</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Paternos</label><Input name="paternalGrandparents" value={newPartida.paternalGrandparents} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Maternos</label><Input name="maternalGrandparents" value={newPartida.maternalGrandparents} onChange={handleNewPartidaChange} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrinos</label><Input name="godparents" value={newPartida.godparents} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label><Input name="minister" value={newPartida.minister} onChange={handleNewPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label><select name="ministerFaith" value={newPartida.ministerFaith} onChange={handleNewPartidaChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || newPartida.ministerFaith !== activePriest) && <Input name="ministerFaith" value={newPartida.ministerFaith} onChange={handleNewPartidaChange} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button variant="outline" onClick={() => navigate('/parish/decree-replacement/view')} className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</Button>
                        <Button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"><Save className="w-4 h-4 mr-2" /> {isLoading ? 'Guardando...' : 'Guardar Decreto'}</Button>
                    </div>
                </TabsContent>

                <TabsContent value="confirmaciones">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-red-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-red-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label>
                                    <Input value={confDecreeData.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                                    <Input name="decreeNumber" value={confDecreeData.decreeNumber} onChange={handleConfDecreeChange} placeholder="Ej: 001-2025" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input type="date" name="decreeDate" value={confDecreeData.decreeDate} onChange={handleConfDecreeChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                                    <select
                                        name="conceptoAnulacionId"
                                        value={confDecreeData.conceptoAnulacionId}
                                        onChange={handleConfDecreeChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Seleccionar Concepto (Opcional)</option>
                                        {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                    </select>
                                    {selectedConfConcept && <div className="mt-1 text-xs text-red-600">{selectedConfConcept.codigo} - {selectedConfConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Confirmación <span className="text-red-500">*</span></label><Input type="date" name="sacramentDate" value={newConfPartida.sacramentDate} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Confirmación</label><Input name="lugarConfirmacion" value={newConfPartida.lugarConfirmacion} onChange={handleNewConfPartidaChange} placeholder="Parroquia..." /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input name="firstName" value={newConfPartida.firstName} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input name="lastName" value={newConfPartida.lastName} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label><Input type="date" name="birthDate" value={newConfPartida.birthDate} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento <span className="text-red-500">*</span></label><Input name="lugarNacimientoDetalle" value={newConfPartida.lugarNacimientoDetalle} onChange={handleNewConfPartidaChange} /></div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre <span className="text-red-500">*</span></label><Input name="fatherName" value={newConfPartida.fatherName} onChange={handleNewConfPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre <span className="text-red-500">*</span></label><Input name="motherName" value={newConfPartida.motherName} onChange={handleNewConfPartidaChange} /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrino</label><Input name="padrino" value={newConfPartida.padrino} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madrina</label><Input name="madrina" value={newConfPartida.madrina} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label><Input name="minister" value={newConfPartida.minister} onChange={handleNewConfPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label><select name="ministerFaith" value={newConfPartida.ministerFaith} onChange={handleNewConfPartidaChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || newConfPartida.ministerFaith !== activePriest) && <Input name="ministerFaith" value={newConfPartida.ministerFaith} onChange={handleNewConfPartidaChange} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button variant="outline" onClick={() => navigate('/parish/decree-replacement/view')} className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</Button>
                        <Button onClick={handleConfSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"><Save className="w-4 h-4 mr-2" /> {isLoading ? 'Guardando...' : 'Guardar Decreto'}</Button>
                    </div>
                </TabsContent>

                <TabsContent value="matrimonios">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-purple-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-purple-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label>
                                    <Input value={marDecreeData.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                                    <Input name="decreeNumber" value={marDecreeData.decreeNumber} onChange={handleMarDecreeChange} placeholder="Ej: 001-2025" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input type="date" name="decreeDate" value={marDecreeData.decreeDate} onChange={handleMarDecreeChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                                    <select
                                        name="conceptoAnulacionId"
                                        value={marDecreeData.conceptoAnulacionId}
                                        onChange={handleMarDecreeChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Seleccionar Concepto (Opcional)</option>
                                        {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                    </select>
                                    {selectedMarConcept && <div className="mt-1 text-xs text-purple-600">{selectedMarConcept.codigo} - {selectedMarConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <Heart className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Matrimonio <span className="text-red-500">*</span></label><Input type="date" name="sacramentDate" value={newMarPartida.sacramentDate} onChange={handleNewMarPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Matrimonio</label><Input name="lugarMatrimonio" value={newMarPartida.lugarMatrimonio} onChange={handleNewMarPartidaChange} placeholder="Parroquia..." /></div>
                            </div>
                            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 mb-6">
                                <h4 className="text-sm font-bold text-blue-800 mb-4 uppercase border-b border-blue-200 pb-1">Datos del Esposo</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input name="husbandName" value={newMarPartida.husbandName} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input name="husbandSurname" value={newMarPartida.husbandSurname} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Nacimiento</label><Input type="date" name="husbandBirthDate" value={newMarPartida.husbandBirthDate} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Nacimiento</label><Input name="husbandPlaceOfBirth" value={newMarPartida.husbandPlaceOfBirth} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padre</label><Input name="husbandFather" value={newMarPartida.husbandFather} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madre</label><Input name="husbandMother" value={newMarPartida.husbandMother} onChange={handleNewMarPartidaChange} /></div>
                                </div>
                            </div>
                            <div className="p-4 bg-pink-50/50 rounded-lg border border-pink-100 mb-6">
                                <h4 className="text-sm font-bold text-pink-800 mb-4 uppercase border-b border-pink-200 pb-1">Datos de la Esposa</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input name="wifeName" value={newMarPartida.wifeName} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input name="wifeSurname" value={newMarPartida.wifeSurname} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Nacimiento</label><Input type="date" name="wifeBirthDate" value={newMarPartida.wifeBirthDate} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Nacimiento</label><Input name="wifePlaceOfBirth" value={newMarPartida.wifePlaceOfBirth} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padre</label><Input name="wifeFather" value={newMarPartida.wifeFather} onChange={handleNewMarPartidaChange} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madre</label><Input name="wifeMother" value={newMarPartida.wifeMother} onChange={handleNewMarPartidaChange} /></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Testigos</label><Input name="witnesses" value={newMarPartida.witnesses} onChange={handleNewMarPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label><Input name="minister" value={newMarPartida.minister} onChange={handleNewMarPartidaChange} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label><select name="ministerFaith" value={newMarPartida.ministerFaith} onChange={handleNewMarPartidaChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || newMarPartida.ministerFaith !== activePriest) && <Input name="ministerFaith" value={newMarPartida.ministerFaith} onChange={handleNewMarPartidaChange} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button variant="outline" onClick={() => navigate('/parish/decree-replacement/view')} className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</Button>
                        <Button onClick={handleMarSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"><Save className="w-4 h-4 mr-2" /> {isLoading ? 'Guardando...' : 'Guardar Decreto'}</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
};

export default BaptismRepositionNewPage;
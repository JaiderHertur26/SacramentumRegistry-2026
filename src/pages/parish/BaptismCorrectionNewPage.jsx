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
import { generateUUID, incrementPaddedValue } from '@/utils/supabaseHelpers';

const BaptismCorrectionNewPage = () => {
    const { user } = useAuth();
    const { 
        getBaptisms, 
        getConfirmations,
        getMatrimonios,
        createBaptismCorrection, 
        getParrocoActual, 
        getBaptismCorrections,
        getConceptosAnulacion,
        getMisDatosList
    } = useAppData();
    const { toast } = useToast();
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---

    const [isLoading, setIsLoading] = useState(false);
    
    // --- BAPTISM STATE ---
    // Section 1: Decree Data
    const [decreeData, setDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', 
        targetName: '', // "Nombre de la Partida Anulada (Persona)"
        book: '',
        page: '',
        entry: ''
    });

    // Search Result
    const [foundRecord, setFoundRecord] = useState(null);
    const [searchMessage, setSearchMessage] = useState(null);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Section 2: New Partida Form
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
    // Section 1: Decree Data
    const [confDecreeData, setConfDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', 
        targetName: '',
        book: '',
        page: '',
        entry: ''
    });

    const [confFoundRecord, setConfFoundRecord] = useState(null);
    const [confSearchMessage, setConfSearchMessage] = useState(null);
    const [confSuggestions, setConfSuggestions] = useState([]);
    const [showConfSuggestions, setShowConfSuggestions] = useState(false);
    const confWrapperRef = useRef(null);

    // Section 2: New Partida Form (Confirmation)
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
    // Section 1: Decree Data
    const [marDecreeData, setMarDecreeData] = useState({
        parroquia: '',
        decreeNumber: '',
        decreeDate: new Date().toISOString().split('T')[0],
        conceptoAnulacionId: '', 
        targetName: '',
        book: '',
        page: '',
        entry: ''
    });

    const [marFoundRecord, setMarFoundRecord] = useState(null);
    const [marSearchMessage, setMarSearchMessage] = useState(null);
    const [marSuggestions, setMarSuggestions] = useState([]);
    const [showMarSuggestions, setShowMarSuggestions] = useState(false);
    const marWrapperRef = useRef(null);

    // Section 2: New Partida Form (Marriage)
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

    const [conceptos, setConceptos] = useState([]);
    const [activePriest, setActivePriest] = useState(null);

    // --- INITIALIZATION ---

    useEffect(() => {
        if (user && user.parishId) {
            // Load Conceptos de Anulacion
            const allConceptos = getConceptosAnulacion(user.parishId);
            setConceptos(allConceptos.filter(c => c.tipo === 'porCorreccion'));

            // Auto-fill Section 1 Data: Parroquia - Ciudad from Mis Datos
            const misDatos = getMisDatosList(user.parishId);
            let parishLabel = '';
            
            if (misDatos && misDatos.length > 0) {
                const dato = misDatos[0];
                const nombre = dato.nombre || user.parishName || 'Parroquia';
                const ciudad = dato.ciudad || user.city || 'Ciudad';
                parishLabel = `${nombre} - ${ciudad}`;
            } else {
                // Fallback to user data if Mis Datos is empty
                parishLabel = `${user.parishName || 'Parroquia'} - ${user.city || 'Ciudad'}`;
            }

            setDecreeData(prev => ({ ...prev, parroquia: parishLabel }));
            setConfDecreeData(prev => ({ ...prev, parroquia: parishLabel }));
            setMarDecreeData(prev => ({ ...prev, parroquia: parishLabel }));

            // Auto-fill Da Fe with current priest
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

    // Handle click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (confWrapperRef.current && !confWrapperRef.current.contains(event.target)) {
                setShowConfSuggestions(false);
            }
            if (marWrapperRef.current && !marWrapperRef.current.contains(event.target)) {
                setShowMarSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef, confWrapperRef, marWrapperRef]);

    // --- HANDLERS (BAPTISM) ---

    const handleDecreeChange = (e) => {
        const { name, value } = e.target;
        setDecreeData(prev => ({ ...prev, [name]: value }));
        
        if (['book', 'page', 'entry'].includes(name)) {
            setFoundRecord(null);
            setSearchMessage(null);
        }

        if (name === 'targetName') {
            if (value.length > 2) {
                const allBaptisms = getBaptisms(user?.parishId);
                const filtered = allBaptisms.filter(b => {
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
            const allBaptisms = getBaptisms(user?.parishId);
            const found = allBaptisms.find(b => 
                String(b.book_number) === String(book) &&
                String(b.page_number) === String(page) &&
                String(b.entry_number) === String(entry)
            );

            if (found) {
                if (found.status === 'anulada') {
                    setSearchMessage({ type: 'error', text: "Esta partida ya se encuentra ANULADA." });
                } else {
                    setFoundRecord(found);
                    setSearchMessage({ type: 'success', text: "Partida encontrada exitosamente." });
                    
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
                setSearchMessage({ type: 'error', text: "No se encontró ninguna partida con esos datos." });
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

        const existingDecrees = getBaptismCorrections(user?.parishId);
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
            user?.parishId
        );

        setIsLoading(false);

        if (result.success) {
            toast({ 
                title: "Éxito", 
                description: "Decreto guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parroquia/decretos/ver-correcciones');
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };

    // --- HANDLERS (CONFIRMATION) ---

    const handleConfDecreeChange = (e) => {
        const { name, value } = e.target;
        setConfDecreeData(prev => ({ ...prev, [name]: value }));
        
        if (['book', 'page', 'entry'].includes(name)) {
            setConfFoundRecord(null);
            setConfSearchMessage(null);
        }

        if (name === 'targetName') {
            if (value.length > 2) {
                const allConfirmations = getConfirmations(user?.parishId);
                const filtered = allConfirmations.filter(c => {
                    const fullName = `${c.firstName || ''} ${c.lastName || ''} ${c.nombres || ''} ${c.apellidos || ''}`.toLowerCase();
                    return fullName.includes(value.toLowerCase());
                }).slice(0, 5); 
                setConfSuggestions(filtered);
                setShowConfSuggestions(true);
            } else {
                setConfSuggestions([]);
                setShowConfSuggestions(false);
            }
        }
    };

    const handleConfSuggestionClick = (record) => {
        const fullName = `${record.firstName || record.nombres} ${record.lastName || record.apellidos}`;
        setConfDecreeData(prev => ({ ...prev, targetName: fullName }));
        setShowConfSuggestions(false);
    };

    const handleNewConfPartidaChange = (e) => {
        const { name, value } = e.target;
        setNewConfPartida(prev => ({ ...prev, [name]: value }));
    };

    const handleConfSearch = () => {
        const { book, page, entry } = confDecreeData;
        
        if (!book || !page || !entry) {
            setConfSearchMessage({ type: 'error', text: "Debe ingresar Libro, Folio y Número para buscar." });
            return;
        }

        setIsLoading(true);
        setConfSearchMessage(null);
        setConfFoundRecord(null);

        setTimeout(() => {
            const allConfirmations = getConfirmations(user?.parishId);
            const found = allConfirmations.find(c => 
                String(c.book_number) === String(book) &&
                String(c.page_number) === String(page) &&
                String(c.entry_number) === String(entry)
            );

            if (found) {
                if (found.status === 'anulada') {
                    setConfSearchMessage({ type: 'error', text: "Esta partida ya se encuentra ANULADA." });
                } else {
                    setConfFoundRecord(found);
                    setConfSearchMessage({ type: 'success', text: "Partida encontrada exitosamente." });
                    
                    const foundName = `${found.firstName || found.nombres || ''} ${found.lastName || found.apellidos || ''}`.trim();
                    if (!confDecreeData.targetName) {
                        setConfDecreeData(prev => ({ ...prev, targetName: foundName }));
                    }

                    setNewConfPartida(prev => ({
                        ...prev,
                        firstName: getSafeValue(found, 'firstName', 'nombres'),
                        lastName: getSafeValue(found, 'lastName', 'apellidos'),
                        sacramentDate: getSafeValue(found, 'sacramentDate', 'feccof', 'fechaConfirmacion'),
                        birthDate: getSafeValue(found, 'birthDate', 'fecnac', 'fechaNacimiento'),
                        lugarNacimientoDetalle: getSafeValue(found, 'placeOfBirth', 'lugarNacimiento', 'lugarn'),
                        lugarConfirmacion: getSafeValue(found, 'lugarConfirmacion', 'parroquia', 'parishName'),
                        fatherName: getSafeValue(found, 'fatherName', 'padre'),
                        motherName: getSafeValue(found, 'motherName', 'madre'),
                        padrino: getSafeValue(found, 'padrino', 'godfather'),
                        madrina: getSafeValue(found, 'madrina', 'godmother'),
                        minister: getSafeValue(found, 'minister', 'ministro'),
                        ministerFaith: prev.ministerFaith || getSafeValue(found, 'ministerFaith', 'dafe', 'daFe'),
                    }));
                }
            } else {
                setConfSearchMessage({ type: 'error', text: "No se encontró ninguna partida con esos datos." });
            }
            setIsLoading(false);
        }, 300);
    };

    const validateConfForm = () => {
        if (!confDecreeData.decreeNumber) return false;
        if (!confDecreeData.decreeDate) return false;
        if (!confDecreeData.conceptoAnulacionId) return false;
        if (!confDecreeData.targetName) return false;
        if (!confFoundRecord) return false;

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
                description: "Por favor complete todos los campos requeridos, incluyendo el concepto de anulación, y asegúrese de buscar la partida.", 
                variant: "destructive" 
            });
            return;
        }

        setIsLoading(true);

        try {
            const parishId = user?.parishId;
            const key = `confirmations_${parishId}`;
            const correctionsKey = `confirmationCorrections_${parishId}`;
            const paramsKey = `confirmationParameters_${parishId}`;
            
            const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
            let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
            const existingCorrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
            
            if (existingCorrections.some(c => c.decreeNumber === confDecreeData.decreeNumber)) {
                throw new Error("Este número de decreto ya existe para confirmaciones.");
            }

            if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

            const newId = generateUUID();
            const newRecord = {
                ...newConfPartida, 
                id: newId, 
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

            const idx = allRecords.findIndex(r => r.id === confFoundRecord.id);
            if (idx === -1) throw new Error("Original no encontrada.");

            const note = `PARTIDA ANULADA POR DECRETO No. ${confDecreeData.decreeNumber} DE FECHA ${confDecreeData.decreeDate}. VER LIBRO ${newRecord.book_number} FOLIO ${newRecord.page_number} NUMERO ${newRecord.entry_number}.`;
            
            allRecords[idx] = { 
                ...allRecords[idx], 
                isAnnulled: true, 
                status: 'anulada', 
                annulmentDecree: confDecreeData.decreeNumber, 
                annulmentDate: confDecreeData.decreeDate, 
                notaMarginal: note, 
                conceptoAnulacionId: confDecreeData.conceptoAnulacionId,
                updatedAt: new Date().toISOString() 
            };
            
            allRecords.push(newRecord);
            existingCorrections.push({
                id: generateUUID(), 
                decreeNumber: confDecreeData.decreeNumber, 
                decreeDate: confDecreeData.decreeDate,
                conceptoAnulacionId: confDecreeData.conceptoAnulacionId, 
                targetName: `${confFoundRecord.firstName || confFoundRecord.nombres} ${confFoundRecord.lastName || confFoundRecord.apellidos}`,
                originalPartidaId: confFoundRecord.id, 
                newPartidaId: newId, 
                createdAt: new Date().toISOString()
            });

            localStorage.setItem(key, JSON.stringify(allRecords));
            localStorage.setItem(correctionsKey, JSON.stringify(existingCorrections));
            localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

            toast({ 
                title: "Éxito", 
                description: "Decreto de confirmación guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parroquia/decretos/ver-correcciones');

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
        
        if (['book', 'page', 'entry'].includes(name)) {
            setMarFoundRecord(null);
            setMarSearchMessage(null);
        }

        if (name === 'targetName') {
            if (value.length > 2) {
                const allMatrimonios = getMatrimonios(user?.parishId);
                const filtered = allMatrimonios.filter(m => {
                    // Check both husband and wife names
                    const husbandFull = `${m.husbandName || ''} ${m.husbandSurname || ''}`.toLowerCase();
                    const wifeFull = `${m.wifeName || ''} ${m.wifeSurname || ''}`.toLowerCase();
                    const query = value.toLowerCase();
                    return husbandFull.includes(query) || wifeFull.includes(query);
                }).slice(0, 5); 
                setMarSuggestions(filtered);
                setShowMarSuggestions(true);
            } else {
                setMarSuggestions([]);
                setShowMarSuggestions(false);
            }
        }
    };

    const handleMarSuggestionClick = (record) => {
        // Use husband's name as primary label but show both in UI if possible, here just setting a text
        const label = `${record.husbandName} ${record.husbandSurname} & ${record.wifeName} ${record.wifeSurname}`;
        setMarDecreeData(prev => ({ ...prev, targetName: label }));
        setShowMarSuggestions(false);
    };

    const handleNewMarPartidaChange = (e) => {
        const { name, value } = e.target;
        setNewMarPartida(prev => ({ ...prev, [name]: value }));
    };

    const handleMarSearch = () => {
        const { book, page, entry } = marDecreeData;
        
        if (!book || !page || !entry) {
            setMarSearchMessage({ type: 'error', text: "Debe ingresar Libro, Folio y Número para buscar." });
            return;
        }

        setIsLoading(true);
        setMarSearchMessage(null);
        setMarFoundRecord(null);

        setTimeout(() => {
            const allMatrimonios = getMatrimonios(user?.parishId);
            const found = allMatrimonios.find(m => 
                String(m.book_number) === String(book) &&
                String(m.page_number) === String(page) &&
                String(m.entry_number) === String(entry)
            );

            if (found) {
                if (found.status === 'anulada') {
                    setMarSearchMessage({ type: 'error', text: "Esta partida ya se encuentra ANULADA." });
                } else {
                    setMarFoundRecord(found);
                    setMarSearchMessage({ type: 'success', text: "Partida encontrada exitosamente." });
                    
                    const foundName = `${found.husbandName} ${found.husbandSurname} & ${found.wifeName} ${found.wifeSurname}`;
                    if (!marDecreeData.targetName) {
                        setMarDecreeData(prev => ({ ...prev, targetName: foundName }));
                    }

                    setNewMarPartida(prev => ({
                        ...prev,
                        sacramentDate: getSafeValue(found, 'sacramentDate', 'fechaCelebracion', 'fecha'),
                        lugarMatrimonio: getSafeValue(found, 'lugarMatrimonio', 'parroquia', 'parishName'),
                        
                        husbandName: getSafeValue(found, 'husbandName', 'esposoNombres'),
                        husbandSurname: getSafeValue(found, 'husbandSurname', 'esposoApellidos'),
                        husbandBirthDate: getSafeValue(found, 'husbandBirthDate', 'esposoFechaNacimiento'),
                        husbandPlaceOfBirth: getSafeValue(found, 'husbandPlaceOfBirth', 'esposoLugarNacimiento'),
                        husbandFather: getSafeValue(found, 'husbandFather', 'esposoPadre'),
                        husbandMother: getSafeValue(found, 'husbandMother', 'esposoMadre'),

                        wifeName: getSafeValue(found, 'wifeName', 'esposaNombres'),
                        wifeSurname: getSafeValue(found, 'wifeSurname', 'esposaApellidos'),
                        wifeBirthDate: getSafeValue(found, 'wifeBirthDate', 'esposaFechaNacimiento'),
                        wifePlaceOfBirth: getSafeValue(found, 'wifePlaceOfBirth', 'esposaLugarNacimiento'),
                        wifeFather: getSafeValue(found, 'wifeFather', 'esposaPadre'),
                        wifeMother: getSafeValue(found, 'wifeMother', 'esposaMadre'),

                        witnesses: getSafeValue(found, 'witnesses', 'testigos'),
                        minister: getSafeValue(found, 'minister', 'ministro'),
                        ministerFaith: prev.ministerFaith || getSafeValue(found, 'ministerFaith', 'dafe', 'daFe'),
                    }));
                }
            } else {
                setMarSearchMessage({ type: 'error', text: "No se encontró ninguna partida con esos datos." });
            }
            setIsLoading(false);
        }, 300);
    };

    const validateMarForm = () => {
        if (!marDecreeData.decreeNumber) return false;
        if (!marDecreeData.decreeDate) return false;
        if (!marDecreeData.conceptoAnulacionId) return false;
        if (!marDecreeData.targetName) return false;
        if (!marFoundRecord) return false;

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
                description: "Por favor complete todos los campos requeridos, incluyendo el concepto de anulación, y asegúrese de buscar la partida.", 
                variant: "destructive" 
            });
            return;
        }

        setIsLoading(true);

        try {
            const parishId = user?.parishId;
            const key = `matrimonios_${parishId}`;
            const correctionsKey = `marriageCorrections_${parishId}`;
            const paramsKey = `matrimonioParameters_${parishId}`;
            
            const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
            let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
            const existingCorrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
            
            if (existingCorrections.some(c => c.decreeNumber === marDecreeData.decreeNumber)) {
                throw new Error("Este número de decreto ya existe para matrimonios.");
            }

            if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

            const newId = generateUUID();
            const newRecord = {
                ...newMarPartida, 
                id: newId, 
                parishId,
                // Ensure data fields match schema expectations
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

            const idx = allRecords.findIndex(r => r.id === marFoundRecord.id);
            if (idx === -1) throw new Error("Original no encontrada.");

            const note = `MATRIMONIO ANULADO POR DECRETO No. ${marDecreeData.decreeNumber} DE FECHA ${marDecreeData.decreeDate}. VER LIBRO ${newRecord.book_number} FOLIO ${newRecord.page_number} NUMERO ${newRecord.entry_number}.`;
            
            allRecords[idx] = { 
                ...allRecords[idx], 
                isAnnulled: true, 
                status: 'anulada', 
                annulmentDecree: marDecreeData.decreeNumber, 
                annulmentDate: marDecreeData.decreeDate, 
                notaMarginal: note, 
                conceptoAnulacionId: marDecreeData.conceptoAnulacionId,
                updatedAt: new Date().toISOString() 
            };
            
            allRecords.push(newRecord);
            existingCorrections.push({
                id: generateUUID(), 
                decreeNumber: marDecreeData.decreeNumber, 
                decreeDate: marDecreeData.decreeDate,
                conceptoAnulacionId: marDecreeData.conceptoAnulacionId, 
                targetName: `${marFoundRecord.husbandName} ${marFoundRecord.husbandSurname} & ${marFoundRecord.wifeName} ${marFoundRecord.wifeSurname}`,
                originalPartidaId: marFoundRecord.id, 
                newPartidaId: newId, 
                createdAt: new Date().toISOString()
            });

            localStorage.setItem(key, JSON.stringify(allRecords));
            localStorage.setItem(correctionsKey, JSON.stringify(existingCorrections));
            localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

            toast({ 
                title: "Éxito", 
                description: "Decreto de matrimonio guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parroquia/decretos/ver-correcciones');

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to get selected concept details for visual feedback
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
                <Button variant="ghost" onClick={() => navigate('/parroquia/decretos/ver-correcciones')} className="p-0 hover:bg-transparent">
                    <ArrowLeft className="w-6 h-6 text-gray-500" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Corrección</h1>
                    <p className="text-gray-500 text-sm">Proceso de anulación y registro en Libro Supletorio</p>
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
                        
                        {/* --- SECTION 1: DATOS DEL DECRETO --- */}
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
                                    <Input 
                                        name="decreeNumber"
                                        value={decreeData.decreeNumber} 
                                        onChange={handleDecreeChange}
                                        placeholder="Ej: 001-2025"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input 
                                        type="date"
                                        name="decreeDate"
                                        value={decreeData.decreeDate} 
                                        onChange={handleDecreeChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Anulación <span className="text-red-500">*</span></label>
                                    <select
                                        name="conceptoAnulacionId"
                                        value={decreeData.conceptoAnulacionId}
                                        onChange={handleDecreeChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar Concepto de Anulación</option>
                                        {conceptos.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.codigo} - {c.concepto}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedConcept && (
                                        <div className="mt-1 text-xs text-blue-600">
                                            {selectedConcept.codigo} - {selectedConcept.concepto}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mt-6">
                                <h4 className="text-sm font-bold text-blue-800 mb-4 uppercase">Búsqueda de Partida a Anular</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1 relative" ref={wrapperRef}>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre (Persona) <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="targetName"
                                            value={decreeData.targetName}
                                            onChange={handleDecreeChange}
                                            placeholder="Nombre completo"
                                            autoComplete="off"
                                        />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                                                {suggestions.map((record, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                                                        onClick={() => handleSuggestionClick(record)}
                                                    >
                                                        {record.firstName || record.nombres} {record.lastName || record.apellidos}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Libro <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="book"
                                            value={decreeData.book}
                                            onChange={handleDecreeChange}
                                            placeholder="No."
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Folio <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="page"
                                            value={decreeData.page}
                                            onChange={handleDecreeChange}
                                            placeholder="No."
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número <span className="text-red-500">*</span></label>
                                            <Input 
                                                name="entry"
                                                value={decreeData.entry}
                                                onChange={handleDecreeChange}
                                                placeholder="No."
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleSearch} 
                                            disabled={isLoading}
                                            className="mb-[2px] bg-[#4B7BA7] hover:bg-[#3A6286] text-white"
                                        >
                                            {isLoading ? '...' : 'Buscar'}
                                        </Button>
                                    </div>
                                </div>

                                {searchMessage && (
                                    <div className={`mt-4 p-3 rounded-md text-sm font-medium flex items-center gap-2 ${searchMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                        {searchMessage.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                                        {searchMessage.text}
                                    </div>
                                )}

                                {foundRecord && (
                                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Registro Encontrado</h5>
                                        <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><span className="font-semibold">Bautizado:</span> {foundRecord.firstName || foundRecord.nombres} {foundRecord.lastName || foundRecord.apellidos}</div>
                                            <div><span className="font-semibold">Padres:</span> {foundRecord.fatherName || foundRecord.padre} & {foundRecord.motherName || foundRecord.madre}</div>
                                            <div><span className="font-semibold">Fecha:</span> {foundRecord.sacramentDate || foundRecord.fecbau}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- SECTION 2: FORMULARIO DE NUEVA PARTIDA --- */}
                        <div className={`bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6 transition-all duration-300 ${!foundRecord ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA
                            </h3>

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

                    {/* --- ACTION BUTTONS --- */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/parroquia/decretos/ver-correcciones')} 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={!foundRecord || isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"
                        >
                            <Save className="w-4 h-4 mr-2" /> 
                            {isLoading ? 'Guardando...' : 'Guardar Decreto'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="confirmaciones">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        
                        {/* --- SECTION 1: DATOS DEL DECRETO (CONFIRMATION) --- */}
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
                                    <Input 
                                        name="decreeNumber"
                                        value={confDecreeData.decreeNumber} 
                                        onChange={handleConfDecreeChange}
                                        placeholder="Ej: 001-2025"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input 
                                        type="date"
                                        name="decreeDate"
                                        value={confDecreeData.decreeDate} 
                                        onChange={handleConfDecreeChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Anulación <span className="text-red-500">*</span></label>
                                    <select
                                        name="conceptoAnulacionId"
                                        value={confDecreeData.conceptoAnulacionId}
                                        onChange={handleConfDecreeChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Seleccionar Concepto de Anulación</option>
                                        {conceptos.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.codigo} - {c.concepto}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedConfConcept && (
                                        <div className="mt-1 text-xs text-red-600">
                                            {selectedConfConcept.codigo} - {selectedConfConcept.concepto}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-red-50/50 p-6 rounded-lg border border-red-100 mt-6">
                                <h4 className="text-sm font-bold text-red-800 mb-4 uppercase">Búsqueda de Partida a Anular</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1 relative" ref={confWrapperRef}>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre (Persona) <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="targetName"
                                            value={confDecreeData.targetName}
                                            onChange={handleConfDecreeChange}
                                            placeholder="Nombre completo"
                                            autoComplete="off"
                                        />
                                        {showConfSuggestions && confSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                                                {confSuggestions.map((record, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                                                        onClick={() => handleConfSuggestionClick(record)}
                                                    >
                                                        {record.firstName || record.nombres} {record.lastName || record.apellidos}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Libro <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="book"
                                            value={confDecreeData.book}
                                            onChange={handleConfDecreeChange}
                                            placeholder="No."
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Folio <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="page"
                                            value={confDecreeData.page}
                                            onChange={handleConfDecreeChange}
                                            placeholder="No."
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número <span className="text-red-500">*</span></label>
                                            <Input 
                                                name="entry"
                                                value={confDecreeData.entry}
                                                onChange={handleConfDecreeChange}
                                                placeholder="No."
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleConfSearch} 
                                            disabled={isLoading}
                                            className="mb-[2px] bg-[#4B7BA7] hover:bg-[#3A6286] text-white"
                                        >
                                            {isLoading ? '...' : 'Buscar'}
                                        </Button>
                                    </div>
                                </div>

                                {confSearchMessage && (
                                    <div className={`mt-4 p-3 rounded-md text-sm font-medium flex items-center gap-2 ${confSearchMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                        {confSearchMessage.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                                        {confSearchMessage.text}
                                    </div>
                                )}

                                {confFoundRecord && (
                                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Registro Encontrado</h5>
                                        <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><span className="font-semibold">Confirmado:</span> {confFoundRecord.firstName || confFoundRecord.nombres} {confFoundRecord.lastName || confFoundRecord.apellidos}</div>
                                            <div><span className="font-semibold">Padres:</span> {confFoundRecord.fatherName || confFoundRecord.padre} & {confFoundRecord.motherName || confFoundRecord.madre}</div>
                                            <div><span className="font-semibold">Fecha:</span> {confFoundRecord.sacramentDate || confFoundRecord.feccof}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- SECTION 2: FORMULARIO DE NUEVA PARTIDA (CONFIRMATION) --- */}
                        <div className={`bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6 transition-all duration-300 ${!confFoundRecord ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Confirmación <span className="text-red-500">*</span></label>
                                    <Input type="date" name="sacramentDate" value={newConfPartida.sacramentDate} onChange={handleNewConfPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Confirmación</label>
                                    <Input name="lugarConfirmacion" value={newConfPartida.lugarConfirmacion} onChange={handleNewConfPartidaChange} placeholder="Parroquia..." />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label>
                                    <Input name="firstName" value={newConfPartida.firstName} onChange={handleNewConfPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label>
                                    <Input name="lastName" value={newConfPartida.lastName} onChange={handleNewConfPartidaChange} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                                    <Input type="date" name="birthDate" value={newConfPartida.birthDate} onChange={handleNewConfPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento <span className="text-red-500">*</span></label>
                                    <Input name="lugarNacimientoDetalle" value={newConfPartida.lugarNacimientoDetalle} onChange={handleNewConfPartidaChange} />
                                </div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre <span className="text-red-500">*</span></label>
                                        <Input name="fatherName" value={newConfPartida.fatherName} onChange={handleNewConfPartidaChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre <span className="text-red-500">*</span></label>
                                        <Input name="motherName" value={newConfPartida.motherName} onChange={handleNewConfPartidaChange} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrino</label>
                                    <Input name="padrino" value={newConfPartida.padrino} onChange={handleNewConfPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madrina</label>
                                    <Input name="madrina" value={newConfPartida.madrina} onChange={handleNewConfPartidaChange} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label>
                                    <Input name="minister" value={newConfPartida.minister} onChange={handleNewConfPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label>
                                    <select 
                                        name="ministerFaith" 
                                        value={newConfPartida.ministerFaith}
                                        onChange={handleNewConfPartidaChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                    >
                                        {activePriest && <option value={activePriest}>{activePriest}</option>}
                                        <option value="">Otro...</option>
                                    </select>
                                    {(!activePriest || newConfPartida.ministerFaith !== activePriest) && (
                                        <Input 
                                            name="ministerFaith"
                                            value={newConfPartida.ministerFaith}
                                            onChange={handleNewConfPartidaChange}
                                            className="mt-2"
                                            placeholder="Nombre manual..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ACTION BUTTONS (CONFIRMATION) --- */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/parroquia/decretos/ver-correcciones')} 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleConfSave} 
                            disabled={!confFoundRecord || isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"
                        >
                            <Save className="w-4 h-4 mr-2" /> 
                            {isLoading ? 'Guardando...' : 'Guardar Decreto'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="matrimonios">
                    <div className="space-y-8 max-w-6xl mx-auto pb-24">
                        
                        {/* --- SECTION 1: DATOS DEL DECRETO (MATRIMONIO) --- */}
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
                                    <Input 
                                        name="decreeNumber"
                                        value={marDecreeData.decreeNumber} 
                                        onChange={handleMarDecreeChange}
                                        placeholder="Ej: 001-2025"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input 
                                        type="date"
                                        name="decreeDate"
                                        value={marDecreeData.decreeDate} 
                                        onChange={handleMarDecreeChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Anulación <span className="text-red-500">*</span></label>
                                    <select
                                        name="conceptoAnulacionId"
                                        value={marDecreeData.conceptoAnulacionId}
                                        onChange={handleMarDecreeChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Seleccionar Concepto de Anulación</option>
                                        {conceptos.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.codigo} - {c.concepto}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedMarConcept && (
                                        <div className="mt-1 text-xs text-purple-600">
                                            {selectedMarConcept.codigo} - {selectedMarConcept.concepto}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-purple-50/50 p-6 rounded-lg border border-purple-100 mt-6">
                                <h4 className="text-sm font-bold text-purple-800 mb-4 uppercase">Búsqueda de Partida a Anular</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1 relative" ref={marWrapperRef}>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Esposo(a) <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="targetName"
                                            value={marDecreeData.targetName}
                                            onChange={handleMarDecreeChange}
                                            placeholder="Nombre de uno de los esposos"
                                            autoComplete="off"
                                        />
                                        {showMarSuggestions && marSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                                                {marSuggestions.map((record, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                                                        onClick={() => handleMarSuggestionClick(record)}
                                                    >
                                                        {record.husbandName} {record.husbandSurname} & {record.wifeName} {record.wifeSurname}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Libro <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="book"
                                            value={marDecreeData.book}
                                            onChange={handleMarDecreeChange}
                                            placeholder="No."
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Folio <span className="text-red-500">*</span></label>
                                        <Input 
                                            name="page"
                                            value={marDecreeData.page}
                                            onChange={handleMarDecreeChange}
                                            placeholder="No."
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número <span className="text-red-500">*</span></label>
                                            <Input 
                                                name="entry"
                                                value={marDecreeData.entry}
                                                onChange={handleMarDecreeChange}
                                                placeholder="No."
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleMarSearch} 
                                            disabled={isLoading}
                                            className="mb-[2px] bg-[#4B7BA7] hover:bg-[#3A6286] text-white"
                                        >
                                            {isLoading ? '...' : 'Buscar'}
                                        </Button>
                                    </div>
                                </div>

                                {marSearchMessage && (
                                    <div className={`mt-4 p-3 rounded-md text-sm font-medium flex items-center gap-2 ${marSearchMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                        {marSearchMessage.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                                        {marSearchMessage.text}
                                    </div>
                                )}

                                {marFoundRecord && (
                                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Registro Encontrado</h5>
                                        <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><span className="font-semibold">Esposos:</span> {marFoundRecord.husbandName} {marFoundRecord.husbandSurname} & {marFoundRecord.wifeName} {marFoundRecord.wifeSurname}</div>
                                            <div><span className="font-semibold">Fecha:</span> {marFoundRecord.sacramentDate || marFoundRecord.fechaCelebracion}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- SECTION 2: FORMULARIO DE NUEVA PARTIDA (MATRIMONIO) --- */}
                        <div className={`bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6 transition-all duration-300 ${!marFoundRecord ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <Heart className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Matrimonio <span className="text-red-500">*</span></label>
                                    <Input type="date" name="sacramentDate" value={newMarPartida.sacramentDate} onChange={handleNewMarPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Matrimonio</label>
                                    <Input name="lugarMatrimonio" value={newMarPartida.lugarMatrimonio} onChange={handleNewMarPartidaChange} placeholder="Parroquia..." />
                                </div>
                            </div>
                            
                            {/* Husband Section */}
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

                            {/* Wife Section */}
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
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Testigos</label>
                                    <Input name="witnesses" value={newMarPartida.witnesses} onChange={handleNewMarPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label>
                                    <Input name="minister" value={newMarPartida.minister} onChange={handleNewMarPartidaChange} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label>
                                    <select 
                                        name="ministerFaith" 
                                        value={newMarPartida.ministerFaith}
                                        onChange={handleNewMarPartidaChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                    >
                                        {activePriest && <option value={activePriest}>{activePriest}</option>}
                                        <option value="">Otro...</option>
                                    </select>
                                    {(!activePriest || newMarPartida.ministerFaith !== activePriest) && (
                                        <Input 
                                            name="ministerFaith"
                                            value={newMarPartida.ministerFaith}
                                            onChange={handleNewMarPartidaChange}
                                            className="mt-2"
                                            placeholder="Nombre manual..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ACTION BUTTONS (MATRIMONIO) --- */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:pl-64 z-20">
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/parroquia/decretos/ver-correcciones')} 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleMarSave} 
                            disabled={!marFoundRecord || isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold px-6"
                        >
                            <Save className="w-4 h-4 mr-2" /> 
                            {isLoading ? 'Guardando...' : 'Guardar Decreto'}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
};

export default BaptismCorrectionNewPage;
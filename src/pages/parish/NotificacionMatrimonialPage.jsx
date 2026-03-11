import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/components/ui/use-toast';
import { Mail, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import BusquedaPartidaBautismo from '@/components/BusquedaPartidaBautismo';
import FormularioNotificacionMatrimonial from '@/components/FormularioNotificacionMatrimonial';
import FormularioNotificacionManual from '@/components/FormularioNotificacionManual';
import ConfirmacionNotificacion from '@/components/ConfirmacionNotificacion';

import FiltrosRespaldos from '@/components/FiltrosRespaldos';
import TablaRespaldos from '@/components/TablaRespaldos';
import ModalVerDocumento from '@/components/ModalVerDocumento';

import { filtrarDocumentos, enriquecerDocumentoConDatos } from '@/utils/matrimonialNotificationDocumentHelpers';
import { validarPersonaNoTieneConyuge } from '@/utils/matrimonialNotificationValidation';

const NotificacionMatrimonialPage = () => {
    const { user } = useAuth();
    const { 
        guardarNotificacionMatrimonial, 
        getDocumentosParroquia, 
        getParroquiasReceptoras,
        getBaptisms,
        getMatrimonios,
        getMisDatosList,
        obtenerNotasAlMargen,
        data,
        loadData
    } = useAppData();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('crear');
    const [isManualMode, setIsManualMode] = useState(false); // NUEVO ESTADO MODO MANUAL

    const [selectedPartida, setSelectedPartida] = useState(null);
    const [savedDocumento, setSavedDocumento] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [rawDocuments, setRawDocuments] = useState([]);
    const [filteredDocuments, setFilteredDocuments] = useState([]);
    const [availableReceiverParishes, setAvailableReceiverParishes] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showDocumentModal, setShowDocumentModal] = useState(false);

    useEffect(() => {
        if (user?.parishId) {
            loadRespaldosData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.parishId]);

    const loadRespaldosData = () => {
        const docs = getDocumentosParroquia(user.parishId);
        const parishes = getParroquiasReceptoras(user.parishId);
        setRawDocuments(docs);
        if (activeTab === 'respaldos') {
            setFilteredDocuments(docs);
            setAvailableReceiverParishes(parishes);
        }
    };

    const handlePartidaSelected = (partida) => {
        if (!partida) {
            setSelectedPartida(null);
            return;
        }

        if (!partida.id || (!partida.nombres && !partida.firstName) || (!partida.apellidos && !partida.lastName)) {
            toast({
                title: "Error de Validación",
                description: "La partida seleccionada no contiene los datos mínimos requeridos (ID, Nombres, Apellidos).",
                variant: "destructive"
            });
            setSelectedPartida(null);
            return;
        }

        setSelectedPartida(partida);
        setError(null);
        
        const firstName = partida?.nombres || partida?.firstName || '';
        const lastName = partida?.apellidos || partida?.lastName || '';
        const personName = `${firstName} ${lastName}`.trim();
        
        const validacion = validarPersonaNoTieneConyuge(personName, rawDocuments);
        if (!validacion.valido) {
            toast({
                title: "Atención",
                description: validacion.mensaje,
                variant: "destructive"
            });
        }
    };

    const processSave = async (payloadPartida, payloadFormData) => {
        setError(null);
        setIsSaving(true);
        
        try {
            const misDatos = getMisDatosList(user?.parishId);
            if (!misDatos || misDatos.length === 0) {
                throw new Error("Por favor configure la información de 'Mis Datos' (Nombre de Parroquia y Diócesis) antes de crear notificaciones.");
            }

            const firstName = payloadPartida?.nombres || payloadPartida?.firstName || '';
            const lastName = payloadPartida?.apellidos || payloadPartida?.lastName || '';
            const personName = `${firstName} ${lastName}`.trim();
            
            const validacion = validarPersonaNoTieneConyuge(personName, rawDocuments);
            if (!validacion.valido) {
                throw new Error(validacion.mensaje);
            }

            const notasConfig = obtenerNotasAlMargen(user?.parishId);
            const notaMatrimonialPlantilla = notasConfig?.porNotificacionMatrimonial?.textoParaPartidaOriginal || "CONTRAJO MATRIMONIO CON [NOMBRE_CONYUGE] EL DIA [FECHA_MATRIMONIO] EN LA PARROQUIA [PARROQUIA_MATRIMONIO] DE LA DIOCESIS DE [DIOCESIS_MATRIMONIO].";

            const payload = {
                partida: payloadPartida,
                formData: payloadFormData,
                parishId: user.parishId,
                createdBy: user.username,
                notaPlantilla: notaMatrimonialPlantilla
            };

            const result = guardarNotificacionMatrimonial(payload);

            if (result.success) {
                setSavedDocumento(result.data);
                setShowConfirmation(true);
                setIsManualMode(false);
                
                toast({
                    title: "Éxito",
                    description: "Notificación matrimonial guardada correctamente.",
                    className: "bg-green-600 text-white"
                });
                
                loadData();
                loadRespaldosData();
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            console.error("[Notificación Matrimonial] Error saving:", err);
            setError(err.message);
            toast({ 
                title: "Error al guardar", 
                description: err.message, 
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handler para Guardado Normal
    const handleSave = (formData) => {
        if (!selectedPartida || !selectedPartida.id) {
            setError("No hay una partida válida seleccionada.");
            return;
        }
        processSave(selectedPartida, formData);
    };

    // Handler para Guardado Manual
    const handleSaveManual = (manualData) => {
        // Creamos una partida virtual para engañar al sistema
        const fakePartida = {
            id: `manual-${Date.now()}`,
            nombres: manualData.nombresBautizado,
            apellidos: manualData.apellidosBautizado,
            book_number: manualData.libroBautismo,
            page_number: manualData.folioBautismo,
            entry_number: manualData.numeroBautismo,
            isManual: true
        };

        const formData = {
            receiverParishId: manualData.parroquiaDestinoId,
            spouseName: manualData.spouseName,
            marriageDate: manualData.marriageDate,
            marriageBook: manualData.marriageBook,
            marriageFolio: manualData.marriageFolio,
            marriageNumber: manualData.marriageNumber,
            marriageParish: user?.parishId,  // Usará el UUID que será traducido al imprimir
            marriageDiocese: user?.dioceseId // Usará el UUID que será traducido al imprimir
        };

        processSave(fakePartida, formData);
    };

    const handleCancel = () => {
        setSelectedPartida(null);
        setIsManualMode(false);
        setError(null);
    };

    const handleGoToBackups = () => {
        setShowConfirmation(false);
        setSelectedPartida(null);
        setIsManualMode(false);
        setActiveTab('respaldos');
        loadRespaldosData();
    };

    const handleFilterChange = (filters) => {
        const filtered = filtrarDocumentos(rawDocuments, filters);
        setFilteredDocuments(filtered);
    };

    const handleViewDocument = (doc) => {
        const baptisms = getBaptisms(user.parishId);
        const matrimonios = getMatrimonios(user.parishId);
        const enrichedDoc = enriquecerDocumentoConDatos(doc, baptisms, matrimonios);
        
        setSelectedDocument(enrichedDoc);
        setShowDocumentModal(true);
    };

    const handleUpdateDocumento = (updatedDocument) => {
        loadRespaldosData();
    };

    const currentParishInfo = (data.parishes || []).find(p => p.id === user?.parishId);
    const receiverParishInfo = selectedDocument?.receiverParishId 
        ? (data.parishes || []).find(p => p.id === selectedDocument.receiverParishId) 
        : null;

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <Helmet>
                <title>Notificación Matrimonial | Eclesia Digital</title>
                <meta name="description" content="Gestión de notificaciones matrimoniales y respaldos." />
            </Helmet>

            <div className="mb-6 flex items-center gap-3">
                <div className="bg-[#4B7BA7] p-2 rounded-lg">
                    <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notificación Matrimonial</h1>
                    <p className="text-gray-500 text-sm">Genere avisos de matrimonio y consulte el archivo de respaldos enviados.</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                        <h3 className="text-red-800 font-bold">Atención</h3>
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 w-full justify-start overflow-x-auto bg-gray-100/50 p-1 border border-gray-200">
                    <TabsTrigger value="crear" className="px-6 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all font-medium">
                        Crear Notificación
                    </TabsTrigger>
                    <TabsTrigger value="respaldos" className="px-6 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all font-medium" onClick={() => loadRespaldosData()}>
                        Respaldos / Archivo
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="crear" className="space-y-8 pb-12 focus-visible:outline-none">
                    
                    {/* OPCIÓN BÚSQUEDA O MODO MANUAL */}
                    {!selectedPartida && !isManualMode && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">1</div>
                                <h2 className="text-lg font-bold text-gray-800">Seleccionar Partida de Bautismo Local</h2>
                            </div>
                            
                            <BusquedaPartidaBautismo onPartidaSelected={handlePartidaSelected} />
                            
                            <div className="relative flex py-5 items-center">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">O</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <div className="text-center bg-gray-50 border border-gray-200 p-6 rounded-xl">
                                <h3 className="font-bold text-gray-800 mb-2">¿La persona fue bautizada en OTRA Parroquia?</h3>
                                <p className="text-sm text-gray-600 mb-4 max-w-lg mx-auto">
                                    Si el bautismo no está en su base de datos local, ingrese los datos manualmente para emitir la notificación.
                                </p>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsManualMode(true)} 
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold shadow-sm"
                                >
                                    <Edit3 className="w-4 h-4 mr-2" /> Crear Notificación Manual
                                </Button>
                            </div>
                        </section>
                    )}

                    {/* VISTA MODO LOCAL NORMAL */}
                    {selectedPartida && !isManualMode && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">2</div>
                                <h2 className="text-lg font-bold text-gray-800">Completar Datos de Notificación</h2>
                            </div>
                            
                            <FormularioNotificacionMatrimonial 
                                selectedPartida={selectedPartida} 
                                allDocuments={rawDocuments}
                                onSave={handleSave} 
                                onCancel={handleCancel}
                                disabled={isSaving}
                            />
                        </section>
                    )}

                    {/* VISTA MODO MANUAL EXTERNO */}
                    {isManualMode && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="flex items-center gap-3 mb-4">
                                 <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white">
                                     <Edit3 className="w-4 h-4" />
                                 </div>
                                 <div>
                                     <h2 className="text-lg font-bold text-gray-800">Notificación Manual</h2>
                                     <p className="text-xs text-gray-500">Para personas no registradas en su base local.</p>
                                 </div>
                             </div>
                             
                             <FormularioNotificacionManual 
                                 parishes={data.parishes || []}
                                 onSave={handleSaveManual}
                                 onCancel={handleCancel}
                                 disabled={isSaving}
                             />
                        </section>
                    )}
                </TabsContent>

                <TabsContent value="respaldos" className="space-y-6 pb-12 focus-visible:outline-none">
                    <FiltrosRespaldos 
                        onFilterChange={handleFilterChange} 
                        availableParishes={availableReceiverParishes} 
                    />
                    
                    <TablaRespaldos 
                        documentos={filteredDocuments} 
                        onViewDocument={handleViewDocument} 
                        onUpdateDocument={handleUpdateDocumento}
                        catalogParishes={data.parishes || []}
                    />
                </TabsContent>
            </Tabs>

            <ConfirmacionNotificacion 
                isOpen={showConfirmation} 
                documento={savedDocumento} 
                onClose={handleGoToBackups} 
                onGoToBackups={handleGoToBackups} 
                onViewDocument={() => handleViewDocument(savedDocumento)}
            />

            <ModalVerDocumento 
                isOpen={showDocumentModal}
                onClose={() => setShowDocumentModal(false)}
                documento={selectedDocument}
                emisorInfo={currentParishInfo}
                receptorInfo={receiverParishInfo}
            />

        </DashboardLayout>
    );
};

export default NotificacionMatrimonialPage;

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/components/ui/use-toast';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import BusquedaPartidaBautismo from '@/components/BusquedaPartidaBautismo';
import FormularioNotificacionMatrimonial from '@/components/FormularioNotificacionMatrimonial';
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
        data,
        loadData
    } = useAppData();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('crear');

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

    const handleSave = async (formData) => {
        setError(null);
        setIsSaving(true);
        
        try {
            if (!selectedPartida || !selectedPartida.id) {
                 throw new Error("No hay una partida válida seleccionada.");
            }

            const misDatos = getMisDatosList(user?.parishId);
            if (!misDatos || misDatos.length === 0) {
                throw new Error("Por favor configure la información de 'Mis Datos' (Nombre de Parroquia y Diócesis) antes de crear notificaciones.");
            }

            const firstName = selectedPartida?.nombres || selectedPartida?.firstName || '';
            const lastName = selectedPartida?.apellidos || selectedPartida?.lastName || '';
            const personName = `${firstName} ${lastName}`.trim();
            
            const validacion = validarPersonaNoTieneConyuge(personName, rawDocuments);
            if (!validacion.valido) {
                throw new Error(validacion.mensaje);
            }

            const payload = {
                partida: selectedPartida,
                formData: formData,
                parishId: user.parishId,
                createdBy: user.username
            };

            const result = guardarNotificacionMatrimonial(payload);

            if (result.success) {
                setSavedDocumento(result.data);
                setShowConfirmation(true);
                
                toast({
                    title: "Éxito",
                    description: "Notificación matrimonial guardada correctamente. Ambas partidas han sido afectadas.",
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

    const handleCancel = () => {
        setSelectedPartida(null);
        setError(null);
    };

    const handleGoToBackups = () => {
        setShowConfirmation(false);
        setSelectedPartida(null);
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
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${selectedPartida ? 'bg-green-500' : 'bg-blue-600'}`}>
                                {selectedPartida ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">Seleccionar Partida de Bautismo Principal</h2>
                        </div>
                        
                        <BusquedaPartidaBautismo onPartidaSelected={handlePartidaSelected} />
                    </section>

                    {selectedPartida && (
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

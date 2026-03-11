
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ChevronRight, Save, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

const BaptismSentarRegistrosPage = () => {
    const { user } = useAuth();
    const { getBaptismParameters, saveBaptismParameters } = useAppData();
    const { toast } = useToast();
    const navigate = useNavigate();
    
    const [pendingBaptisms, setPendingBaptisms] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [parameters, setParameters] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.parishId) return;
        const entityId = user.parishId;
        
        // 1. Cargar la base de datos de Temporales
        const storedPending = JSON.parse(localStorage.getItem(`pendingBaptisms_${entityId}`) || '[]');
        setPendingBaptisms(storedPending);

        // 2. Cargar parámetros de numeración y consecutivos
        const currentParams = getBaptismParameters(entityId);
        setParameters(currentParams);
        setIsLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.parishId]);

    // Helper para mantener el formato de relleno (ej. 001, 002)
    const formatNumberLike = (num, template) => {
        const strTemp = String(template || '');
        if (strTemp.startsWith('0')) {
            return String(num).padStart(strTemp.length, '0');
        }
        return String(num);
    };

    // Validación de fecha futura
    const isDateInFuture = (dateString) => {
        if (!dateString) return false;
        // Utilizando la fecha actual de referencia (2026-03-09) o el reloj del sistema
        const today = new Date('2026-03-09T00:00:00');
        const checkDate = new Date(dateString);
        if (isNaN(checkDate.getTime())) return false;
        
        // Normalizamos las horas para comparar solo fechas
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        
        return checkDate > today;
    };

    const handleRegisterIndividual = async () => {
        const currentBaptism = pendingBaptisms[currentIndex];
        if (!currentBaptism || !user?.parishId) return;

        const dateStr = currentBaptism.fechaSacramento || currentBaptism.baptismDate;
        if (isDateInFuture(dateStr)) {
            toast({
                title: "Error de validación",
                description: "No se puede sentar un registro con fecha de celebración futura. La fecha debe ser igual o anterior a hoy.",
                variant: "destructive"
            });
            return;
        }
        
        const entityId = user.parishId;
        const hoy = new Date().toISOString().split('T')[0]; // Formato AAAA-MM-DD

        // 1. Convertir a Permanente y asignar números actuales
        const recordToSave = {
            ...currentBaptism,
            status: 'seated', // o 'permanente'
            book_number: parameters.ordinarioLibro || 1,
            page_number: parameters.ordinarioFolio || 1,
            entry_number: parameters.ordinarioNumero || 1,
            // Asignación de compatibilidad con esquemas anteriores
            libro: parameters.ordinarioLibro || 1,
            folio: parameters.ordinarioFolio || 1,
            numero: parameters.ordinarioNumero || 1,
            fechaAsentamiento: hoy
        };

        // 2. Guardar en Base de Datos de Permanentes
        const finalKey = `baptisms_${entityId}`;
        const currentFinal = JSON.parse(localStorage.getItem(finalKey) || '[]');
        localStorage.setItem(finalKey, JSON.stringify([...currentFinal, recordToSave]));

        // 3. Calcular los siguientes valores de libro, folio y número
        let numLibro = parseInt(parameters.ordinarioLibro || 1, 10);
        let numFolio = parseInt(parameters.ordinarioFolio || 1, 10);
        let numActa = parseInt(parameters.ordinarioNumero || 1, 10);
        const partidasPorFolio = parseInt(parameters.ordinarioPartidas || 2, 10);
        const reiniciarPorFolio = Boolean(parameters.ordinarioRestartNumber);

        numActa++;
        
        // Lógica de incremento automático de folios
        if (reiniciarPorFolio) {
            if (numActa > partidasPorFolio) {
                numFolio++;
                numActa = 1;
            }
        } else {
            // Si el número no reinicia, cada múltiplo de las partidas por folio indica un cambio de folio
            if ((numActa - 1) % Math.max(1, partidasPorFolio) === 0 && (numActa - 1) !== 0) {
                numFolio++;
            }
        }

        const nextParams = {
            ...parameters,
            ordinarioLibro: formatNumberLike(numLibro, parameters.ordinarioLibro),
            ordinarioFolio: formatNumberLike(numFolio, parameters.ordinarioFolio),
            ordinarioNumero: formatNumberLike(numActa, parameters.ordinarioNumero),
        };

        // 4. Actualizar parámetros en estado y persistencia
        saveBaptismParameters(nextParams, entityId);
        setParameters(nextParams);

        // 5. Eliminar de Temporales
        const updatedPending = pendingBaptisms.filter((_, idx) => idx !== currentIndex);
        localStorage.setItem(`pendingBaptisms_${entityId}`, JSON.stringify(updatedPending));
        setPendingBaptisms(updatedPending);

        toast({ 
            title: "Asentado Exitosamente", 
            description: `Bautismo registrado: Libro ${recordToSave.book_number}, Folio ${recordToSave.page_number}, Número ${recordToSave.entry_number}`, 
            className: "bg-green-50 text-green-900 border-green-200" 
        });

        if (currentIndex >= updatedPending.length) {
            setCurrentIndex(Math.max(0, updatedPending.length - 1));
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout entityName={user?.parishName || "Parroquia"}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="p-8 text-center text-gray-500">Cargando parámetros...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (pendingBaptisms.length === 0) {
        return (
            <DashboardLayout entityName={user?.parishName || "Parroquia"}>
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-8 text-center mt-6">
                    <CheckCircle2 className="w-16 h-16 text-green-200 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">¡Todo al día!</h3>
                    <p className="text-gray-500 mt-2">No hay bautizos temporales pendientes por sentar.</p>
                </div>
            </DashboardLayout>
        );
    }

    const currentBaptism = pendingBaptisms[currentIndex];
    const baptismDateStr = currentBaptism?.fechaSacramento || currentBaptism?.baptismDate;
    const isFutureDate = isDateInFuture(baptismDateStr);

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#4B7BA7] flex items-center gap-2">
                        Sentar Registros <span className="text-gray-400 text-lg font-normal">(Individual)</span>
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Asignación consecutiva de Libro, Folio y Número a partidas temporales desde parámetros.
                    </p>
                </div>
                <Button variant="outline" className="text-gray-600" onClick={() => navigate('/parish/baptisms')}>
                    <LogOut className="w-4 h-4 mr-2" /> Salir y Volver
                </Button>
            </div>

            <div className="bg-white p-4 rounded-t-lg shadow-sm border border-gray-200 flex items-center justify-between border-b-0">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} 
                    disabled={currentIndex === 0}
                    className="hover:bg-gray-100"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </Button>
                <span className="font-mono text-sm font-bold text-gray-600 bg-gray-100 px-4 py-1.5 rounded-full">
                    Registro {currentIndex + 1} de {pendingBaptisms.length}
                </span>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentIndex(prev => Math.min(pendingBaptisms.length - 1, prev + 1))} 
                    disabled={currentIndex === pendingBaptisms.length - 1}
                    className="hover:bg-gray-100"
                >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                </Button>
            </div>

            <div className="bg-white p-6 rounded-b-lg shadow-sm border border-gray-200">
                {/* Parámetros Actuales Display */}
                <div className="grid grid-cols-3 gap-4 mb-8 p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div className="text-center md:text-left">
                        <label className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Libro a Asignar</label>
                        <div className="font-mono text-2xl text-blue-900 font-bold bg-white inline-block px-4 py-1 rounded-md shadow-sm border border-blue-100 min-w-[80px] text-center">
                            {parameters?.ordinarioLibro || 1}
                        </div>
                    </div>
                    <div className="text-center md:text-left">
                        <label className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Folio a Asignar</label>
                        <div className="font-mono text-2xl text-blue-900 font-bold bg-white inline-block px-4 py-1 rounded-md shadow-sm border border-blue-100 min-w-[80px] text-center">
                            {parameters?.ordinarioFolio || 1}
                        </div>
                    </div>
                    <div className="text-center md:text-left">
                        <label className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Número a Asignar</label>
                        <div className="font-mono text-2xl text-blue-900 font-bold bg-white inline-block px-4 py-1 rounded-md shadow-sm border border-blue-100 min-w-[80px] text-center">
                            {parameters?.ordinarioNumero || 1}
                        </div>
                    </div>
                </div>

                {/* Previsualización del registro temporal */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">i</span>
                        Información del Registro Temporal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 px-2">
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombres y Apellidos</label>
                            <p className="font-semibold text-lg text-gray-900">
                                {currentBaptism.nombres || currentBaptism.firstName} {currentBaptism.apellidos || currentBaptism.lastName}
                            </p>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Fecha de Bautismo</label>
                            <p className={`font-medium ${isFutureDate ? 'text-red-600' : 'text-gray-800'}`}>
                                {baptismDateStr || 'No registrada'}
                            </p>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Padres</label>
                            <p className="text-sm text-gray-700">
                                {currentBaptism.nombrePadre || currentBaptism.padre || '---'} <br className="hidden md:block"/> 
                                <span className="text-gray-400 mx-1">/</span> 
                                {currentBaptism.nombreMadre || currentBaptism.madre || '---'}
                            </p>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Ministro</label>
                            <p className="text-sm text-gray-700">
                                {currentBaptism.ministro || currentBaptism.sacerdote || '---'}
                            </p>
                        </div>
                    </div>
                </div>

                {isFutureDate && (
                    <div className="flex items-start gap-3 text-red-700 bg-red-50 p-4 rounded-lg mb-6 border border-red-200">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-sm">Fecha de celebración inválida</h4>
                            <p className="text-sm mt-1">No se puede sentar un registro con fecha de celebración futura. La fecha debe ser igual o anterior a hoy.</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
                    <Button 
                        size="lg"
                        className={`shadow-sm transition-all font-semibold px-8 ${
                            isFutureDate 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-[#4B7BA7] hover:bg-[#3a5f8a] text-white'
                        }`}
                        onClick={handleRegisterIndividual}
                        disabled={isFutureDate}
                    >
                        <Save className="w-5 h-5 mr-2" /> 
                        Sentar como Permanente
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default BaptismSentarRegistrosPage;

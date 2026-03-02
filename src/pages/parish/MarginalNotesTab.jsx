
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Check, Heart, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertDateToSpanishTextNatural } from '@/utils/dateTimeFormatters';

const MarginalNotesTab = () => {
    const { user } = useAuth();
    const { 
        obtenerNotasAlMargen, 
        saveNotasAlMargen
    } = useAppData();
    const { toast } = useToast();

    const [notes, setNotes] = useState({
        porCorreccion: { anulada: '', nuevaPartida: '' },
        porReposicion: { nuevaPartida: '' },
        porNotificacionMatrimonial: '',
        estandar: ''
    });
    
    const [previews, setPreviews] = useState({
        anulada: '',
        nuevaPartida: '',
        reposicion: '',
        matrimonial: '',
        standard: ''
    });
    
    const [savedStates, setSavedStates] = useState({
        correction: false,
        reposicion: false,
        matrimonial: false,
        standard: false
    });

    // DEBUG: Monitor state
    useEffect(() => {
        console.log("MarginalNotesTab - Current User:", user);
    }, [user]);

    useEffect(() => {
        if (user?.parishId) {
            const parishIdStr = String(user.parishId);
            console.log("MarginalNotesTab - Loading data for parish:", parishIdStr);
            const data = obtenerNotasAlMargen(parishIdStr);
            console.log("MarginalNotesTab - Loaded data:", data);

            setNotes({
                porCorreccion: data.porCorreccion || { anulada: '', nuevaPartida: '' },
                porReposicion: data.porReposicion || { nuevaPartida: '' },
                porNotificacionMatrimonial: data.porNotificacionMatrimonial || '',
                estandar: data.estandar || ''
            });
        } else {
            console.warn("MarginalNotesTab - Waiting for parishId...");
        }
    }, [user?.parishId, obtenerNotasAlMargen]);

    useEffect(() => {
        const sampleDate = convertDateToSpanishTextNatural(new Date().toISOString().split('T')[0]).toUpperCase();
        const newPreviews = { ...previews };

        if (notes.porCorreccion.anulada) {
            newPreviews.anulada = notes.porCorreccion.anulada
                .replace(/\[FECHA_DECRETO\]/g, "OCHO DE ABRIL DE DOS MIL VEINTICUATRO")
                .replace(/\[NUMERO_DECRETO\]/g, "0357")
                .replace(/\[LIBRO_NUEVA\]/g, "0003")
                .replace(/\[FOLIO_NUEVA\]/g, "0001")
                .replace(/\[NUMERO_PARTIDA_NUEVA\]/g, "0002")
                .replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
        }

        if (notes.porCorreccion.nuevaPartida) {
            newPreviews.nuevaPartida = notes.porCorreccion.nuevaPartida
                .replace(/\[NUMERO_DECRETO\]/g, "1957")
                .replace(/\[FECHA_DECRETO\]/g, "DIEZ DE ABRIL DE DOS MIL VEINTITRÉS")
                .replace(/\[OFICINA_DECRETO\]/g, "CANCILLERÍA")
                .replace(/\[LIBRO_ANULADA\]/g, "001")
                .replace(/\[FOLIO_ANULADA\]/g, "039")
                .replace(/\[NUMERO_PARTIDA_ANULADA\]/g, "0779")
                .replace(/\[NOMBRE_SACERDOTE\]/g, "PADRE JAIDER HERRERA")
                .replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
        }

        if (notes.porReposicion.nuevaPartida) {
            newPreviews.reposicion = notes.porReposicion.nuevaPartida
                .replace(/\[NUMERO_DECRETO\]/g, "0842")
                .replace(/\[FECHA_DECRETO\]/g, "DOCE DE ENERO DE DOS MIL VEINTICUATRO")
                .replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
        }

        if (notes.porNotificacionMatrimonial) {
            newPreviews.matrimonial = notes.porNotificacionMatrimonial
                .replace(/\[FECHA_NOTIFICACION\]/g, sampleDate)
                .replace(/\[FECHA_MATRIMONIO\]/g, "QUINCE DE MAYO DE DOS MIL VEINTICUATRO")
                .replace(/\[PARROQUIA_MATRIMONIO\]/g, "SANTA MARÍA DE LA ESPERANZA")
                .replace(/\[DIOCESIS_MATRIMONIO\]/g, "BARRANQUILLA")
                .replace(/\[NOMBRE_CONYUGE\]/g, "MARÍA FERNANDA LÓPEZ")
                .replace(/\[LIBRO_MAT\]/g, "0012")
                .replace(/\[FOLIO_MAT\]/g, "0045")
                .replace(/\[NUMERO_MAT\]/g, "0123");
        }

        if (notes.estandar) {
            newPreviews.standard = notes.estandar.replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
        }

        setPreviews(newPreviews);
    }, [notes]);

    const showSuccess = (section) => {
        setSavedStates(prev => ({ ...prev, [section]: true }));
        setTimeout(() => {
            setSavedStates(prev => ({ ...prev, [section]: false }));
        }, 3000);
    };

    const handleSave = (section) => {
        console.log("MarginalNotesTab - SAVE BUTTON CLICKED for:", section);

        if (!user?.parishId) {
            console.error("MarginalNotesTab - CANNOT SAVE: No parishId found.");
            toast({
                title: "Error de Sesión",
                description: "No se pudo identificar su parroquia. Por favor, cierre sesión e ingrese nuevamente.",
                variant: "destructive"
            });
            return;
        }

        const parishIdStr = String(user.parishId);
        console.log("MarginalNotesTab - Data to save:", notes);

        try {
            const result = saveNotasAlMargen(notes, parishIdStr);
            console.log("MarginalNotesTab - AppDataContext result:", result);

            if (result.success) {
                toast({
                    title: "¡Configuración Guardada!",
                    description: "Los cambios se han aplicado correctamente.",
                    className: "bg-emerald-600 text-white border-none font-bold"
                });
                showSuccess(section);
            } else {
                toast({
                    title: "Error al Guardar",
                    description: result.message || "Ocurrió un problema técnico.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("MarginalNotesTab - CRASH DURING SAVE:", error);
            toast({
                title: "Error Crítico",
                description: "La aplicación encontró un error al intentar guardar.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-8 py-6 px-4 max-w-5xl mx-auto">

            {/* Sección: Notificación Matrimonial */}
            <div className="bg-white rounded-2xl border-2 border-rose-100 shadow-sm p-8 transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Notificación Matrimonial</h3>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nota para el Bautizado notificado como casado</p>
                        </div>
                    </div>
                    <AnimatePresence>
                        {savedStates.matrimonial && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center text-emerald-600 text-xs font-black bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 uppercase tracking-widest"
                            >
                                <Check className="w-4 h-4 mr-2" /> Guardado
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {!user?.parishId && (
                    <div className="mb-4 p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg flex items-center gap-2 text-xs font-bold">
                        <AlertCircle className="w-4 h-4" />
                        Atención: No se ha detectado el ID de su parroquia. El guardado podría fallar.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-2">
                            <span className="text-[10px] font-black text-rose-700 uppercase tracking-[0.2em] block">Variables Disponibles</span>
                            <p className="text-[10px] text-rose-600 font-bold leading-relaxed">
                                [FECHA_NOTIFICACION], [FECHA_MATRIMONIO], [PARROQUIA_MATRIMONIO], [DIOCESIS_MATRIMONIO], [NOMBRE_CONYUGE], [LIBRO_MAT], [FOLIO_MAT], [NUMERO_MAT]
                            </p>
                        </div>
                        <textarea
                            value={notes.porNotificacionMatrimonial}
                            onChange={(e) => {
                                const val = e.target.value;
                                setNotes(prev => ({ ...prev, porNotificacionMatrimonial: val }));
                            }}
                            className="w-full min-h-[160px] p-4 border-2 border-gray-100 rounded-xl focus:border-rose-300 focus:ring-0 outline-none transition-all text-sm font-bold text-gray-700 leading-relaxed font-mono"
                            placeholder="Defina el texto legal para la notificación..."
                        />
                    </div>
                    <div className="flex flex-col h-full">
                        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 flex-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Heart className="w-20 h-20" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Vista Previa de Impresión</span>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-inner min-h-[120px]">
                                <p className="text-xs text-gray-800 font-bold italic leading-relaxed">
                                    {previews.matrimonial || "Configure el texto para ver la vista previa..."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSave('matrimonial');
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-6 rounded-xl shadow-lg shadow-rose-100 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <Save className="w-4 h-4 mr-2" /> Guardar Nota de Matrimonio
                    </Button>
                </div>
            </div>

            {/* Sección: Corrección */}
            <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Por Corrección (Anulación)</h3>
                    <AnimatePresence>
                        {savedStates.correction && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center text-emerald-600 text-xs font-black bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 uppercase tracking-widest"
                            >
                                <Check className="w-4 h-4 mr-2" /> Guardado
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Partida Anulada</label>
                        <textarea
                            value={notes.porCorreccion.anulada}
                            onChange={(e) => setNotes(prev => ({ ...prev, porCorreccion: { ...prev.porCorreccion, anulada: e.target.value } }))}
                            className="w-full min-h-[140px] p-4 border-2 border-gray-100 rounded-xl focus:border-blue-300 focus:ring-0 outline-none text-sm font-bold text-gray-700 font-mono"
                        />
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Vista Previa</span>
                             <p className="text-[11px] text-gray-600 font-bold italic leading-relaxed">{previews.anulada}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nueva Partida</label>
                        <textarea
                            value={notes.porCorreccion.nuevaPartida}
                            onChange={(e) => setNotes(prev => ({ ...prev, porCorreccion: { ...prev.porCorreccion, nuevaPartida: e.target.value } }))}
                            className="w-full min-h-[140px] p-4 border-2 border-gray-100 rounded-xl focus:border-blue-300 focus:ring-0 outline-none text-sm font-bold text-gray-700 font-mono"
                        />
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Vista Previa</span>
                             <p className="text-[11px] text-gray-600 font-bold italic leading-relaxed">{previews.nuevaPartida}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        onClick={() => handleSave('correction')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-8 py-6 rounded-xl"
                    >
                        <Save className="w-4 h-4 mr-2" /> Guardar Notas de Corrección
                    </Button>
                </div>
            </div>

            {/* Sección: Reposición */}
            <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Por Reposición</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nota Legal para Reposición</label>
                        <textarea
                            value={notes.porReposicion.nuevaPartida}
                            onChange={(e) => setNotes(prev => ({ ...prev, porReposicion: { nuevaPartida: e.target.value } }))}
                            className="w-full min-h-[120px] p-4 border-2 border-gray-100 rounded-xl focus:border-amber-300 focus:ring-0 outline-none text-sm font-bold text-gray-700"
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Vista Previa</span>
                        <p className="text-xs text-gray-700 font-bold italic leading-relaxed">{previews.reposicion}</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={() => handleSave('reposicion')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest px-8 py-6 rounded-xl"
                    >
                        <Save className="w-4 h-4 mr-2" /> Guardar Nota de Reposición
                    </Button>
                </div>
            </div>

            {/* Sección: Estándar */}
            <div className="bg-white rounded-2xl border-2 border-emerald-100 shadow-sm p-8">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Nota Estándar</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <textarea
                            value={notes.estandar}
                            onChange={(e) => setNotes(prev => ({ ...prev, estandar: e.target.value }))}
                            className="w-full min-h-[120px] p-4 border-2 border-gray-100 rounded-xl focus:border-emerald-300 focus:ring-0 outline-none text-sm font-bold text-gray-700"
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Vista Previa</span>
                         <p className="text-xs text-gray-700 font-bold italic leading-relaxed">{previews.standard}</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={() => handleSave('standard')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-8 py-6 rounded-xl"
                    >
                        <Save className="w-4 h-4 mr-2" /> Guardar Nota Estándar
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MarginalNotesTab;

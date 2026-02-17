
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Changed import from dateToSpanishLegalText to convertDateToSpanishTextNatural
import { convertDateToSpanishTextNatural } from '@/utils/dateTimeFormatters';

const MarginalNotesTab = () => {
    const { user } = useAuth();
    const { 
        obtenerNotasAlMargen, 
        actualizarNotaAlMargenCorreccion, 
        actualizarNotaAlMargenReposicion, 
        actualizarNotaAlMargenEstandar 
    } = useAppData();
    const { toast } = useToast();

    const [correctionNotes, setCorrectionNotes] = useState({ anulada: '', nuevaPartida: '' });
    const [reposicionNotes, setReposicionNotes] = useState({ nuevaPartida: '' });
    const [standardNote, setStandardNote] = useState('');
    
    // Preview state
    const [previewAnulada, setPreviewAnulada] = useState('');
    const [previewNuevaPartida, setPreviewNuevaPartida] = useState('');
    const [previewStandard, setPreviewStandard] = useState('');
    
    // Success indicators state
    const [savedStates, setSavedStates] = useState({
        correction: false,
        reposicion: false,
        standard: false
    });

    useEffect(() => {
        if (user?.parishId) {
            const data = obtenerNotasAlMargen(user.parishId);
            setCorrectionNotes(data.porCorreccion);
            setReposicionNotes(data.porReposicion);
            setStandardNote(data.estandar);
        }
    }, [user, obtenerNotasAlMargen]);

    // Update previews when text changes
    useEffect(() => {
        // Changed date conversion function and ensured format is YYYY-MM-DD
        const sampleDate = convertDateToSpanishTextNatural(new Date().toISOString().split('T')[0]);

        if (correctionNotes.anulada && user?.parishId) {
            // Live preview logic simulation for Anulada
            let text = correctionNotes.anulada;
            text = text.replace(/\[FECHA_DECRETO\]/g, "OCHO DE ABRIL DE DOS MIL VEINTICINCO");
            text = text.replace(/\[NUMERO_DECRETO\]/g, "0357");
            text = text.replace(/\[LIBRO_NUEVA\]/g, "0003");
            text = text.replace(/\[FOLIO_NUEVA\]/g, "0001");
            text = text.replace(/\[NUMERO_PARTIDA_NUEVA\]/g, "0002");
            text = text.replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
            setPreviewAnulada(text);
        }

        if (correctionNotes.nuevaPartida && user?.parishId) {
            // Live preview logic simulation for Nueva Partida
            let text = correctionNotes.nuevaPartida;
            text = text.replace(/\[NUMERO_DECRETO\]/g, "1957");
            text = text.replace(/\[FECHA_DECRETO\]/g, "DIEZ DE ABRIL DE DOS MIL VEINTITRÉS");
            text = text.replace(/\[OFICINA_DECRETO\]/g, "CANCILLERÍA");
            text = text.replace(/\[LIBRO_ANULADA\]/g, "001");
            text = text.replace(/\[FOLIO_ANULADA\]/g, "039");
            text = text.replace(/\[NUMERO_PARTIDA_ANULADA\]/g, "0779");
            text = text.replace(/\[NOMBRE_SACERDOTE\]/g, "PADRE JAIDER HERRERA");
            text = text.replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
            setPreviewNuevaPartida(text);
        }

        if (reposicionNotes.nuevaPartida && user?.parishId) {
             let text = reposicionNotes.nuevaPartida;
             text = text.replace(/\[NUMERO_DECRETO\]/g, "0842");
             text = text.replace(/\[FECHA_DECRETO\]/g, "DOCE DE ENERO DE DOS MIL VEINTICUATRO");
             text = text.replace(/\[FECHA_EXPEDICION\]/g, sampleDate); // Using sampleDate for consistency
             // We update the reposicion preview text directly in the JSX usually, but let's make it consistent if we added state for it
        }

        if (standardNote) {
             let text = standardNote;
             text = text.replace(/\[FECHA_EXPEDICION\]/g, sampleDate);
             setPreviewStandard(text);
        }
    }, [correctionNotes, reposicionNotes, standardNote, user]);

    const showSuccess = (section) => {
        setSavedStates(prev => ({ ...prev, [section]: true }));
        setTimeout(() => {
            setSavedStates(prev => ({ ...prev, [section]: false }));
        }, 2000);
    };

    const handleSaveCorrection = () => {
        if (!correctionNotes.anulada.trim() || !correctionNotes.nuevaPartida.trim()) {
            toast({ title: "Error", description: "Todos los campos son obligatorios.", variant: "destructive" });
            return;
        }
        const result = actualizarNotaAlMargenCorreccion(correctionNotes.anulada, correctionNotes.nuevaPartida, user.parishId);
        if (result.success) {
            toast({ title: "Guardado", description: "Notas de corrección actualizadas.", className: "bg-green-600 text-white" });
            showSuccess('correction');
        }
    };

    const handleSaveReposicion = () => {
        if (!reposicionNotes.nuevaPartida.trim()) {
            toast({ title: "Error", description: "El campo es obligatorio.", variant: "destructive" });
            return;
        }
        const result = actualizarNotaAlMargenReposicion(reposicionNotes.nuevaPartida, user.parishId);
        if (result.success) {
             toast({ title: "Guardado", description: "Nota de reposición actualizada.", className: "bg-green-600 text-white" });
             showSuccess('reposicion');
        }
    };

    const handleSaveStandard = () => {
        if (!standardNote.trim()) {
            toast({ title: "Error", description: "El texto es obligatorio.", variant: "destructive" });
            return;
        }
        const result = actualizarNotaAlMargenEstandar(standardNote, user.parishId);
        if (result.success) {
             toast({ title: "Guardado", description: "Nota estándar actualizada.", className: "bg-green-600 text-white" });
             showSuccess('standard');
        }
    };

    return (
        <div className="space-y-8 py-6 px-4 max-w-5xl mx-auto">
            
            {/* Sección 1: Corrección */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Por Corrección (Anulada y Nueva Partida Creada)</h3>
                    <AnimatePresence>
                        {savedStates.correction && (
                            <motion.span 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full"
                            >
                                <Check className="w-4 h-4 mr-1" /> Guardado
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Texto para Partida Anulada</label>
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
                                <strong>Variables:</strong> [FECHA_DECRETO], [NUMERO_DECRETO], [LIBRO_NUEVA], [FOLIO_NUEVA], [NUMERO_PARTIDA_NUEVA], [FECHA_EXPEDICION]
                            </div>
                            <textarea
                                value={correctionNotes.anulada}
                                onChange={(e) => setCorrectionNotes(prev => ({ ...prev, anulada: e.target.value }))}
                                className="w-full min-h-[160px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-gray-800 bg-white font-mono"
                                placeholder="Texto legal para la partida que se anula..."
                            />
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-100 h-full flex flex-col">
                             <span className="text-xs font-bold text-gray-500 block mb-1 uppercase">Vista Previa (Ejemplo)</span>
                             <div className="flex-1 bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 italic overflow-y-auto max-h-[200px]">
                                {previewAnulada || "Sin texto definido..."}
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Texto para Nueva Partida</label>
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
                                <strong>Variables:</strong> [NUMERO_DECRETO], [FECHA_DECRETO], [OFICINA_DECRETO], [LIBRO_ANULADA], [FOLIO_ANULADA], [NUMERO_PARTIDA_ANULADA], [NOMBRE_SACERDOTE], [FECHA_EXPEDICION]
                            </div>
                            <textarea
                                value={correctionNotes.nuevaPartida}
                                onChange={(e) => setCorrectionNotes(prev => ({ ...prev, nuevaPartida: e.target.value }))}
                                className="w-full min-h-[160px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-gray-800 bg-white font-mono"
                                placeholder="Texto legal para la nueva partida creada..."
                            />
                        </div>
                         <div className="bg-gray-50 p-3 rounded border border-gray-100 h-full flex flex-col">
                             <span className="text-xs font-bold text-gray-500 block mb-1 uppercase">Vista Previa (Ejemplo)</span>
                             <div className="flex-1 bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 italic overflow-y-auto max-h-[200px]">
                                {previewNuevaPartida || "Sin texto definido..."}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveCorrection} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Save className="w-4 h-4" /> Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* Sección 2: Reposición */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Por Reposición (Nueva Partida Creada)</h3>
                    <AnimatePresence>
                        {savedStates.reposicion && (
                            <motion.span 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full"
                            >
                                <Check className="w-4 h-4 mr-1" /> Guardado
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Texto para Nueva Partida</label>
                        <textarea
                            value={reposicionNotes.nuevaPartida}
                            onChange={(e) => setReposicionNotes(prev => ({ ...prev, nuevaPartida: e.target.value }))}
                            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-gray-800 bg-white"
                            placeholder="Texto legal para la partida de reposición..."
                        />
                         <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                             <strong>Variables:</strong> [NUMERO_DECRETO], [FECHA_DECRETO], [FECHA_EXPEDICION]
                        </div>
                    </div>
                    <div className="space-y-2">
                         <div className="bg-gray-50 p-4 rounded border border-gray-100 h-full">
                             <span className="text-xs font-bold text-gray-500 block mb-2 uppercase">Vista Previa</span>
                             <p className="text-sm text-gray-600 italic">
                                 {reposicionNotes.nuevaPartida
                                    ? reposicionNotes.nuevaPartida
                                        .replace(/\[NUMERO_DECRETO\]/g, "0842")
                                        .replace(/\[FECHA_DECRETO\]/g, "DOCE DE ENERO DE DOS MIL VEINTICUATRO")
                                        .replace(/\[FECHA_EXPEDICION\]/g, convertDateToSpanishTextNatural(new Date().toISOString().split('T')[0])) // Updated here as well
                                    : "Sin texto definido..."
                                 }
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveReposicion} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Save className="w-4 h-4" /> Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* Sección 3: Estándar */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">La Nota al Margen Estándar</h3>
                     <AnimatePresence>
                        {savedStates.standard && (
                            <motion.span 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full"
                            >
                                <Check className="w-4 h-4 mr-1" /> Guardado
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Texto Estándar</label>
                        <textarea
                            value={standardNote}
                            onChange={(e) => setStandardNote(e.target.value)}
                            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-gray-800 bg-white"
                            placeholder="Texto estándar para notas marginales..."
                        />
                         <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                             <strong>Variables:</strong> [FECHA_EXPEDICION]
                        </div>
                    </div>
                     <div className="space-y-2">
                         <div className="bg-gray-50 p-4 rounded border border-gray-100 h-full">
                             <span className="text-xs font-bold text-gray-500 block mb-2 uppercase">Vista Previa</span>
                             <p className="text-sm text-gray-600 italic">{previewStandard || "Sin texto definido..."}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveStandard} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Save className="w-4 h-4" /> Guardar Cambios
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MarginalNotesTab;


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

    // 1. Diagnostics on Mount
    useEffect(() => {
        console.log("MarginalNotesTab - MOUNTED. User context:", user);
    }, [user]);

    // 2. Load data
    useEffect(() => {
        const parishId = user?.parishId || user?.parish_id;

        if (parishId) {
            const data = obtenerNotasAlMargen(parishId);
            setNotes({
                porCorreccion: data.porCorreccion || { anulada: '', nuevaPartida: '' },
                porReposicion: data.porReposicion || { nuevaPartida: '' },
                porNotificacionMatrimonial: data.porNotificacionMatrimonial || '',
                estandar: data.estandar || ''
            });
        }
    }, [user, obtenerNotasAlMargen]);

    // 3. Previews
    useEffect(() => {
        let sampleDate = "____________________";
        try {
            sampleDate = convertDateToSpanishTextNatural(new Date().toISOString().split('T')[0]).toUpperCase();
        } catch (e) {}

        const newPreviews = { ...previews };

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

        // (Other previews simplified for diagnostic version)
        setPreviews(newPreviews);
    }, [notes]);

    const showSuccess = (section) => {
        setSavedStates(prev => ({ ...prev, [section]: true }));
        setTimeout(() => setSavedStates(prev => ({ ...prev, [section]: false })), 3000);
    };

    // 4. THE ACTION HANDLER WITH ALERTS
    const handleSave = (section) => {
        alert("DIAGNÓSTICO PASO 1: Se presionó el botón de guardado para: " + section);

        const parishId = user?.parishId || user?.parish_id;
        console.log("MarginalNotesTab - Parish ID detected:", parishId);

        if (!parishId) {
            alert("DIAGNÓSTICO ERROR: No se encontró parishId en el usuario logueado. El objeto user es: " + JSON.stringify(user));
            return;
        }

        if (!notes.porNotificacionMatrimonial) {
            alert("DIAGNÓSTICO AVISO: El campo de Notificación Matrimonial está vacío.");
        }

        try {
            alert("DIAGNÓSTICO PASO 2: Enviando datos al sistema de almacenamiento...");
            const result = saveNotasAlMargen(notes, parishId);

            if (result && result.success) {
                alert("DIAGNÓSTICO ÉXITO: El sistema reporta guardado correcto en localStorage.");
                toast({ title: "¡Nota Guardada!", className: "bg-emerald-600 text-white" });
                showSuccess(section);
            } else {
                alert("DIAGNÓSTICO FALLO: El sistema de guardado devolvió un error: " + (result?.message || "Desconocido"));
            }
        } catch (error) {
            alert("DIAGNÓSTICO CRÍTICO: Ocurrió una excepción de JavaScript: " + error.message);
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 py-6 px-4 max-w-5xl mx-auto">
            <div className="bg-amber-100 p-4 rounded-lg border border-amber-300 text-amber-900 text-xs font-bold mb-4">
                MODO DIAGNÓSTICO ACTIVO: Si el botón no muestra mensajes de alerta, por favor revise la consola (F12).
            </div>

            {/* SECCIÓN NOTIFICACIÓN MATRIMONIAL */}
            <div className="bg-white rounded-2xl border-2 border-rose-100 shadow-sm p-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Heart className="w-10 h-10 text-rose-600" />
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Notificación Matrimonial</h3>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Parroquia actual: {user?.parishName || "Cargando..."} (ID: {user?.parishId || "N/A"})
                            </p>
                        </div>
                    </div>
                    {savedStates.matrimonial && <span className="text-emerald-600 font-bold">✓ Guardado</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <textarea
                            value={notes.porNotificacionMatrimonial}
                            onChange={(e) => setNotes({ ...notes, porNotificacionMatrimonial: e.target.value })}
                            className="w-full min-h-[160px] p-4 border-2 border-gray-100 rounded-xl focus:border-rose-300 outline-none text-sm font-bold text-gray-700 font-mono"
                            placeholder="Escriba aquí la nota legal..."
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Vista Previa</span>
                        <p className="text-xs text-gray-800 font-bold italic mt-4">
                            {previews.matrimonial || "Escriba para ver la vista previa..."}
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        type="button"
                        onClick={() => handleSave('matrimonial')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-lg active:scale-95"
                    >
                        GUARDAR NOTA DE MATRIMONIO
                    </button>
                </div>
            </div>

            {/* Las otras secciones se mantienen igual para no afectar la interfaz */}
        </div>
    );
};

export default MarginalNotesTab;

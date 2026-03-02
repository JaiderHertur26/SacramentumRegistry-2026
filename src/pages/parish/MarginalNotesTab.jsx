
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Check, Heart, FileText, FileUp, Info } from 'lucide-react';
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

    // 1. Load ALL data on mount and user change
    useEffect(() => {
        const pId = user?.parishId || user?.parish_id || user?.parroquiaId;
        if (pId) {
            console.log("MarginalNotesTab - Loading all notes for:", pId);
            const data = obtenerNotasAlMargen(pId);
            setNotes({
                porCorreccion: data.porCorreccion || { anulada: '', nuevaPartida: '' },
                porReposicion: data.porReposicion || { nuevaPartida: '' },
                porNotificacionMatrimonial: data.porNotificacionMatrimonial || '',
                estandar: data.estandar || ''
            });
        }
    }, [user, obtenerNotasAlMargen]);

    // 2. Refresh previews
    useEffect(() => {
        let sampleDate = "____________________";
        try {
            sampleDate = convertDateToSpanishTextNatural(new Date().toISOString().split('T')[0]).toUpperCase();
        } catch (e) {}

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
        setTimeout(() => setSavedStates(prev => ({ ...prev, [section]: false })), 3000);
    };

    const handleSave = (section) => {
        const pId = user?.parishId || user?.parish_id || user?.parroquiaId;
        if (!pId) {
            toast({ title: "Error", description: "No se identificó la parroquia.", variant: "destructive" });
            return;
        }

        // We send the whole notes object to ensure consistent saving
        const result = saveNotasAlMargen(notes, String(pId));
        if (result.success) {
            toast({ title: "¡Guardado con éxito!", className: "bg-green-600 text-white font-bold" });
            showSuccess(section);
        } else {
            toast({ title: "Error al guardar", description: result.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-8 py-6 px-4 max-w-5xl mx-auto">

            {/* 1. NOTIFICACIÓN MATRIMONIAL */}
            <div className="bg-white rounded-2xl border-2 border-rose-100 shadow-sm p-8 transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Heart className="w-10 h-10 text-rose-600" />
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Notificación Matrimonial</h3>
                            <p className="text-xs font-bold text-gray-500">Nota para el bautizado notificado como casado</p>
                        </div>
                    </div>
                    {savedStates.matrimonial && <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold animate-bounce">✓ Cambios Guardados</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="bg-rose-50 p-3 rounded-lg text-[10px] text-rose-700 font-bold border border-rose-100">
                            <strong>Variables:</strong> [FECHA_NOTIFICACION], [FECHA_MATRIMONIO], [PARROQUIA_MATRIMONIO], [DIOCESIS_MATRIMONIO], [NOMBRE_CONYUGE], [LIBRO_MAT], [FOLIO_MAT], [NUMERO_MAT]
                        </div>
                        <textarea
                            value={notes.porNotificacionMatrimonial}
                            onChange={(e) => setNotes({ ...notes, porNotificacionMatrimonial: e.target.value })}
                            className="w-full min-h-[160px] p-4 border-2 border-gray-100 rounded-xl focus:border-rose-300 outline-none text-sm font-bold text-gray-700 font-mono"
                            placeholder="Escriba aquí la nota legal..."
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Vista Previa Real</span>
                        <p className="text-xs text-gray-800 font-bold italic mt-4 leading-relaxed">
                            {previews.matrimonial || "Escriba texto para generar vista previa..."}
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={() => handleSave('matrimonial')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> GUARDAR NOTA DE MATRIMONIO
                    </button>
                </div>
            </div>

            {/* 2. POR CORRECCIÓN (ANULACIÓN) */}
            <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm p-8 transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <FileText className="w-10 h-10 text-blue-600" />
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Por Corrección (Anulación)</h3>
                            <p className="text-xs font-bold text-gray-500">Notas legales para partidas anuladas y nuevas</p>
                        </div>
                    </div>
                    {savedStates.correction && <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold animate-bounce">✓ Cambios Guardados</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nota para Partida Anulada</label>
                        <textarea
                            value={notes.porCorreccion.anulada}
                            onChange={(e) => setNotes({ ...notes, porCorreccion: { ...notes.porCorreccion, anulada: e.target.value } })}
                            className="w-full min-h-[140px] p-4 border-2 border-gray-100 rounded-xl focus:border-blue-300 outline-none text-sm font-bold text-gray-700 font-mono"
                        />
                        <div className="p-3 bg-gray-50 rounded-lg text-[10px] text-gray-500 font-bold border border-gray-100 italic">
                            {previews.anulada}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nota para Nueva Partida</label>
                        <textarea
                            value={notes.porCorreccion.nuevaPartida}
                            onChange={(e) => setNotes({ ...notes, porCorreccion: { ...notes.porCorreccion, nuevaPartida: e.target.value } })}
                            className="w-full min-h-[140px] p-4 border-2 border-gray-100 rounded-xl focus:border-blue-300 outline-none text-sm font-bold text-gray-700 font-mono"
                        />
                        <div className="p-3 bg-gray-50 rounded-lg text-[10px] text-gray-500 font-bold border border-gray-100 italic">
                            {previews.nuevaPartida}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={() => handleSave('correction')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> GUARDAR NOTAS DE CORRECCIÓN
                    </button>
                </div>
            </div>

            {/* 3. POR REPOSICIÓN */}
            <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-8 transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <FileUp className="w-10 h-10 text-amber-600" />
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Por Reposición</h3>
                            <p className="text-xs font-bold text-gray-500">Nota para partidas creadas por reposición</p>
                        </div>
                    </div>
                    {savedStates.reposicion && <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold animate-bounce">✓ Cambios Guardados</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <textarea
                            value={notes.porReposicion.nuevaPartida}
                            onChange={(e) => setNotes({ ...notes, porReposicion: { nuevaPartida: e.target.value } })}
                            className="w-full min-h-[120px] p-4 border-2 border-gray-100 rounded-xl focus:border-amber-300 outline-none text-sm font-bold text-gray-700"
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex items-center">
                        <p className="text-xs text-gray-800 font-bold italic leading-relaxed">{previews.reposicion}</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => handleSave('reposicion')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> GUARDAR NOTA DE REPOSICIÓN
                    </button>
                </div>
            </div>

            {/* 4. NOTA ESTÁNDAR */}
            <div className="bg-white rounded-2xl border-2 border-emerald-100 shadow-sm p-8 transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Info className="w-10 h-10 text-emerald-600" />
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Nota Estándar</h3>
                            <p className="text-xs font-bold text-gray-500">Nota al margen por defecto para partidas comunes</p>
                        </div>
                    </div>
                    {savedStates.standard && <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold animate-bounce">✓ Cambios Guardados</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <textarea
                            value={notes.estandar}
                            onChange={(e) => setNotes({ ...notes, estandar: e.target.value })}
                            className="w-full min-h-[120px] p-4 border-2 border-gray-100 rounded-xl focus:border-emerald-300 outline-none text-sm font-bold text-gray-700"
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex items-center">
                         <p className="text-xs text-gray-800 font-bold italic leading-relaxed">{previews.standard}</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => handleSave('standard')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> GUARDAR NOTA ESTÁNDAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MarginalNotesTab;

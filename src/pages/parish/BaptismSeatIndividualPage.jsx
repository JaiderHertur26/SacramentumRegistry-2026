import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight, 
    CheckCircle2, 
    LogOut,
    User,
    CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';

const BaptismSeatIndividualPage = () => {
    const { user } = useAuth();
    const { getPendingBaptisms, getNextBaptismNumbers, seatBaptism } = useAppData();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [pendingBaptisms, setPendingBaptisms] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [nextNumbers, setNextNumbers] = useState(null);

    // Marginal Note Logic State
    const [includeCivilRegistry, setIncludeCivilRegistry] = useState(false);
    const [civilRegistryData, setCivilRegistryData] = useState({
        registrySerial: '',
        registryOffice: '',
        registryDate: ''
    });

    const loadData = async () => {
        setLoading(true);
        const records = await getPendingBaptisms(user?.parishId);
        setPendingBaptisms(records);        
        setNextNumbers(getNextBaptismNumbers(user?.parishId));
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user?.parishId]);

    const currentBaptism = pendingBaptisms[currentIndex];

    // Initialize/Update civil registry fields when current record changes
    useEffect(() => {
        if (currentBaptism) {
            setCivilRegistryData({
                registrySerial: currentBaptism.registrySerial || '',
                registryOffice: currentBaptism.registryOffice || '',
                registryDate: currentBaptism.registryDate || ''
            });
            // Reset checkbox default state if needed, or keep persistent for session
            setIncludeCivilRegistry(false); 
        }
    }, [currentBaptism]);

    const handleCivilDataChange = (e) => {
        const { name, value } = e.target;
        setCivilRegistryData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleConfirm = async () => {
        if (!currentBaptism) return;
        
        // Prepare updates
        const updates = { ...civilRegistryData };
        let marginalNoteToAdd = '';

        if (includeCivilRegistry) {
            // Generate auto-note
            const { registrySerial, registryOffice, registryDate } = civilRegistryData;
            
            // Format date for text
            let formattedDate = registryDate;
            try {
                if (registryDate) formattedDate = convertDateToSpanishText(registryDate).toUpperCase();
            } catch (e) {
                console.error("Date format error", e);
            }

            if (registrySerial && registryOffice) {
                marginalNoteToAdd = `REGISTRO CIVIL SERIAL No. ${registrySerial}, EXPEDIDO POR ${registryOffice}`;
                if (formattedDate) {
                    marginalNoteToAdd += ` DE FECHA: ${formattedDate}`;
                }
                marginalNoteToAdd += ".";
            }
        }

        // Combine with existing manual note if present
        if (marginalNoteToAdd) {
            const existingNote = currentBaptism.notaAlMargen || '';
            updates.notaAlMargen = existingNote 
                ? `${existingNote}\n${marginalNoteToAdd}` 
                : marginalNoteToAdd;
        }

        const result = await seatBaptism(currentBaptism.id, user?.parishId, updates);
        
        if (result.success) {
            toast({
                title: "Registro Asentado",
                description: result.message,
                variant: "success",
                className: "bg-green-50 border-green-200 text-green-900"
            });
            
            // Refresh data
            const newRecords = await getPendingBaptisms(user?.parishId);
            setPendingBaptisms(newRecords);            
            setNextNumbers(getNextBaptismNumbers(user?.parishId));
            if (currentIndex >= newRecords.length) {
                setCurrentIndex(Math.max(0, newRecords.length - 1));
            }
        } else {
             toast({
                title: "Error",
                description: result.message,
                variant: "destructive"
            });
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando registros pendientes...</div>;

    if (pendingBaptisms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-semibold mb-2">¡Todo al día!</h2>
                <p>No hay bautizos pendientes de registro.</p>
                <Button variant="outline" className="mt-6" onClick={() => navigate('/parroquia/bautismo/sentar-registros')}>
                    Volver
                </Button>
            </div>
        );
    }

    const Field = ({ label, value }) => (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
            <p className="text-gray-900 font-medium text-sm truncate">{value || '---'}</p>
        </div>
    );

    const getFormattedParents = (parents) => {
        if (!parents || !Array.isArray(parents)) return "---";
        return parents.map(p => p.name).join(' y ');
    };

    const getFormattedGrandparents = (parents, type) => {
        if (!parents || !Array.isArray(parents)) return "---";
        const targetParent = parents.find(p => type === 'paternal' ? p.type === 'padre' : p.type === 'madre');
        if (!targetParent || !targetParent.grandparents) return "---";
        return `${targetParent.grandparents.grandfather || ''} y ${targetParent.grandparents.grandmother || ''}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Toolbar */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-3">
                     <div className="bg-[#D4AF37]/10 p-2 rounded-lg text-[#D4AF37]">
                         <User className="w-5 h-5" />
                     </div>
                     <div>
                         <h2 className="text-lg font-bold text-gray-800">
                             Bautizo {currentIndex + 1} de {pendingBaptisms.length}
                         </h2>
                         <p className="text-xs text-gray-500">Revise los datos antes de asentar.</p>
                     </div>
                 </div>

                 <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0}>
                         <ChevronsLeft className="w-4 h-4" />
                     </Button>
                     <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
                         <ChevronLeft className="w-4 h-4" />
                     </Button>
                     <span className="text-sm font-medium text-gray-600 px-2 min-w-[3rem] text-center">
                         {currentIndex + 1} / {pendingBaptisms.length}
                     </span>
                     <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(prev => Math.min(pendingBaptisms.length - 1, prev + 1))} disabled={currentIndex === pendingBaptisms.length - 1}>
                         <ChevronRight className="w-4 h-4" />
                     </Button>
                     <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(pendingBaptisms.length - 1)} disabled={currentIndex === pendingBaptisms.length - 1}>
                         <ChevronsRight className="w-4 h-4" />
                     </Button>
                 </div>
            </div>

            {/* Form Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Section 1: Numeración (Preview) */}
                <div className="col-span-full mb-2">
                    <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">Datos de Registro (Asignación Automática)</h3>
                    <div className="grid grid-cols-3 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <Field label="Libro" value={nextNumbers?.book} />
                        <Field label="Folio" value={nextNumbers?.page} />
                        <Field label="Número" value={nextNumbers?.entry} />
                    </div>
                </div>

                {/* Section 2: Datos del Bautizado */}
                <div className="col-span-full md:col-span-2 lg:col-span-4">
                     <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider mb-3 border-b border-gray-100 pb-1 mt-2">Datos del Bautizado</h3>
                </div>
                <Field label="Apellidos" value={currentBaptism.lastName || currentBaptism.last_name} />
                <Field label="Nombres" value={currentBaptism.firstName || currentBaptism.first_name} />
                <Field label="Fecha Bautismo" value={currentBaptism.sacramentDate || currentBaptism.sacrament_date} />
                <Field label="Lugar Bautismo" value={user?.parishName} />
                <Field label="Fecha Nacimiento" value={currentBaptism.birthDate || currentBaptism.birth_date} />
                <Field label="Lugar Nacimiento" value={currentBaptism.birthPlace || currentBaptism.birth_place} />
                <Field label="Sexo" value={currentBaptism.gender === 'M' ? 'Masculino' : 'Femenino'} />
                
                {/* Section 3: Filiación */}
                <div className="col-span-full md:col-span-2 lg:col-span-4 mt-2">
                     <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">Filiación y Padrinos</h3>
                </div>
                <div className="col-span-full md:col-span-2">
                     <Field label="Padres" value={getFormattedParents(currentBaptism.parents)} />
                </div>
                <div className="col-span-full md:col-span-2">
                    <Field label="Tipo de Unión" value={currentBaptism.parents?.[0]?.civilStatus || '---'} />
                </div>
                <div className="col-span-full md:col-span-2">
                    <Field label="Abuelos Paternos" value={getFormattedGrandparents(currentBaptism.parents, 'paternal')} />
                </div>
                <div className="col-span-full md:col-span-2">
                    <Field label="Abuelos Maternos" value={getFormattedGrandparents(currentBaptism.parents, 'maternal')} />
                </div>
                 <div className="col-span-full md:col-span-2">
                    <Field label="Padrinos" value={currentBaptism.godparents?.map(g => g.name).join(', ') || '---'} />
                </div>
                 <div className="col-span-full md:col-span-2">
                    <Field label="Ministro" value={currentBaptism.minister || '---'} />
                </div>

                {/* Section 4: Datos de Registro Civil (Editable & Auto-Note Generation) */}
                <div className="col-span-full mt-4">
                     <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider mb-3 border-b border-gray-100 pb-1 flex items-center justify-between">
                        <span>Datos de Registro Civil</span>
                        <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                             <input 
                                type="checkbox" 
                                id="genNote" 
                                checked={includeCivilRegistry} 
                                onChange={(e) => setIncludeCivilRegistry(e.target.checked)}
                                className="w-4 h-4 text-[#4B7BA7] rounded border-gray-300 focus:ring-[#4B7BA7]"
                             />
                             <label htmlFor="genNote" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                Incluir nota marginal automática
                             </label>
                        </div>
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Serial Registro Civil</label>
                            <Input 
                                name="registrySerial" 
                                value={civilRegistryData.registrySerial} 
                                onChange={handleCivilDataChange}
                                placeholder="Ej: 54115513"
                                className="bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Oficina Registro Civil</label>
                            <Input 
                                name="registryOffice" 
                                value={civilRegistryData.registryOffice} 
                                onChange={handleCivilDataChange}
                                placeholder="Ej: Registraduría de..."
                                className="bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha Expedición</label>
                            <Input 
                                type="date"
                                name="registryDate" 
                                value={civilRegistryData.registryDate} 
                                onChange={handleCivilDataChange}
                                className="bg-white"
                            />
                        </div>
                        {includeCivilRegistry && (
                             <div className="col-span-full mt-2">
                                <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-100 flex items-start gap-2">
                                    <CheckSquare className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>
                                        Se generará automáticamente una nota marginal con estos datos al asentar el registro.
                                    </span>
                                </div>
                             </div>
                        )}
                     </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                <Button variant="outline" className="gap-2 text-gray-600" onClick={() => navigate('/parroquia/dashboard')}>
                    <LogOut className="w-4 h-4" /> Salir
                </Button>
                <Button className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white gap-2 px-8 shadow-md transition-all hover:translate-y-[-1px]" onClick={handleConfirm}>
                    <CheckCircle2 className="w-4 h-4" /> Registrar y Siguiente
                </Button>
            </div>
        </div>
    );
};

export default BaptismSeatIndividualPage;
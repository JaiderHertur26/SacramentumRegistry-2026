
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Save, Printer, Calendar, User, Users, FileText, ScrollText, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import BaptismTicket from '@/components/BaptismTicket';
import CityAutocomplete from '@/components/CityAutocomplete';
import { useActivePriestDisplay } from '@/hooks/useActivePriestDisplay';
import useParroquiaFromMisDatos from '@/hooks/useParroquiaFromMisDatos';

const BaptismNewPage = () => {
  const { user } = useAuth();
  const { getMisDatosList, getCiudadesList } = useAppData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const parishNameFromMisDatos = useParroquiaFromMisDatos();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [parishInfo, setParishInfo] = useState({ name: '', address: '', phone: '', city: '' });
  const [ministers, setMinisters] = useState([]);
  const [cities, setCities] = useState([]);

  const activePriestDisplay = useActivePriestDisplay(ministers);

  // NUEVO ESTÁNDAR DE DATOS UNIFICADO
  const initialFormData = {
    // Control
    fechaInscripcion: new Date().toISOString().split('T')[0],
    
    // Celebración
    fechaSacramento: '', 
    horaSacramento: '00:00',
    lugarBautismo: '', 

    // Bautizado
    apellidos: '',
    nombres: '',
    sexo: '', 
    fechaNacimiento: '',
    lugarNacimiento: '', 

    // Padres
    nombrePadre: '',
    cedulaPadre: '', 
    nombreMadre: '',
    cedulaMadre: '', 
    tipoUnionPadres: '', 

    // Abuelos y Padrinos
    abuelosPaternos: '', 
    abuelosMaternos: '', 
    padrinos: '', 

    // Legal y Firmas
    ministro: '',
    daFe: '',

    // Registro Civil
    serialRegistro: '', 
    nuip: '',
    oficinaRegistro: '', 
    fechaExpedicionRegistro: '', 
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (parishNameFromMisDatos && !formData.lugarBautismo) {
        setFormData(prev => ({ ...prev, lugarBautismo: parishNameFromMisDatos }));
    }
  }, [parishNameFromMisDatos]);

  useEffect(() => {
     if (activePriestDisplay) {
         setFormData(prev => ({ ...prev, daFe: activePriestDisplay }));
     }
  }, [activePriestDisplay]);

  useEffect(() => {
      if (user?.parishId) {
          const misDatos = getMisDatosList(user.parishId);
          if (misDatos && misDatos.length > 0) {
              setParishInfo({
                  name: misDatos[0].nombre || user.parishName,
                  address: misDatos[0].direccion || '',
                  phone: misDatos[0].telefono || '',
                  city: misDatos[0].ciudad || ''
              });
          }
          setCities(getCiudadesList(user.parishId));
          
          const storedMinisters = localStorage.getItem(`parrocos_${user.parishId}`);
          if (storedMinisters) {
              const parsed = JSON.parse(storedMinisters);
              setMinisters(parsed);
              const active = parsed.find(p => p.estado === '1' || p.estado === 1);
              if (active) setFormData(prev => ({ ...prev, ministro: `${active.nombre} ${active.apellido || ''}`.trim() }));
          }
      }
  }, [user]);

  const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const entityId = user.parishId || user.dioceseId;
        const storageKey = `pendingBaptisms_${entityId}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // OBJETO ESTRICTAMENTE ESTANDARIZADO
        const nuevoBautismo = {
            id: Date.now().toString(),
            estado: 'temporal', // Marcado como temporal
            creadoPorDecreto: false,
            parishId: user?.parishId,
            ...formData
        };

        const updated = [...existing, nuevoBautismo];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        
        await new Promise(resolve => setTimeout(resolve, 500));

        setTicketData(nuevoBautismo);
        setIsSuccess(true);
        toast({ title: "Éxito", description: "Bautizo guardado en Temporales.", className: "bg-green-50 text-green-900" });

        setTimeout(() => window.print(), 500);
    } catch (error) {
        toast({ title: "Error", description: "Ocurrió un error al guardar.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isSuccess) {
      return (
          <>
            <div className="print:hidden">
                <DashboardLayout entityName={user?.parishName || "Parroquia"}>
                    <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center mt-12 border border-gray-200">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bautizo Guardado (Temporal)</h2>
                        <div className="flex justify-center gap-4 mt-8">
                            <Button onClick={() => window.location.reload()} variant="outline">Nuevo Registro</Button>
                            <Button onClick={() => navigate('/parroquia/bautismo/sentar-registros')} className="bg-[#4B7BA7] text-white">Sentar Registros</Button>
                        </div>
                    </div>
                </DashboardLayout>
            </div>
            <div className="hidden print:block">
                 {ticketData && <BaptismTicket baptismData={ticketData} parishInfo={parishInfo} />}
            </div>
          </>
      );
  }

  return (
    <div className="print:hidden">
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <h1 className="text-2xl font-bold text-gray-900 font-serif mb-6">Inscripción de Bautismo</h1>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-8 max-w-5xl mx-auto space-y-8">
                
                {/* 1. DATOS DEL BAUTISMO */}
                <section>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 border-b pb-2 mb-4"><Calendar className="w-4 h-4 text-gray-500" /> Datos de la Celebración</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha y Hora *</label><input type="datetime-local" name="fechaSacramento" required value={formData.fechaSacramento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lugar de Bautismo</label><input type="text" name="lugarBautismo" value={formData.lugarBautismo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ministro *</label><input type="text" name="ministro" required value={formData.ministro} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    </div>
                </section>

                {/* 2. BAUTIZADO */}
                <section>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 border-b pb-2 mb-4"><User className="w-4 h-4 text-gray-500" /> Datos del Bautizado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellidos *</label><input type="text" name="apellidos" required value={formData.apellidos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombres *</label><input type="text" name="nombres" required value={formData.nombres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Nacimiento *</label><input type="date" name="fechaNacimiento" required value={formData.fechaNacimiento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lugar Nacimiento</label><CityAutocomplete name="lugarNacimiento" value={formData.lugarNacimiento} onChange={handleChange} cities={cities} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sexo</label>
                            <select name="sexo" value={formData.sexo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Seleccione...</option><option value="MASCULINO">MASCULINO</option><option value="FEMENINO">FEMENINO</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 3. PADRES Y ABUELOS */}
                <section>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 border-b pb-2 mb-4"><Users className="w-4 h-4 text-gray-500" /> Filiación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-bold text-blue-900 text-xs uppercase mb-3">Padre</h4>
                            <input type="text" name="nombrePadre" placeholder="Nombre completo" value={formData.nombrePadre} onChange={handleChange} className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md text-sm" />
                            <input type="text" name="cedulaPadre" placeholder="Cédula" value={formData.cedulaPadre} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                        <div className="bg-pink-50 p-4 rounded-lg">
                            <h4 className="font-bold text-pink-900 text-xs uppercase mb-3">Madre</h4>
                            <input type="text" name="nombreMadre" placeholder="Nombre completo" value={formData.nombreMadre} onChange={handleChange} className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md text-sm" />
                            <input type="text" name="cedulaMadre" placeholder="Cédula" value={formData.cedulaMadre} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Unión</label>
                        <select name="tipoUnionPadres" value={formData.tipoUnionPadres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Seleccione...</option><option value="MATRIMONIO CATÓLICO">MATRIMONIO CATÓLICO</option><option value="MATRIMONIO CIVIL">MATRIMONIO CIVIL</option><option value="UNIÓN LIBRE">UNIÓN LIBRE</option><option value="MADRE SOLTERA">MADRE SOLTERA</option><option value="OTRO">OTRO</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Abuelos Paternos</label><textarea name="abuelosPaternos" value={formData.abuelosPaternos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md h-16" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Abuelos Maternos</label><textarea name="abuelosMaternos" value={formData.abuelosMaternos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md h-16" /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Padrinos</label><textarea name="padrinos" value={formData.padrinos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md h-16" /></div>
                </section>

                {/* 4. REGISTRO CIVIL */}
                <section>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 border-b pb-2 mb-4"><ScrollText className="w-4 h-4 text-gray-500" /> Registro Civil</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Serial</label><input type="text" name="serialRegistro" value={formData.serialRegistro} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">NUIP</label><input type="text" name="nuip" value={formData.nuip} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Oficina</label><input type="text" name="oficinaRegistro" value={formData.oficinaRegistro} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Exp.</label><input type="date" name="fechaExpedicionRegistro" value={formData.fechaExpedicionRegistro} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    </div>
                </section>

                <div className="flex justify-end gap-4 border-t pt-6">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar y Generar Boleta</Button>
                </div>
            </form>
        </DashboardLayout>
    </div>
  );
};
export default BaptismNewPage;

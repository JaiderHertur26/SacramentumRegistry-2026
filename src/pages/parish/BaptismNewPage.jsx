import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Save, Printer, CheckCircle, Calendar, User, Users, FileText, ScrollText, Loader2 } from 'lucide-react';
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
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [parishInfo, setParishInfo] = useState({ name: '', address: '', phone: '', city: '' });
  const [ministers, setMinisters] = useState([]);
  const [ministersFiltrados, setMinistersFiltrados] = useState([]);
  const [cities, setCities] = useState([]);

  // Use hook to get active priest full name for Da Fe field
  const activePriestDisplay = useActivePriestDisplay(ministers);

  // Initial Form Data matching Edit Page and Mapper
  const initialFormData = {
    inscriptionDate: new Date().toISOString().split('T')[0],
    byDecree: false,

    sacramentDate: '', 
    sacramentTime: '00:00',
    lugarBautismoDetalle: '', // lugbau

    lastName: '',
    firstName: '',
    sex: '', // Gender (1,2)
    birthDate: '',
    lugarNacimientoDetalle: '', // lugarn

    fatherName: '',
    fatherId: '', // cedupad
    motherName: '',
    motherId: '', // cedumad
    tipoUnionPadres: '', // tipohijo (1-5)

    paternalGrandparents: '', // abuepat
    maternalGrandparents: '', // abuemat
    godparents: '', // padrinos

    minister: '',
    ministerFaith: '',

    registrySerial: '', // regciv
    nuip: '',
    registryOffice: '', // notaria
    registryDate: '', // fecregis

    decreeDate: '',
    decreeNumber: '',
    decreeIssuer: '',
    
    address: '',
    responsible: user?.username || '',
  };

  const [formData, setFormData] = useState(initialFormData);

  // Auto-populate Parish Name from Hook
  useEffect(() => {
    if (parishNameFromMisDatos && !formData.lugarBautismoDetalle) {
        setFormData(prev => ({ ...prev, lugarBautismoDetalle: parishNameFromMisDatos }));
    }
  }, [parishNameFromMisDatos]);

  // Auto-populate ministerFaith when activePriestDisplay is available
  useEffect(() => {
     if (activePriestDisplay) {
         setFormData(prev => ({ ...prev, ministerFaith: activePriestDisplay }));
     }
  }, [activePriestDisplay]);

  useEffect(() => {
      const loadParishInfo = async () => {
          if (!user?.parishId) return;

          const misDatos = getMisDatosList(user.parishId);
          let parishNameFound = user.parishName || '';

          if (misDatos && misDatos.length > 0) {
              setParishInfo({
                  name: misDatos[0].nombre || parishNameFound,
                  address: misDatos[0].direccion || '',
                  phone: misDatos[0].telefono || '',
                  city: misDatos[0].ciudad || ''
              });
          }
      };
      loadParishInfo();
  }, [user, getMisDatosList]);

  useEffect(() => {
      if (user?.parishId || user?.dioceseId) {
          const list = getCiudadesList(user.parishId || user.dioceseId);
          setCities(list);
      }
  }, [user, getCiudadesList]);

  // Simplified Ministers Load
  useEffect(() => {
     if (!user?.parishId) return;
     const key = `parrocos_${user.parishId}`;
     const stored = localStorage.getItem(key);
     if (stored) {
         try {
             const parsed = JSON.parse(stored);
             setMinisters(parsed);
             setMinistersFiltrados(parsed);
             // Auto-set minister field to active priest name if available
             const active = parsed.find(p => p.estado === '1' || p.estado === 1);
             if (active) {
                 const name = `${active.nombre} ${active.apellido || ''}`.trim();
                 setFormData(prev => ({ ...prev, minister: name }));
             }
         } catch(e) {}
     }
  }, [user]);

  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const entityId = user.parishId || user.dioceseId;
        const storageKey = `pendingBaptisms_${entityId}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const newBaptism = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            parishId: user?.parishId,
            ...formData, 
            ministerFaith: activePriestDisplay || formData.ministerFaith,
            
            // Map legacy key names for compatibility
            lugarn: formData.lugarNacimientoDetalle,
            lugbau: formData.lugarBautismoDetalle,
            cedupad: formData.fatherId,
            cedumad: formData.motherId,
            abuepat: formData.paternalGrandparents,
            abuemat: formData.maternalGrandparents,
            padrinos: formData.godparents,
            regciv: formData.registrySerial,
            notaria: formData.registryOffice,
            fecregis: formData.registryDate,
            tipohijo: formData.tipoUnionPadres,
            
            // Ticket specific structure
            parents: [
                 { name: formData.fatherName, role: 'father', idNumber: formData.fatherId },
                 { name: formData.motherName, role: 'mother', idNumber: formData.motherId }
            ].filter(p => p.name),
        };

        const updated = [...existing, newBaptism];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        
        await new Promise(resolve => setTimeout(resolve, 500));

        setTicketData(newBaptism);
        setShowTicket(true);
        setIsSuccess(true);
        
        toast({ title: "Éxito - Bautizo guardado", description: "Imprimiendo boleta...", className: "bg-green-50 border-green-200 text-green-900" });

        setTimeout(() => window.print(), 500);
        
    } catch (error) {
        console.error(error);
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
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-700" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bautizo Guardado en Pendientes</h2>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                            <Button onClick={() => window.location.reload()} variant="outline" className="text-gray-900 border-gray-300">Nuevo Registro</Button>
                            <Button onClick={() => navigate('/parroquia/bautismo/sentar-registros')} variant="secondary">Ir a Sentar Registros</Button>
                            <Button onClick={() => window.print()} className="bg-[#D4AF37] text-white gap-2 font-bold"><Printer className="w-4 h-4" /> Re-imprimir Boleta</Button>
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

  const SectionHeader = ({ icon: Icon, title, number }) => (
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 mt-6">
          <div className="w-6 h-6 rounded-full bg-[#E5E9F0] text-[#4B7BA7] flex items-center justify-center text-xs font-bold border border-[#4B7BA7]/20">{number}</div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">{Icon && <Icon className="w-4 h-4 text-gray-500" />}{title}</h3>
      </div>
  );

  return (
    <>
        <div className="print:hidden">
            <DashboardLayout entityName={user?.parishName || "Parroquia"}>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Formulario de Inscripción de Bautismo</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="p-8 max-w-5xl mx-auto">
                        
                        {/* SECCIÓN 1: INSCRIPCIÓN */}
                        <SectionHeader number="1" title="Datos de Inscripción" icon={FileText} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha de Inscripción</label>
                                <input type="date" name="inscriptionDate" value={formData.inscriptionDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                            </div>
                        </div>

                        {/* SECCIÓN 2: BAUTISMO */}
                        <SectionHeader number="2" title="Datos del Bautismo" icon={Calendar} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha y Hora <span className="text-red-600">*</span></label>
                                <input type="datetime-local" name="sacramentDate" required value={formData.sacramentDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lugar de Bautismo (lugbau)</label>
                                <input type="text" name="lugarBautismoDetalle" value={formData.lugarBautismoDetalle} onChange={handleChange} placeholder="Ej: Parroquia San José" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ministro <span className="text-red-600">*</span></label>
                                <input list="ministers-list" type="text" name="minister" required value={formData.minister} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                                <datalist id="ministers-list">{ministersFiltrados.map((m, i) => <option key={i} value={`${m.nombre} ${m.apellido || ''}`.trim()} />)}</datalist>
                            </div>
                        </div>

                        {/* SECCIÓN 3: BAUTIZADO */}
                        <SectionHeader number="3" title="Datos del Bautizado" icon={User} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellidos <span className="text-red-600">*</span></label>
                                <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none uppercase font-semibold text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombres <span className="text-red-600">*</span></label>
                                <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none uppercase font-semibold text-gray-900" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                             <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Nacimiento <span className="text-red-600">*</span></label>
                                <input type="date" name="birthDate" required value={formData.birthDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lugar Nacimiento (lugarn)</label>
                                <CityAutocomplete 
                                    name="lugarNacimientoDetalle" 
                                    value={formData.lugarNacimientoDetalle} 
                                    onChange={handleChange}
                                    cities={cities}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-gray-900"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sexo</label>
                                <select name="sex" value={formData.sex} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none bg-white text-gray-900">
                                    <option value="">Seleccione...</option>
                                    <option value="1">MASCULINO (1)</option>
                                    <option value="2">FEMENINO (2)</option>
                                </select>
                            </div>
                        </div>

                        {/* SECCIÓN 4: PADRES */}
                        <SectionHeader number="4" title="Datos de los Padres" icon={Users} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold text-blue-900 text-xs uppercase mb-3">Padre</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                                        <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cédula (cedupad)</label>
                                        <input type="text" name="fatherId" value={formData.fatherId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                                <h4 className="font-bold text-pink-900 text-xs uppercase mb-3">Madre</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                                        <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cédula (cedumad)</label>
                                        <input type="text" name="motherId" value={formData.motherId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Unión (sexo/tipohijo)</label>
                                <select name="tipoUnionPadres" value={formData.tipoUnionPadres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none bg-white text-gray-900">
                                    <option value="">Seleccione...</option>
                                    <option value="1">1 - Matrimonio Católico</option>
                                    <option value="2">2 - Matrimonio Civil</option>
                                    <option value="3">3 - Unión Libre</option>
                                    <option value="4">4 - Madre Soltera</option>
                                    <option value="5">5 - Otro</option>
                                </select>
                             </div>
                        </div>

                        {/* SECCIÓN 5: ABUELOS */}
                        <SectionHeader number="5" title="Abuelos" icon={Users} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Abuelos Paternos (abuepat)</label>
                                <textarea name="paternalGrandparents" value={formData.paternalGrandparents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 text-sm text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Abuelos Maternos (abuemat)</label>
                                <textarea name="maternalGrandparents" value={formData.maternalGrandparents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 text-sm text-gray-900" />
                            </div>
                        </div>

                        {/* SECCIÓN 6: PADRINOS */}
                        <SectionHeader number="6" title="Padrinos" icon={Users} />
                        <div className="mb-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Padrinos (padrinos)</label>
                            <textarea name="godparents" value={formData.godparents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 text-sm text-gray-900" />
                        </div>

                        {/* SECCIÓN 7: REGISTRO CIVIL */}
                        <SectionHeader number="7" title="Datos de Registro Civil" icon={ScrollText} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Serial Registro Civil (regciv)</label>
                                <input type="text" name="registrySerial" value={formData.registrySerial} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">NUIP / NUIT (nuip)</label>
                                <input type="text" name="nuip" value={formData.nuip} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Oficina de Registro (notaria)</label>
                                <input type="text" name="registryOffice" value={formData.registryOffice} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Expedición (fecregis)</label>
                                <input type="date" name="registryDate" value={formData.registryDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-gray-900" />
                            </div>
                        </div>

                        {/* DA FE / MINISTER FAITH */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Da Fe (Párroco)</label>
                                    <Input 
                                        name="ministerFaith" 
                                        value={formData.ministerFaith} 
                                        onChange={handleChange} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white gap-2 px-8 py-2.5 font-bold">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar y Generar Boleta
                            </Button>
                        </div>
                    </div>
                </form>
            </DashboardLayout>
        </div>
        <div className="hidden print:block">
             {ticketData && <BaptismTicket baptismData={ticketData} parishInfo={parishInfo} />}
        </div>
    </>
  );
};

export default BaptismNewPage;
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, FileText, UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { generateUUID } from '@/utils/supabaseHelpers';

const NewDecreeReplacementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      data,
      getConceptosAnulacion, 
      getParrocoActual,
      getMisDatosList,
      createNotification
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [activePriest, setActivePriest] = useState(null);

  // --- BAPTISM STATE ---
  const [bautismoDecree, setBautismoDecree] = useState({ 
      parroquia: '',
      targetParishId: '',
      numeroDecreto: '', 
      fechaDecreto: new Date().toISOString().split('T')[0], 
      conceptoAnulacionId: '' 
  });
  const [bautismoNewPartida, setBautismoNewPartida] = useState({
      sacramentDate: '', firstName: '', lastName: '', birthDate: '', 
      lugarNacimientoDetalle: '', lugarBautismo: '',
      fatherName: '', ceduPadre: '', motherName: '', ceduMadre: '', 
      tipoUnionPadres: '1', sex: '1', paternalGrandparents: '', maternalGrandparents: '',
      godparents: '', minister: '', ministerFaith: '',
      serialRegCivil: '', nuipNuit: '', oficinaRegistro: '', fechaExpedicion: ''
  });

  // Load Initial Data
  useEffect(() => {
    if (user?.parishId || user?.dioceseId) {
        const contextId = user?.parishId || user?.dioceseId;
        const allConcepts = getConceptosAnulacion(contextId);
        const repoConcepts = allConcepts.filter(c => c.tipo === 'porReposicion' || c.tipo === 'porCorreccion');
        setConceptos(repoConcepts.length > 0 ? repoConcepts : allConcepts);
        
        const misDatos = getMisDatosList(contextId);
        let parishLabel = '';
        if (misDatos && misDatos.length > 0) {
            const dato = misDatos[0];
            const nombre = dato.nombre || user.dioceseName || 'Cancillería';
            const ciudad = dato.ciudad || user.city || 'Ciudad';
            parishLabel = `${nombre} - ${ciudad}`;
        } else {
            parishLabel = `${user.dioceseName || 'Cancillería'} - ${user.city || 'Ciudad'}`;
        }

        setBautismoDecree(prev => ({ 
            ...prev, 
            parroquia: parishLabel,
            targetParishId: user.parishId || '' 
        }));
        
        const priest = getParrocoActual(contextId);
        if (priest) {
            const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
            setActivePriest(name);
            setBautismoNewPartida(prev => ({ ...prev, ministerFaith: name }));
        }
    }
  }, [user, getConceptosAnulacion, getParrocoActual, getMisDatosList]);

  // --- SUBMIT HANDLERS ---
  const handleSubmit = async (e, type) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const savedDecreeId = generateUUID(); 
      const targetParishId = bautismoDecree.targetParishId;

      if (!targetParishId) {
          toast({
              title: "Error",
              description: "Debe seleccionar la parroquia destino para este decreto.",
              variant: "destructive"
          });
          setIsSubmitting(false);
          return;
      }

      // Construct Decree Record Object
      const decreeRecord = {
          id: savedDecreeId,
          decreeNumber: bautismoDecree.numeroDecreto,
          decreeDate: bautismoDecree.fechaDecreto,
          conceptoAnulacionId: bautismoDecree.conceptoAnulacionId,
          parishId: targetParishId,
          sacrament: type, // 'bautismo', etc.
          status: 'completed',
          createdAt: new Date().toISOString(),
          // Data snapshots
          nombres: bautismoNewPartida.firstName,
          apellidos: bautismoNewPartida.lastName,
          newPartidaData: bautismoNewPartida,
          // Metadata
          createdBy: user.id,
          createdByName: user.username,
          originType: 'chancery'
      };
      
      try {
          // 1. Save to PARISH storage (Existing behavior)
          const parishKey = `decrees_replacement_${targetParishId}`;
          const currentParishDecrees = JSON.parse(localStorage.getItem(parishKey) || '[]');
          currentParishDecrees.push(decreeRecord);
          localStorage.setItem(parishKey, JSON.stringify(currentParishDecrees));

          // 2. Save to CHANCERY storage (Dual-write)
          const chanceryKey = `chancery_decrees_replacement_${user.dioceseId}`;
          const currentChanceryDecrees = JSON.parse(localStorage.getItem(chanceryKey) || '[]');
          currentChanceryDecrees.push(decreeRecord);
          localStorage.setItem(chanceryKey, JSON.stringify(currentChanceryDecrees));

          // 3. Send Notification
          await createNotification({
              decree_id: savedDecreeId,
              decree_type: 'replacement',
              parish_id: targetParishId,
              created_by: user.id,
              message: `Nuevo decreto de reposición (Bautismo) #${bautismoDecree.numeroDecreto} generado para ${bautismoNewPartida.firstName} ${bautismoNewPartida.lastName}.`,
              status: 'unread'
          });

          toast({ 
              title: "Reposición Exitosa", 
              description: "Se ha generado la nueva partida supletoria y se ha notificado a la parroquia.", 
              className: "bg-green-50 border-green-200 text-green-900" 
          });

          navigate('/chancery/decree-replacement/view');

      } catch (error) {
          console.error("Error saving replacement decree:", error);
          toast({
              title: "Error",
              description: "Ocurrió un error al guardar el decreto.",
              variant: "destructive"
          });
      } finally {
          setIsSubmitting(false);
      }
  };

  const getConceptDetails = (id) => {
    if (!id) return null;
    return conceptos.find(c => c.id === id);
  };
  
  const selectedConcept = getConceptDetails(bautismoDecree.conceptoAnulacionId);
  const dioceseParishes = data.parishes ? data.parishes.filter(p => p.dioceseId === user?.dioceseId) : [];

  // Render helpers
  const renderDecreeSection = (decree, setDecree) => (
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm mb-6">
          <h3 className="font-bold text-blue-800 text-sm uppercase mb-4 border-b border-blue-300 pb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> 1. Datos del Decreto</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Entidad Emisora</label>
                  <Input value={decree.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
              </div>
              
              {!user.parishId && (
                  <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia Destino (Reposición) <span className="text-red-500">*</span></label>
                      <select
                          value={decree.targetParishId}
                          onChange={(e) => setDecree({...decree, targetParishId: e.target.value})}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="">Seleccionar Parroquia...</option>
                          {dioceseParishes.map(p => (
                              <option key={p.id} value={p.id}>
                                  {p.name} - {p.city}
                              </option>
                          ))}
                      </select>
                  </div>
              )}

              <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                  <Input value={decree.numeroDecreto} onChange={(e) => setDecree({...decree, numeroDecreto: e.target.value})} placeholder="Ej: 001-2025" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                  <Input type="date" value={decree.fechaDecreto} onChange={(e) => setDecree({...decree, fechaDecreto: e.target.value})} />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                  <select
                      value={decree.conceptoAnulacionId}
                      onChange={(e) => setDecree({...decree, conceptoAnulacionId: e.target.value})}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                      <option value="">Seleccionar Concepto (Opcional)</option>
                      {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                  </select>
                  {selectedConcept && <div className="mt-1 text-xs text-blue-600">{selectedConcept.codigo} - {selectedConcept.concepto}</div>}
              </div>
          </div>
      </div>
  );

  return (
    <DashboardLayout entityName={user?.dioceseName || "Cancillería"}>
        <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate('/chancery/decree-replacement/view')} className="p-0 hover:bg-transparent">
                <ArrowLeft className="w-6 h-6 text-gray-500" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Reposición</h1>
                <p className="text-gray-500 text-sm">Registro de reposición de partidas perdidas o deterioradas (Libro Supletorio)</p>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-6xl mx-auto p-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmacion" disabled className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonio" disabled className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">Matrimonios</TabsTrigger>
                </TabsList>

                {/* --- BAUTISMO TAB --- */}
                <TabsContent value="bautismo" className="p-4">
                    <form onSubmit={(e) => handleSubmit(e, 'bautismo')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(bautismoDecree, setBautismoDecree)}
                        
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Bautismo <span className="text-red-500">*</span></label><Input type="date" value={bautismoNewPartida.sacramentDate} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, sacramentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Bautismo</label><Input value={bautismoNewPartida.lugarBautismo} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lugarBautismo: e.target.value})} placeholder="Parroquia..." /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.firstName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, firstName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.lastName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lastName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label><Input type="date" value={bautismoNewPartida.birthDate} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, birthDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.lugarNacimientoDetalle} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lugarNacimientoDetalle: e.target.value})} /></div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.fatherName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, fatherName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula del Padre</label><Input value={bautismoNewPartida.ceduPadre} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ceduPadre: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.motherName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, motherName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula de la Madre</label><Input value={bautismoNewPartida.ceduMadre} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ceduMadre: e.target.value})} /></div>
                                </div>

                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipo de Unión <span className="text-red-500">*</span></label><select value={bautismoNewPartida.tipoUnionPadres} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, tipoUnionPadres: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"><option value="1">1 - MATRIMONIO CATÓLICO</option><option value="2">2 - MATRIMONIO CIVIL</option><option value="3">3 - UNIÓN LIBRE</option><option value="4">4 - MADRE SOLTERA</option><option value="5">5 - OTRO</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Sexo <span className="text-red-500">*</span></label><select value={bautismoNewPartida.sex} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, sex: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"><option value="1">1 - Masculino</option><option value="2">2 - Femenino</option></select></div>
                                
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Paternos</label><Input value={bautismoNewPartida.paternalGrandparents} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, paternalGrandparents: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Maternos</label><Input value={bautismoNewPartida.maternalGrandparents} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, maternalGrandparents: e.target.value})} /></div>
                                
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrinos</label><Input value={bautismoNewPartida.godparents} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, godparents: e.target.value})} /></div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-4 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos Registro Civil</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Serial Reg. Civil</label><Input value={bautismoNewPartida.serialRegCivil} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, serialRegCivil: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">NUIP / NUIT</label><Input value={bautismoNewPartida.nuipNuit} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, nuipNuit: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Oficina Registro</label><Input value={bautismoNewPartida.oficinaRegistro} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, oficinaRegistro: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Expedición</label>
                                        <Input type="date" value={bautismoNewPartida.fechaExpedicion} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, fechaExpedicion: e.target.value})} />
                                    </div>
                                </div>

                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.minister} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, minister: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe <span className="text-red-500">*</span></label><select value={bautismoNewPartida.ministerFaith} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ministerFaith: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || bautismoNewPartida.ministerFaith !== activePriest) && <Input value={bautismoNewPartida.ministerFaith} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ministerFaith: e.target.value})} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/chancery/decree-replacement/view')}>
                                <X className="w-4 h-4 mr-2" /> Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Decreto de Reposición</>}
                            </Button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="confirmacion" className="p-8 text-center text-gray-500">
                    Funcionalidad para Confirmaciones próximamente.
                </TabsContent>

                <TabsContent value="matrimonio" className="p-8 text-center text-gray-500">
                    Funcionalidad para Matrimonios próximamente.
                </TabsContent>
            </Tabs>
        </div>
    </DashboardLayout>
  );
};

export default NewDecreeReplacementPage;
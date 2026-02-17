import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, CheckCircle, FileText, UserPlus, Info, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { generateUUID, incrementPaddedValue } from '@/utils/supabaseHelpers';

const DecreeRepositionNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      getConceptosAnulacion, 
      getParrocoActual
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [activePriest, setActivePriest] = useState(null);

  // --- BAPTISM STATE ---
  const [bautismoDecree, setBautismoDecree] = useState({ numeroDecreto: '', fechaDecreto: new Date().toISOString().split('T')[0], conceptoAnulacionId: '' });
  const [bautismoNewPartida, setBautismoNewPartida] = useState({
      sacramentDate: '', firstName: '', lastName: '', birthDate: '', placeOfBirth: '',
      fatherName: '', motherName: '', tipoUnionPadres: '1', sex: '1',
      godparents: '', minister: '', ministerFaith: ''
  });

  // --- CONFIRMATION STATE ---
  const [confirmacionDecree, setConfirmacionDecree] = useState({ numeroDecreto: '', fechaDecreto: new Date().toISOString().split('T')[0], conceptoAnulacionId: '' });
  const [confirmacionNewPartida, setConfirmacionNewPartida] = useState({
      sacramentDate: '', firstName: '', lastName: '', birthDate: '', placeOfBirth: '',
      fatherName: '', motherName: '', godparents: '', minister: '', ministerFaith: ''
  });

  // --- MARRIAGE STATE ---
  const [matrimonioDecree, setMatrimonioDecree] = useState({ numeroDecreto: '', fechaDecreto: new Date().toISOString().split('T')[0], conceptoAnulacionId: '' });
  const [matrimonioNewPartida, setMatrimonioNewPartida] = useState({
      sacramentDate: '', husbandName: '', husbandSurname: '', wifeName: '', wifeSurname: '',
      witnesses: '', minister: '', ministerFaith: ''
  });

  // Load Initial Data
  useEffect(() => {
    if (user?.parishId) {
        // Conceptos para reposición (usando los mismos de anulación por ahora o filtrando si hubiera tipo específico)
        const allConcepts = getConceptosAnulacion(user.parishId);
        // Filtramos si existe un tipo 'porReposicion', si no, mostramos todos o los genéricos
        const repoConcepts = allConcepts.filter(c => c.tipo === 'porReposicion' || c.tipo === 'porCorreccion');
        setConceptos(repoConcepts.length > 0 ? repoConcepts : allConcepts);
        
        const priest = getParrocoActual(user.parishId);
        if (priest) {
            const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
            setActivePriest(name);
            setBautismoNewPartida(prev => ({ ...prev, ministerFaith: name }));
            setConfirmacionNewPartida(prev => ({ ...prev, ministerFaith: name }));
            setMatrimonioNewPartida(prev => ({ ...prev, ministerFaith: name }));
        }
    }
  }, [user, getConceptosAnulacion, getParrocoActual]);

  // --- SUBMIT HANDLERS ---
  const handleSubmit = async (e, type) => {
      e.preventDefault();
      setIsSubmitting(true);
      const parishId = user.parishId;

      try {
          if (type === 'bautismo') {
              if (!bautismoDecree.numeroDecreto) throw new Error("Datos incompletos.");
              const baptismsKey = `baptisms_${parishId}`;
              const repositionsKey = `baptismRepositions_${parishId}`;
              const paramsKey = `baptismParameters_${parishId}`;
              
              const allBaptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              const existingRepositions = JSON.parse(localStorage.getItem(repositionsKey) || '[]');
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newBaptismRId = generateUUID();
              const newPartidaRecord = {
                  ...bautismoNewPartida, id: newBaptismRId, parishId,
                  book_number: params.suplementarioLibro, page_number: params.suplementarioFolio, entry_number: params.suplementarioNumero,
                  status: 'seated', isSupplementary: true, correctionDecreeRef: bautismoDecree.numeroDecreto,
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId, tipoNotaAlMargen: 'porReposicion.nuevaPartida', createdAt: new Date().toISOString()
              };

              allBaptisms.push(newPartidaRecord);
              existingRepositions.push({
                  id: generateUUID(), decreeNumber: bautismoDecree.numeroDecreto, decreeDate: bautismoDecree.fechaDecreto,
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId, parroquia: user.parishName, targetName: `${bautismoNewPartida.firstName} ${bautismoNewPartida.lastName}`,
                  newBaptismRId: newBaptismRId,
                  newPartidaSummary: { ...newPartidaRecord, book: newPartidaRecord.book_number, page: newPartidaRecord.page_number, entry: newPartidaRecord.entry_number },
                  createdAt: new Date().toISOString()
              });

              localStorage.setItem(baptismsKey, JSON.stringify(allBaptisms));
              localStorage.setItem(repositionsKey, JSON.stringify(existingRepositions));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

          } else if (type === 'confirmacion') {
              if (!confirmacionDecree.numeroDecreto) throw new Error("Datos incompletos.");
              const key = `confirmations_${parishId}`;
              const repositionsKey = `confirmationRepositions_${parishId}`;
              const paramsKey = `confirmationParameters_${parishId}`;
              
              const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              const existingRepositions = JSON.parse(localStorage.getItem(repositionsKey) || '[]');
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newConfirmationRId = generateUUID();
              const newRecord = {
                  ...confirmacionNewPartida, id: newConfirmationRId, parishId,
                  book_number: params.suplementarioLibro, page_number: params.suplementarioFolio, entry_number: params.suplementarioNumero,
                  status: 'seated', isSupplementary: true, correctionDecreeRef: confirmacionDecree.numeroDecreto,
                  conceptoAnulacionId: confirmacionDecree.conceptoAnulacionId, createdAt: new Date().toISOString()
              };

              allRecords.push(newRecord);
              existingRepositions.push({
                  id: generateUUID(), decreeNumber: confirmacionDecree.numeroDecreto, decreeDate: confirmacionDecree.fechaDecreto,
                  conceptoAnulacionId: confirmacionDecree.conceptoAnulacionId, targetName: `${confirmacionNewPartida.firstName} ${confirmacionNewPartida.lastName}`,
                  newConfirmationRId: newConfirmationRId, createdAt: new Date().toISOString()
              });

              localStorage.setItem(key, JSON.stringify(allRecords));
              localStorage.setItem(repositionsKey, JSON.stringify(existingRepositions));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

          } else if (type === 'matrimonio') {
              if (!matrimonioDecree.numeroDecreto) throw new Error("Datos incompletos.");
              const key = `matrimonios_${parishId}`;
              const repositionsKey = `marriageRepositions_${parishId}`;
              const paramsKey = `matrimonioParameters_${parishId}`;
              
              const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              const existingRepositions = JSON.parse(localStorage.getItem(repositionsKey) || '[]');
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newMarriageRId = generateUUID();
              const newRecord = {
                  ...matrimonioNewPartida, id: newMarriageRId, parishId,
                  book_number: params.suplementarioLibro, page_number: params.suplementarioFolio, entry_number: params.suplementarioNumero,
                  status: 'celebrated', isSupplementary: true, correctionDecreeRef: matrimonioDecree.numeroDecreto,
                  conceptoAnulacionId: matrimonioDecree.conceptoAnulacionId, createdAt: new Date().toISOString()
              };

              allRecords.push(newRecord);
              existingRepositions.push({
                  id: generateUUID(), decreeNumber: matrimonioDecree.numeroDecreto, decreeDate: matrimonioDecree.fechaDecreto,
                  conceptoAnulacionId: matrimonioDecree.conceptoAnulacionId, targetName: `${matrimonioNewPartida.husbandSurname} - ${matrimonioNewPartida.wifeSurname}`,
                  newMarriageRId: newMarriageRId, createdAt: new Date().toISOString()
              });

              localStorage.setItem(key, JSON.stringify(allRecords));
              localStorage.setItem(repositionsKey, JSON.stringify(existingRepositions));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));
          }

          setIsSuccess(true);
          toast({ title: "Reposición Exitosa", description: "Se ha generado la nueva partida supletoria.", className: "bg-green-50 border-green-200 text-green-900" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  if (isSuccess) {
      return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center mt-12 border border-gray-200 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Decreto de Reposición Registrado</h2>
                <p className="text-gray-700 mb-8 font-medium">Se ha generado la nueva partida supletoria correctamente.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => navigate('/parish/decree-replacement/view')} variant="outline">Ver Lista</Button>
                    <Button onClick={() => window.location.reload()} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold">Nuevo Decreto</Button>
                </div>
            </div>
        </DashboardLayout>
      );
  }

  // --- RENDER HELPERS ---
  const renderDecreeSection = (decree, setDecree) => (
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm mb-6">
          <h3 className="font-bold text-blue-800 text-sm uppercase mb-4 border-b border-blue-300 pb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> 1. Datos del Decreto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                  <Input name="numeroDecreto" value={decree.numeroDecreto} onChange={(e) => setDecree({ ...decree, numeroDecreto: e.target.value })} placeholder="Ej: 001-2026" className="bg-white"/>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Decreto <span className="text-red-500">*</span></label>
                  <Input type="date" name="fechaDecreto" value={decree.fechaDecreto} onChange={(e) => setDecree({ ...decree, fechaDecreto: e.target.value })} className="bg-white"/>
              </div>
          </div>
      </div>
  );

  const renderConceptSection = (decree, setDecree) => (
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 shadow-sm mb-6">
          <h3 className="font-bold text-purple-800 text-sm uppercase mb-4 border-b border-purple-300 pb-2 flex items-center gap-2"><Info className="w-4 h-4"/> 2. Concepto de Reposición</h3>
          <select name="conceptoAnulacionId" value={decree.conceptoAnulacionId} onChange={(e) => setDecree({ ...decree, conceptoAnulacionId: e.target.value })} className="w-full rounded-md border border-purple-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Seleccionar Concepto (Opcional)</option>
              {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
          </select>
      </div>
  );

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Reposición</h1>
            <p className="text-gray-600 font-medium text-sm">Registro de reposición de partidas perdidas o deterioradas (Libro Supletorio).</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-5xl mx-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmacion" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonio" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">Matrimonios</TabsTrigger>
                </TabsList>

                <TabsContent value="bautismo">
                    <form onSubmit={(e) => handleSubmit(e, 'bautismo')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(bautismoDecree, setBautismoDecree)}
                        {renderConceptSection(bautismoDecree, setBautismoDecree)}
                        
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200 shadow-sm">
                            <h3 className="font-bold text-green-800 text-sm uppercase mb-4 border-b border-green-300 pb-2 flex items-center gap-2"><UserPlus className="w-4 h-4"/> 3. Datos de Nueva Partida (Supletorio)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Bautismo *</label><Input type="date" value={bautismoNewPartida.sacramentDate} onChange={e => setBautismoNewPartida({...bautismoNewPartida, sacramentDate: e.target.value})} className="bg-white" /></div>
                                <div className="hidden md:block"></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Nombres *</label><Input value={bautismoNewPartida.firstName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, firstName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Apellidos *</label><Input value={bautismoNewPartida.lastName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, lastName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Nacimiento</label><Input type="date" value={bautismoNewPartida.birthDate} onChange={e => setBautismoNewPartida({...bautismoNewPartida, birthDate: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Lugar Nacimiento</label><Input value={bautismoNewPartida.placeOfBirth} onChange={e => setBautismoNewPartida({...bautismoNewPartida, placeOfBirth: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padre</label><Input value={bautismoNewPartida.fatherName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, fatherName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Madre</label><Input value={bautismoNewPartida.motherName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, motherName: e.target.value})} className="bg-white" /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padrinos</label><Input value={bautismoNewPartida.godparents} onChange={e => setBautismoNewPartida({...bautismoNewPartida, godparents: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Ministro</label><Input value={bautismoNewPartida.minister} onChange={e => setBautismoNewPartida({...bautismoNewPartida, minister: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Da Fe</label><Input value={bautismoNewPartida.ministerFaith} onChange={e => setBautismoNewPartida({...bautismoNewPartida, ministerFaith: e.target.value})} className="bg-white" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="confirmacion">
                    <form onSubmit={(e) => handleSubmit(e, 'confirmacion')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(confirmacionDecree, setConfirmacionDecree)}
                        {renderConceptSection(confirmacionDecree, setConfirmacionDecree)}
                        
                        <div className="bg-red-50 p-6 rounded-lg border border-red-200 shadow-sm">
                            <h3 className="font-bold text-red-800 text-sm uppercase mb-4 border-b border-red-300 pb-2 flex items-center gap-2"><UserPlus className="w-4 h-4"/> 3. Datos de Nueva Partida (Supletorio)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Confirmación *</label><Input type="date" value={confirmacionNewPartida.sacramentDate} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, sacramentDate: e.target.value})} className="bg-white" /></div>
                                <div className="hidden md:block"></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Nombres *</label><Input value={confirmacionNewPartida.firstName} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, firstName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Apellidos *</label><Input value={confirmacionNewPartida.lastName} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, lastName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Nacimiento</label><Input type="date" value={confirmacionNewPartida.birthDate} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, birthDate: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Lugar Nacimiento</label><Input value={confirmacionNewPartida.placeOfBirth} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, placeOfBirth: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padre</label><Input value={confirmacionNewPartida.fatherName} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, fatherName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Madre</label><Input value={confirmacionNewPartida.motherName} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, motherName: e.target.value})} className="bg-white" /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padrinos</label><Input value={confirmacionNewPartida.godparents} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, godparents: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Ministro</label><Input value={confirmacionNewPartida.minister} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, minister: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Da Fe</label><Input value={confirmacionNewPartida.ministerFaith} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, ministerFaith: e.target.value})} className="bg-white" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="matrimonio">
                    <form onSubmit={(e) => handleSubmit(e, 'matrimonio')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(matrimonioDecree, setMatrimonioDecree)}
                        {renderConceptSection(matrimonioDecree, setMatrimonioDecree)}
                        
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 shadow-sm">
                            <h3 className="font-bold text-purple-800 text-sm uppercase mb-4 border-b border-purple-300 pb-2 flex items-center gap-2"><Heart className="w-4 h-4"/> 3. Datos de Nueva Partida (Supletorio)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Matrimonio *</label><Input type="date" value={matrimonioNewPartida.sacramentDate} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, sacramentDate: e.target.value})} className="bg-white" /></div>
                                <div className="hidden md:block"></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposo Nombres</label><Input value={matrimonioNewPartida.husbandName} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, husbandName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposo Apellidos</label><Input value={matrimonioNewPartida.husbandSurname} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, husbandSurname: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposa Nombres</label><Input value={matrimonioNewPartida.wifeName} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, wifeName: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposa Apellidos</label><Input value={matrimonioNewPartida.wifeSurname} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, wifeSurname: e.target.value})} className="bg-white" /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Testigos</label><Input value={matrimonioNewPartida.witnesses} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, witnesses: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Ministro</label><Input value={matrimonioNewPartida.minister} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, minister: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Da Fe</label><Input value={matrimonioNewPartida.ministerFaith} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, ministerFaith: e.target.value})} className="bg-white" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </form>
                </TabsContent>
            </Tabs>
        </div>
    </DashboardLayout>
  );
};

export default DecreeRepositionNew;
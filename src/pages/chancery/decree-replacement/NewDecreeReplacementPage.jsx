import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, FileText, UserPlus, ArrowLeft, Heart } from 'lucide-react';
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

  // --- SHARED DECREE STATE ---
  const [decreeInfo, setDecreeInfo] = useState({
      parroquia: '',
      targetParishId: '',
      numeroDecreto: '', 
      fechaDecreto: new Date().toISOString().split('T')[0], 
      conceptoAnulacionId: '' 
  });

  // --- BAPTISM STATE ---
  const [bautismoNewPartida, setBautismoNewPartida] = useState({
      sacramentDate: '', firstName: '', lastName: '', birthDate: '', 
      lugarNacimientoDetalle: '', lugarBautismo: '',
      fatherName: '', ceduPadre: '', motherName: '', ceduMadre: '', 
      tipoUnionPadres: '1', sex: '1', paternalGrandparents: '', maternalGrandparents: '',
      godparents: '', minister: '', ministerFaith: '',
      serialRegCivil: '', nuipNuit: '', oficinaRegistro: '', fechaExpedicion: ''
  });

  // --- CONFIRMATION STATE ---
  const [confNewPartida, setConfNewPartida] = useState({
      sacramentDate: '', firstName: '', lastName: '', birthDate: '', lugarNacimientoDetalle: '',
      lugarConfirmacion: '', fatherName: '', motherName: '', padrino: '', madrina: '', minister: '', ministerFaith: ''
  });

  // --- MARRIAGE STATE ---
  const [marNewPartida, setMarNewPartida] = useState({
      sacramentDate: '', lugarMatrimonio: '', husbandName: '', husbandSurname: '',
      wifeName: '', wifeSurname: '', witnesses: '', minister: '', ministerFaith: ''
  });

  // Load Initial Data
  useEffect(() => {
    if (user) {
        const contextId = user.dioceseId || user.id;
        const allConcepts = getConceptosAnulacion(contextId);
        setConceptos(allConcepts.filter(c => c.tipo === 'porReposicion' || c.tipo === 'porCorreccion'));
        
        const misDatos = getMisDatosList(contextId);
        const entityLabel = misDatos?.[0]
            ? `${misDatos[0].nombre} - ${misDatos[0].ciudad}`.toUpperCase()
            : `${user.dioceseName || 'CANCILLERÍA'} - ${user.city || 'BARRANQUILLA'}`.toUpperCase();

        setDecreeInfo(prev => ({ ...prev, parroquia: entityLabel }));
        
        const priest = getParrocoActual(contextId);
        if (priest) {
            const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
            setActivePriest(name);
            setBautismoNewPartida(prev => ({ ...prev, ministerFaith: name }));
            setConfNewPartida(prev => ({ ...prev, ministerFaith: name }));
            setMarNewPartida(prev => ({ ...prev, ministerFaith: name }));
        }
    }
  }, [user]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (!decreeInfo.targetParishId || !decreeInfo.numeroDecreto) {
          toast({ title: "Error", description: "Complete los campos obligatorios del decreto.", variant: "destructive" });
          return;
      }

      setIsSubmitting(true);
      const savedDecreeId = generateUUID();
      const targetParishId = decreeInfo.targetParishId;
      const type = activeTab;

      const newPartidaData = type === 'bautismo' ? bautismoNewPartida : type === 'confirmacion' ? confNewPartida : marNewPartida;

      const decreeRecord = {
          id: savedDecreeId,
          decreeNumber: decreeInfo.numeroDecreto,
          decreeDate: decreeInfo.fechaDecreto,
          conceptoAnulacionId: decreeInfo.conceptoAnulacionId,
          parishId: targetParishId,
          sacrament: type,
          status: 'completed',
          createdAt: new Date().toISOString(),
          targetName: type === 'matrimonios' ? `${newPartidaData.husbandName} & ${newPartidaData.wifeName}` : `${newPartidaData.firstName} ${newPartidaData.lastName}`,
          newPartidaData: newPartidaData,
          createdBy: user.id,
          originType: 'chancery'
      };
      
      try {
          // Save to Parroquia (Mocking logic based on Bautismo)
          const collectionMap = { bautismo: 'baptisms', confirmacion: 'confirmations', matrimonios: 'matrimonios' };
          const repoMap = { bautismo: 'baptismRepositions', confirmacion: 'confirmationRepositions', matrimonios: 'marriageRepositions' };

          const parishListKey = `${repoMap[type]}_${targetParishId}`;
          const currentRepos = JSON.parse(localStorage.getItem(parishListKey) || '[]');
          currentRepos.push(decreeRecord);
          localStorage.setItem(parishListKey, JSON.stringify(currentRepos));

          // Save to Chancery list
          const chanceryKey = `chancery_decrees_replacement_${user.dioceseId}`;
          const currentChancery = JSON.parse(localStorage.getItem(chanceryKey) || '[]');
          currentChancery.push(decreeRecord);
          localStorage.setItem(chanceryKey, JSON.stringify(currentChancery));

          await createNotification({
              decree_id: savedDecreeId,
              decree_type: 'replacement',
              parish_id: targetParishId,
              message: `Nuevo decreto de reposición (${type}) #${decreeInfo.numeroDecreto} generado por Cancillería.`,
              status: 'unread'
          });

          toast({ title: "Reposición Exitosa", description: "Decreto generado y parroquia notificada." });
          navigate('/chancery/decree-replacement/view');
      } catch (error) {
          toast({ title: "Error", description: "No se pudo guardar el decreto.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  const dioceseParishes = data.parishes ? data.parishes.filter(p => p.dioceseId === user?.dioceseId) : [];

  return (
    <DashboardLayout entityName={user?.dioceseName || "Cancillería"}>
        <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate('/chancery/decree-replacement/view')} className="p-0 hover:bg-transparent"><ArrowLeft className="w-6 h-6 text-gray-500" /></Button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Reposición (Diocesano)</h1>
                <p className="text-gray-500 text-sm">Emisión de decretos de reposición para partidas de la diócesis.</p>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-6xl mx-auto p-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="py-2 font-bold data-[state=active]:text-blue-600">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmacion" className="py-2 font-bold data-[state=active]:text-red-600">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonios" className="py-2 font-bold data-[state=active]:text-purple-600">Matrimonios</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="p-4 space-y-8 animate-in fade-in duration-300">
                    {/* SECTION 1: DECREE INFO */}
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
                        <h3 className="font-bold text-blue-800 text-sm uppercase mb-4 border-b border-blue-300 pb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> 1. Datos del Decreto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2"><label className="text-xs font-bold uppercase">Entidad Emisora</label><Input value={decreeInfo.parroquia} readOnly className="bg-gray-50" /></div>
                            <div className="md:col-span-2"><label className="text-xs font-bold uppercase">Parroquia Destino <span className="text-red-500">*</span></label>
                                <select value={decreeInfo.targetParishId} onChange={e => setDecreeInfo({...decreeInfo, targetParishId: e.target.value})} className="w-full h-10 border rounded-md px-3 bg-white">
                                    <option value="">Seleccionar...</option>
                                    {dioceseParishes.map(p => <option key={p.id} value={p.id}>{p.name} - {p.city}</option>)}
                                </select>
                            </div>
                            <div><label className="text-xs font-bold uppercase">No. Decreto</label><Input value={decreeInfo.numeroDecreto} onChange={e => setDecreeInfo({...decreeInfo, numeroDecreto: e.target.value})} /></div>
                            <div><label className="text-xs font-bold uppercase">Concepto</label>
                                <select className="w-full h-10 border rounded-md px-3 bg-white" value={decreeInfo.conceptoAnulacionId} onChange={e => setDecreeInfo({...decreeInfo, conceptoAnulacionId: e.target.value})}>
                                    <option value="">Seleccione...</option>
                                    {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SACRAMENT FORM */}
                    <TabsContent value="bautismo" className="mt-0">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-green-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5"/> DATOS NUEVA PARTIDA (BAUTISMO)</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Nombres" value={bautismoNewPartida.firstName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, firstName: e.target.value})} />
                                <Input label="Apellidos" value={bautismoNewPartida.lastName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, lastName: e.target.value})} />
                                <Input label="Padre" value={bautismoNewPartida.fatherName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, fatherName: e.target.value})} />
                                <Input label="Madre" value={bautismoNewPartida.motherName} onChange={e => setBautismoNewPartida({...bautismoNewPartida, motherName: e.target.value})} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="confirmacion" className="mt-0">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-red-600 p-6">
                            <h3 className="text-lg font-bold text-red-800 mb-6 flex items-center gap-2 border-b pb-2"><UserPlus className="w-5 h-5"/> DATOS NUEVA PARTIDA (CONFIRMACIÓN)</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Nombres" value={confNewPartida.firstName} onChange={e => setConfNewPartida({...confNewPartida, firstName: e.target.value})} />
                                <Input label="Apellidos" value={confNewPartida.lastName} onChange={e => setConfNewPartida({...confNewPartida, lastName: e.target.value})} />
                                <Input label="Padrino" value={confNewPartida.padrino} onChange={e => setConfNewPartida({...confNewPartida, padrino: e.target.value})} />
                                <Input label="Madrina" value={confNewPartida.madrina} onChange={e => setConfNewPartida({...confNewPartida, madrina: e.target.value})} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="matrimonios" className="mt-0">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-purple-600 p-6">
                            <h3 className="text-lg font-bold text-purple-800 mb-6 flex items-center gap-2 border-b pb-2"><Heart className="w-5 h-5"/> DATOS NUEVA PARTIDA (MATRIMONIO)</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Novio" value={marNewPartida.husbandName} onChange={e => setMarNewPartida({...marNewPartida, husbandName: e.target.value})} placeholder="Nombres y Apellidos" />
                                <Input label="Novia" value={marNewPartida.wifeName} onChange={e => setMarNewPartida({...marNewPartida, wifeName: e.target.value})} placeholder="Nombres y Apellidos" />
                                <div className="md:col-span-2"><Input label="Testigos" value={marNewPartida.witnesses} onChange={e => setMarNewPartida({...marNewPartida, witnesses: e.target.value})} /></div>
                            </div>
                        </div>
                    </TabsContent>

                    <div className="flex justify-end gap-4 border-t pt-6">
                        <Button type="button" variant="outline" onClick={() => navigate('/chancery/decree-replacement/view')}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                    </div>
                </form>
            </Tabs>
        </div>
    </DashboardLayout>
  );
};

export default NewDecreeReplacementPage;
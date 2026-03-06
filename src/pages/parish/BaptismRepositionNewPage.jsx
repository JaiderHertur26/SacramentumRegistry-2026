import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, FileText, UserPlus, Heart, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { generateUUID } from '@/utils/supabaseHelpers';

const BaptismRepositionNewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      getConceptosAnulacion, 
      getConceptoAnulacion,
      getParrocoActual,
      getMisDatosList,
      saveDecreeReplacementBaptism,
      saveBaptism,
      getBaptismParameters
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [activePriest, setActivePriest] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // --- BAPTISM STATE ---
  const [bautismoDecree, setBautismoDecree] = useState({ 
      parroquia: '',
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
      serialRegCivil: '', nuipNuit: '', oficinaRegistro: '', fechaExpedicion: '',
      book: '', page: '', entry: ''
  });

  // Load Initial Data & Parameters
  useEffect(() => {
    if (user && user.parishId) {
        // Load Conceptos
        const allConcepts = getConceptosAnulacion(user.parishId);
        const repoConcepts = allConcepts.filter(c => c.tipo === 'porReposicion' || c.tipo === 'porCorreccion');
        setConceptos(repoConcepts.length > 0 ? repoConcepts : allConcepts);
        
        // Auto-fill Parish Info
        const misDatos = getMisDatosList(user.parishId);
        let parishLabel = '';
        if (misDatos && misDatos.length > 0) {
            const dato = misDatos[0];
            const nombre = dato.nombre || user.parishName || 'Parroquia';
            const ciudad = dato.ciudad || user.city || 'Ciudad';
            parishLabel = `${nombre} - ${ciudad}`;
        } else {
            parishLabel = `${user.parishName || 'Parroquia'} - ${user.city || 'Ciudad'}`;
        }

        setBautismoDecree(prev => ({ ...prev, parroquia: parishLabel }));
        
        // Auto-fill Priest
        const priest = getParrocoActual(user.parishId);
        if (priest) {
            const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
            setActivePriest(name);
            setBautismoNewPartida(prev => ({ ...prev, ministerFaith: name }));
        }

        // Auto-load Parameters
        const params = getBaptismParameters(user.parishId);
        if (params) {
            setBautismoNewPartida(prev => ({
                ...prev,
                book: params.suplementarioLibro || '',
                page: params.suplementarioFolio || '',
                entry: params.suplementarioNumero || ''
            }));
        }
    }
  }, [user, getConceptosAnulacion, getParrocoActual, getMisDatosList, getBaptismParameters]);

  const handleSaveDecree = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      const parishId = user.parishId;

      try {
          if (!bautismoDecree.parroquia || !bautismoDecree.numeroDecreto || !bautismoDecree.fechaDecreto || !bautismoDecree.conceptoAnulacionId) {
              throw new Error("Faltan datos del decreto (Parroquia, Número, Fecha o Concepto).");
          }
          if (!bautismoNewPartida.firstName || !bautismoNewPartida.lastName || !bautismoNewPartida.sacramentDate) {
              throw new Error("Complete los datos requeridos de la nueva partida (Nombres, Apellidos, Fecha).");
          }
          
          if (!bautismoNewPartida.book || !bautismoNewPartida.page || !bautismoNewPartida.entry) {
              throw new Error("Error: Los parámetros de numeración (Libro Supletorio, Folio, Número) no se han cargado. Por favor, asigne valores en la Configuración de Parámetros de Bautismo.");
          }

          const concepto = getConceptoAnulacion(bautismoDecree.conceptoAnulacionId, parishId);
          const marginNoteText = concepto?.notaMarginalNueva || "Partida creada por reposición.";
          
          const newBaptismId = generateUUID();
          
          // TASK 1: Ensure all fields including civil registry are mapped correctly
          const finalNewPartida = {
              ...bautismoNewPartida,
              id: newBaptismId,
              parishId,
              type: "replacement",
              createdByDecree: "replacement",
              marginNote: {
                  text: marginNoteText,
                  appliedDate: bautismoDecree.fechaDecreto,
                  appliedByDecree: bautismoDecree.numeroDecreto
              },
              replacesPartidaId: "unknown", 
              
              nombres: bautismoNewPartida.firstName,
              apellidos: bautismoNewPartida.lastName,
              fecbau: bautismoNewPartida.sacramentDate,
              fecnac: bautismoNewPartida.birthDate,
              lugarn: bautismoNewPartida.lugarNacimientoDetalle,
              lugnac: bautismoNewPartida.lugarNacimientoDetalle,
              lugarBautismoDetalle: bautismoNewPartida.lugarBautismo,
              lugbau: bautismoNewPartida.lugarBautismo,
              sexo: bautismoNewPartida.sex,
              padre: bautismoNewPartida.fatherName,
              cedupad: bautismoNewPartida.ceduPadre,
              madre: bautismoNewPartida.motherName,
              cedumad: bautismoNewPartida.ceduMadre,
              abuepat: bautismoNewPartida.paternalGrandparents,
              abuemat: bautismoNewPartida.maternalGrandparents,
              padrinos: bautismoNewPartida.godparents,
              tipohijo: bautismoNewPartida.tipoUnionPadres,
              ministro: bautismoNewPartida.minister,
              dafe: bautismoNewPartida.ministerFaith,
              book_number: bautismoNewPartida.book,
              page_number: bautismoNewPartida.page,
              entry_number: bautismoNewPartida.entry,
              status: 'seated',
              
              // Civil Registry mapping explicitly
              regciv: bautismoNewPartida.serialRegCivil,
              nuip: bautismoNewPartida.nuipNuit,
              notaria: bautismoNewPartida.oficinaRegistro,
              fecregis: bautismoNewPartida.fechaExpedicion
          };

          console.log("📤 [BaptismRepositionNewPage] Enviando Partida a guardar:", finalNewPartida);

          const saveRes = saveBaptism(finalNewPartida, parishId);
          if (!saveRes.success) throw new Error(saveRes.message || "Error al guardar la partida.");

          const decreeData = {
              id: generateUUID(),
              parishId,
              type: "replacement",
              sacrament: "bautismo",
              numeroDecreto: bautismoDecree.numeroDecreto,
              decreeNumber: bautismoDecree.numeroDecreto,
              fechaDecreto: bautismoDecree.fechaDecreto,
              decreeDate: bautismoDecree.fechaDecreto,
              conceptoAnulacionId: bautismoDecree.conceptoAnulacionId,
              targetName: `${bautismoNewPartida.firstName} ${bautismoNewPartida.lastName}`,
              originalPartidaId: "unknown",
              newPartidaId: newBaptismId,
              newBaptismIdRepo: newBaptismId, // Add explicit ref
              newPartidaSummary: {
                  book: bautismoNewPartida.book,
                  page: bautismoNewPartida.page,
                  entry: bautismoNewPartida.entry,
              },
              datosNuevaPartida: finalNewPartida, // Store full object for easy editing
              status: 'active'
          };

          console.log("📤 [BaptismRepositionNewPage] Enviando Decreto a guardar:", decreeData);

          const decRes = saveDecreeReplacementBaptism(decreeData, parishId);
          if (!decRes.success) throw new Error(decRes.message || "Error al guardar el decreto.");

          setSuccessInfo({
              decreeNumber: bautismoDecree.numeroDecreto,
              reference: `L:${bautismoNewPartida.book} F:${bautismoNewPartida.page} N:${bautismoNewPartida.entry}`
          });
          setIsSuccess(true);
          toast({ 
              title: "Reposición Exitosa", 
              description: `Decreto ${bautismoDecree.numeroDecreto} guardado. Nueva partida: L:${bautismoNewPartida.book} F:${bautismoNewPartida.page} N:${bautismoNewPartida.entry}`, 
              className: "bg-green-50 border-green-200 text-green-900" 
          });

          setTimeout(() => {
              navigate('/parish/decree-replacement/view');
          }, 2000);

      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  const getConceptDetails = (id) => {
    if (!id) return null;
    return conceptos.find(c => c.id === id);
  };
  
  const selectedConcept = getConceptDetails(bautismoDecree.conceptoAnulacionId);

  if (isSuccess) {
      return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center mt-12 border border-gray-200 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Decreto de Reposición Registrado</h2>
                <p className="text-gray-700 mb-8 font-medium">Se ha generado la nueva partida y el decreto correspondiente.</p>
                {successInfo && (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded font-mono text-sm text-gray-800">
                        <p><strong>Decreto:</strong> {successInfo.decreeNumber}</p>
                        <p><strong>Partida Supletoria:</strong> {successInfo.reference}</p>
                    </div>
                )}
                <p className="text-gray-500 text-sm">Redirigiendo a la lista de decretos...</p>
            </div>
        </DashboardLayout>
      );
  }

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
        <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate('/parish/decree-replacement/view')} className="p-0 hover:bg-transparent">
                <X className="w-6 h-6 text-gray-500" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Reposición</h1>
                <p className="text-gray-500 text-sm">Registro de reposición de partidas perdidas o deterioradas</p>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-6xl mx-auto p-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-1 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Bautizos</TabsTrigger>
                </TabsList>

                {/* --- BAUTISMO TAB --- */}
                <TabsContent value="bautismo" className="p-4">
                    <form onSubmit={handleSaveDecree} className="space-y-8 pb-24">
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-blue-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia <span className="text-red-500">*</span></label>
                                    <Input value={bautismoDecree.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                                    <Input required value={bautismoDecree.numeroDecreto} onChange={(e) => setBautismoDecree({...bautismoDecree, numeroDecreto: e.target.value})} placeholder="Ej: 001-2025" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input required type="date" value={bautismoDecree.fechaDecreto} onChange={(e) => setBautismoDecree({...bautismoDecree, fechaDecreto: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={bautismoDecree.conceptoAnulacionId}
                                        onChange={(e) => setBautismoDecree({...bautismoDecree, conceptoAnulacionId: e.target.value})}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar Concepto</option>
                                        {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                    </select>
                                    {selectedConcept && <div className="mt-1 text-xs text-blue-600">{selectedConcept.codigo} - {selectedConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Libro (Nuevo) <span className="text-red-500">*</span></label>
                                    <Input readOnly disabled value={bautismoNewPartida.book} className="bg-gray-100 text-gray-500 font-bold cursor-not-allowed border-gray-200" />
                                    <span className="text-[10px] text-gray-400 mt-1 block">Asignado de parámetros (Supletorio)</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Folio (Nuevo) <span className="text-red-500">*</span></label>
                                    <Input readOnly disabled value={bautismoNewPartida.page} className="bg-gray-100 text-gray-500 font-bold cursor-not-allowed border-gray-200" />
                                    <span className="text-[10px] text-gray-400 mt-1 block">Asignado de parámetros (Supletorio)</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número (Nuevo) <span className="text-red-500">*</span></label>
                                    <Input readOnly disabled value={bautismoNewPartida.entry} className="bg-gray-100 text-gray-500 font-bold cursor-not-allowed border-gray-200" />
                                    <span className="text-[10px] text-gray-400 mt-1 block">Asignado de parámetros (Supletorio)</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Bautismo <span className="text-red-500">*</span></label><Input required type="date" value={bautismoNewPartida.sacramentDate} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, sacramentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Bautismo</label><Input value={bautismoNewPartida.lugarBautismo} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lugarBautismo: e.target.value})} placeholder="Parroquia..." /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input required value={bautismoNewPartida.firstName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, firstName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input required value={bautismoNewPartida.lastName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lastName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento</label><Input type="date" value={bautismoNewPartida.birthDate} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, birthDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento</label><Input value={bautismoNewPartida.lugarNacimientoDetalle} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lugarNacimientoDetalle: e.target.value})} /></div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre</label><Input value={bautismoNewPartida.fatherName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, fatherName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula del Padre</label><Input value={bautismoNewPartida.ceduPadre} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ceduPadre: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre</label><Input value={bautismoNewPartida.motherName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, motherName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cédula de la Madre</label><Input value={bautismoNewPartida.ceduMadre} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ceduMadre: e.target.value})} /></div>
                                </div>

                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipo de Unión</label><select value={bautismoNewPartida.tipoUnionPadres} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, tipoUnionPadres: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"><option value="1">1 - MATRIMONIO CATÓLICO</option><option value="2">2 - MATRIMONIO CIVIL</option><option value="3">3 - UNIÓN LIBRE</option><option value="4">4 - MADRE SOLTERA</option><option value="5">5 - OTRO</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Sexo</label><select value={bautismoNewPartida.sex} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, sex: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"><option value="1">1 - Masculino</option><option value="2">2 - Femenino</option></select></div>
                                
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Paternos</label><Input value={bautismoNewPartida.paternalGrandparents} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, paternalGrandparents: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abuelos Maternos</label><Input value={bautismoNewPartida.maternalGrandparents} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, maternalGrandparents: e.target.value})} /></div>
                                
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrinos</label><Input value={bautismoNewPartida.godparents} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, godparents: e.target.value})} /></div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-4 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos Registro Civil</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Serial Reg. Civil</label><Input value={bautismoNewPartida.serialRegCivil} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, serialRegCivil: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">NUIP / NUIT</label><Input value={bautismoNewPartida.nuipNuit} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, nuipNuit: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Oficina Registro</label><Input value={bautismoNewPartida.oficinaRegistro} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, oficinaRegistro: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Expedición</label><Input type="date" value={bautismoNewPartida.fechaExpedicion} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, fechaExpedicion: e.target.value})} /></div>
                                </div>

                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro</label><Input value={bautismoNewPartida.minister} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, minister: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe</label><select value={bautismoNewPartida.ministerFaith} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ministerFaith: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || bautismoNewPartida.ministerFaith !== activePriest) && <Input value={bautismoNewPartida.ministerFaith} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, ministerFaith: e.target.value})} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate('/parish/decree-replacement/view')} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </form>
                </TabsContent>
            </Tabs>
        </div>
    </DashboardLayout>
  );
};

export default BaptismRepositionNewPage;
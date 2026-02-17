
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, FileText, UserPlus, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { generateUUID, incrementPaddedValue } from '@/utils/supabaseHelpers';

const NewDecreeReplacement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      getConceptosAnulacion, 
      getParrocoActual,
      getMisDatosList,
      saveDecreeReplacement // Updated to use the new exposed alias
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [activePriest, setActivePriest] = useState(null);

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
      serialRegCivil: '', nuipNuit: '', oficinaRegistro: '', fechaExpedicion: ''
  });

  // --- CONFIRMATION STATE ---
  const [confirmacionDecree, setConfirmacionDecree] = useState({ 
      parroquia: '',
      numeroDecreto: '', 
      fechaDecreto: new Date().toISOString().split('T')[0], 
      conceptoAnulacionId: '' 
  });
  const [confirmacionNewPartida, setConfirmacionNewPartida] = useState({
      sacramentDate: '', firstName: '', lastName: '', birthDate: '', 
      lugarNacimientoDetalle: '', lugarConfirmacion: '',
      fatherName: '', motherName: '', padrino: '', madrina: '', 
      minister: '', ministerFaith: ''
  });

  // --- MARRIAGE STATE ---
  const [matrimonioDecree, setMatrimonioDecree] = useState({ 
      parroquia: '',
      numeroDecreto: '', 
      fechaDecreto: new Date().toISOString().split('T')[0], 
      conceptoAnulacionId: '' 
  });
  const [matrimonioNewPartida, setMatrimonioNewPartida] = useState({
      sacramentDate: '', lugarMatrimonio: '',
      husbandName: '', husbandSurname: '', husbandBirthDate: '', husbandPlaceOfBirth: '', husbandFather: '', husbandMother: '',
      wifeName: '', wifeSurname: '', wifeBirthDate: '', wifePlaceOfBirth: '', wifeFather: '', wifeMother: '',
      witnesses: '', minister: '', ministerFaith: ''
  });

  // Load Initial Data
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
        setConfirmacionDecree(prev => ({ ...prev, parroquia: parishLabel }));
        setMatrimonioDecree(prev => ({ ...prev, parroquia: parishLabel }));
        
        // Auto-fill Priest
        const priest = getParrocoActual(user.parishId);
        if (priest) {
            const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
            setActivePriest(name);
            setBautismoNewPartida(prev => ({ ...prev, ministerFaith: name }));
            setConfirmacionNewPartida(prev => ({ ...prev, ministerFaith: name }));
            setMatrimonioNewPartida(prev => ({ ...prev, ministerFaith: name }));
        }
    }
  }, [user, getConceptosAnulacion, getParrocoActual, getMisDatosList]);

  // --- SUBMIT HANDLERS ---
  const handleSubmit = async (e, type) => {
      e.preventDefault();
      setIsSubmitting(true);
      const parishId = user.parishId;

      try {
          if (type === 'bautismo') {
              if (!bautismoDecree.numeroDecreto || !bautismoNewPartida.firstName || !bautismoNewPartida.sacramentDate) {
                  throw new Error("Por favor complete los campos obligatorios (*)");
              }
              
              const baptismsKey = `baptisms_${parishId}`;
              const paramsKey = `baptismParameters_${parishId}`;
              
              const allBaptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newBaptismRId = generateUUID();
              const decreeId = generateUUID();

              // 1. Create New Partida Record FIRST
              const newPartidaRecord = {
                  ...bautismoNewPartida,
                  id: newBaptismRId,
                  parishId,
                  // Map fields
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
                  regciv: bautismoNewPartida.serialRegCivil,
                  nuip: bautismoNewPartida.nuipNuit,
                  notaria: bautismoNewPartida.oficinaRegistro,
                  fecregis: bautismoNewPartida.fechaExpedicion,
                  
                  // Supplementary Book Data
                  book_number: params.suplementarioLibro,
                  page_number: params.suplementarioFolio,
                  entry_number: params.suplementarioNumero,
                  
                  status: 'seated',
                  isSupplementary: true,
                  replacementDecreeRef: bautismoDecree.numeroDecreto,
                  // LINK TO DECREE
                  newBaptismIdRepo: decreeId, 
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId,
                  tipoNotaAlMargen: 'porReposicion.nuevaPartida',
                  createdAt: new Date().toISOString()
              };

              allBaptisms.push(newPartidaRecord);
              
              // 2. Save Decree using Context with Bidirectional Link
              const decreePayload = {
                  id: decreeId,
                  parroquiaId: parishId,
                  sacrament: 'bautismo',
                  decreeNumber: bautismoDecree.numeroDecreto,
                  numeroDecreto: bautismoDecree.numeroDecreto, // Alias for compatibility
                  decreeDate: bautismoDecree.fechaDecreto,
                  fechaDecreto: bautismoDecree.fechaDecreto, // Alias
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId,
                  conceptoId: bautismoDecree.conceptoAnulacionId, // Alias
                  parroquia: user.parishName,
                  targetName: `${bautismoNewPartida.firstName} ${bautismoNewPartida.lastName}`,
                  
                  // LINK TO PARTIDA
                  newBaptismIdRepo: newBaptismRId,
                  targetBaptismId: null, // No original record for replacement usually

                  datosNuevaPartida: newPartidaRecord, // Store copy or reference
                  newPartidaSummary: { 
                      ...newPartidaRecord, 
                      book: newPartidaRecord.book_number, 
                      page: newPartidaRecord.page_number, 
                      entry: newPartidaRecord.entry_number 
                  },
                  
                  createdAt: new Date().toISOString(),
                  estado: 'active'
              };

              saveDecreeReplacement(decreePayload, parishId);

              // 3. Update Storage
              localStorage.setItem(baptismsKey, JSON.stringify(allBaptisms));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

          } else if (type === 'confirmacion') {
              if (!confirmacionDecree.numeroDecreto || !confirmacionNewPartida.firstName || !confirmacionNewPartida.sacramentDate) {
                  throw new Error("Por favor complete los campos obligatorios (*)");
              }

              const key = `confirmations_${parishId}`;
              const paramsKey = `confirmationParameters_${parishId}`;
              
              const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newConfirmationRId = generateUUID();
              const decreeId = generateUUID();
              
              const newRecord = {
                  ...confirmacionNewPartida,
                  id: newConfirmationRId,
                  parishId,
                  nombres: confirmacionNewPartida.firstName,
                  apellidos: confirmacionNewPartida.lastName,
                  feccof: confirmacionNewPartida.sacramentDate,
                  fecnac: confirmacionNewPartida.birthDate,
                  lugarNacimiento: confirmacionNewPartida.lugarNacimientoDetalle,
                  padre: confirmacionNewPartida.fatherName,
                  madre: confirmacionNewPartida.motherName,
                  ministro: confirmacionNewPartida.minister,
                  dafe: confirmacionNewPartida.ministerFaith,

                  book_number: params.suplementarioLibro,
                  page_number: params.suplementarioFolio,
                  entry_number: params.suplementarioNumero,
                  
                  status: 'seated',
                  isSupplementary: true,
                  replacementDecreeRef: confirmacionDecree.numeroDecreto,
                  
                  // LINK TO DECREE
                  newBaptismIdRepo: decreeId, 
                  conceptoAnulacionId: confirmacionDecree.conceptoAnulacionId,
                  tipoNotaAlMargen: 'porReposicion.nuevaPartida',
                  createdAt: new Date().toISOString()
              };

              allRecords.push(newRecord);
              
              const decreePayload = {
                  id: decreeId,
                  parroquiaId: parishId,
                  sacrament: 'confirmacion',
                  decreeNumber: confirmacionDecree.numeroDecreto,
                  numeroDecreto: confirmacionDecree.numeroDecreto,
                  decreeDate: confirmacionDecree.fechaDecreto,
                  fechaDecreto: confirmacionDecree.fechaDecreto,
                  conceptoAnulacionId: confirmacionDecree.conceptoAnulacionId,
                  conceptoId: confirmacionDecree.conceptoAnulacionId,
                  
                  // LINK TO PARTIDA
                  newBaptismIdRepo: newConfirmationRId,
                  targetBaptismId: null,

                  datosNuevaPartida: newRecord,
                  newPartidaSummary: {
                      book: newRecord.book_number,
                      page: newRecord.page_number,
                      entry: newRecord.entry_number
                  },
                  createdAt: new Date().toISOString(),
                  estado: 'active'
              };

              saveDecreeReplacement(decreePayload, parishId);

              localStorage.setItem(key, JSON.stringify(allRecords));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

          } else if (type === 'matrimonio') {
              if (!matrimonioDecree.numeroDecreto || !matrimonioNewPartida.husbandSurname || !matrimonioNewPartida.sacramentDate) {
                  throw new Error("Por favor complete los campos obligatorios (*)");
              }

              const key = `matrimonios_${parishId}`;
              const paramsKey = `matrimonioParameters_${parishId}`;
              
              const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newMarriageRId = generateUUID();
              const decreeId = generateUUID();
              
              const newRecord = {
                  ...matrimonioNewPartida,
                  id: newMarriageRId,
                  parishId,
                  esposoNombres: matrimonioNewPartida.husbandName,
                  esposoApellidos: matrimonioNewPartida.husbandSurname,
                  esposaNombres: matrimonioNewPartida.wifeName,
                  esposaApellidos: matrimonioNewPartida.wifeSurname,
                  fechaCelebracion: matrimonioNewPartida.sacramentDate,
                  ministro: matrimonioNewPartida.minister,
                  dafe: matrimonioNewPartida.ministerFaith,

                  book_number: params.suplementarioLibro,
                  page_number: params.suplementarioFolio,
                  entry_number: params.suplementarioNumero,
                  
                  status: 'celebrated',
                  isSupplementary: true,
                  replacementDecreeRef: matrimonioDecree.numeroDecreto,
                  
                  // LINK TO DECREE
                  newBaptismIdRepo: decreeId, 
                  conceptoAnulacionId: matrimonioDecree.conceptoAnulacionId,
                  tipoNotaAlMargen: 'porReposicion.nuevaPartida',
                  createdAt: new Date().toISOString()
              };

              allRecords.push(newRecord);
              
              const decreePayload = {
                  id: decreeId,
                  parroquiaId: parishId,
                  sacrament: 'matrimonio',
                  decreeNumber: matrimonioDecree.numeroDecreto,
                  numeroDecreto: matrimonioDecree.numeroDecreto,
                  decreeDate: matrimonioDecree.fechaDecreto,
                  fechaDecreto: matrimonioDecree.fechaDecreto,
                  conceptoAnulacionId: matrimonioDecree.conceptoAnulacionId,
                  conceptoId: matrimonioDecree.conceptoAnulacionId,

                  // LINK TO PARTIDA
                  newBaptismIdRepo: newMarriageRId,
                  targetBaptismId: null,

                  datosNuevaPartida: newRecord,
                  newPartidaSummary: {
                      book: newRecord.book_number,
                      page: newRecord.page_number,
                      entry: newRecord.entry_number
                  },
                  createdAt: new Date().toISOString(),
                  estado: 'active'
              };

              saveDecreeReplacement(decreePayload, parishId);

              localStorage.setItem(key, JSON.stringify(allRecords));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));
          }

          toast({ 
              title: "Reposición Exitosa", 
              description: "Se ha generado la nueva partida supletoria y el decreto correspondiente.", 
              className: "bg-green-50 border-green-200 text-green-900" 
          });
          navigate('/parish/decree-replacement/view'); 
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
  const selectedConfConcept = getConceptDetails(confirmacionDecree.conceptoAnulacionId);
  const selectedMarConcept = getConceptDetails(matrimonioDecree.conceptoAnulacionId);

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
        <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate('/parish/decree-replacement/view')} className="p-0 hover:bg-transparent">
                <X className="w-6 h-6 text-gray-500" />
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
                    <TabsTrigger value="confirmacion" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonio" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">Matrimonios</TabsTrigger>
                </TabsList>

                {/* --- BAUTISMO TAB --- */}
                <TabsContent value="bautismo" className="p-4">
                    <div className="space-y-8 pb-24">
                        {/* SECTION 1: DATOS DEL DECRETO */}
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-blue-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label>
                                    <Input value={bautismoDecree.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label>
                                    <Input value={bautismoDecree.numeroDecreto} onChange={(e) => setBautismoDecree({...bautismoDecree, numeroDecreto: e.target.value})} placeholder="Ej: 001-2025" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label>
                                    <Input type="date" value={bautismoDecree.fechaDecreto} onChange={(e) => setBautismoDecree({...bautismoDecree, fechaDecreto: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                                    <select
                                        value={bautismoDecree.conceptoAnulacionId}
                                        onChange={(e) => setBautismoDecree({...bautismoDecree, conceptoAnulacionId: e.target.value})}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar Concepto (Opcional)</option>
                                        {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
                                    </select>
                                    {selectedConcept && <div className="mt-1 text-xs text-blue-600">{selectedConcept.codigo} - {selectedConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: FORMULARIO DE NUEVA PARTIDA */}
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Bautismo <span className="text-red-500">*</span></label><Input type="date" value={bautismoNewPartida.sacramentDate} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, sacramentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Bautismo</label><Input value={bautismoNewPartida.lugarBautismo} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lugarBautismo: e.target.value})} placeholder="Parroquia..." /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.firstName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, firstName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input value={bautismoNewPartida.lastName} onChange={(e) => setBautismoNewPartida({...bautismoNewPartida, lastName: e.target.value})} /></div>
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
                                
                                {/* Registro Civil Section */}
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
                             <Button onClick={(e) => handleSubmit(e, 'bautismo')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </div>
                </TabsContent>

                {/* --- CONFIRMACION TAB --- */}
                <TabsContent value="confirmacion" className="p-4">
                    <div className="space-y-8 pb-24">
                        {/* SECTION 1: DATOS DEL DECRETO */}
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-red-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-red-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label>
                                    <Input value={confirmacionDecree.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label><Input value={confirmacionDecree.numeroDecreto} onChange={(e) => setConfirmacionDecree({...confirmacionDecree, numeroDecreto: e.target.value})} placeholder="Ej: 001-2025" /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label><Input type="date" value={confirmacionDecree.fechaDecreto} onChange={(e) => setConfirmacionDecree({...confirmacionDecree, fechaDecreto: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                                    <select value={confirmacionDecree.conceptoAnulacionId} onChange={(e) => setConfirmacionDecree({...confirmacionDecree, conceptoAnulacionId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">Seleccionar Concepto (Opcional)</option>{conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}</select>
                                    {selectedConfConcept && <div className="mt-1 text-xs text-red-600">{selectedConfConcept.codigo} - {selectedConfConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: FORMULARIO DE NUEVA PARTIDA */}
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <UserPlus className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Confirmación <span className="text-red-500">*</span></label><Input type="date" value={confirmacionNewPartida.sacramentDate} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, sacramentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Confirmación</label><Input value={confirmacionNewPartida.lugarConfirmacion} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, lugarConfirmacion: e.target.value})} placeholder="Parroquia..." /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input value={confirmacionNewPartida.firstName} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, firstName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input value={confirmacionNewPartida.lastName} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, lastName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Nacimiento</label><Input type="date" value={confirmacionNewPartida.birthDate} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, birthDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar de Nacimiento</label><Input value={confirmacionNewPartida.lugarNacimientoDetalle} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, lugarNacimientoDetalle: e.target.value})} /></div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="md:col-span-2 text-xs font-bold text-blue-600 uppercase border-b pb-1 mb-2">Datos de los Padres</h4>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Padre</label><Input value={confirmacionNewPartida.fatherName} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, fatherName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre de la Madre</label><Input value={confirmacionNewPartida.motherName} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, motherName: e.target.value})} /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padrino</label><Input value={confirmacionNewPartida.padrino} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, padrino: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madrina</label><Input value={confirmacionNewPartida.madrina} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, madrina: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro</label><Input value={confirmacionNewPartida.minister} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, minister: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe</label><select value={confirmacionNewPartida.ministerFaith} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, ministerFaith: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || confirmacionNewPartida.ministerFaith !== activePriest) && <Input value={confirmacionNewPartida.ministerFaith} onChange={(e) => setConfirmacionNewPartida({...confirmacionNewPartida, ministerFaith: e.target.value})} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate('/parish/decree-replacement/view')} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button onClick={(e) => handleSubmit(e, 'confirmacion')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </div>
                </TabsContent>

                {/* --- MATRIMONIO TAB --- */}
                <TabsContent value="matrimonio" className="p-4">
                    <div className="space-y-8 pb-24">
                        {/* SECTION 1: DATOS DEL DECRETO */}
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-purple-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-purple-600" /> SECCIÓN 1: DATOS DEL DECRETO
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Parroquia</label>
                                    <Input value={matrimonioDecree.parroquia} readOnly className="bg-gray-100 text-gray-700 font-medium" />
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Número de Decreto <span className="text-red-500">*</span></label><Input value={matrimonioDecree.numeroDecreto} onChange={(e) => setMatrimonioDecree({...matrimonioDecree, numeroDecreto: e.target.value})} placeholder="Ej: 001-2025" /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Decreto <span className="text-red-500">*</span></label><Input type="date" value={matrimonioDecree.fechaDecreto} onChange={(e) => setMatrimonioDecree({...matrimonioDecree, fechaDecreto: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Concepto de Reposición</label>
                                    <select value={matrimonioDecree.conceptoAnulacionId} onChange={(e) => setMatrimonioDecree({...matrimonioDecree, conceptoAnulacionId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"><option value="">Seleccionar Concepto (Opcional)</option>{conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}</select>
                                    {selectedMarConcept && <div className="mt-1 text-xs text-purple-600">{selectedMarConcept.codigo} - {selectedMarConcept.concepto}</div>}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: FORMULARIO DE NUEVA PARTIDA */}
                        <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-600 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                <Heart className="w-5 h-5 text-green-600" /> SECCIÓN 2: FORMULARIO DE NUEVA PARTIDA (SUPLETORIO)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha de Matrimonio <span className="text-red-500">*</span></label><Input type="date" value={matrimonioNewPartida.sacramentDate} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, sacramentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Matrimonio</label><Input value={matrimonioNewPartida.lugarMatrimonio} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, lugarMatrimonio: e.target.value})} placeholder="Parroquia..." /></div>
                            </div>
                            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 mb-6">
                                <h4 className="text-sm font-bold text-blue-800 mb-4 uppercase border-b border-blue-200 pb-1">Datos del Esposo</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input value={matrimonioNewPartida.husbandName} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, husbandName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input value={matrimonioNewPartida.husbandSurname} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, husbandSurname: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Nacimiento</label><Input type="date" value={matrimonioNewPartida.husbandBirthDate} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, husbandBirthDate: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Nacimiento</label><Input value={matrimonioNewPartida.husbandPlaceOfBirth} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, husbandPlaceOfBirth: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padre</label><Input value={matrimonioNewPartida.husbandFather} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, husbandFather: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madre</label><Input value={matrimonioNewPartida.husbandMother} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, husbandMother: e.target.value})} /></div>
                                </div>
                            </div>
                            <div className="p-4 bg-pink-50/50 rounded-lg border border-pink-100 mb-6">
                                <h4 className="text-sm font-bold text-pink-800 mb-4 uppercase border-b border-pink-200 pb-1">Datos de la Esposa</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label><Input value={matrimonioNewPartida.wifeName} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, wifeName: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label><Input value={matrimonioNewPartida.wifeSurname} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, wifeSurname: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Nacimiento</label><Input type="date" value={matrimonioNewPartida.wifeBirthDate} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, wifeBirthDate: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lugar Nacimiento</label><Input value={matrimonioNewPartida.wifePlaceOfBirth} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, wifePlaceOfBirth: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Padre</label><Input value={matrimonioNewPartida.wifeFather} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, wifeFather: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Madre</label><Input value={matrimonioNewPartida.wifeMother} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, wifeMother: e.target.value})} /></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Testigos</label><Input value={matrimonioNewPartida.witnesses} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, witnesses: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ministro</label><Input value={matrimonioNewPartida.minister} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, minister: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Da Fe</label><select value={matrimonioNewPartida.ministerFaith} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, ministerFaith: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">{activePriest && <option value={activePriest}>{activePriest}</option>}<option value="">Otro...</option></select>{(!activePriest || matrimonioNewPartida.ministerFaith !== activePriest) && <Input value={matrimonioNewPartida.ministerFaith} onChange={(e) => setMatrimonioNewPartida({...matrimonioNewPartida, ministerFaith: e.target.value})} className="mt-2" placeholder="Nombre manual..." />}</div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate('/parish/decree-replacement/view')} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button onClick={(e) => handleSubmit(e, 'matrimonio')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    </DashboardLayout>
  );
};

export default NewDecreeReplacement;

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, Loader2, CheckCircle, Search, AlertCircle, FileText, UserPlus, Info, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { updateBaptismPartidaMarginalNote } from '@/utils/updateBaptismPartidaMarginalNote.js';
import { generateUUID, incrementPaddedValue } from '@/utils/supabaseHelpers';

const NewDecreeCorrection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      getConceptosAnulacion, 
      getBaptisms,
      getConfirmations,
      getMatrimonios, 
      getParrocoActual
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [activePriest, setActivePriest] = useState(null);

  // --- BAPTISM STATE (NUEVO ESTÁNDAR) ---
  const [bautismoSearch, setBautismoSearch] = useState({ book: '', page: '', entry: '' });
  const [bautismoFound, setBautismoFound] = useState(null);
  const [bautismoSearchError, setBautismoSearchError] = useState(null);
  const [bautismoSearching, setBautismoSearching] = useState(false);
  const [bautismoDecree, setBautismoDecree] = useState({ numeroDecreto: '', fechaDecreto: new Date().toISOString().split('T')[0], conceptoAnulacionId: '' });
  const [bautismoNewPartida, setBautismoNewPartida] = useState({
      fechaSacramento: '', nombres: '', apellidos: '', fechaNacimiento: '', lugarNacimiento: '',
      nombrePadre: '', nombreMadre: '', tipoUnionPadres: '1', sexo: '1',
      padrinos: '', ministro: '', daFe: ''
  });

  // --- CONFIRMATION STATE (NUEVO ESTÁNDAR) ---
  const [confirmacionSearch, setConfirmacionSearch] = useState({ book: '', page: '', entry: '' });
  const [confirmacionFound, setConfirmacionFound] = useState(null);
  const [confirmacionSearchError, setConfirmacionSearchError] = useState(null);
  const [confirmacionSearching, setConfirmacionSearching] = useState(false);
  const [confirmacionDecree, setConfirmacionDecree] = useState({ numeroDecreto: '', fechaDecreto: new Date().toISOString().split('T')[0], conceptoAnulacionId: '' });
  const [confirmacionNewPartida, setConfirmacionNewPartida] = useState({
      fechaSacramento: '', nombres: '', apellidos: '', fechaNacimiento: '', lugarNacimiento: '',
      nombrePadre: '', nombreMadre: '', padrinos: '', ministro: '', daFe: ''
  });

  // --- MARRIAGE STATE (NUEVO ESTÁNDAR) ---
  const [matrimonioSearch, setMatrimonioSearch] = useState({ book: '', page: '', entry: '' });
  const [matrimonioFound, setMatrimonioFound] = useState(null);
  const [matrimonioSearchError, setMatrimonioSearchError] = useState(null);
  const [matrimonioSearching, setMatrimonioSearching] = useState(false);
  const [matrimonioDecree, setMatrimonioDecree] = useState({ numeroDecreto: '', fechaDecreto: new Date().toISOString().split('T')[0], conceptoAnulacionId: '' });
  const [matrimonioNewPartida, setMatrimonioNewPartida] = useState({
      fechaSacramento: '', lugarMatrimonio: '', esposoNombres: '', esposoApellidos: '', esposaNombres: '', esposaApellidos: '',
      testigos: '', ministro: '', daFe: ''
  });

  // Load Initial Data
  useEffect(() => {
    if (user?.parishId) {
        const allConcepts = getConceptosAnulacion(user.parishId);
        setConceptos(allConcepts.filter(c => c.tipo === 'porCorreccion'));
        const priest = getParrocoActual(user.parishId);
        if (priest) {
            const name = `${priest.nombre} ${priest.apellido || ''}`.trim();
            setActivePriest(name);
            setBautismoNewPartida(prev => ({ ...prev, daFe: name }));
            setConfirmacionNewPartida(prev => ({ ...prev, daFe: name }));
            setMatrimonioNewPartida(prev => ({ ...prev, daFe: name }));
        }
    }
  }, [user, getConceptosAnulacion, getParrocoActual]);

  // --- SEARCH HANDLERS CON TRADUCTOR INTELIGENTE ---
  const handleSearch = (type) => {
      let searchParams, setSearchError, setFound, setSearching, getMethod, mapNewPartida;
      
      if (type === 'bautismo') {
          searchParams = bautismoSearch; setSearchError = setBautismoSearchError; setFound = setBautismoFound; setSearching = setBautismoSearching; getMethod = getBaptisms;
          mapNewPartida = (found) => setBautismoNewPartida(prev => ({ 
              ...prev, 
              fechaSacramento: found.fechaSacramento || found.sacramentDate || found.fecbau || '', 
              nombres: found.nombres || found.firstName || '', 
              apellidos: found.apellidos || found.lastName || '', 
              fechaNacimiento: found.fechaNacimiento || found.birthDate || found.fecnac || '', 
              lugarNacimiento: found.lugarNacimiento || found.lugarNacimientoDetalle || found.birthPlace || found.lugarn || '', 
              nombrePadre: found.nombrePadre || found.fatherName || found.padre || '', 
              nombreMadre: found.nombreMadre || found.motherName || found.madre || '', 
              padrinos: Array.isArray(found.godparents) ? found.godparents.map(g=>g.name).join(', ') : (found.padrinos || found.godparents || ''), 
              ministro: found.ministro || found.minister || '',
              sexo: found.sexo || found.sex || 'MASCULINO',
              tipoUnionPadres: found.tipoUnionPadres || found.parentsUnionType || found.tipohijo || 'MATRIMONIO CATÓLICO',
              daFe: prev.daFe || found.daFe || found.ministerFaith || ''
          }));
      } else if (type === 'confirmacion') {
          searchParams = confirmacionSearch; setSearchError = setConfirmacionSearchError; setFound = setConfirmacionFound; setSearching = setConfirmacionSearching; getMethod = getConfirmations;
          mapNewPartida = (found) => setConfirmacionNewPartida(prev => ({ 
              ...prev, 
              fechaSacramento: found.fechaSacramento || found.sacramentDate || found.feccof || '', 
              nombres: found.nombres || found.firstName || '', 
              apellidos: found.apellidos || found.lastName || '', 
              fechaNacimiento: found.fechaNacimiento || found.birthDate || found.fecnac || '', 
              lugarNacimiento: found.lugarNacimiento || found.placeOfBirth || found.lugarn || '', 
              nombrePadre: found.nombrePadre || found.fatherName || found.padre || '', 
              nombreMadre: found.nombreMadre || found.motherName || found.madre || '', 
              padrinos: found.padrinos || found.godparents || found.padrino || '', 
              ministro: found.ministro || found.minister || '',
              daFe: prev.daFe || found.daFe || found.ministerFaith || ''
          }));
      } else {
          searchParams = matrimonioSearch; setSearchError = setMatrimonioSearchError; setFound = setMatrimonioFound; setSearching = setMatrimonioSearching; getMethod = getMatrimonios;
          mapNewPartida = (found) => setMatrimonioNewPartida(prev => ({ 
              ...prev, 
              fechaSacramento: found.fechaSacramento || found.fechaCelebracion || found.sacramentDate || '', 
              lugarMatrimonio: found.lugarMatrimonio || found.parroquia || '', 
              esposoNombres: found.esposoNombres || found.husbandName || '', 
              esposoApellidos: found.esposoApellidos || found.husbandSurname || '', 
              esposaNombres: found.esposaNombres || found.wifeName || '', 
              esposaApellidos: found.esposaApellidos || found.wifeSurname || '', 
              testigos: found.testigos || found.witnesses || '', 
              ministro: found.ministro || found.minister || '',
              daFe: prev.daFe || found.daFe || found.ministerFaith || ''
          }));
      }

      if (!searchParams.book || !searchParams.page || !searchParams.entry) {
          setSearchError("Ingrese Libro, Folio y Número para buscar.");
          return;
      }
      
      setSearching(true); setSearchError(null); setFound(null);

      setTimeout(() => {
          const allRecords = getMethod(user?.parishId);
          const found = allRecords.find(r => String(r.book_number || r.libro) === String(searchParams.book) && String(r.page_number || r.folio) === String(searchParams.page) && String(r.entry_number || r.numero) === String(searchParams.entry));

          if (found) {
              if (found.status === 'anulada' || found.isAnnulled) setSearchError("Esta partida ya se encuentra ANULADA.");
              else {
                  setFound(found);
                  mapNewPartida(found);
              }
          } else setSearchError("Partida no encontrada en los registros.");
          setSearching(false);
      }, 500);
  };

  // --- SUBMIT HANDLERS CON INYECCIÓN DEL ESTÁNDAR ---
  const handleSubmit = async (e, type) => {
      e.preventDefault();
      setIsSubmitting(true);
      const parishId = user.parishId;

      try {
          if (type === 'bautismo') {
              if (!bautismoDecree.numeroDecreto || !bautismoFound) throw new Error("Datos incompletos.");
              const baptismsKey = `baptisms_${parishId}`;
              const correctionsKey = `baptismCorrections_${parishId}`;
              const paramsKey = `baptismParameters_${parishId}`;
              
              const allBaptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              const existingCorrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newPartidaId = generateUUID();
              
              // Construimos el nuevo registro con nuestro Diccionario Unificado
              const newPartidaRecord = {
                  ...bautismoNewPartida, 
                  id: newPartidaId, 
                  parishId,
                  // Estándar Unificado
                  libro: params.suplementarioLibro,
                  folio: params.suplementarioFolio,
                  numero: params.suplementarioNumero,
                  // Legacy para compatibilidad de tablas
                  book_number: params.suplementarioLibro, 
                  page_number: params.suplementarioFolio, 
                  entry_number: params.suplementarioNumero,
                  firstName: bautismoNewPartida.nombres,
                  lastName: bautismoNewPartida.apellidos,
                  sacramentDate: bautismoNewPartida.fechaSacramento,
                  birthDate: bautismoNewPartida.fechaNacimiento,
                  sex: bautismoNewPartida.sexo,
                  fatherName: bautismoNewPartida.nombrePadre,
                  motherName: bautismoNewPartida.nombreMadre,
                  godparents: bautismoNewPartida.padrinos,
                  minister: bautismoNewPartida.ministro,
                  ministerFaith: bautismoNewPartida.daFe,
                  
                  status: 'seated', 
                  isSupplementary: true, 
                  correctionDecreeRef: bautismoDecree.numeroDecreto,
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId, 
                  tipoNotaAlMargen: 'porCorreccion.nuevaPartida', 
                  createdAt: new Date().toISOString()
              };

              const originalIndex = allBaptisms.findIndex(b => b.id === bautismoFound.id);
              if (originalIndex === -1) throw new Error("Partida original no encontrada.");
              
              const marginalNote = updateBaptismPartidaMarginalNote(bautismoFound.id, { numero: bautismoDecree.numeroDecreto, fecha: bautismoDecree.fechaDecreto, libro: newPartidaRecord.libro, folio: newPartidaRecord.folio }, null);
              
              allBaptisms[originalIndex] = {
                  ...allBaptisms[originalIndex], 
                  isAnnulled: true, 
                  status: 'anulada', 
                  annulmentDecree: bautismoDecree.numeroDecreto,
                  annulmentDate: bautismoDecree.fechaDecreto, 
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId,
                  tipoNotaAlMargen: 'porCorreccion.anulada', 
                  notaMarginal: marginalNote, 
                  updatedAt: new Date().toISOString()
              };

              allBaptisms.push(newPartidaRecord);
              existingCorrections.push({
                  id: generateUUID(), 
                  decreeNumber: bautismoDecree.numeroDecreto, 
                  decreeDate: bautismoDecree.fechaDecreto,
                  conceptoAnulacionId: bautismoDecree.conceptoAnulacionId, 
                  parroquia: user.parishName, 
                  targetName: `${bautismoFound.nombres || bautismoFound.firstName} ${bautismoFound.apellidos || bautismoFound.lastName}`,
                  book: bautismoFound.libro || bautismoFound.book_number, 
                  page: bautismoFound.folio || bautismoFound.page_number, 
                  entry: bautismoFound.numero || bautismoFound.entry_number,
                  originalPartidaId: bautismoFound.id, 
                  newPartidaId: newPartidaId,
                  originalPartidaSummary: { ...bautismoFound, book: bautismoFound.libro || bautismoFound.book_number, page: bautismoFound.folio || bautismoFound.page_number, entry: bautismoFound.numero || bautismoFound.entry_number },
                  newPartidaSummary: { ...newPartidaRecord, book: newPartidaRecord.libro, page: newPartidaRecord.folio, entry: newPartidaRecord.numero },
                  createdAt: new Date().toISOString()
              });

              localStorage.setItem(baptismsKey, JSON.stringify(allBaptisms));
              localStorage.setItem(correctionsKey, JSON.stringify(existingCorrections));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

          } else if (type === 'confirmacion') {
              if (!confirmacionDecree.numeroDecreto || !confirmacionFound) throw new Error("Datos incompletos.");
              const key = `confirmations_${parishId}`;
              const correctionsKey = `confirmationCorrections_${parishId}`;
              const paramsKey = `confirmationParameters_${parishId}`;
              
              const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              const existingCorrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newId = generateUUID();
              const newRecord = {
                  ...confirmacionNewPartida, 
                  id: newId, 
                  parishId,
                  libro: params.suplementarioLibro,
                  folio: params.suplementarioFolio,
                  numero: params.suplementarioNumero,
                  book_number: params.suplementarioLibro, page_number: params.suplementarioFolio, entry_number: params.suplementarioNumero,
                  firstName: confirmacionNewPartida.nombres,
                  lastName: confirmacionNewPartida.apellidos,
                  sacramentDate: confirmacionNewPartida.fechaSacramento,
                  birthDate: confirmacionNewPartida.fechaNacimiento,
                  fatherName: confirmacionNewPartida.nombrePadre,
                  motherName: confirmacionNewPartida.nombreMadre,
                  godparents: confirmacionNewPartida.padrinos,
                  minister: confirmacionNewPartida.ministro,
                  ministerFaith: confirmacionNewPartida.daFe,
                  status: 'seated', isSupplementary: true, correctionDecreeRef: confirmacionDecree.numeroDecreto,
                  conceptoAnulacionId: confirmacionDecree.conceptoAnulacionId, createdAt: new Date().toISOString()
              };

              const idx = allRecords.findIndex(r => r.id === confirmacionFound.id);
              if (idx === -1) throw new Error("Original no encontrada.");

              const note = `PARTIDA ANULADA POR DECRETO No. ${confirmacionDecree.numeroDecreto} DE FECHA ${confirmacionDecree.fechaDecreto}. VER LIBRO ${newRecord.libro} FOLIO ${newRecord.folio} NUMERO ${newRecord.numero}.`;
              
              allRecords[idx] = { ...allRecords[idx], isAnnulled: true, status: 'anulada', annulmentDecree: confirmacionDecree.numeroDecreto, annulmentDate: confirmacionDecree.fechaDecreto, notaMarginal: note, updatedAt: new Date().toISOString() };
              allRecords.push(newRecord);
              existingCorrections.push({
                  id: generateUUID(), decreeNumber: confirmacionDecree.numeroDecreto, decreeDate: confirmacionDecree.fechaDecreto,
                  conceptoAnulacionId: confirmacionDecree.conceptoAnulacionId, targetName: `${confirmacionFound.nombres || confirmacionFound.firstName} ${confirmacionFound.apellidos || confirmacionFound.lastName}`,
                  originalPartidaId: confirmacionFound.id, newPartidaId: newId, createdAt: new Date().toISOString()
              });

              localStorage.setItem(key, JSON.stringify(allRecords));
              localStorage.setItem(correctionsKey, JSON.stringify(existingCorrections));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));

          } else if (type === 'matrimonio') {
              if (!matrimonioDecree.numeroDecreto || !matrimonioFound) throw new Error("Datos incompletos.");
              const key = `matrimonios_${parishId}`;
              const correctionsKey = `marriageCorrections_${parishId}`;
              const paramsKey = `matrimonioParameters_${parishId}`;
              
              const allRecords = JSON.parse(localStorage.getItem(key) || '[]');
              let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
              const existingCorrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
              if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

              const newId = generateUUID();
              const newRecord = {
                  ...matrimonioNewPartida, 
                  id: newId, 
                  parishId,
                  libro: params.suplementarioLibro,
                  folio: params.suplementarioFolio,
                  numero: params.suplementarioNumero,
                  book_number: params.suplementarioLibro, page_number: params.suplementarioFolio, entry_number: params.suplementarioNumero,
                  husbandName: matrimonioNewPartida.esposoNombres,
                  husbandSurname: matrimonioNewPartida.esposoApellidos,
                  wifeName: matrimonioNewPartida.esposaNombres,
                  wifeSurname: matrimonioNewPartida.esposaApellidos,
                  sacramentDate: matrimonioNewPartida.fechaSacramento,
                  witnesses: matrimonioNewPartida.testigos,
                  minister: matrimonioNewPartida.ministro,
                  ministerFaith: matrimonioNewPartida.daFe,
                  status: 'celebrated', isSupplementary: true, correctionDecreeRef: matrimonioDecree.numeroDecreto,
                  conceptoAnulacionId: matrimonioDecree.conceptoAnulacionId, createdAt: new Date().toISOString()
              };

              const idx = allRecords.findIndex(r => r.id === matrimonioFound.id);
              if (idx === -1) throw new Error("Original no encontrada.");

              const note = `MATRIMONIO ANULADO POR DECRETO No. ${matrimonioDecree.numeroDecreto} DE FECHA ${matrimonioDecree.fechaDecreto}. VER LIBRO ${newRecord.libro} FOLIO ${newRecord.folio} NUMERO ${newRecord.numero}.`;
              
              allRecords[idx] = { ...allRecords[idx], isAnnulled: true, status: 'anulada', annulmentDecree: matrimonioDecree.numeroDecreto, annulmentDate: matrimonioDecree.fechaDecreto, notaMarginal: note, updatedAt: new Date().toISOString() };
              allRecords.push(newRecord);
              existingCorrections.push({
                  id: generateUUID(), decreeNumber: matrimonioDecree.numeroDecreto, decreeDate: matrimonioDecree.fechaDecreto,
                  conceptoAnulacionId: matrimonioDecree.conceptoAnulacionId, targetName: `${matrimonioFound.esposoApellidos || matrimonioFound.husbandSurname} - ${matrimonioFound.esposaApellidos || matrimonioFound.wifeSurname}`,
                  originalPartidaId: matrimonioFound.id, newPartidaId: newId, createdAt: new Date().toISOString()
              });

              localStorage.setItem(key, JSON.stringify(allRecords));
              localStorage.setItem(correctionsKey, JSON.stringify(existingCorrections));
              localStorage.setItem(paramsKey, JSON.stringify({ ...params, suplementarioNumero: incrementPaddedValue(params.suplementarioNumero) }));
          }

          setIsSuccess(true);
          toast({ title: "Corrección Exitosa", description: "Se ha anulado la partida original y creado la supletoria.", className: "bg-green-50 border-green-200 text-green-900" });
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Decreto de Corrección Registrado</h2>
                <p className="text-gray-700 mb-8 font-medium">La partida anterior ha sido anulada y se ha generado la nueva partida supletoria de acuerdo al estándar unificado.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => navigate('/parroquia/decretos/ver-correcciones')} variant="outline">Ver Lista</Button>
                    <Button onClick={() => window.location.reload()} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold">Nuevo Decreto</Button>
                </div>
            </div>
        </DashboardLayout>
      );
  }

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

  const renderSearchSection = (search, setSearch, handleSearch, isSearching, error, found, type) => (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
          <h3 className="font-bold text-gray-700 text-sm uppercase mb-4 border-b border-gray-300 pb-2 flex items-center gap-2"><Search className="w-4 h-4"/> 2. Seleccionar Partida Anulada</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
              {['book', 'page', 'entry'].map(field => (
                  <div key={field} className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{field === 'book' ? 'Libro' : field === 'page' ? 'Folio' : 'Número'}</label>
                      <Input name={field} value={search[field]} onChange={(e) => setSearch({ ...search, [field]: e.target.value })} placeholder={field === 'book' ? 'Libro' : field === 'page' ? 'Folio' : 'Número'} />
                  </div>
              ))}
              <Button type="button" onClick={() => handleSearch(type)} disabled={isSearching} className="bg-[#4B7BA7] hover:bg-[#3B6B97] text-white w-full md:w-auto">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : "Buscar"}
              </Button>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
          {found && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-2 flex justify-between items-start">
                  <div className="text-sm">
                      {type === 'matrimonio' ? (
                          <><div><span className="font-bold">Esposos:</span> {found.esposoNombres || found.husbandName} & {found.esposaNombres || found.wifeName}</div>
                          <div><span className="font-bold">Fecha:</span> {found.fechaSacramento || found.sacramentDate || found.fechaCelebracion}</div></>
                      ) : (
                          <><div><span className="font-bold">Nombre:</span> {found.nombres || found.firstName} {found.apellidos || found.lastName}</div>
                          <div><span className="font-bold">Fecha:</span> {found.fechaSacramento || found.sacramentDate || found.fecbau || found.feccof}</div></>
                      )}
                  </div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Seleccionada</div>
              </div>
          )}
      </div>
  );

  const renderConceptSection = (decree, setDecree) => (
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 shadow-sm mb-6">
          <h3 className="font-bold text-purple-800 text-sm uppercase mb-4 border-b border-purple-300 pb-2 flex items-center gap-2"><Info className="w-4 h-4"/> 3. Concepto de Anulación</h3>
          <select name="conceptoAnulacionId" value={decree.conceptoAnulacionId} onChange={(e) => setDecree({ ...decree, conceptoAnulacionId: e.target.value })} className="w-full rounded-md border border-purple-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Seleccionar Concepto</option>
              {conceptos.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.concepto}</option>)}
          </select>
      </div>
  );

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Nuevo Decreto de Corrección</h1>
            <p className="text-gray-600 font-medium text-sm">Registro de correcciones a partidas existentes (Anulación + Partida Supletoria).</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-5xl mx-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmacion" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonio" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">Matrimonios</TabsTrigger>
                </TabsList>

                {/* BAUTISMO TAB */}
                <TabsContent value="bautismo">
                    <form onSubmit={(e) => handleSubmit(e, 'bautismo')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(bautismoDecree, setBautismoDecree)}
                        {renderSearchSection(bautismoSearch, setBautismoSearch, handleSearch, bautismoSearching, bautismoSearchError, bautismoFound, 'bautismo')}
                        {renderConceptSection(bautismoDecree, setBautismoDecree)}
                        
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200 shadow-sm">
                            <h3 className="font-bold text-green-800 text-sm uppercase mb-4 border-b border-green-300 pb-2 flex items-center gap-2"><UserPlus className="w-4 h-4"/> 4. Datos de Nueva Partida (Supletorio)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Bautismo *</label><Input type="date" value={bautismoNewPartida.fechaSacramento} onChange={e => setBautismoNewPartida({...bautismoNewPartida, fechaSacramento: e.target.value})} className="bg-white" /></div>
                                <div className="hidden md:block"></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Nombres *</label><Input value={bautismoNewPartida.nombres} onChange={e => setBautismoNewPartida({...bautismoNewPartida, nombres: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Apellidos *</label><Input value={bautismoNewPartida.apellidos} onChange={e => setBautismoNewPartida({...bautismoNewPartida, apellidos: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Nacimiento</label><Input type="date" value={bautismoNewPartida.fechaNacimiento} onChange={e => setBautismoNewPartida({...bautismoNewPartida, fechaNacimiento: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Lugar Nacimiento</label><Input value={bautismoNewPartida.lugarNacimiento} onChange={e => setBautismoNewPartida({...bautismoNewPartida, lugarNacimiento: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Sexo</label>
                                    <select value={bautismoNewPartida.sexo} onChange={e => setBautismoNewPartida({...bautismoNewPartida, sexo: e.target.value})} className="w-full bg-white border border-gray-300 rounded-md p-2">
                                        <option value="MASCULINO">Masculino</option>
                                        <option value="FEMENINO">Femenino</option>
                                    </select>
                                </div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Tipo de Unión</label>
                                    <select value={bautismoNewPartida.tipoUnionPadres} onChange={e => setBautismoNewPartida({...bautismoNewPartida, tipoUnionPadres: e.target.value})} className="w-full bg-white border border-gray-300 rounded-md p-2">
                                        <option value="MATRIMONIO CATÓLICO">Matrimonio Católico</option>
                                        <option value="MATRIMONIO CIVIL">Matrimonio Civil</option>
                                        <option value="UNIÓN LIBRE">Unión Libre</option>
                                        <option value="MADRE SOLTERA">Madre Soltera</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padre</label><Input value={bautismoNewPartida.nombrePadre} onChange={e => setBautismoNewPartida({...bautismoNewPartida, nombrePadre: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Madre</label><Input value={bautismoNewPartida.nombreMadre} onChange={e => setBautismoNewPartida({...bautismoNewPartida, nombreMadre: e.target.value})} className="bg-white" /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padrinos</label><Input value={bautismoNewPartida.padrinos} onChange={e => setBautismoNewPartida({...bautismoNewPartida, padrinos: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Ministro</label><Input value={bautismoNewPartida.ministro} onChange={e => setBautismoNewPartida({...bautismoNewPartida, ministro: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Da Fe</label><Input value={bautismoNewPartida.daFe} onChange={e => setBautismoNewPartida({...bautismoNewPartida, daFe: e.target.value})} className="bg-white" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </form>
                </TabsContent>

                {/* CONFIRMACION TAB */}
                <TabsContent value="confirmacion">
                    <form onSubmit={(e) => handleSubmit(e, 'confirmacion')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(confirmacionDecree, setConfirmacionDecree)}
                        {renderSearchSection(confirmacionSearch, setConfirmacionSearch, handleSearch, confirmacionSearching, confirmacionSearchError, confirmacionFound, 'confirmacion')}
                        {renderConceptSection(confirmacionDecree, setConfirmacionDecree)}
                        
                        <div className="bg-red-50 p-6 rounded-lg border border-red-200 shadow-sm">
                            <h3 className="font-bold text-red-800 text-sm uppercase mb-4 border-b border-red-300 pb-2 flex items-center gap-2"><UserPlus className="w-4 h-4"/> 4. Datos de Nueva Partida (Supletorio)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Confirmación *</label><Input type="date" value={confirmacionNewPartida.fechaSacramento} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, fechaSacramento: e.target.value})} className="bg-white" /></div>
                                <div className="hidden md:block"></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Nombres *</label><Input value={confirmacionNewPartida.nombres} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, nombres: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Apellidos *</label><Input value={confirmacionNewPartida.apellidos} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, apellidos: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Nacimiento</label><Input type="date" value={confirmacionNewPartida.fechaNacimiento} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, fechaNacimiento: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Lugar Nacimiento</label><Input value={confirmacionNewPartida.lugarNacimiento} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, lugarNacimiento: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padre</label><Input value={confirmacionNewPartida.nombrePadre} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, nombrePadre: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Madre</label><Input value={confirmacionNewPartida.nombreMadre} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, nombreMadre: e.target.value})} className="bg-white" /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Padrinos</label><Input value={confirmacionNewPartida.padrinos} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, padrinos: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Ministro</label><Input value={confirmacionNewPartida.ministro} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, ministro: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Da Fe</label><Input value={confirmacionNewPartida.daFe} onChange={e => setConfirmacionNewPartida({...confirmacionNewPartida, daFe: e.target.value})} className="bg-white" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                             <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                             <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold"><Save className="w-4 h-4 mr-2" /> Guardar Decreto</Button>
                        </div>
                    </form>
                </TabsContent>

                {/* MATRIMONIO TAB */}
                <TabsContent value="matrimonio">
                    <form onSubmit={(e) => handleSubmit(e, 'matrimonio')} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderDecreeSection(matrimonioDecree, setMatrimonioDecree)}
                        {renderSearchSection(matrimonioSearch, setMatrimonioSearch, handleSearch, matrimonioSearching, matrimonioSearchError, matrimonioFound, 'matrimonio')}
                        {renderConceptSection(matrimonioDecree, setMatrimonioDecree)}
                        
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 shadow-sm">
                            <h3 className="font-bold text-purple-800 text-sm uppercase mb-4 border-b border-purple-300 pb-2 flex items-center gap-2"><Heart className="w-4 h-4"/> 4. Datos de Nueva Partida (Supletorio)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Fecha Matrimonio *</label><Input type="date" value={matrimonioNewPartida.fechaSacramento} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, fechaSacramento: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Lugar Matrimonio</label><Input value={matrimonioNewPartida.lugarMatrimonio} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, lugarMatrimonio: e.target.value})} className="bg-white" /></div>
                                
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposo Nombres</label><Input value={matrimonioNewPartida.esposoNombres} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, esposoNombres: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposo Apellidos</label><Input value={matrimonioNewPartida.esposoApellidos} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, esposoApellidos: e.target.value})} className="bg-white" /></div>
                                
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposa Nombres</label><Input value={matrimonioNewPartida.esposaNombres} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, esposaNombres: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Esposa Apellidos</label><Input value={matrimonioNewPartida.esposaApellidos} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, esposaApellidos: e.target.value})} className="bg-white" /></div>
                                
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Testigos</label><Input value={matrimonioNewPartida.testigos} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, testigos: e.target.value})} className="bg-white" /></div>
                                
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Ministro</label><Input value={matrimonioNewPartida.ministro} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, ministro: e.target.value})} className="bg-white" /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-700 uppercase">Da Fe</label><Input value={matrimonioNewPartida.daFe} onChange={e => setMatrimonioNewPartida({...matrimonioNewPartida, daFe: e.target.value})} className="bg-white" /></div>
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

export default NewDecreeCorrection;
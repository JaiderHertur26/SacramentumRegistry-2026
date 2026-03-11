import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';
import { Search, Edit, Trash2, ArrowUpDown, FileX2, Info, CheckCircle as CircleCheckBig, XCircle, FileText, Eye, AlertOctagon, BookOpen } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import BaptismPartidaValidator from '@/components/BaptismPartidaValidator';
import { normalizeBaptismPartida, enrichBaptismPartidaWithAuxiliaryData } from '@/utils/baptismDataNormalizer';
import ReadingSummaryPanel from '@/components/ReadingSummaryPanel';
import ViewBaptismPartidaModal from '@/components/modals/ViewBaptismPartidaModal';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters'; // <-- Importado para calcular la fecha al vuelo

// --- HELPERS ESTANDARIZADOS ---
const convertirSexo = (sexoCode) => {
    if (sexoCode == 1 || String(sexoCode).toUpperCase().includes('MASC')) return 'MASCULINO';
    if (sexoCode == 2 || String(sexoCode).toUpperCase().includes('FEM')) return 'FEMENINO';
    return 'NO ESPECIFICADO';
};

const convertirTipoHijo = (tipoHijo) => {
    if (!tipoHijo) return 'NO ESPECIFICADO';
    const tipo = String(tipoHijo).toUpperCase();
    if (tipo === '1' || tipo.includes('CATÓLICO') || tipo.includes('CATOLICO')) return 'MATRIMONIO CATÓLICO';
    if (tipo === '2' || tipo.includes('CIVIL')) return 'MATRIMONIO CIVIL';
    if (tipo === '3' || tipo.includes('LIBRE')) return 'UNIÓN LIBRE';
    if (tipo === '4' || tipo.includes('SOLTERA')) return 'MADRE SOLTERA';
    if (tipo === '5' || tipo === 'OTRO') return 'OTRO';
    return tipo; 
};

// --- INFO BOX (AHORA INTELIGENTE CON NOTAS ESTÁNDAR) ---
const InfoBox = ({ data, replacementDecree, notasConfig }) => {
    if (!data) return null;
    
    const isReplacement = data.type === 'replacement' || data.createdByDecree === 'replacement' || data.newBaptismIdRepo || data.creadoPorDecreto;
    
    // --- MÁQUINA DE ESTADOS VISUAL PARA LA NOTA MARGINAL ---
    let rawMarginText = "";
    let isStandard = false;

    if (data.notaMarginal) {
        rawMarginText = data.notaMarginal;
    } else if (data.marginNote && data.marginNote.text) {
        rawMarginText = data.marginNote.text;
    } else if (data.status === 'anulada' || data.isAnnulled || data.estado === 'anulada') {
        rawMarginText = notasConfig?.porCorreccion?.anulada || "";
    } else {
        // Si no tiene alteraciones, toma la estándar
        rawMarginText = notasConfig?.estandar || "";
        isStandard = true;
    }

    // Calcular la fecha de hoy para el tag [FECHA_EXPEDICION]
    const todayStr = new Date().toISOString().split('T')[0];
    const todayText = convertDateToSpanishText(todayStr).replace(/^EL\s+/i, '');
    const finalNote = rawMarginText.replace(/\[FECHA_EXPEDICION\]/g, todayText).trim().toUpperCase();
    const showNote = !!finalNote && finalNote !== "";

    return (
        <div className="mt-8 border border-blue-200 rounded-lg overflow-hidden shadow-sm bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#4B7BA7] to-[#2a4e70] px-6 py-3 border-b border-blue-800 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                   <Info className="w-5 h-5 text-blue-200" />
                   Detalles Completos del Registro Permanente
                </h3>
                {isReplacement && <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded border border-yellow-600 shadow-sm flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> Creada por Decreto</span>}
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Libro / Folio / Número</span>
                     <span className="text-base font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block font-mono">
                         {data.libro || data.book_number || data.numeroLibro || '-'} / {data.folio || data.page_number || '-'} / {data.numero || data.entry_number || data.numeroActa || '-'}
                     </span>
                 </div>
                 
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Fecha Bautismo</span>
                     <span className="text-base font-medium text-gray-800">{data.fechaSacramento || data.sacramentDate || data.fecbau || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Lugar Bautismo</span>
                     <span className="text-base font-medium text-gray-800 truncate" title={data.lugarBautismo || data.lugarBautismoDetalle}>{data.lugarBautismo || data.lugarBautismoDetalle || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Ministro</span>
                     <span className="text-base font-medium text-gray-800 truncate" title={data.ministro || data.minister}>{data.ministro || data.minister || '-'}</span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Apellidos</span>
                     <span className="text-base font-bold text-gray-900 uppercase">{data.apellidos || data.lastName}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nombres</span>
                     <span className="text-base font-bold text-gray-900 uppercase">{data.nombres || data.firstName}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Sexo</span>
                     <span className="text-base font-medium text-gray-800">{convertirSexo(data.sexo || data.sex)}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Fecha Nacimiento</span>
                     <span className="text-base font-medium text-gray-800">{data.fechaNacimiento || data.birthDate || data.fecnac || '-'}</span>
                 </div>
                 <div className="space-y-1 md:col-span-2">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Lugar Nacimiento</span>
                     <span className="text-base font-medium text-gray-800">{data.lugarNacimiento || data.lugarNacimientoDetalle || data.birthPlace || data.lugnac || '-'}</span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Padre</span>
                     <span className="text-base font-medium text-gray-800">{data.nombrePadre || data.fatherName || data.padre || 'NO REGISTRADO'}</span>
                     {(data.cedulaPadre || data.fatherId || data.cedupad) && <span className="text-xs text-gray-500 block">C.C. {data.cedulaPadre || data.fatherId || data.cedupad}</span>}
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Madre</span>
                     <span className="text-base font-medium text-gray-800">{data.nombreMadre || data.motherName || data.madre || 'NO REGISTRADO'}</span>
                     {(data.cedulaMadre || data.motherId || data.cedumad) && <span className="text-xs text-gray-500 block">C.C. {data.cedulaMadre || data.motherId || data.cedumad}</span>}
                 </div>
                 <div className="space-y-1 md:col-span-2">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Tipo de Unión</span>
                     <span className="text-base font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded inline-block">
                         {convertirTipoHijo(data.tipoUnionPadres || data.parentsUnionType || data.tipohijo)}
                     </span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Abuelos Paternos</span>
                     <span className="text-sm text-gray-800">{data.abuelosPaternos || data.paternalGrandparents || data.abuepat || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Abuelos Maternos</span>
                     <span className="text-sm text-gray-800">{data.abuelosMaternos || data.maternalGrandparents || data.abuemat || '-'}</span>
                 </div>
                 <div className="space-y-1 col-span-2">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Padrinos</span>
                     <span className="text-sm text-gray-800">{data.padrinos || data.godparents || '-'}</span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Serial Reg. Civil</span>
                     <span className="text-base font-medium text-gray-800">{data.serialRegistro || data.registrySerial || data.regciv || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">NUIP / NUIT</span>
                     <span className="text-base font-medium text-gray-800">{data.nuip || data.nuipNuit || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Oficina Registro</span>
                     <span className="text-base font-medium text-gray-800">{data.oficinaRegistro || data.registryOffice || data.notaria || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Fecha Expedición</span>
                     <span className="text-base font-medium text-gray-800">{data.fechaExpedicionRegistro || data.registryDate || data.fecregis || '-'}</span>
                 </div>

                 {/* Notas Marginales - Ahora soporta la visualización de la Estándar en color Azul */}
                 {showNote && (
                    <div className={`col-span-full mt-4 border-t pt-4 p-4 rounded border shadow-inner ${isStandard ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isStandard ? 'text-blue-800' : 'text-yellow-800'}`}>
                            <BookOpen className="w-5 h-5" /> Nota Marginal {isStandard ? '(Estándar)' : 'Activa'}
                        </h4>
                        
                        <div className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${isStandard ? 'text-blue-900' : 'text-yellow-900'}`}>
                            <p className="mb-2">{finalNote}</p>
                            
                            {/* Solo mostramos fecha de aplicación manual si es una nota inyectada (No estándar) */}
                            {!isStandard && data.marginNote && data.marginNote.appliedDate && (
                                <p className="text-xs opacity-80 mt-2 border-t border-yellow-300 pt-2">
                                    <strong>Aplicado el:</strong> {data.marginNote.appliedDate || '-'} | <strong>Decreto No:</strong> {data.marginNote.appliedByDecree || '-'}
                                </p>
                            )}
                        </div>
                    </div>
                 )}
            </div>
            <div className="px-6 pb-6 pt-0">
               <BaptismPartidaValidator rawData={data} />
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const BaptismPartidasPage = () => {
  const { user } = useAuth();
  const { getMisDatosList, getDecreeReplacementByNewBaptismId, getBaptisms, obtenerNotasAlMargen } = useAppData();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null); 
  const [selectedPartida, setSelectedPartida] = useState(null); 
  const [sortConfig, setSortConfig] = useState({ key: 'numero', direction: 'desc' });
  const [parishPrintData, setParishPrintData] = useState({});
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReadingPanelOpen, setIsReadingPanelOpen] = useState(false);
  const [selectedReadingRecord, setSelectedReadingRecord] = useState(null);
  const [replacementDecree, setReplacementDecree] = useState(null);
  const [notasConfig, setNotasConfig] = useState(null);

  useEffect(() => {
    loadData();
    loadParishData();
    if (user?.parishId) {
        setNotasConfig(obtenerNotasAlMargen(user.parishId));
    }
  }, [user]);

  // Si se selecciona un decreto de reposición, buscar su info
  useEffect(() => {
      if (selectedPartida && selectedPartida.newBaptismIdRepo) {
          const decree = getDecreeReplacementByNewBaptismId(selectedPartida.newBaptismIdRepo, user?.parishId);
          setReplacementDecree(decree);
      } else {
          setReplacementDecree(null);
      }
  }, [selectedPartida, user]);

  // Escuchar cambios en localStorage para actualizar la tabla si hay asientamientos en otra pestaña
  useEffect(() => {
      const handleStorageChange = (e) => {
          if (e.key === `baptisms_${user?.parishId}`) {
              loadData();
          }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.parishId]);

  const loadParishData = () => {
    if (!user?.parishId) return;
    try {
        const misDatos = getMisDatosList(user.parishId);
        if (misDatos && misDatos.length > 0) {
            setParishPrintData(misDatos[0]);
        }
    } catch (err) {
        console.error("Error loading parish data:", err);
    }
  };

  const loadData = async () => {
    if (!user?.parishId && !user?.dioceseId) return;
    setIsLoading(true);
    const entityId = user.parishId || user.dioceseId;
    
    try {
        const permanentRecords = await getBaptisms(entityId) || [];
        const sanitizedData = permanentRecords.map(record => ({
            ...record,
            padrinos: record.padrinos || record.godparents || [] 
        }));
        setRecords(sanitizedData);
        
        // Refrescar el panel lateral si el registro seleccionado cambió
        if (selectedPartida) {
            const updatedSelected = sanitizedData.find(r => String(r.id) === String(selectedPartida.id));
            if (updatedSelected) {
                setSelectedPartida(updatedSelected);
            } else {
                setSelectedPartida(null); // Se eliminó
            }
        }
    } catch (error) {
        console.error("Error loading baptisms:", error);
        toast({ title: "Error", description: "No se pudieron cargar los registros permanentes.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const parseSortDate = (dateStr) => {
      if (!dateStr) return 0;
      if (dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          return new Date(`${y}-${m}-${d}`).getTime();
      }
      return new Date(dateStr).getTime();
  };

  const sortedRecords = [...records].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (sortConfig.key === 'numero') {
         aValue = (parseInt(a.libro || a.book_number || a.numeroLibro || 0) * 1000000) + (parseInt(a.folio || a.page_number || 0) * 1000) + parseInt(a.numero || a.entry_number || a.numeroActa || 0);
         bValue = (parseInt(b.libro || b.book_number || b.numeroLibro || 0) * 1000000) + (parseInt(b.folio || b.page_number || 0) * 1000) + parseInt(b.numero || b.entry_number || b.numeroActa || 0);
      } else if (sortConfig.key === 'fechaSacramento') {
          aValue = parseSortDate(a.fechaSacramento || a.sacramentDate || a.fecbau);
          bValue = parseSortDate(b.fechaSacramento || b.sacramentDate || b.fecbau);
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const filteredRecords = sortedRecords.filter(r => {
    const term = searchTerm.toLowerCase();
    const nombres = (r.nombres || r.firstName || '').toLowerCase();
    const apellidos = (r.apellidos || r.lastName || '').toLowerCase();
    const nombrePadre = (r.nombrePadre || r.fatherName || r.padre || '').toLowerCase();
    const nombreMadre = (r.nombreMadre || r.motherName || r.madre || '').toLowerCase();
    
    // Búsqueda en libro, folio o número (Ej: "1:25:3")
    const archivo = `${r.libro || r.book_number || ''}:${r.folio || r.page_number || ''}:${r.numero || r.entry_number || ''}`;
    
    return nombres.includes(term) || apellidos.includes(term) || nombrePadre.includes(term) || nombreMadre.includes(term) || archivo.includes(term);
  });

  const handleDelete = (id, e) => {
      e?.stopPropagation();
      if (window.confirm("¿Está seguro de eliminar este registro permanente? Esta acción no se puede deshacer.")) {
          const entityId = user.parishId || user.dioceseId;
          const key = `baptisms_${entityId}`; 
          
          try {
              const currentRecords = JSON.parse(localStorage.getItem(key) || '[]');
              const updatedRecords = currentRecords.filter(r => String(r.id) !== String(id));
              
              localStorage.setItem(key, JSON.stringify(updatedRecords));
              setRecords(updatedRecords);
              
              if (String(selectedPartida?.id) === String(id)) setSelectedPartida(null);
              toast({ title: "Registro eliminado", description: "El bautismo ha sido eliminado correctamente de la base permanente." });
          } catch(err) {
              toast({ title: "Error", description: "Ocurrió un error al eliminar el registro.", variant: "destructive" });
          }
      }
  };

  const handleEdit = (id, e) => {
      e?.stopPropagation();
      navigate(`/parroquia/bautismo/editar?id=${id}`);
  };

  const handleViewClick = (row, e) => {
      e?.stopPropagation();
      openViewModal(row);
  };

  const openViewModal = (row) => {
      const normalizedRecord = normalizeBaptismPartida(row);
      const enrichedRecord = enrichBaptismPartidaWithAuxiliaryData(normalizedRecord, parishPrintData);
      
      if (row.marginNote) enrichedRecord.marginNote = row.marginNote;
      if (row.type) enrichedRecord.type = row.type;
      if (row.createdByDecree || row.creadoPorDecreto) enrichedRecord.createdByDecree = row.createdByDecree || row.creadoPorDecreto;
      
      setSelectedRecord(enrichedRecord);
      setIsViewModalOpen(true);
  };

  const columns = [
    { 
        header: <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('numero')}>Archivo <ArrowUpDown className="w-3 h-3 ml-1" /></div>,
        render: (row) => {
             const isReplacement = row.type === 'replacement' || row.createdByDecree === 'replacement' || row.newBaptismIdRepo || row.creadoPorDecreto;
             return (
                 <div className="flex flex-col items-start gap-1">
                     <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-700">L:{row.libro || row.book_number || row.numeroLibro || '-'} F:{row.folio || row.page_number || '-'} N:{row.numero || row.entry_number || row.numeroActa || '-'}</span>
                     {isReplacement && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200" title={row.marginNote?.appliedByDecree ? `Decreto: ${row.marginNote.appliedByDecree}` : 'Creado por Decreto'}>DECRETO</span>}
                 </div>
             );
        }
    },
    { 
        header: <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('apellidos')}>Apellidos <ArrowUpDown className="w-3 h-3 ml-1" /></div>,
        render: (row) => <span className="font-semibold text-gray-900 uppercase">{row.apellidos || row.lastName}</span> 
    },
    { 
        header: 'Nombres', 
        render: (row) => <span className="text-gray-800 uppercase">{row.nombres || row.firstName}</span> 
    },
    { 
        header: <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('fechaSacramento')}>Fecha Bautismo <ArrowUpDown className="w-3 h-3 ml-1" /></div>,
        render: (row) => {
            let displayDate = row.fechaSacramento || row.sacramentDate || row.fecbau;
            if (displayDate && !displayDate.includes('/')) {
                const d = new Date(displayDate);
                if (!isNaN(d.getTime())) displayDate = d.toLocaleDateString();
            }
            return <span className="text-gray-600 text-sm">{displayDate || '-'}</span>;
        }
    },
    { header: 'Lugar Bautismo', render: (row) => <span className="text-xs text-gray-600 truncate max-w-[120px] inline-block">{row.lugarBautismo || row.lugarBautismoDetalle || row.lugbau || '-'}</span> },
    { header: 'Padres', render: (row) => <span className="text-xs text-gray-600 truncate max-w-[150px] inline-block" title={`${row.nombrePadre || row.fatherName || row.padre} / ${row.nombreMadre || row.motherName || row.madre}`}>{row.nombrePadre || row.fatherName || row.padre || '---'} / {row.nombreMadre || row.motherName || row.madre || '---'}</span> },
    { header: 'Sexo', render: (row) => <span className="text-xs text-gray-600">{convertirSexo(row.sexo || row.sex)}</span> },
  ];

  if (isLoading) {
    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex justify-center items-center h-64"><p className="text-gray-500 font-medium">Cargando base de datos permanente...</p></div>
        </DashboardLayout>
    );
  }

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#4B7BA7] font-serif flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Partidas Permanentes
            </h1>
            <p className="text-gray-600 mt-1">Consulte, edite e imprima los registros de bautismo oficiales (asentados).</p>
        </div>
        <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-sm font-medium text-gray-600 shadow-sm">Total Registros: {filteredRecords.length}</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex gap-4">
         <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por archivo (1:45:12), apellidos, nombres o padres..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900 placeholder:text-gray-400 font-medium transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </div>

      {filteredRecords.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
             <FileX2 className="w-12 h-12 mb-3 text-gray-300" />
             <p className="font-medium text-lg">No se encontraron registros</p>
             <p className="text-sm">No hay resultados en la base de datos permanente para su búsqueda.</p>
         </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Table 
                columns={columns} 
                data={filteredRecords} 
                onRowClick={(row) => setSelectedPartida(row)}
                actions={[
                    { label: <Eye className="w-4 h-4" />, type: 'view', onClick: (row, e) => handleViewClick(row, e), className: "text-[#D4AF37] hover:bg-yellow-50 p-2 rounded-full transition-colors", title: "Visualizar Partida" },
                    { 
                        label: (row) => {
                            const isAnnulled = row.status === 'anulada' || row.isAnnulled || row.estado === 'anulada';
                            return isAnnulled ? <XCircle className="w-4 h-4" /> : <CircleCheckBig className="w-4 h-4" />;
                        },
                        icon: (row) => {
                             const isAnnulled = row.status === 'anulada' || row.isAnnulled || row.estado === 'anulada';
                             return isAnnulled ? XCircle : CircleCheckBig;
                        },
                        type: 'status', 
                        className: (row) => {
                            const isAnnulled = row.status === 'anulada' || row.isAnnulled || row.estado === 'anulada';
                            return `p-2 rounded-full h-9 w-9 flex items-center justify-center cursor-default ${
                                isAnnulled ? 'text-red-500' : 'text-green-500'
                            }`;
                        }, 
                        title: (row) => {
                            const isAnnulled = row.status === 'anulada' || row.isAnnulled || row.estado === 'anulada';
                            return isAnnulled ? "Partida Anulada" : "Partida Correcta";
                        },
                        onClick: null,
                        disabled: true
                    },
                    { label: <Edit className="w-4 h-4" />, type: 'edit', onClick: (row, e) => handleEdit(row.id, e), className: "text-[#4B7BA7] hover:bg-blue-50 p-2 rounded-full transition-colors", title: "Editar Registro" },
                    { label: <Trash2 className="w-4 h-4" />, type: 'delete', onClick: (row, e) => handleDelete(row.id, e), className: "text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors", title: "Eliminar Registro" }
                ]}
            />
        </div>
      )}

      {/* DETALLES DE LA PARTIDA SELECCIONADA */}
      <InfoBox data={selectedPartida} replacementDecree={replacementDecree} notasConfig={notasConfig} />

      <ViewBaptismPartidaModal 
          isOpen={isViewModalOpen} 
          onClose={() => { setIsViewModalOpen(false); setSelectedRecord(null); }} 
          partida={selectedRecord} 
          auxiliaryData={parishPrintData} 
      />
      
      <ReadingSummaryPanel 
          isOpen={isReadingPanelOpen} 
          onClose={() => { setIsReadingPanelOpen(false); setSelectedReadingRecord(null); }} 
          data={selectedReadingRecord} 
          sacramentType="baptism" 
      />

    </DashboardLayout>
  );
};

export default BaptismPartidasPage;
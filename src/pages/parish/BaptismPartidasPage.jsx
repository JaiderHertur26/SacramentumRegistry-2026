
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

const convertirSexo = (sexoCode) => {
    if (sexoCode == 1 || sexoCode === '1') return 'MASCULINO';
    if (sexoCode == 2 || sexoCode === '2') return 'FEMENINO';
    if (sexoCode === 'MASCULINO' || sexoCode === 'FEMENINO') return sexoCode;
    return 'NO ESPECIFICADO';
};

const convertirTipoHijo = (tipoHijo) => {
    if (tipoHijo == 1 || tipoHijo === '1') return 'MATRIMONIO CATÓLICO';
    if (tipoHijo == 2 || tipoHijo === '2') return 'MATRIMONIO CIVIL';
    if (tipoHijo == 3 || tipoHijo === '3') return 'UNIÓN LIBRE';
    if (tipoHijo == 4 || tipoHijo === '4') return 'MADRE SOLTERA';
    if (tipoHijo == 5 || tipoHijo === '5') return 'OTRO';
    const valid = ['MATRIMONIO CATÓLICO', 'MATRIMONIO CIVIL', 'UNIÓN LIBRE', 'MADRE SOLTERA', 'OTRO'];
    if (valid.includes(tipoHijo)) return tipoHijo;
    return 'NO ESPECIFICADO';
};

const InfoBox = ({ data, replacementDecree }) => {
    if (!data) return null;
    
    const isReplacement = data.type === 'replacement' || data.createdByDecree === 'replacement' || data.newBaptismIdRepo;
    const hasMarginNote = !!data.marginNote || !!data.notaMarginal || !!data.notaAlMargen;

    return (
        <div className="mt-8 border border-blue-200 rounded-lg overflow-hidden shadow-sm bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#4B7BA7] to-[#2a4e70] px-6 py-3 border-b border-blue-800 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                   <Info className="w-5 h-5 text-blue-200" />
                   Detalles Completos del Registro
                </h3>
                {isReplacement && <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded border border-yellow-600 shadow-sm flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> Creada por Decreto de Reposición</span>}
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Libro / Folio / Número</span>
                     <span className="text-base font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block font-mono">
                         {data.book_number || data.book} / {data.page_number || data.page} / {data.entry_number || data.entry}
                     </span>
                 </div>
                 
                 {/* Bautismo Info */}
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Fecha Bautismo</span>
                     <span className="text-base font-medium text-gray-800">{data.sacramentDate || data.fecbau || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Lugar Bautismo (Detalle)</span>
                     <span className="text-base font-medium text-gray-800 truncate" title={data.lugarBautismoDetalle || data.lugarBautismo}>{data.lugarBautismoDetalle || data.lugarBautismo || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Ministro</span>
                     <span className="text-base font-medium text-gray-800 truncate" title={data.minister || data.ministro}>{data.minister || data.ministro || '-'}</span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 {/* Persona Info */}
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Apellidos</span>
                     <span className="text-base font-bold text-gray-900">{data.lastName || data.apellidos}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nombres</span>
                     <span className="text-base font-bold text-gray-900">{data.firstName || data.nombres}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Sexo</span>
                     <span className="text-base font-medium text-gray-800">{convertirSexo(data.sex || data.sexo)}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Fecha Nacimiento</span>
                     <span className="text-base font-medium text-gray-800">{data.birthDate || data.fecnac || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Lugar Nacimiento (Detalle)</span>
                     <span className="text-base font-medium text-gray-800">{data.lugarNacimientoDetalle || data.birthPlace || data.lugnac || '-'}</span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 {/* Padres Info */}
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Padre</span>
                     <span className="text-base font-medium text-gray-800">{data.fatherName || data.padre || 'NO REGISTRADO'}</span>
                     {(data.fatherId || data.cedupad) && <span className="text-xs text-gray-500 block">C.C. {data.fatherId || data.cedupad}</span>}
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Madre</span>
                     <span className="text-base font-medium text-gray-800">{data.motherName || data.madre || 'NO REGISTRADO'}</span>
                     {(data.motherId || data.cedumad) && <span className="text-xs text-gray-500 block">C.C. {data.motherId || data.cedumad}</span>}
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Tipo de Unión</span>
                     <span className="text-base font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded inline-block">
                         {convertirTipoHijo(data.tipoUnionPadres || data.parentsUnionType || data.tipohijo)}
                     </span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 {/* Abuelos y Padrinos */}
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Abuelos Paternos</span>
                     <span className="text-sm text-gray-800">{data.paternalGrandparents || data.abuepat || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Abuelos Maternos</span>
                     <span className="text-sm text-gray-800">{data.maternalGrandparents || data.abuemat || '-'}</span>
                 </div>
                 <div className="space-y-1 col-span-2">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Padrinos</span>
                     <span className="text-sm text-gray-800">{data.godparents || data.padrinos || '-'}</span>
                 </div>

                 <div className="border-t border-gray-100 col-span-full my-1"></div>

                 {/* Registro Civil */}
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Serial Reg. Civil</span>
                     <span className="text-base font-medium text-gray-800">{data.registrySerial || data.regciv || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">NUIP / NUIT</span>
                     <span className="text-base font-medium text-gray-800">{data.nuip || data.nuipNuit || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Oficina Registro</span>
                     <span className="text-base font-medium text-gray-800">{data.registryOffice || data.notaria || '-'}</span>
                 </div>
                 <div className="space-y-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Fecha Expedición</span>
                     <span className="text-base font-medium text-gray-800">{data.registryDate || data.fecregis || '-'}</span>
                 </div>

                 {/* Dedicated Margin Note section for Replacements */}
                 {hasMarginNote && (
                    <div className="col-span-full mt-4 border-t border-yellow-200 pt-4 bg-yellow-50 p-4 rounded border shadow-inner">
                        <h4 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" /> Nota Marginal Activa
                        </h4>
                        
                        {data.marginNote ? (
                             <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-yellow-900">
                                 <p className="mb-2">{data.marginNote.text}</p>
                                 <p className="text-xs opacity-80 mt-2 border-t border-yellow-300 pt-2">
                                     <strong>Aplicado el:</strong> {data.marginNote.appliedDate || '-'} | <strong>Decreto No:</strong> {data.marginNote.appliedByDecree || '-'}
                                 </p>
                             </div>
                        ) : (
                             <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-yellow-900">
                                 {data.notaAlMargen || data.notaMarginal}
                             </div>
                        )}
                        
                        {data.notaAlMargenOriginal && (
                            <div className="mt-4 pt-3 border-t border-yellow-300/50">
                                <span className="text-xs font-bold text-yellow-700 uppercase block mb-1">Nota Original Respaldada:</span>
                                <p className="text-xs text-yellow-800 font-mono italic opacity-70 truncate" title={data.notaAlMargenOriginal}>
                                    {data.notaAlMargenOriginal}
                                </p>
                            </div>
                        )}
                        
                    </div>
                )}
            </div>
            <div className="px-6 pb-6 pt-0">
               <BaptismPartidaValidator rawData={data} />
            </div>
        </div>
    );
};

const BaptismPartidasPage = () => {
  const { user } = useAuth();
  const { getMisDatosList, getDecreeReplacementByNewBaptismId, loadData: refreshAppData } = useAppData();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null); 
  const [selectedPartida, setSelectedPartida] = useState(null); 
  const [sortConfig, setSortConfig] = useState({ key: 'entry_number', direction: 'desc' });
  const [parishPrintData, setParishPrintData] = useState({});
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReadingPanelOpen, setIsReadingPanelOpen] = useState(false);
  const [selectedReadingRecord, setSelectedReadingRecord] = useState(null);
  const [replacementDecree, setReplacementDecree] = useState(null);

  useEffect(() => {
    loadData();
    loadParishData();
  }, [user]);

  // Effect to load decree when a partida is selected
  useEffect(() => {
      if (selectedPartida && selectedPartida.newBaptismIdRepo) {
          const decree = getDecreeReplacementByNewBaptismId(selectedPartida.newBaptismIdRepo, user.parishId);
          setReplacementDecree(decree);
      } else {
          setReplacementDecree(null);
      }
  }, [selectedPartida, user]);

  // If the context triggers a refresh, we should also reload data here
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

  const loadData = () => {
    if (!user?.parishId && !user?.dioceseId) return;
    setIsLoading(true);
    const entityId = user.parishId || user.dioceseId;
    const key = `baptisms_${entityId}`;
    try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            const sanitizedData = parsedData.map(record => ({
                ...record,
                godparents: record.godparents || [] 
            }));
            setRecords(sanitizedData);
            
            // Refresh selected partida if it's currently selected to update its view in InfoBox
            if (selectedPartida) {
                const updatedSelected = sanitizedData.find(r => r.id === selectedPartida.id);
                if (updatedSelected) setSelectedPartida(updatedSelected);
            }
        } else {
            setRecords([]);
        }
    } catch (error) {
        console.error("Error loading baptisms:", error);
        toast({ title: "Error", description: "No se pudieron cargar los registros.", variant: "destructive" });
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
      if (sortConfig.key === 'entry_number') {
         aValue = (parseInt(a.book_number || a.book || 0) * 1000000) + (parseInt(a.page_number || a.page || 0) * 1000) + parseInt(a.entry_number || a.entry || 0);
         bValue = (parseInt(b.book_number || b.book || 0) * 1000000) + (parseInt(b.page_number || b.page || 0) * 1000) + parseInt(b.entry_number || b.entry || 0);
      } else if (sortConfig.key === 'sacramentDate') {
          aValue = parseSortDate(a.sacramentDate || a.fecbau);
          bValue = parseSortDate(b.sacramentDate || b.fecbau);
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const filteredRecords = sortedRecords.filter(r => {
    const term = searchTerm.toLowerCase();
    const firstName = (r.firstName || r.nombres || '').toLowerCase();
    const lastName = (r.lastName || r.apellidos || '').toLowerCase();
    const fatherName = (r.fatherName || r.padre || '').toLowerCase();
    const motherName = (r.motherName || r.madre || '').toLowerCase();
    return firstName.includes(term) || lastName.includes(term) || fatherName.includes(term) || motherName.includes(term);
  });

  const handleDelete = (id, e) => {
      e?.stopPropagation();
      if (window.confirm("¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.")) {
          const entityId = user.parishId || user.dioceseId;
          const key = `baptisms_${entityId}`;
          const updatedRecords = records.filter(r => r.id !== id);
          localStorage.setItem(key, JSON.stringify(updatedRecords));
          setRecords(updatedRecords);
          if (selectedPartida?.id === id) setSelectedPartida(null);
          toast({ title: "Registro eliminado", description: "El bautismo ha sido eliminado correctamente." });
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
      
      // Pass along the margin note if it exists directly so the modal knows to render it
      if (row.marginNote) enrichedRecord.marginNote = row.marginNote;
      if (row.type) enrichedRecord.type = row.type;
      if (row.createdByDecree) enrichedRecord.createdByDecree = row.createdByDecree;
      
      setSelectedRecord(enrichedRecord);
      setIsViewModalOpen(true);
  };

  const columns = [
    { 
        header: <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('entry_number')}>Número <ArrowUpDown className="w-3 h-3 ml-1" /></div>,
        render: (row) => {
             const isReplacement = row.type === 'replacement' || row.createdByDecree === 'replacement' || row.newBaptismIdRepo;
             return (
                 <div className="flex flex-col items-start gap-1">
                     <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-700">L:{row.book_number || row.book} F:{row.page_number || row.page} N:{row.entry_number || row.entry}</span>
                     {isReplacement && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200" title={row.marginNote?.appliedByDecree ? `Decreto: ${row.marginNote.appliedByDecree}` : 'Decreto de Reposición'}>REPOSICIÓN</span>}
                 </div>
             );
        }
    },
    { 
        header: <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('lastName')}>Apellidos <ArrowUpDown className="w-3 h-3 ml-1" /></div>,
        render: (row) => <span className="font-semibold text-gray-900">{row.lastName || row.apellidos}</span> 
    },
    { 
        header: 'Nombres', 
        render: (row) => <span className="text-gray-800">{row.firstName || row.nombres}</span> 
    },
    { 
        header: <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('sacramentDate')}>Fecha Bautismo <ArrowUpDown className="w-3 h-3 ml-1" /></div>,
        render: (row) => {
            let displayDate = row.sacramentDate || row.fecbau;
            if (displayDate && !displayDate.includes('/')) {
                 displayDate = new Date(displayDate).toLocaleDateString();
            }
            return <span className="text-gray-600 text-sm">{displayDate || '-'}</span>;
        }
    },
    { header: 'Lugar Bautismo', render: (row) => <span className="text-xs text-gray-600">{row.lugarBautismoDetalle || row.lugbau || '-'}</span> },
    { header: 'Padres', render: (row) => <span className="text-xs text-gray-600 truncate max-w-[150px] inline-block" title={`${row.fatherName || row.padre} / ${row.motherName || row.madre}`}>{row.fatherName || row.padre} / {row.motherName || row.madre}</span> },
    { header: 'Sexo', render: (row) => <span className="text-xs text-gray-600">{convertirSexo(row.sex || row.sexo)}</span> },
  ];

  if (isLoading) {
    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex justify-center items-center h-64"><p className="text-gray-500">Cargando partidas...</p></div>
        </DashboardLayout>
    );
  }

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#4B7BA7] font-serif">Partidas de Bautismo</h1>
            <p className="text-gray-600 mt-1">Consulte, edite e imprima los registros de bautismo asentados.</p>
        </div>
        <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-sm font-medium text-gray-600 shadow-sm">Total: {filteredRecords.length}</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por apellidos, nombres o padres..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900 placeholder:text-gray-400 font-medium transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </div>

      {filteredRecords.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
             <FileX2 className="w-12 h-12 mb-3 text-gray-300" />
             <p className="font-medium">No se encontraron registros</p>
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
                            const isAnnulled = row.status === 'anulada' || row.isAnnulled;
                            return isAnnulled ? <XCircle className="w-4 h-4" /> : <CircleCheckBig className="w-4 h-4" />;
                        },
                        icon: (row) => {
                             const isAnnulled = row.status === 'anulada' || row.isAnnulled;
                             return isAnnulled ? XCircle : CircleCheckBig;
                        },
                        type: 'status', 
                        className: (row) => {
                            const isAnnulled = row.status === 'anulada' || row.isAnnulled;
                            return `p-2 rounded-full h-9 w-9 flex items-center justify-center cursor-default ${
                                isAnnulled ? 'text-red-500' : 'text-green-500'
                            }`;
                        }, 
                        title: (row) => {
                            const isAnnulled = row.status === 'anulada' || row.isAnnulled;
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

      <InfoBox data={selectedPartida} replacementDecree={replacementDecree} />

      <ViewBaptismPartidaModal 
          isOpen={isViewModalOpen} 
          onClose={() => { setIsViewModalOpen(false); setSelectedRecord(null); }} 
          partida={selectedRecord} 
          auxiliaryData={parishPrintData} 
      />
      
      <ReadingSummaryPanel isOpen={isReadingPanelOpen} onClose={() => { setIsReadingPanelOpen(false); setSelectedReadingRecord(null); }} data={selectedReadingRecord} sacramentType="baptism" />

    </DashboardLayout>
  );
};

export default BaptismPartidasPage;

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import { Edit, Trash2, PlusCircle, Search, FileX2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import ViewRepositionDecreeModal from '@/components/modals/ViewRepositionDecreeModal';

const BaptismRepositionListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      getDecreeReplacementsBySacrament, 
      deleteDecreeReplacement,
      getConceptosAnulacion // Usamos la función estándar para mayor compatibilidad
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [concepts, setConcepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADO DEL MODAL DE IMPRESIÓN ---
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDecree, setSelectedDecree] = useState(null);

  useEffect(() => {
      if (user?.parishId) {
          const loadedConcepts = getConceptosAnulacion(user.parishId);
          setConcepts(loadedConcepts);
          loadData();
      }
  }, [user, activeTab]);

  const loadData = () => {
      setIsLoading(true);
      setTimeout(() => {
        const data = getDecreeReplacementsBySacrament(activeTab, user.parishId);
        setRecords(data || []);
        setIsLoading(false);
      }, 300);
  };

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter(r => 
        (r.decreeNumber || r.numeroDecreto || '').toLowerCase().includes(term) ||
        (r.targetName || r.nombres || '').toLowerCase().includes(term) ||
        (r.apellidos || '').toLowerCase().includes(term)
    );
  }, [searchTerm, records]);

  // --- LÓGICA INTELIGENTE DE CONCEPTOS ---
  const getConceptName = (row) => {
      const id = row.conceptoAnulacionId;
      if (row.concepto) return row.concepto; // Si ya viene el texto desde Cancillería
      if (row.causa) return row.causa;       // Si viene como causa
      
      const c = concepts.find(i => String(i.id) === String(id) || String(i.codigo) === String(id));
      return c ? c.concepto : 'DECRETO DE REPOSICIÓN';
  };

  const handleDelete = (id) => {
      if (window.confirm("¿Está seguro de eliminar este decreto? Esta acción no se puede deshacer.")) {
          const result = deleteDecreeReplacement(id, user.parishId);
          if (result.success) {
              loadData();
              toast({ title: "Decreto eliminado", description: "El registro ha sido borrado correctamente." });
          } else {
              toast({ title: "Error", description: result.message, variant: "destructive" });
          }
      }
  };

  const columns = [
    { 
        header: 'No. Decreto', 
        render: (row) => <span className="font-mono font-bold text-blue-900">{row.decreeNumber || row.numeroDecreto || '---'}</span> 
    },
    { 
        header: 'Fecha', 
        render: (row) => row.decreeDate || row.fechaDecreto || '---' 
    },
    { 
        header: 'Concepto', 
        render: (row) => <span className="text-[11px] font-bold text-gray-700 uppercase leading-tight">{getConceptName(row)}</span> 
    },
    { 
        header: 'Titular', 
        render: (row) => <span className="font-bold uppercase text-gray-800">{row.targetName || `${row.nombres || ''} ${row.apellidos || ''}`.trim()}</span> 
    },
    { 
        header: 'Nueva Partida', 
        render: (row) => {
            const sum = row.newPartidaSummary || row.datosNuevaPartida || {};
            const L = sum.book || sum.book_number || sum.libro || '-';
            const F = sum.page || sum.page_number || sum.folio || '-';
            const N = sum.entry || sum.entry_number || sum.numero || '-';
            return <span className="font-mono text-xs text-gray-500">L:{L} F:{F} N:{N}</span>;
        } 
    },
    { 
        header: 'Estado', 
        render: (row) => (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border border-green-200">
                {row.estado || row.status || 'Activo'}
            </span>
        )
    }
  ];

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#4B7BA7] font-serif">Decretos de Reposición</h1>
            <p className="text-gray-600 mt-1">Listado de decretos emitidos para reposición de partidas.</p>
        </div>
        <Button onClick={() => navigate('/parroquia/decretos/nuevo-reposicion')} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white gap-2 font-bold shadow-md">
            <PlusCircle className="w-4 h-4" /> Nuevo Decreto
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 min-h-[500px]">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <TabsList className="grid w-full md:w-auto grid-cols-1 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="px-6 py-2">Bautizos</TabsTrigger>
                </TabsList>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar por decreto o titular..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-48 text-gray-400">Cargando decretos...</div>
            ) : (
                <TabsContent value="bautismo" className="mt-0">
                    {filteredRecords.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <Table 
                                columns={columns} 
                                data={filteredRecords} 
                                actions={[
                                    { 
                                        label: <Eye className="w-4 h-4" />, 
                                        onClick: (row) => { setSelectedDecree(row); setViewModalOpen(true); }, 
                                        className: "text-[#D4AF37] hover:bg-yellow-50 p-2 rounded-full",
                                        title: "Ver Detalles"
                                    },
                                    { 
                                        label: <Edit className="w-4 h-4" />, 
                                        // RUTA CORRECTA PARA EVITAR 404 BASADA EN TU APP.JSX
                                        onClick: (row) => navigate(`/parroquia/decretos/editar-reposicion?id=${row.id}`), 
                                        className: "text-[#4B7BA7] hover:bg-blue-50 p-2 rounded-full",
                                        title: "Editar"
                                    },
                                    { 
                                        label: <Trash2 className="w-4 h-4" />, 
                                        onClick: (row) => handleDelete(row.id), 
                                        className: "text-red-500 hover:bg-red-50 p-2 rounded-full",
                                        title: "Eliminar"
                                    }
                                ]} 
                            />
                        </div>
                    )}
                </TabsContent>
            )}
         </Tabs>
      </div>

      {viewModalOpen && (
          <ViewRepositionDecreeModal 
              isOpen={viewModalOpen}
              onClose={() => { setViewModalOpen(false); setSelectedDecree(null); }}
              decreeData={selectedDecree}
          />
      )}
    </DashboardLayout>
  );
};

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
         <FileX2 className="w-12 h-12 mb-3 text-gray-300" />
         <p className="font-medium">No se encontraron decretos</p>
         <p className="text-sm">Intente con otro término o cree un nuevo registro.</p>
    </div>
);

export default BaptismRepositionListPage;
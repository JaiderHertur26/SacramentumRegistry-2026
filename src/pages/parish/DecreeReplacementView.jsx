
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import { Edit, Trash2, PlusCircle, Search, FileX2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const DecreeReplacementView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
      getDecreeReplacementsBySacrament, 
      deleteDecreeReplacement,
      getAnnulmentConcepts
  } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [concepts, setConcepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      if (user?.parishId) {
          const loadedConcepts = getAnnulmentConcepts(user.parishId);
          setConcepts(loadedConcepts);
          loadData();
      }
  }, [user, activeTab]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = records.filter(r => 
        (r.decreeNumber || '').toLowerCase().includes(term) ||
        (getConceptName(r.conceptoAnulacionId) || '').toLowerCase().includes(term)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const loadData = () => {
      setIsLoading(true);
      setTimeout(() => {
        const data = getDecreeReplacementsBySacrament(activeTab, user.parishId);
        setRecords(data || []);
        setFilteredRecords(data || []);
        setIsLoading(false);
      }, 300);
  };

  const getConceptName = (id) => {
      const c = concepts.find(i => i.id === id);
      return c ? c.concepto : 'Desconocido';
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
    { header: 'No. Decreto', accessor: 'decreeNumber', className: "font-mono font-bold w-32" },
    { header: 'Fecha', accessor: 'decreeDate', className: "w-32" },
    { header: 'Concepto', render: (row) => getConceptName(row.conceptoAnulacionId), className: "truncate max-w-[200px]" },
    { header: 'Partida Original', render: (row) => row.originalPartidaSummary ? `L:${row.originalPartidaSummary.book} F:${row.originalPartidaSummary.page} N:${row.originalPartidaSummary.entry}` : <span className="text-gray-400 italic">No disponible</span> },
    { header: 'Nueva Partida', render: (row) => row.newPartidaSummary ? `L:${row.newPartidaSummary.book} F:${row.newPartidaSummary.page} N:${row.newPartidaSummary.entry}` : '-' },
  ];

  const actions = [
      { 
          label: <Edit className="w-4 h-4" />, 
          type: 'edit', 
          onClick: (row) => navigate(`/parish/decree-replacement/edit?id=${row.id}`), 
          className: "text-[#4B7BA7] hover:bg-blue-50 p-2 rounded-full transition-colors"
      },
      { 
          label: <Trash2 className="w-4 h-4" />, 
          type: 'delete', 
          onClick: (row) => handleDelete(row.id), 
          className: "text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
      }
  ];

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#4B7BA7] font-serif">Decretos de Reposición</h1>
            <p className="text-gray-600 mt-1">Listado de decretos emitidos para reposición de partidas.</p>
        </div>
        <Button onClick={() => navigate('/parish/decree-replacement/new')} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white gap-2 font-bold shadow-md">
            <PlusCircle className="w-4 h-4" /> Nuevo Decreto
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 min-h-[500px]">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <TabsList className="grid w-full md:w-auto grid-cols-3 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="px-6 py-2">Bautizos</TabsTrigger>
                    <TabsTrigger value="confirmacion" className="px-6 py-2">Confirmaciones</TabsTrigger>
                    <TabsTrigger value="matrimonio" className="px-6 py-2">Matrimonios</TabsTrigger>
                </TabsList>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar por decreto o concepto..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-48 text-gray-400">Cargando decretos...</div>
            ) : (
                <>
                    <TabsContent value="bautismo" className="mt-0">
                        {filteredRecords.length === 0 ? <EmptyState /> : <div className="rounded-lg border border-gray-200 overflow-hidden"><Table columns={columns} data={filteredRecords} actions={actions} /></div>}
                    </TabsContent>
                    <TabsContent value="confirmacion" className="mt-0">
                        {filteredRecords.length === 0 ? <EmptyState /> : <div className="rounded-lg border border-gray-200 overflow-hidden"><Table columns={columns} data={filteredRecords} actions={actions} /></div>}
                    </TabsContent>
                    <TabsContent value="matrimonio" className="mt-0">
                         {filteredRecords.length === 0 ? <EmptyState /> : <div className="rounded-lg border border-gray-200 overflow-hidden"><Table columns={columns} data={filteredRecords} actions={actions} /></div>}
                    </TabsContent>
                </>
            )}
         </Tabs>
      </div>
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

export default DecreeReplacementView;

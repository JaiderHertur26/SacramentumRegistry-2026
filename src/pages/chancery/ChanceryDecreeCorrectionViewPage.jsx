import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import { Edit, Trash2, PlusCircle, Search, FileX2, Eye } from 'lucide-react'; // <-- Agregado Eye
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import ViewCorrectionDecreeModal from '@/components/modals/ViewCorrectionDecreeModal'; // <-- IMPORTANTE: El modal de impresión

const ChanceryDecreeCorrectionViewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getBaptismCorrections, deleteBaptismCorrection } = useAppData();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el Modal de Impresión
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDecree, setSelectedDecree] = useState(null);

  useEffect(() => {
    if (user) { loadData(); }
  }, [user, activeTab]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = records.filter(r => 
        (r.targetName || r.nombres || '').toLowerCase().includes(term) ||
        (r.decreeNumber || r.numeroDecreto || '').toLowerCase().includes(term)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const loadData = () => {
      const entityId = user.dioceseId || user.id;
      const allCorrections = getBaptismCorrections(entityId) || [];
      const sacramentDecrees = allCorrections.filter(d => 
          (!d.sacrament || d.sacrament === activeTab || activeTab === "bautismo")
      );
      setRecords(sacramentDecrees);
      setFilteredRecords(sacramentDecrees);
  };

  const handleDelete = (id) => {
      if (window.confirm("¿Está seguro de eliminar este decreto? Se revertirán los cambios en la parroquia destino.")) {
          const entityId = user.dioceseId || user.id;
          const result = deleteBaptismCorrection(id, entityId);
          if (result.success) {
              loadData();
              toast({ title: "Decreto eliminado", description: "El registro ha sido borrado y la parroquia restaurada." });
          } else {
              toast({ title: "Error", description: result.message, variant: "destructive" });
          }
      }
  };

  const columns = [
    { header: 'No. Decreto', accessor: 'decreeNumber', className: "font-mono font-bold w-32", render: (row) => row.decreeNumber || row.numeroDecreto },
    { header: 'Fecha', accessor: 'decreeDate', className: "w-32", render: (row) => row.decreeDate || row.fechaDecreto },
    { header: 'Parroquia Destino', render: (row) => <span className="text-xs font-semibold text-purple-700">{row.targetParishName || 'Parroquia Local'}</span> },
    { header: 'Titular', render: (row) => <span className="font-semibold uppercase">{row.targetName || `${row.nombres || ''} ${row.apellidos || ''}`.trim()}</span> },
    { header: 'Corrección Realizada', render: (row) => {
        if (row.newPartidaSummary) {
            return `L:${row.newPartidaSummary.book || row.newPartidaSummary.book_number || ''} F:${row.newPartidaSummary.page || row.newPartidaSummary.page_number || ''} N:${row.newPartidaSummary.entry || row.newPartidaSummary.entry_number || ''}`;
        }
        return row.correccionRealizada || '-';
    }, className: "truncate max-w-[200px]" }
  ];

  return (
    <DashboardLayout entityName={user?.dioceseName || "Cancillería"}>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#4B7BA7] font-serif">Decretos de Corrección (Cancillería)</h1>
            <p className="text-gray-600 mt-1">Listado de decretos maestros emitidos para corregir errores en las parroquias.</p>
        </div>
        <Button onClick={() => navigate('/chancery/decree-correction/new')} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white gap-2 font-bold shadow-md">
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
                        placeholder="Buscar por decreto o nombre..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-sm"
                    />
                </div>
            </div>

            <TabsContent value="bautismo" className="mt-0">
                {filteredRecords.length === 0 ? <EmptyState /> : (
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <Table 
                            columns={columns} 
                            data={filteredRecords}
                            actions={[
                                { 
                                    label: <Eye className="w-4 h-4" />, 
                                    type: 'view', 
                                    onClick: (row) => { setSelectedDecree(row); setViewModalOpen(true); }, 
                                    className: "text-[#D4AF37] hover:bg-yellow-50 p-2 rounded-full transition-colors",
                                    title: "Vista Previa e Impresión"
                                },
                                { 
                                    label: <Edit className="w-4 h-4" />, 
                                    type: 'edit', 
                                    onClick: (row) => navigate(`/chancery/decree-correction/edit?id=${row.id}`), 
                                    className: "text-[#4B7BA7] hover:bg-blue-50 p-2 rounded-full transition-colors"
                                },
                                { 
                                    label: <Trash2 className="w-4 h-4" />, 
                                    type: 'delete', 
                                    onClick: (row) => handleDelete(row.id), 
                                    className: "text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                }
                            ]}
                        />
                    </div>
                )}
            </TabsContent>
            {/* ... Resto de TabsContent (puedes repetir la lógica anterior) ... */}
         </Tabs>
      </div>

      {/* MODAL DE VISTA PREVIA E IMPRESIÓN */}
      <ViewCorrectionDecreeModal 
          isOpen={viewModalOpen}
          onClose={() => { setViewModalOpen(false); setSelectedDecree(null); }}
          decreeData={selectedDecree}
      />
    </DashboardLayout>
  );
};

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
         <FileX2 className="w-12 h-12 mb-3 text-gray-300" />
         <p className="font-medium">No se encontraron decretos en el archivo central</p>
         <p className="text-sm">Intente con otro término o emita un nuevo decreto a una parroquia.</p>
    </div>
);

export default ChanceryDecreeCorrectionViewPage;
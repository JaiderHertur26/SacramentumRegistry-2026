import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import { Edit, Trash2, PlusCircle, Search, FileX2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const DecreeCorrectionView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.parishId) {
        loadData();
    }
  }, [user, activeTab]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = records.filter(r => 
        (r.nombres || '').toLowerCase().includes(term) ||
        (r.apellidos || '').toLowerCase().includes(term) ||
        (r.numeroDecreto || '').toLowerCase().includes(term)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const loadData = () => {
      const entityId = user.parishId || user.dioceseId;
      
      // 1. LEER DE LAS CAJAS CORRECTAS (Donde realmente se guardan)
      const baptisms = JSON.parse(localStorage.getItem(`baptismCorrections_${entityId}`) || '[]');
      const confirmations = JSON.parse(localStorage.getItem(`confirmationCorrections_${entityId}`) || '[]');
      const marriages = JSON.parse(localStorage.getItem(`marriageCorrections_${entityId}`) || '[]');

      // 2. NORMALIZAR DATOS PARA QUE LA TABLA NO ESTÉ VACÍA NUNCA
      const mapDecrees = (list, sacramentType) => list.map(d => {
          const original = d.originalPartidaSummary || {};
          const nueva = d.newPartidaSummary || {};
          return {
              ...d,
              sacrament: sacramentType,
              numeroDecreto: d.numeroDecreto || d.decreeNumber || 'S/N',
              fechaDecreto: d.fechaDecreto || d.decreeDate || '---',
              apellidos: d.apellidos || (d.targetName ? d.targetName.split(' ').slice(1).join(' ') : '---'),
              nombres: d.nombres || (d.targetName ? d.targetName.split(' ')[0] : 'Registro Histórico'),
              errorEncontrado: d.observations || d.conceptoAnulacionId || 'Ver detalles de corrección',
              correccionRealizada: `L:${nueva.libro || nueva.book || '?'} F:${nueva.folio || nueva.page || '?'} N:${nueva.numero || nueva.entry || '?'}`
          };
      });

      const allDecrees = [
          ...mapDecrees(baptisms, 'bautismo'),
          ...mapDecrees(confirmations, 'confirmacion'),
          ...mapDecrees(marriages, 'matrimonio')
      ];
      
      const sacramentDecrees = allDecrees.filter(d => d.sacrament === activeTab);
      
      // Ordenar del más reciente al más antiguo
      sacramentDecrees.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      setRecords(sacramentDecrees);
      setFilteredRecords(sacramentDecrees);
  };

  const handleDelete = (id) => {
      if (window.confirm("¿Está seguro de eliminar este decreto? Esta acción no se puede deshacer.")) {
          const entityId = user.parishId || user.dioceseId;
          
          // Eliminar de la base de datos correspondiente según la pestaña
          let storageKey = '';
          if (activeTab === 'bautismo') storageKey = `baptismCorrections_${entityId}`;
          else if (activeTab === 'confirmacion') storageKey = `confirmationCorrections_${entityId}`;
          else if (activeTab === 'matrimonio') storageKey = `marriageCorrections_${entityId}`;

          const allDecrees = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const updated = allDecrees.filter(d => d.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(updated));
          
          loadData();
          toast({ title: "Decreto eliminado", description: "El registro ha sido borrado correctamente." });
      }
  };

  const columns = [
    { header: 'No. Decreto', accessor: 'numeroDecreto', className: "font-mono font-bold w-32" },
    { header: 'Fecha', accessor: 'fechaDecreto', className: "w-32" },
    { header: 'Sujeto (Apellidos)', accessor: 'apellidos', className: "font-semibold" },
    { header: 'Sujeto (Nombres)', accessor: 'nombres' },
    { header: 'Observaciones', accessor: 'errorEncontrado', className: "truncate max-w-[200px]" },
    { header: 'Apunta A (Nueva)', accessor: 'correccionRealizada', className: "font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded" }
  ];

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#4B7BA7] font-serif">Decretos de Corrección</h1>
            <p className="text-gray-600 mt-1">Listado de decretos emitidos para corregir errores en partidas.</p>
        </div>
        <Button onClick={() => navigate('/parroquia/decretos/nuevo-correccion')} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white gap-2 font-bold shadow-md">
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
                        placeholder="Buscar decreto..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-sm"
                    />
                </div>
            </div>

            <TabsContent value="bautismo" className="mt-0">
                {filteredRecords.length === 0 ? <EmptyState /> : <DecreeTable data={filteredRecords} columns={columns} onDelete={handleDelete} navigate={navigate} />}
            </TabsContent>
            <TabsContent value="confirmacion" className="mt-0">
                {filteredRecords.length === 0 ? <EmptyState /> : <DecreeTable data={filteredRecords} columns={columns} onDelete={handleDelete} navigate={navigate} />}
            </TabsContent>
            <TabsContent value="matrimonio" className="mt-0">
                 {filteredRecords.length === 0 ? <EmptyState /> : <DecreeTable data={filteredRecords} columns={columns} onDelete={handleDelete} navigate={navigate} />}
            </TabsContent>
         </Tabs>
      </div>
    </DashboardLayout>
  );
};

const DecreeTable = ({ data, columns, onDelete, navigate }) => (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table 
            columns={columns} 
            data={data}
            actions={[
                { 
                    label: <Trash2 className="w-4 h-4" />, 
                    type: 'delete', 
                    onClick: (row) => onDelete(row.id), 
                    className: "text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                }
            ]}
        />
    </div>
);

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
         <FileX2 className="w-12 h-12 mb-3 text-gray-300" />
         <p className="font-medium">No se encontraron decretos</p>
         <p className="text-sm">Intente con otro término o importe nuevos registros.</p>
    </div>
);

export default DecreeCorrectionView;
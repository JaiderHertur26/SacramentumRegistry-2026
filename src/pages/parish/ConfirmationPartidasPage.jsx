
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';
import { Search, Edit, Trash2, Info, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import ViewConfirmationPartidaModal from '@/components/modals/ViewConfirmationPartidaModal';

const ConfirmationPartidasPage = () => {
  const { user } = useAuth();
  const { getMisDatosList, getConfirmations } = useAppData();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartida, setSelectedPartida] = useState(null);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [parishPrintData, setParishPrintData] = useState({});

  useEffect(() => {
    const pId = user?.parishId || user?.parish_id || user?.parroquiaId;
    if (pId) {
        const data = getConfirmations(pId);
        setRecords(data);
        const misDatos = getMisDatosList(pId);
        if (misDatos?.length > 0) setParishPrintData(misDatos[0]);
        setIsLoading(false);
    }
  }, [user, getConfirmations, getMisDatosList]);

  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    return (r.firstName || '').toLowerCase().includes(term) || (r.lastName || '').toLowerCase().includes(term);
  });

  const handleViewClick = (row) => {
      setSelectedRecordForModal(row);
      setIsViewModalOpen(true);
  };

  const columns = [
    { header: 'Registro', render: (row) => <span className="font-mono text-xs font-black bg-gray-100 px-2 py-1 rounded">L:{row.book_number} F:{row.page_number} N:{row.entry_number}</span> },
    { header: 'Apellidos', render: (row) => <span className="font-bold text-gray-900 uppercase">{row.lastName}</span> },
    { header: 'Nombres', render: (row) => <span className="text-gray-800 font-medium">{row.firstName}</span> },
    { header: 'Fecha', render: (row) => <span className="text-gray-600 text-sm font-bold">{row.sacramentDate || '-'}</span> }
  ];

  if (isLoading) return <DashboardLayout entityName="Cargando..."><div className="p-20 text-center text-gray-500 font-bold">Cargando partidas de confirmación...</div></DashboardLayout>;

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex justify-between items-end mb-6">
        <div>
            <h1 className="text-3xl font-black text-[#111111] tracking-tight">Partidas de Confirmación</h1>
            <p className="text-gray-500 font-bold text-sm">Consulta y gestión de actas de confirmación.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-black text-gray-600 shadow-sm">Total: {filteredRecords.length}</div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por nombres o apellidos..." className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-lg outline-none focus:border-amber-400 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <Table
                columns={columns}
                data={filteredRecords}
                onRowClick={(row) => setSelectedPartida(row)}
                actions={[
                    { label: <Eye className="w-4 h-4" />, onClick: handleViewClick, className: "text-[#D4AF37] hover:bg-yellow-50 p-2 rounded-full", title: "Ver Partida" },
                    { label: <Edit className="w-4 h-4" />, onClick: (row) => navigate(`/parroquia/confirmacion/editar?id=${row.id}`), className: "text-blue-600 hover:bg-blue-50 p-2 rounded-full", title: "Editar" },
                    { label: <Trash2 className="w-4 h-4" />, onClick: (row) => { if(confirm("¿Eliminar?")) { /* delete */ } }, className: "text-red-600 hover:bg-red-50 p-2 rounded-full", title: "Eliminar" }
                ]}
            />
      </div>

      {selectedPartida && (
          <div className="mt-8 p-6 bg-white rounded-2xl border-2 border-amber-100 shadow-sm animate-in fade-in">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" /> Detalle Rápido
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div><p className="text-gray-400 font-bold uppercase">Padre</p><p className="font-black text-gray-900">{selectedPartida.fatherName || '-'}</p></div>
                  <div><p className="text-gray-400 font-bold uppercase">Madre</p><p className="font-black text-gray-900">{selectedPartida.motherName || '-'}</p></div>
                  <div><p className="text-gray-400 font-bold uppercase">Padrinos</p><p className="font-black text-gray-900">{selectedPartida.godparents || '-'}</p></div>
                  <div><p className="text-gray-400 font-bold uppercase">Lugar</p><p className="font-black text-gray-900">{selectedPartida.lugarConfirmacion || '-'}</p></div>
              </div>
          </div>
      )}

      <ViewConfirmationPartidaModal 
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          partida={selectedRecordForModal}
          auxiliaryData={parishPrintData}
      />
    </DashboardLayout>
  );
};

export default ConfirmationPartidasPage;

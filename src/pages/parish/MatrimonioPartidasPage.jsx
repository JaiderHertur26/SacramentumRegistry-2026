
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';
import { Search, Edit, Trash2, Info, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import ViewMarriagePartidaModal from '@/components/modals/ViewMarriagePartidaModal';

const MatrimonioPartidasPage = () => {
  const { user } = useAuth();
  const { getMisDatosList, getMatrimonios } = useAppData();
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
        setRecords(getMatrimonios(pId));
        const misDatos = getMisDatosList(pId);
        if (misDatos?.length > 0) setParishPrintData(misDatos[0]);
        setIsLoading(false);
    }
  }, [user, getMatrimonios, getMisDatosList]);

  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    const groom = `${r.groomName} ${r.groomSurname}`.toLowerCase();
    const bride = `${r.brideName} ${r.brideSurname}`.toLowerCase();
    return groom.includes(term) || bride.includes(term);
  });

  const handleViewClick = (row) => {
      setSelectedRecordForModal(row);
      setIsViewModalOpen(true);
  };

  const columns = [
    { header: 'Registro', render: (row) => <span className="font-mono text-xs font-black bg-gray-100 px-2 py-1 rounded">L:{row.book_number} F:{row.page_number} N:{row.entry_number}</span> },
    { header: 'Esposo', render: (row) => <span className="font-bold text-blue-900 uppercase">{row.groomName} {row.groomSurname}</span> },
    { header: 'Esposa', render: (row) => <span className="font-bold text-rose-900 uppercase">{row.brideName} {row.brideSurname}</span> },
    { header: 'Fecha', render: (row) => <span className="text-gray-600 font-bold">{row.sacramentDate || '-'}</span> }
  ];

  if (isLoading) return <DashboardLayout entityName="Cargando..."><div className="p-20 text-center text-gray-500 font-bold">Cargando partidas de matrimonio...</div></DashboardLayout>;

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex justify-between items-end mb-6">
        <div>
            <h1 className="text-3xl font-black text-[#111111] tracking-tight">Partidas de Matrimonio</h1>
            <p className="text-gray-500 font-bold text-sm">Archivo histórico de matrimonios eclesiásticos.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-black text-gray-600 shadow-sm">Total: {filteredRecords.length}</div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por nombres de contrayentes..." className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-lg outline-none focus:border-rose-300 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <Table
                columns={columns}
                data={filteredRecords}
                onRowClick={(row) => setSelectedPartida(row)}
                actions={[
                    { label: <Eye className="w-4 h-4" />, onClick: handleViewClick, className: "text-[#D4AF37] hover:bg-yellow-50 p-2 rounded-full", title: "Ver Partida" },
                    { label: <Edit className="w-4 h-4" />, onClick: (row) => navigate(`/parroquia/matrimonio/editar?id=${row.id}`), className: "text-blue-600 hover:bg-blue-50 p-2 rounded-full", title: "Editar" },
                    { label: <Trash2 className="w-4 h-4" />, onClick: (row) => { if(confirm("¿Eliminar?")) { /* delete */ } }, className: "text-red-600 hover:bg-red-50 p-2 rounded-full", title: "Eliminar" }
                ]}
            />
      </div>

      <ViewMarriagePartidaModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          partida={selectedRecordForModal}
          auxiliaryData={parishPrintData}
      />
    </DashboardLayout>
  );
};

export default MatrimonioPartidasPage;

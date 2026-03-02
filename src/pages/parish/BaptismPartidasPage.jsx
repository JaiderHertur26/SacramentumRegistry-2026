
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';
import { Search, Edit, Trash2, ArrowUpDown, FileX2, Info, CheckCircle as CircleCheckBig, XCircle, Eye, AlertOctagon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { normalizeBaptismPartida, enrichBaptismPartidaWithAuxiliaryData } from '@/utils/baptismDataNormalizer';
import ViewBaptismPartidaModal from '@/components/modals/ViewBaptismPartidaModal';

const convertirSexo = (s) => (s == 1 || s === '1' || String(s).startsWith('M')) ? 'MASCULINO' : 'FEMENINO';

const InfoBox = ({ data, replacementDecree }) => {
    if (!data) return null;
    return (
        <div className="mt-8 border border-blue-200 rounded-lg overflow-hidden shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#4B7BA7] to-[#2a4e70] px-6 py-3 border-b border-blue-800 flex justify-between items-center text-white font-bold">
                <span className="flex items-center gap-2"><Info className="w-5 h-5" /> Detalle del Registro</span>
                {data.newBaptismIdRepo && <span className="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-1 rounded">PARTIDA SUPLETORIA</span>}
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                <div className="space-y-1">
                    <p className="text-gray-500 font-bold uppercase text-[10px]">Libro/Folio/Número</p>
                    <p className="font-mono font-black">{data.book_number} / {data.page_number} / {data.entry_number}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500 font-bold uppercase text-[10px]">Bautizado</p>
                    <p className="font-black text-gray-900">{data.firstName} {data.lastName}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500 font-bold uppercase text-[10px]">Fecha Bautismo</p>
                    <p className="font-black">{data.sacramentDate || '-'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500 font-bold uppercase text-[10px]">Sexo</p>
                    <p className="font-black">{convertirSexo(data.sex)}</p>
                </div>
            </div>
        </div>
    );
};

const BaptismPartidasPage = () => {
  const { user } = useAuth();
  const { getMisDatosList, getDecreeReplacementByNewBaptismId, getBaptisms } = useAppData();
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
        setRecords(getBaptisms(pId));
        const misDatos = getMisDatosList(pId);
        if (misDatos?.length > 0) setParishPrintData(misDatos[0]);
        setIsLoading(false);
    }
  }, [user, getBaptisms, getMisDatosList]);

  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    return (r.firstName || '').toLowerCase().includes(term) || (r.lastName || '').toLowerCase().includes(term) || (r.fatherName || '').toLowerCase().includes(term);
  });

  const handleViewClick = (row) => {
      const normalized = normalizeBaptismPartida(row);
      const enriched = enrichBaptismPartidaWithAuxiliaryData(normalized, parishPrintData);
      setSelectedRecordForModal(enriched);
      setIsViewModalOpen(true);
  };

  const columns = [
    { header: 'Número', render: (row) => <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded">L:{row.book_number} F:{row.page_number} N:{row.entry_number}</span> },
    { header: 'Apellidos', render: (row) => <span className="font-bold text-gray-900">{row.lastName}</span> },
    { header: 'Nombres', render: (row) => <span className="text-gray-800">{row.firstName}</span> },
    { header: 'Fecha', render: (row) => <span className="text-gray-600 text-sm">{row.sacramentDate || '-'}</span> }
  ];

  if (isLoading) return <DashboardLayout entityName="Cargando..."><div className="p-20 text-center">Cargando partidas...</div></DashboardLayout>;

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex justify-between items-end mb-6">
        <div>
            <h1 className="text-3xl font-black text-[#111111] tracking-tight">Partidas de Bautismo</h1>
            <p className="text-gray-500 font-bold">Consulte, edite e imprima los registros de bautismo.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-black text-gray-600 shadow-sm">Total: {filteredRecords.length}</div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por nombres o apellidos..." className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-lg outline-none focus:border-[#4B7BA7] transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <Table 
                columns={columns} 
                data={filteredRecords} 
                onRowClick={(row) => setSelectedPartida(row)}
                actions={[
                    { label: <Eye className="w-4 h-4" />, onClick: handleViewClick, className: "text-[#D4AF37] hover:bg-yellow-50 p-2 rounded-full", title: "Ver Partida" },
                    { label: <Edit className="w-4 h-4" />, onClick: (row) => navigate(`/parroquia/bautismo/editar?id=${row.id}`), className: "text-blue-600 hover:bg-blue-50 p-2 rounded-full", title: "Editar" },
                    { label: <Trash2 className="w-4 h-4" />, onClick: (row) => { if(confirm("¿Eliminar?")) { /* delete logic */ } }, className: "text-red-600 hover:bg-red-50 p-2 rounded-full", title: "Eliminar" }
                ]}
            />
      </div>

      <InfoBox data={selectedPartida} />

      <ViewBaptismPartidaModal 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)}
          partida={selectedRecordForModal}
          auxiliaryData={parishPrintData} 
      />
    </DashboardLayout>
  );
};

export default BaptismPartidasPage;

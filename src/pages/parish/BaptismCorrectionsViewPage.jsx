import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Trash2, ArrowUpDown, FileText, XCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ViewCorrectionDecreeModal from '@/components/modals/ViewCorrectionDecreeModal';
import { useToast } from '@/components/ui/use-toast';

const BaptismCorrectionsViewPage = () => {
    const { user } = useAuth();
    const { getBaptismCorrections, deleteBaptismCorrection, getMisDatosList } = useAppData();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [corrections, setCorrections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDecree, setSelectedDecree] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [parishPrintData, setParishPrintData] = useState({});

    useEffect(() => {
        if (user && user.parishId) {
            loadCorrections();
            loadParishData();
        }
    }, [user, getBaptismCorrections]);

    const loadCorrections = () => {
        setIsLoading(true);
        try {
            const data = getBaptismCorrections(user.parishId);
            // Sort by decree date descending by default
            const sorted = data.sort((a, b) => new Date(b.decreeDate) - new Date(a.decreeDate));
            setCorrections(sorted);
        } catch (error) {
            console.error("Error loading corrections:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadParishData = () => {
        try {
            const misDatos = getMisDatosList(user.parishId);
            if (misDatos && misDatos.length > 0) {
                setParishPrintData(misDatos[0]);
            }
        } catch (err) {
            console.error("Error loading parish data:", err);
        }
    };

    const handleView = (decree) => {
        setSelectedDecree(decree);
        setIsViewModalOpen(true);
    };

    const handleEdit = (id, e) => {
        e?.stopPropagation();
        navigate(`/parroquia/decretos/editar/${id}`);
    };

    const handleDelete = (id, e) => {
        e?.stopPropagation();
        if (window.confirm("¿Está seguro de eliminar este decreto? Esta acción es irreversible y RESTAURARÁ la partida original mientras ELIMINA la partida nueva creada por el decreto.")) {
            // Updated: Use the new restoration logic from context
            const result = deleteBaptismCorrection(id, user.parishId);
            if (result.success) {
                toast({ 
                    title: "Decreto Eliminado", 
                    description: result.message || "La partida original ha sido restaurada exitosamente.",
                    className: "bg-green-50 border-green-200 text-green-900"
                });
                loadCorrections(); // Refresh list
            } else {
                toast({ 
                    title: "Error", 
                    description: result.message || "No se pudo eliminar el decreto.", 
                    variant: "destructive" 
                });
            }
        }
    };

    const filteredCorrections = corrections.filter(c => 
        c.decreeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.targetName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { 
            header: 'No. Decreto', 
            render: (row) => <span className="font-bold font-mono text-gray-700">{row.decreeNumber}</span>
        },
        { 
            header: 'Fecha', 
            render: (row) => <span className="text-sm text-gray-600">{row.decreeDate}</span>
        },
        { 
            header: 'Partida Anulada (Persona)', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{row.targetName}</span>
                    <span className="text-xs text-gray-500">
                        Libro: {row.book} | Folio: {row.page} | No: {row.entry}
                    </span>
                </div>
            )
        },
        {
            header: 'Nueva Partida',
            render: (row) => (
                <div className="flex flex-col">
                    {row.newPartidaSummary ? (
                        <>
                            <span className="font-medium text-green-700">Libro Supletorio</span>
                            <span className="text-xs text-gray-500">
                                L: {row.newPartidaSummary.book} | F: {row.newPartidaSummary.page} | N: {row.newPartidaSummary.entry}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-red-400 italic">No vinculada</span>
                    )}
                </div>
            )
        }
    ];

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Decretos de Corrección</h1>
                    <p className="text-gray-500 text-sm">Gestione las anulaciones y correcciones de partidas</p>
                </div>
                <Button onClick={() => navigate('/parroquia/decretos/nuevo')} className="bg-[#4B7BA7] hover:bg-[#3A6286]">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Decreto
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <input 
                    type="text" 
                    placeholder="Buscar por número de decreto o nombre..." 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table 
                    columns={columns} 
                    data={filteredCorrections} 
                    isLoading={isLoading}
                    actions={[
                        { label: <Eye className="w-4 h-4" />, type: 'view', onClick: (row) => handleView(row), className: "text-blue-600 hover:bg-blue-50 p-2 rounded-full", title: "Ver Detalle" },
                        { label: <Edit className="w-4 h-4" />, type: 'edit', onClick: (row, e) => handleEdit(row.id, e), className: "text-orange-500 hover:bg-orange-50 p-2 rounded-full", title: "Editar Decreto" },
                        { label: <Trash2 className="w-4 h-4" />, type: 'delete', onClick: (row, e) => handleDelete(row.id, e), className: "text-red-500 hover:bg-red-50 p-2 rounded-full", title: "Eliminar y Restaurar" }
                    ]}
                />
            </div>

            <ViewCorrectionDecreeModal 
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                decree={selectedDecree}
                parishData={parishPrintData}
            />
        </DashboardLayout>
    );
};

export default BaptismCorrectionsViewPage;
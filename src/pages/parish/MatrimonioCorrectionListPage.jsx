import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ViewCorrectionDecreeModal from '@/components/modals/ViewCorrectionDecreeModal';

const MatrimonioCorrectionListPage = () => {
    const { user } = useAuth();
    const { getMatrimonios } = useAppData();
    const [corrections, setCorrections] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { toast } = useToast();

    // Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedDecree, setSelectedDecree] = useState(null);

    useEffect(() => {
        if (user?.parishId) {
            loadCorrections();
        }
    }, [user]);

    const loadCorrections = () => {
        const correctionsKey = `marriageCorrections_${user?.parishId}`;
        const data = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
        setCorrections(data);
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar este decreto? Esta acción no se puede deshacer.")) {
            const correctionsKey = `marriageCorrections_${user?.parishId}`;
            const current = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
            const updated = current.filter(c => c.id !== id);
            localStorage.setItem(correctionsKey, JSON.stringify(updated));

            toast({ title: "Eliminado", description: "Decreto de matrimonio eliminado correctamente.", className: "bg-green-50" });
            loadCorrections();
        }
    };

    const handleView = (decree) => {
        setSelectedDecree(decree);
        setViewModalOpen(true);
    };

    const handleEdit = (id) => {
         navigate(`/parish/decree-correction/edit?id=${id}&sacrament=marriage`);
    };

    const filteredCorrections = corrections.filter(item => {
        const annulledName = item.targetName || '';
        const term = searchTerm.toLowerCase();

        return item.decreeNumber.toLowerCase().includes(term) ||
               annulledName.toLowerCase().includes(term);
    });

    const columns = [
        { header: 'No. Decreto', accessor: 'decreeNumber', className: "font-semibold text-gray-900" },
        { header: 'Fecha', accessor: 'decreeDate' },
        {
            header: 'Esposos (Original)',
            render: (row) => row.targetName ? row.targetName.toUpperCase() : ''
        },
        {
            header: 'Acciones',
            render: (row) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800" onClick={() => handleView(row)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-800" onClick={() => handleEdit(row.id)}>
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout entityName={user?.parishName || "Parroquia"}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#8E44AD]">Decretos de Corrección (Matrimonio)</h1>
                    <p className="text-gray-500">Historial de correcciones y anulaciones de matrimonio</p>
                </div>
                <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => navigate('/parish/decree-correction/new')}
                >
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Decreto
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por número de decreto o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 max-w-md"
                    />
                </div>

                <Table columns={columns} data={filteredCorrections} />

                {filteredCorrections.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {searchTerm ? 'No se encontraron decretos con ese criterio.' : 'No hay decretos registrados aún.'}
                    </div>
                )}
            </div>

            <ViewCorrectionDecreeModal
                isOpen={viewModalOpen}
                onClose={() => { setViewModalOpen(false); setSelectedDecree(null); }}
                decreeData={selectedDecree}
            />
        </DashboardLayout>
    );
};

export default MatrimonioCorrectionListPage;
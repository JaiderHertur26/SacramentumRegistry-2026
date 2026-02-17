
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Search, Edit, Trash2, Plus } from 'lucide-react';
import Table from '@/components/ui/Table';
import CreateAnnulmentConceptModal from '@/components/modals/CreateAnnulmentConceptModal';
import EditAnnulmentConceptModal from '@/components/modals/EditAnnulmentConceptModal';

const AnnulmentConceptsTab = () => {
    const { user } = useAuth();
    const { getConceptosAnulacion, deleteConceptoAnulacion } = useAppData();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [concepts, setConcepts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedConcept, setSelectedConcept] = useState(null);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = () => {
        const contextId = user?.parishId || user?.dioceseId;
        if (!contextId) return;
        setIsLoading(true);
        try {
            const data = getConceptosAnulacion(contextId);
            setConcepts(data || []);
        } catch (error) {
            console.error("Error loading concepts:", error);
            toast({ title: "Error", description: "No se pudieron cargar los conceptos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and sort concepts by code ascending
    const filteredConcepts = concepts
        .filter(c => {
            const term = searchTerm.toLowerCase();
            return (c.codigo || '').toLowerCase().includes(term) || (c.concepto || '').toLowerCase().includes(term);
        })
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true }));

    const handleDelete = (id, e) => {
        e?.stopPropagation();
        if (window.confirm("¿Está seguro de eliminar este concepto?")) {
            const result = deleteConceptoAnulacion(id, user?.parishId || user?.dioceseId);
            if (result.success) {
                toast({ title: "Eliminado", description: "El concepto ha sido eliminado.", className: "bg-green-600 text-white" });
                loadData();
            } else {
                toast({ title: "Error", description: "No se pudo eliminar el concepto.", variant: "destructive" });
            }
        }
    };

    const handleEdit = (concept, e) => {
        e?.stopPropagation();
        setSelectedConcept(concept);
        setIsEditOpen(true);
    };

    const columns = [
        { header: 'Código', render: (row) => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.codigo}</span> },
        { header: 'Concepto', render: (row) => <span className="font-semibold text-gray-900">{row.concepto}</span> },
        { header: 'Expide', render: (row) => <span className="text-gray-600 text-sm">{row.expide}</span> },
        { 
            header: 'Tipo', 
            render: (row) => {
                let badgeClass = 'bg-gray-100 text-gray-800';
                let label = 'Desconocido';

                if (row.tipo === 'porCorreccion') {
                    badgeClass = 'bg-blue-50 text-blue-600';
                    label = 'Por Corrección';
                } else if (row.tipo === 'porReposicion') {
                    badgeClass = 'bg-green-50 text-green-600';
                    label = 'Por Reposición';
                } else if (row.tipo === 'porRepeticion') {
                    badgeClass = 'bg-purple-50 text-purple-600';
                    label = 'Por Repetición';
                } else if (row.tipo === 'porNulidad') {
                    badgeClass = 'bg-amber-50 text-amber-600';
                    label = 'Por Nulidad';
                }

                return (
                    <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>
                        {label}
                    </span>
                );
            } 
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                 <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar por código o concepto..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Plus className="w-4 h-4" />
                    Crear Nuevo Concepto
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table 
                    columns={columns} 
                    data={filteredConcepts} 
                    isLoading={isLoading}
                    actions={[
                        { label: <Edit className="w-4 h-4" />, type: 'edit', onClick: handleEdit, className: "text-[#4B7BA7] hover:bg-blue-50 p-2 rounded-full", title: "Editar" },
                        { label: <Trash2 className="w-4 h-4" />, type: 'delete', onClick: (row, e) => handleDelete(row.id, e), className: "text-red-500 hover:bg-red-50 p-2 rounded-full", title: "Eliminar" }
                    ]}
                />
                {!isLoading && filteredConcepts.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron conceptos de anulación.
                    </div>
                )}
            </div>

            <CreateAnnulmentConceptModal 
                isOpen={isCreateOpen} 
                onClose={() => setIsCreateOpen(false)} 
                onSuccess={loadData} 
            />
            
            <EditAnnulmentConceptModal 
                isOpen={isEditOpen} 
                onClose={() => { setIsEditOpen(false); setSelectedConcept(null); }} 
                concept={selectedConcept}
                onSuccess={loadData} 
            />
        </div>
    );
};

export default AnnulmentConceptsTab;

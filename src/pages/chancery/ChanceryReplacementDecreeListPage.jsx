
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import { Search, Eye, Filter, Pencil } from 'lucide-react';

const ChanceryReplacementDecreeListPage = () => {
    const { user } = useAuth();
    const { data } = useAppData();
    const [activeTab, setActiveTab] = useState("bautismo");
    const [allDecrees, setAllDecrees] = useState([]);
    const [filteredDecrees, setFilteredDecrees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    
    useEffect(() => {
        if (user?.dioceseId) {
            loadAllDioceseReplacements();
        }
    }, [user, data.parishes]);

    const loadAllDioceseReplacements = () => {
        const dioceseParishes = data.parishes.filter(p => p.dioceseId === user.dioceseId);
        let aggregated = [];

        dioceseParishes.forEach(parish => {
            // Fetch replacements from local storage using parish ID
            const key = `decrees_replacement_${parish.id}`;
            const parishDecrees = JSON.parse(localStorage.getItem(key) || '[]');
            
            const enriched = parishDecrees.map(d => ({
                ...d,
                parishName: parish.name,
                parishCity: parish.city
            }));
            aggregated = [...aggregated, ...enriched];
        });

        aggregated.sort((a, b) => new Date(b.createdAt || b.fechaDecreto) - new Date(a.createdAt || a.fechaDecreto));
        setAllDecrees(aggregated);
    };

    useEffect(() => {
        // Filter by Tab and Search Term
        const term = searchTerm.toLowerCase();
        
        const bySacrament = allDecrees.filter(d => (d.sacrament || 'bautismo') === activeTab);
        
        const filtered = bySacrament.filter(item => {
            const decreeNum = (item.numeroDecreto || '').toLowerCase();
            const pName = (item.parishName || '').toLowerCase();
            const names = (item.nombres || '').toLowerCase();
            const lastNames = (item.apellidos || '').toLowerCase();
            
            return decreeNum.includes(term) || 
                   pName.includes(term) || 
                   names.includes(term) || 
                   lastNames.includes(term);
        });
        
        setFilteredDecrees(filtered);
    }, [searchTerm, allDecrees, activeTab]);

    const handleEdit = (row) => {
        // Use the new editor route
        navigate(`/chancery/decree-replacement/editor?id=${row.id}`);
    };

    const columns = [
        { header: 'No. Decreto', accessor: 'numeroDecreto', className: "font-mono font-bold w-32" },
        { header: 'Fecha', accessor: 'fechaDecreto', className: "w-28" },
        { header: 'Parroquia', accessor: 'parishName', className: "text-sm text-gray-600" },
        { header: 'Sujeto', render: (row) => <span className="font-semibold">{row.apellidos} {row.nombres}</span> },
        { header: 'Causa', accessor: 'causa', className: "text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded text-center" },
        { 
            header: 'Acciones',
            render: (row) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-800 hover:bg-amber-50" onClick={() => handleEdit(row)}>
                        <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout entityName={`Cancillería - ${user?.dioceseName || ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#2C3E50]">Decretos de Reposición</h1>
                    <p className="text-gray-500">Control de reposiciones de partidas en toda la diócesis.</p>
                </div>
                <div>
                     <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" /> Filtros Avanzados
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
                    <TabsList className="grid w-full md:w-[400px] grid-cols-3 bg-gray-100">
                        <TabsTrigger value="bautismo">Bautismo</TabsTrigger>
                        <TabsTrigger value="confirmacion">Confirmación</TabsTrigger>
                        <TabsTrigger value="matrimonio">Matrimonio</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Buscar por número, parroquia o nombre del feligrés..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 max-w-lg"
                    />
                </div>

                <Table columns={columns} data={filteredDecrees} />
                
                {filteredDecrees.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg mt-4 border border-dashed border-gray-200">
                        <p className="font-medium">No se encontraron decretos de reposición.</p>
                        <p className="text-sm mt-1">Verifique la pestaña de sacramento o el término de búsqueda.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ChanceryReplacementDecreeListPage;


import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import CreateParishModal from '@/components/modals/CreateParishModal';
import { Plus } from 'lucide-react';

const ParishListPage = () => {
  const { data } = useAppData();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeParishes = data.parishes || [];
  const parishes = safeParishes.filter(p => p.dioceseId === user.dioceseId);
  
  const columns = [
    { header: 'Nombre', accessor: 'name' },
    { header: 'Ciudad', accessor: 'city' },
    { header: 'Dirección', accessor: 'address' },
    { header: 'Párroco', accessor: 'priest' }
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2C3E50]">Parroquias Diocesanas</h1>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Crear Parroquia
        </Button>
      </div>

      <Table 
        columns={columns} 
        data={parishes}
        actions={[{ type: 'edit', label: 'Editar' }, { type: 'delete', label: 'Eliminar', variant: 'danger' }]}
        onAction={() => {}} 
      />

      <CreateParishModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </DashboardLayout>
  );
};

export default ParishListPage;

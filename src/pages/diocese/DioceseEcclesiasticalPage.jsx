
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Eye, User, Home, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Modals
import CreateVicaryModal from '@/components/modals/CreateVicaryModal';
import CreateDecanateModal from '@/components/modals/CreateDecanateModal';
import CreateParishModal from '@/components/modals/CreateParishModal';
import CreateChancellorModal from '@/components/modals/CreateChancellorModal';
import EditParishModal from '@/components/modals/EditParishModal';
import EditChancellorModal from '@/components/modals/EditChancellorModal';
import EditVicaryModal from '@/components/modals/EditVicaryModal';
import EditDecanateModal from '@/components/modals/EditDecanateModal';
import DetailsModal from '@/components/modals/DetailsModal';
import ParishDetailsModal from '@/components/modals/ParishDetailsModal';

const DioceseEcclesiasticalPage = () => {
  const { data, deleteParish, deleteChancellor, deleteVicary, deleteDecanate } = useAppData();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // Modals State
  const [modals, setModals] = useState({
    createVicary: false,
    createDecanate: false,
    createParish: false,
    createChancellor: false,
    editParish: false,
    editChancellor: false,
    editVicary: false,
    editDecanate: false,
    details: false,
    parishDetails: false
  });
  
  const [selectedItem, setSelectedItem] = useState(null);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-[#111111] font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 text-red-600 gap-2 font-medium">
              <AlertCircle className="w-5 h-5" />
              <span>Error de autenticación: Usuario no identificado.</span>
          </div>
      );
  }

  const openModal = (name, item = null) => {
    setSelectedItem(item);
    setModals(prev => ({ ...prev, [name]: true }));
  };

  const closeModal = (name) => {
    setModals(prev => ({ ...prev, [name]: false }));
    setSelectedItem(null);
  };

  const vicaries = (data?.vicariates || []).filter(v => v.dioceseId === user.dioceseId);
  const getDeaneries = (vicaryId) => (data?.deaneries || []).filter(d => d.vicaryId === vicaryId);
  const getParishesByDecanate = (decanateId) => (data?.parishes || []).filter(p => p.decanateId === decanateId);
  const getDirectParishes = (vicaryId) => (data?.parishes || []).filter(p => p.vicaryId === vicaryId && (!p.decanateId || p.decanateId === 'null'));

  const chancellor = (data?.chancelleries || []).find(c => c.dioceseId === user.dioceseId);

  const handleDeleteParish = (id) => {
    if (confirm('¿Estás seguro de eliminar esta parroquia? Se eliminará también el usuario asociado.')) {
        if (deleteParish) {
            deleteParish(id);
            toast({ title: 'Eliminado', description: 'Parroquia eliminada.', variant: 'success' });
        } else {
             toast({ title: 'Error', description: 'Función no disponible.', variant: 'destructive' });
        }
    }
  };

  const handleDeleteChancellor = (id) => {
    if (confirm('¿Estás seguro de eliminar el canciller? Se eliminará también el usuario asociado.')) {
        if (deleteChancellor) {
            deleteChancellor(id);
            toast({ title: 'Eliminado', description: 'Canciller eliminado.', variant: 'success' });
        }
    }
  };

  const handleDeleteVicary = (id) => {
    if (confirm('¿Estás seguro de eliminar esta vicaría? Se eliminarán también los decanatos y parroquias asociados.')) {
         if (deleteVicary) {
            deleteVicary(id);
            toast({ title: 'Eliminado', description: 'Vicaría eliminada.', variant: 'success' });
         }
    }
  };

  const handleDeleteDecanate = (id) => {
    if (confirm('¿Estás seguro de eliminar este decanato? Se eliminarán también las parroquias asociadas.')) {
        if (deleteDecanate) {
            deleteDecanate(id);
            toast({ title: 'Eliminado', description: 'Decanato eliminado.', variant: 'success' });
        }
    }
  };

  const ParishTable = ({ parishes }) => (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-xs uppercase text-[#111111] font-bold">
                <tr>
                    <th className="px-4 py-2">Parroquia</th>
                    <th className="px-4 py-2">Párroco</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {parishes.map(parish => (
                    <tr key={parish.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-medium text-[#111111]">{parish.name}</td>
                        <td className="px-4 py-2 text-[#111111]">{parish.parroco}</td>
                        <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => openModal('parishDetails', parish)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><Eye className="w-4 h-4" /></button>
                                <button onClick={() => openModal('editParish', parish)} className="p-1 hover:bg-blue-100 rounded text-blue-700"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteParish(parish.id)} className="p-1 hover:bg-red-100 rounded text-red-700"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Organización Eclesiástica</title>
        <meta name="description" content="Gestionar estructura eclesiástica de la diócesis" />
      </Helmet>

      <DashboardLayout entityName={user.dioceseName || 'Diócesis'}>
        <div className="bg-white min-h-[calc(100vh-10rem)] rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#111111]">Organización Eclesiástica</h1>
                <p className="text-gray-600 mt-1">Gestione vicarías, decanatos y parroquias de su diócesis.</p>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
                <Button onClick={() => openModal('createVicary')} className="gap-2 bg-[#D4AF37] hover:bg-[#C4A027] text-[#111111] font-medium border border-[#B4932A]">
                    <Plus className="w-4 h-4" /> Crear Vicaría
                </Button>
                <Button onClick={() => openModal('createDecanate')} variant="secondary" className="gap-2 bg-gray-100 text-[#111111] hover:bg-gray-200 border border-gray-300">
                    <Plus className="w-4 h-4" /> Crear Decanato
                </Button>
                <Button onClick={() => openModal('createParish')} className="gap-2 bg-[#4B7BA7] hover:bg-[#3B6B97] text-white">
                    <Plus className="w-4 h-4" /> Crear Parroquia
                </Button>
                <Button onClick={() => openModal('createChancellor')} variant="outline" className="gap-2 text-[#111111] border-gray-300 hover:bg-gray-50" disabled={!!chancellor}>
                    <Plus className="w-4 h-4" /> {chancellor ? 'Cancillería Ya Existe' : 'Crear Cancillería'}
                </Button>
            </div>

            <div className="space-y-6 mb-12">
            {vicaries.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                    No hay vicarías registradas. Comienza creando una estructura eclesiástica.
                </div>
            ) : (
                vicaries.map(vicary => {
                    const vicaryDeaneries = getDeaneries(vicary.id);
                    const directParishes = getDirectParishes(vicary.id);
                    const hasContent = vicaryDeaneries.length > 0 || directParishes.length > 0;

                    return (
                        <div key={vicary.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-[#111111]">{vicary.name}</h3>
                                    <p className="text-sm text-gray-600">Vicario: {vicary.vicarioName}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => openModal('editVicary', vicary)}>
                                        <Edit className="w-4 h-4 text-blue-700" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteVicary(vicary.id)}>
                                        <Trash2 className="w-4 h-4 text-red-700" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 bg-white">
                                {!hasContent ? (
                                    <p className="text-sm text-gray-500 italic pl-4">No hay decanatos ni parroquias registradas.</p>
                                ) : (
                                    <div className="space-y-6">
                                        {vicaryDeaneries.map(decanate => (
                                            <div key={decanate.id} className="ml-4 border-l-2 border-gray-200 pl-4">
                                                <div className="mb-2 flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-[#111111] flex items-center gap-2">
                                                            {decanate.name}
                                                        </h4>
                                                        <p className="text-xs text-gray-600">Decano: {decanate.decanName}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => openModal('editDecanate', decanate)} 
                                                            className="p-1 hover:bg-blue-100 rounded text-blue-700"
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteDecanate(decanate.id)} 
                                                            className="p-1 hover:bg-red-100 rounded text-red-700"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-2">
                                                    {getParishesByDecanate(decanate.id).length === 0 ? (
                                                        <p className="text-xs text-gray-500 italic">No hay parroquias en este decanato.</p>
                                                    ) : (
                                                        <ParishTable parishes={getParishesByDecanate(decanate.id)} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {directParishes.length > 0 && (
                                            <div className="ml-4 border-l-2 border-dashed border-gray-300 pl-4 mt-4">
                                                <div className="mb-2">
                                                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                                        <Home className="w-4 h-4" /> Parroquias sin Decanato
                                                    </h4>
                                                    <p className="text-xs text-gray-500">Pertenecen directamente a la Vicaría</p>
                                                </div>
                                                <ParishTable parishes={directParishes} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-lg text-[#111111] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" /> Cancillería
                </h3>
                
                {chancellor ? (
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div>
                            <h4 className="font-medium text-[#111111]">{chancellor.name}</h4>
                            <p className="text-sm text-gray-600">Canciller Diocesano</p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openModal('editChancellor', chancellor)}><Edit className="w-4 h-4 text-blue-700" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteChancellor(chancellor.id)}><Trash2 className="w-4 h-4 text-red-700" /></Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        No se ha registrado un canciller para esta diócesis.
                        <div className="mt-2">
                            <Button variant="link" onClick={() => openModal('createChancellor')} className="text-blue-700 font-medium">Registrar ahora</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {modals.createVicary && <CreateVicaryModal isOpen={modals.createVicary} onClose={() => closeModal('createVicary')} />}
        {modals.createDecanate && <CreateDecanateModal isOpen={modals.createDecanate} onClose={() => closeModal('createDecanate')} />}
        {modals.createParish && <CreateParishModal isOpen={modals.createParish} onClose={() => closeModal('createParish')} />}
        {modals.createChancellor && <CreateChancellorModal isOpen={modals.createChancellor} onClose={() => closeModal('createChancellor')} />}
        
        {modals.editParish && (
          <EditParishModal isOpen={modals.editParish} onClose={() => closeModal('editParish')} parish={selectedItem} />
        )}
        
        {modals.editChancellor && (
          <EditChancellorModal isOpen={modals.editChancellor} onClose={() => closeModal('editChancellor')} chancellor={selectedItem} />
        )}
        
        {modals.editVicary && (
          <EditVicaryModal isOpen={modals.editVicary} onClose={() => closeModal('editVicary')} vicary={selectedItem} />
        )}
        
        {modals.editDecanate && (
          <EditDecanateModal isOpen={modals.editDecanate} onClose={() => closeModal('editDecanate')} decanate={selectedItem} />
        )}
        
        {modals.details && (
          <DetailsModal isOpen={modals.details} onClose={() => closeModal('details')} data={selectedItem} />
        )}
        
        {modals.parishDetails && (
          <ParishDetailsModal isOpen={modals.parishDetails} onClose={() => closeModal('parishDetails')} parish={selectedItem} />
        )}
      </DashboardLayout>
    </>
  );
};

export default DioceseEcclesiasticalPage;

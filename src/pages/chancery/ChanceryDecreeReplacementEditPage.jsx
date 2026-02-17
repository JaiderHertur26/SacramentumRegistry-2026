import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Save, X, Loader2, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ChanceryDecreeReplacementEditPage = () => {
  const { user } = useAuth();
  const { getConceptosAnulacion } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("bautismo");
  const [decrees, setDecrees] = useState([]);
  const [selectedDecreeId, setSelectedDecreeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [conceptos, setConceptos] = useState([]);

  const initialFormState = {
      numeroDecreto: '',
      fechaDecreto: '',
      causa: '', 
      libroOriginal: '',
      folioOriginal: '',
      numeroOriginal: '',
      nombres: '',
      apellidos: '',
      descripcionHechos: '',
      autoridad: '',
      testigos: '',
      conceptoAnulacionId: '' 
  };

  const [formData, setFormData] = useState(initialFormState);

  // Initialize active tab from URL params if present
  useEffect(() => {
      const sacramentParam = searchParams.get('sacrament');
      if (sacramentParam && ['bautismo', 'confirmacion', 'matrimonio'].includes(sacramentParam)) {
          setActiveTab(sacramentParam);
      }
  }, [searchParams]);

  // Load decrees when tab changes or user changes
  useEffect(() => {
    if (user) {
        const entityId = user.dioceseId || user.parishId;
        const storageKey = `decrees_replacement_${entityId}`;
        const allDecrees = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = allDecrees.filter(d => d.sacrament === activeTab);
        setDecrees(filtered);

        // Load Concepts for Chancery/Diocese
        const allConcepts = getConceptosAnulacion(entityId);
        setConceptos(allConcepts.filter(c => c.tipo === 'porReposicion'));

        // Check if URL params match current context to auto-select
        const idParam = searchParams.get('id');
        const sacramentParam = searchParams.get('sacrament');

        if (idParam && sacramentParam === activeTab) {
             setSelectedDecreeId(idParam);
        } else if (idParam) {
             setSelectedDecreeId(idParam);
        } else {
             setSelectedDecreeId("");
             setFormData(initialFormState);
        }
    }
  }, [user, activeTab, searchParams, getConceptosAnulacion]);

  // Load selected decree data into form
  useEffect(() => {
      if (selectedDecreeId) {
          const decree = decrees.find(d => d.id === selectedDecreeId);
          if (decree) {
              setFormData({
                  ...initialFormState,
                  ...decree,
                  conceptoAnulacionId: decree.conceptoAnulacionId || ''
              });
          }
      } else {
          setFormData(initialFormState);
      }
  }, [selectedDecreeId, decrees]);

  const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDecreeId) {
        toast({ title: "Error", description: "Seleccione un decreto para editar.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    
    try {
        const entityId = user.dioceseId || user.parishId;
        const storageKey = `decrees_replacement_${entityId}`;
        const allDecrees = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const updatedDecrees = allDecrees.map(d => {
            if (d.id === selectedDecreeId) {
                return { 
                    ...formData, 
                    id: selectedDecreeId, 
                    sacrament: activeTab,
                    tipoNotaAlMargen: 'porReposicion.nuevaPartida' 
                };
            }
            return d;
        });
        localStorage.setItem(storageKey, JSON.stringify(updatedDecrees));
        
        setDecrees(updatedDecrees.filter(d => d.sacrament === activeTab));

        await new Promise(resolve => setTimeout(resolve, 500));

        toast({
            title: "Cambios Guardados",
            description: "El decreto ha sido actualizado correctamente.",
            className: "bg-green-50 border-green-200 text-green-900"
        });
        navigate('/chancery/decree-replacement/view'); // Redirect to view
        
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredDecrees = decrees.filter(d => 
      (d.numeroDecreto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.nombres || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.apellidos || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConceptDetails = () => {
    if (!formData.conceptoAnulacionId) return null;
    return conceptos.find(c => c.id === formData.conceptoAnulacionId);
  };
  const selectedConceptDetails = getConceptDetails();

  // Render Form Logic (Rest is same as input, just ensuring export)
  function renderForm() {
      if (!selectedDecreeId) {
          return (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 p-10">
                  <Search className="w-12 h-12 mb-2 opacity-20" />
                  <p>Seleccione un decreto del listado para editar</p>
              </div>
          );
      }

      return (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h3 className="font-bold text-orange-800 text-sm uppercase mb-3 border-b border-orange-300 pb-2">Datos del Decreto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número de Decreto</label>
                          <input type="text" name="numeroDecreto" value={formData.numeroDecreto} onChange={handleChange} className="w-full px-3 py-2 border border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Decreto</label>
                          <input type="date" name="fechaDecreto" value={formData.fechaDecreto} onChange={handleChange} className="w-full px-3 py-2 border border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Causa</label>
                          <select name="causa" value={formData.causa} onChange={handleChange} className="w-full px-3 py-2 border border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                              <option value="PERDIDA">Pérdida de Libros</option>
                              <option value="DETERIORO">Deterioro Total</option>
                              <option value="DESTRUCCION">Destrucción (Incendio/Inundación)</option>
                          </select>
                      </div>

                       {/* CONCEPTO DE ANULACION SELECTOR */}
                       <div className="md:col-span-3 mt-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Concepto de Anulación</label>
                            <select
                                name="conceptoAnulacionId"
                                value={formData.conceptoAnulacionId}
                                onChange={handleChange}
                                className="w-full rounded-md border border-orange-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="">-- Ninguno (Estándar) --</option>
                                {conceptos.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.codigo} - {c.concepto} ({c.expide})
                                    </option>
                                ))}
                            </select>
                            {selectedConceptDetails && (
                                <div className="mt-2 text-xs text-orange-600 bg-white border border-orange-200 p-2 rounded flex gap-4">
                                    <span><strong>Código:</strong> {selectedConceptDetails.codigo}</span>
                                    <span><strong>Concepto:</strong> {selectedConceptDetails.concepto}</span>
                                    <span><strong>Expide:</strong> {selectedConceptDetails.expide}</span>
                                </div>
                            )}
                        </div>
                  </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-700 text-sm uppercase mb-3 border-b border-gray-300 pb-2">Datos Originales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Libro</label>
                          <input type="text" name="libroOriginal" value={formData.libroOriginal} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Folio</label>
                          <input type="text" name="folioOriginal" value={formData.folioOriginal} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número</label>
                          <input type="text" name="numeroOriginal" value={formData.numeroOriginal} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none" />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombres</label>
                          <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none uppercase" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellidos</label>
                          <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4B7BA7] outline-none uppercase" />
                      </div>
                  </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-700 text-sm uppercase mb-3 border-b border-gray-300 pb-2">Fundamentación</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descripción de los Hechos</label>
                          <textarea 
                              name="descripcionHechos"
                              value={formData.descripcionHechos} 
                              onChange={handleChange} 
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none h-24 text-sm"
                          />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Testigos / Pruebas</label>
                              <textarea 
                                  name="testigos"
                                  value={formData.testigos} 
                                  onChange={handleChange} 
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none h-20 text-sm"
                              />
                          </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Autoridad</label>
                              <input 
                                  type="text"
                                  name="autoridad"
                                  value={formData.autoridad} 
                                  onChange={handleChange} 
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={() => navigate('/chancery/decree-replacement/view')} disabled={isSubmitting}>
                      <X className="w-4 h-4 mr-2" /> Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-[#D4AF37] hover:bg-[#C4A027] text-white font-bold">
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Guardar Cambios
                  </Button>
              </div>
        </form>
      );
  }

  return (
    <DashboardLayout entityName={user?.dioceseName || "Cancillería"}>
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Editar Decreto Reposición (Cancillería)</h1>
            <p className="text-gray-600 font-medium text-sm">Seleccione un decreto de la lista para modificar sus datos.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-6xl mx-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="bautismo" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                        Bautizos
                    </TabsTrigger>
                    <TabsTrigger value="confirmacion" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
                        Confirmaciones
                    </TabsTrigger>
                    <TabsTrigger value="matrimonio" className="py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">
                        Matrimonios
                    </TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* LEFT SIDEBAR */}
                    <div className="lg:col-span-1 border-r border-gray-200 pr-4 flex flex-col h-[600px]">
                        <div className="relative mb-4">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                placeholder="Buscar decreto..."
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4B7BA7]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {filteredDecrees.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No hay decretos disponibles.</p>
                            ) : (
                                filteredDecrees.map((decree) => (
                                    <button
                                        key={decree.id}
                                        onClick={() => setSelectedDecreeId(decree.id)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg text-sm transition-all border",
                                            selectedDecreeId === decree.id
                                                ? "bg-orange-50 border-orange-200 ring-1 ring-orange-300"
                                                : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="font-bold text-gray-800">{decree.numeroDecreto}</div>
                                        <div className="text-gray-600 truncate">{decree.apellidos}, {decree.nombres}</div>
                                        <div className="text-xs text-gray-400 mt-1">{decree.fechaDecreto}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE: FORM */}
                    <div className="lg:col-span-3">
                        <TabsContent value="bautismo" className="mt-0 h-full">{renderForm()}</TabsContent>
                        <TabsContent value="confirmacion" className="mt-0 h-full">{renderForm()}</TabsContent>
                        <TabsContent value="matrimonio" className="mt-0 h-full">{renderForm()}</TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    </DashboardLayout>
  );
};

export default ChanceryDecreeReplacementEditPage;
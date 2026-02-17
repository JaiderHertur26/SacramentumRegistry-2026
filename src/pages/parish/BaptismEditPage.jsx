
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, ArrowLeft, Loader2, Info, CheckCircle, XCircle } from 'lucide-react';

const BaptismEditPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(null);

  const toInputDate = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = dateStr.split('/');
          return `${y}-${m}-${d}`;
      }
      return '';
  };

  const toStorageDate = (dateStr) => {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
  };

  // Helper for read-only date display
  const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      // If it's already in DD/MM/YYYY format
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
      
      // If it's YYYY-MM-DD
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          const [y, m, d] = dateStr.split('T')[0].split('-');
          return `${d}/${m}/${y}`;
      }
      return dateStr;
  };

  // Helper for sex display
  const getSexText = (val) => {
      if (String(val) === '1' || String(val).toUpperCase() === 'MASCULINO') return 'MASCULINO';
      if (String(val) === '2' || String(val).toUpperCase() === 'FEMENINO') return 'FEMENINO';
      return val || 'NO ESPECIFICADO';
  };

  useEffect(() => {
    if (!user || !recordId) return;
    loadRecord();
  }, [user, recordId]);

  const loadRecord = () => {
    setIsLoading(true);
    const entityId = user.parishId || user.dioceseId;
    const key = `baptisms_${entityId}`;

    try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
            const records = JSON.parse(storedData);
            const record = records.find(r => r.id === recordId);
            
            if (record) {
                // Determine standardized sex value for the select field
                let standardizedSex = '';
                const rawSex = String(record.sex || record.sexo || '').toUpperCase().trim();
                if (rawSex === '1' || rawSex === 'MASCULINO') standardizedSex = 'MASCULINO';
                else if (rawSex === '2' || rawSex === 'FEMENINO') standardizedSex = 'FEMENINO';

                // Ensure field mapping compatibility
                setFormData({
                    ...record,
                    sex: standardizedSex, // Apply standardized value for initial load
                    lugarNacimientoDetalle: record.lugarNacimientoDetalle || record.lugarn || record.lugnac,
                    lugarBautismoDetalle: record.lugarBautismoDetalle || record.lugbau || record.sacramentPlace,
                    fatherId: record.fatherId || record.cedupad,
                    motherId: record.motherId || record.cedumad,
                    paternalGrandparents: record.paternalGrandparents || record.abuepat || record.abupa,
                    maternalGrandparents: record.maternalGrandparents || record.abuemat || record.abuma,
                    godparents: record.godparents || record.padrinos,
                    registrySerial: record.registrySerial || record.regciv,
                    nuip: record.nuip,
                    registryOffice: record.registryOffice || record.notaria,
                    registryDate: record.registryDate || record.fecregis,
                    tipoUnionPadres: parseInt(record.tipoUnionPadres || record.parentsUnionType) || ''
                });
            } else {
                toast({ title: "Error", description: "Registro no encontrado.", variant: "destructive" });
                navigate('/parroquia/bautismo/partidas');
            }
        }
    } catch (error) {
        console.error("Error loading record:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleChange = (e) => {
      const { name, value, type } = e.target;
      let finalValue = value;
      
      if (type === 'date') {
          finalValue = toStorageDate(value);
      }

      // FIX: Ensure numeric type for selector binding when changing value
      if (name === 'tipoUnionPadres') {
          finalValue = parseInt(value) || '';
      }

      setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSave = () => {
      if (!formData) return;

      setIsLoading(true);
      const entityId = user.parishId || user.dioceseId;
      const key = `baptisms_${entityId}`;

      try {
          const storedData = localStorage.getItem(key);
          if (storedData) {
              const records = JSON.parse(storedData);
              const updatedRecords = records.map(r => 
                  r.id === recordId 
                    ? { 
                        ...r, // Keep existing fields
                        ...formData, // Overwrite with form data
                        updatedAt: new Date().toISOString(),
                      } 
                    : r
              );
              
              localStorage.setItem(key, JSON.stringify(updatedRecords));
              toast({ title: "Éxito", description: "Registro actualizado correctamente.", className: "bg-green-50 border-green-200 text-green-900" });
              navigate('/parroquia/bautismo/partidas');
          }
      } catch (error) {
          console.error("Error saving record:", error);
          toast({ title: "Error", description: "No se pudo guardar los cambios.", variant: "destructive" });
      } finally {
          setIsLoading(false);
      }
  };

  if (isLoading || !formData) return (
      <DashboardLayout entityName={user?.parishName || "Parroquia"}>
          <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#4B7BA7]" />
          </div>
      </DashboardLayout>
  );

  const isAnnulled = formData.status === 'anulada' || formData.isAnnulled;

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/parroquia/bautismo/partidas')} className="p-0 hover:bg-transparent text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Editar Registro de Bautismo</h1>
            <p className="text-sm text-gray-600">Libro: {formData.book_number} | Folio: {formData.page_number} | Número: {formData.entry_number}</p>
        </div>
      </div>

      {/* Resumen del Registro (Lectura) Panel */}
      <div className="bg-white rounded-lg shadow-sm border-t-4 border-blue-600 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Resumen del Registro (Lectura)
            </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row 1 */}
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Libro / Folio / Número</p>
                <p className="text-sm text-gray-900 font-bold">{formData.book_number} / {formData.page_number} / {formData.entry_number}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Fecha Bautismo</p>
                <p className="text-sm text-gray-900 font-bold">{formatDateDisplay(formData.sacramentDate)}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Ministro</p>
                <p className="text-sm text-gray-900 font-bold">{formData.minister || '-'}</p>
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Apellidos</p>
                <p className="text-sm text-gray-900 font-bold">{formData.lastName}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Nombres</p>
                <p className="text-sm text-gray-900 font-bold">{formData.firstName}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Sexo</p>
                <p className="text-sm text-gray-900 font-bold">{getSexText(formData.sex)}</p>
            </div>
            
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Fecha Nacimiento</p>
                <p className="text-sm text-gray-900 font-bold">{formatDateDisplay(formData.birthDate)}</p>
            </div>
            
            {/* Row 3 */}
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Padre</p>
                <p className="text-sm text-gray-900 font-bold">{formData.fatherName}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Madre</p>
                <p className="text-sm text-gray-900 font-bold">{formData.motherName}</p>
            </div>
            
            <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold uppercase">Lugar Bautismo</p>
                <p className="text-sm text-gray-900 font-bold">{formData.lugarBautismoDetalle || formData.lugbau || '-'}</p>
            </div>
        </div>
        
        <div className="flex justify-end mt-6">
            <span className={`font-bold flex items-center gap-1 ${isAnnulled ? "text-red-600" : "text-green-600"}`}>
                {isAnnulled ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {isAnnulled ? "ANULADA" : "CORRECTA"}
            </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-8">
        
        {/* Section 0: Datos de Registro */}
        <div>
            <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Datos del Registro</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Libro</label>
                    <Input name="book_number" value={formData.book_number || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Folio</label>
                    <Input name="page_number" value={formData.page_number || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Número</label>
                    <Input name="entry_number" value={formData.entry_number || ''} onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* Section 1: Datos del Bautizado */}
        <div>
            <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Datos del Bautizado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Apellidos</label>
                    <Input name="lastName" value={formData.lastName || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Nombres</label>
                    <Input name="firstName" value={formData.firstName || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Sexo</label>
                    <select 
                        name="sex" 
                        value={formData.sex || ''} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B7BA7] bg-white text-gray-900"
                    >
                        <option value="">Seleccione...</option>
                        <option value="MASCULINO">MASCULINO</option>
                        <option value="FEMENINO">FEMENINO</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha de Nacimiento</label>
                    <Input name="birthDate" type="date" value={toInputDate(formData.birthDate)} onChange={handleChange} />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Lugar de Nacimiento (lugarn)</label>
                    <Input name="lugarNacimientoDetalle" value={formData.lugarNacimientoDetalle || ''} onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* Section 2: Datos del Sacramento */}
        <div>
            <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Datos del Bautismo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha de Bautismo</label>
                    <Input name="sacramentDate" type="date" value={toInputDate(formData.sacramentDate)} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Hora de Bautismo</label>
                    <Input name="sacramentTime" type="time" value={formData.sacramentTime || ''} onChange={handleChange} />
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Lugar Bautismo (lugbau)</label>
                    <Input name="lugarBautismoDetalle" value={formData.lugarBautismoDetalle || ''} onChange={handleChange} placeholder="Ej: Parroquia San José" />
                </div>
            </div>
        </div>

        {/* Section 3: Datos de los Padres */}
        <div>
            <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Datos de los Padres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre del Padre</label>
                        <Input name="fatherName" value={formData.fatherName || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Cédula del Padre (cedupad)</label>
                        <Input name="fatherId" value={formData.fatherId || ''} onChange={handleChange} />
                    </div>
                </div>
                <div className="space-y-4">
                     <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre de la Madre</label>
                        <Input name="motherName" value={formData.motherName || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Cédula de la Madre (cedumad)</label>
                        <Input name="motherId" value={formData.motherId || ''} onChange={handleChange} />
                    </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                     <label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo de Unión de Padres (sexo/tipohijo)</label>
                     <select
                        name="tipoUnionPadres"
                        value={parseInt(formData.tipoUnionPadres) || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B7BA7] bg-white text-gray-900"
                     >
                        <option value="">Seleccione...</option>
                        <option value="1">1 - MATRIMONIO CATÓLICO</option>
                        <option value="2">2 - MATRIMONIO CIVIL</option>
                        <option value="3">3 - UNIÓN LIBRE</option>
                        <option value="4">4 - MADRE SOLTERA</option>
                        <option value="5">5 - OTRO</option>
                        <option value="MATRIMONIO CATÓLICO">MATRIMONIO CATÓLICO</option>
                        <option value="MATRIMONIO CIVIL">MATRIMONIO CIVIL</option>
                        <option value="UNIÓN LIBRE">UNIÓN LIBRE</option>
                        <option value="MADRE SOLTERA">MADRE SOLTERA</option>
                        <option value="OTRO">OTRO</option>
                     </select>
                </div>
            </div>
        </div>

        {/* Section 4: Abuelos y Padrinos */}
        <div>
            <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Abuelos y Padrinos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Abuelos Paternos (abuepat)</label>
                    <textarea 
                        name="paternalGrandparents" 
                        value={formData.paternalGrandparents || ''} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Abuelos Maternos (abuemat)</label>
                    <textarea 
                        name="maternalGrandparents" 
                        value={formData.maternalGrandparents || ''} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Padrinos (padrinos)</label>
                    <textarea 
                        name="godparents" 
                        value={formData.godparents || ''} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 p-2 text-sm h-16 resize-none focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900"
                    />
                </div>
            </div>
        </div>

        {/* Section 5: Datos Legales y Registro Civil */}
        <div>
            <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Datos Legales y Registro Civil</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                 <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Ministro (Sacerdote)</label>
                    <Input name="minister" value={formData.minister || ''} onChange={handleChange} />
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Firma Responsable (Da Fe)</label>
                    <Input name="ministerFaith" value={formData.ministerFaith || ''} onChange={handleChange} placeholder="Nombre de quien firma" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Serial Reg. Civil (regciv)</label>
                    <Input name="registrySerial" value={formData.registrySerial || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">NUIP / NUIT (nuip)</label>
                    <Input name="nuip" value={formData.nuip || ''} onChange={handleChange} />
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Oficina Registro (notaria)</label>
                    <Input name="registryOffice" value={formData.registryOffice || ''} onChange={handleChange} />
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha Expedición (fecregis)</label>
                    <Input name="registryDate" type="date" value={toInputDate(formData.registryDate)} onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={() => navigate('/parroquia/bautismo/partidas')} className="text-gray-600 border-gray-300 hover:bg-gray-50">
                <X className="w-4 h-4 mr-2" />
                Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white font-medium">
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Cambios
            </Button>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default BaptismEditPage;

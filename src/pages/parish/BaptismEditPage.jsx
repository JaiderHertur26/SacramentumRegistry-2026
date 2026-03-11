import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, ArrowLeft, Loader2, Info, CheckCircle, XCircle, AlertCircle, BookOpen } from 'lucide-react';

const BaptismEditPage = () => {
  const { user } = useAuth();
  // SOLO importamos getBaptisms (Permanentes). Nada de temporales.
  const { getBaptisms } = useAppData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});

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
      return `${y}-${m}-${d}`; 
  };

  const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          const [y, m, d] = dateStr.split('T')[0].split('-');
          return `${d}/${m}/${y}`;
      }
      return dateStr;
  };

  const getSexText = (val) => {
      if (String(val) === '1' || String(val).toUpperCase().includes('MASC')) return 'MASCULINO';
      if (String(val) === '2' || String(val).toUpperCase().includes('FEM')) return 'FEMENINO';
      return val || 'NO ESPECIFICADO';
  };

  useEffect(() => {
    if (!user || !recordId) return;
    loadRecord();
  }, [user, recordId]);

  const loadRecord = async () => {
    setIsLoading(true);
    const entityId = user.parishId || user.dioceseId;

    try {
        // BÚSQUEDA ESTRICTA SOLO EN PERMANENTES
        const permanentRecords = await getBaptisms(entityId) || [];
        const record = permanentRecords.find(r => String(r.id) === String(recordId));
        
        if (record) {
            // Estandarización de Sexo
            let standardizedSex = '';
            const rawSex = String(record.sexo || record.sex || '').toUpperCase().trim();
            if (rawSex === '1' || rawSex.includes('MASC')) standardizedSex = 'MASCULINO';
            else if (rawSex === '2' || rawSex.includes('FEM')) standardizedSex = 'FEMENINO';

            // Estandarización de Unión de Padres (Traducción de legacy)
            let standardizedUnion = record.tipoUnionPadres || record.parentsUnionType || '';
            if (String(standardizedUnion) === '1') standardizedUnion = 'MATRIMONIO CATÓLICO';
            else if (String(standardizedUnion) === '2') standardizedUnion = 'MATRIMONIO CIVIL';
            else if (String(standardizedUnion) === '3') standardizedUnion = 'UNIÓN LIBRE';
            else if (String(standardizedUnion) === '4') standardizedUnion = 'MADRE SOLTERA';
            else if (String(standardizedUnion) === '5') standardizedUnion = 'OTRO';

            // Mapeo exhaustivo según el diccionario maestro
            setFormData({
                ...record,
                libro: record.libro || record.book_number || record.book || '',
                folio: record.folio || record.page_number || record.page || '',
                numero: record.numero || record.entry_number || record.entry || '',
                apellidos: record.apellidos || record.lastName || '',
                nombres: record.nombres || record.firstName || '',
                sexo: standardizedSex,
                fechaNacimiento: record.fechaNacimiento || record.birthDate || '',
                lugarNacimiento: record.lugarNacimiento || record.lugarNacimientoDetalle || record.birthPlace || record.lugnac || '',
                fechaSacramento: record.fechaSacramento || record.baptismDate || record.fecbau || '',
                lugarBautismo: record.lugarBautismo || record.lugarBautismoDetalle || record.sacramentPlace || record.lugbau || '',
                nombrePadre: record.nombrePadre || record.padre || record.fatherName || '',
                cedulaPadre: record.cedulaPadre || record.fatherId || record.cedupad || '',
                nombreMadre: record.nombreMadre || record.madre || record.motherName || '',
                cedulaMadre: record.cedulaMadre || record.motherId || record.cedumad || '',
                tipoUnionPadres: standardizedUnion,
                abuelosPaternos: record.abuelosPaternos || record.paternalGrandparents || record.abuepat || record.abupa || '',
                abuelosMaternos: record.abuelosMaternos || record.maternalGrandparents || record.abuemat || record.abuma || '',
                padrinos: record.padrinos || record.godparents || '',
                ministro: record.ministro || record.minister || '',
                daFe: record.daFe || record.ministerFaith || '',
                serialRegistro: record.serialRegistro || record.registrySerial || record.regciv || '',
                nuip: record.nuip || '',
                oficinaRegistro: record.oficinaRegistro || record.registryOffice || record.notaria || '',
                fechaExpedicionRegistro: record.fechaExpedicionRegistro || record.registryDate || record.fecregis || '',
                creadoPorDecreto: record.creadoPorDecreto || record.type === 'replacement' || false
            });
        } else {
            // SI NO ESTÁ EN PERMANENTE, RECHAZAR
            toast({ title: "Registro no encontrado", description: "Este registro no existe en la base de datos de permanentes.", variant: "destructive" });
            navigate('/parroquia/bautismo/partidas');
        }
    } catch (error) {
        console.error("Error loading record:", error);
        toast({ title: "Error", description: "Ocurrió un problema al cargar el registro.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const validateField = (name, value) => {
      let error = '';
      if ((name === 'nombres' || name === 'apellidos') && !value.trim()) {
          error = 'Este campo es obligatorio';
      }
      if (name === 'fechaSacramento' && !value) {
          error = 'La fecha de bautismo es obligatoria';
      }
      setErrors(prev => ({ ...prev, [name]: error }));
      return !error;
  };

  const handleChange = (e) => {
      const { name, value, type } = e.target;
      let finalValue = value;
      
      if (type === 'date') {
          finalValue = toStorageDate(value);
      }

      setFormData(prev => ({ ...prev, [name]: finalValue }));
      validateField(name, finalValue);
  };

  const handleSave = async () => {
      if (!formData) return;

      const isNombresValid = validateField('nombres', formData.nombres);
      const isApellidosValid = validateField('apellidos', formData.apellidos);
      const isFechaValid = validateField('fechaSacramento', formData.fechaSacramento);

      if (!isNombresValid || !isApellidosValid || !isFechaValid) {
          toast({ title: "Error de validación", description: "Por favor, complete todos los campos obligatorios.", variant: "destructive" });
          return;
      }

      setIsLoading(true);
      const entityId = user.parishId || user.dioceseId;
      
      // GUARDADO ESTRICTO SOLO EN PERMANENTES
      const key = `baptisms_${entityId}`;

      try {
          const storedData = localStorage.getItem(key);
          if (storedData) {
              const records = JSON.parse(storedData);
              const updatedRecords = records.map(r => 
                  String(r.id) === String(recordId) 
                      ? { 
                          ...r, 
                          ...formData, 
                          // Sincronizar llaves legacy para que la tabla principal BD_BautizosPage no se rompa
                          book_number: formData.libro,
                          page_number: formData.folio,
                          entry_number: formData.numero,
                          firstName: formData.nombres,
                          lastName: formData.apellidos,
                          baptismDate: formData.fechaSacramento,
                          birthDate: formData.fechaNacimiento,
                          padre: formData.nombrePadre,
                          madre: formData.nombreMadre,
                          updatedAt: new Date().toISOString(),
                        } 
                      : r
              );
              
              localStorage.setItem(key, JSON.stringify(updatedRecords));
              toast({ title: "Éxito", description: "Registro permanente actualizado correctamente.", className: "bg-green-50 border-green-200 text-green-900" });
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
  
  // --- CORRECCIÓN: Lógica más inteligente para el estado "INCOMPLETA" ---
  // Ahora valida que los valores existan, permitiendo "0" como valor válido.
  const hasVal = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const isComplete = hasVal(formData.libro) && hasVal(formData.numero) && hasVal(formData.nombres) && hasVal(formData.apellidos);
  
  const hasErrors = Object.values(errors).some(err => err);

  let statusText = "CORRECTA";
  let statusClass = "bg-green-50 text-green-600";
  let StatusIcon = CheckCircle;

  if (isAnnulled) {
      statusText = "ANULADA";
      statusClass = "bg-red-50 text-red-600";
      StatusIcon = XCircle;
  } else if (!isComplete) {
      statusText = "INCOMPLETA";
      statusClass = "bg-amber-50 text-amber-600";
      StatusIcon = AlertCircle;
  }

  const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2";
  const inputClass = "h-10 w-full px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B7BA7] focus-visible:border-transparent placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors bg-white";
  const sectionHeaderClass = "text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b border-gray-200 pb-3 mb-5";
  const sectionContainerClass = "bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6";

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pb-12">
          
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6 pt-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/parroquia/bautismo/partidas')} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Editar Registro Permanente</h1>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"><BookOpen className="w-3 h-3"/> Base de Datos Principal</span>
                        | Archivo: L:{formData.libro || '-'} F:{formData.folio || '-'} N:{formData.numero || '-'}
                    </p>
                </div>
            </div>
        </div>

        {/* Registro Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-t-4 border-t-[#4B7BA7] p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Resumen del Registro
                </h3>
                <div className="flex gap-2">
                    {formData.creadoPorDecreto && (
                         <span className="font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                             CREADO POR DECRETO
                         </span>
                    )}
                    <span className={`font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${statusClass}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusText}
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                    <p className={labelClass}>Apellidos y Nombres</p>
                    <p className="text-sm text-gray-900 font-bold uppercase">{formData.apellidos || '-'} {formData.nombres || '-'}</p>
                </div>
                <div className="space-y-1">
                    <p className={labelClass}>Fecha Bautismo</p>
                    <p className="text-sm text-gray-900 font-medium">{formatDateDisplay(formData.fechaSacramento) || '-'}</p>
                </div>
                <div className="space-y-1">
                    <p className={labelClass}>Padres</p>
                    <p className="text-sm text-gray-900 font-medium">{formData.nombrePadre || '---'} / {formData.nombreMadre || '---'}</p>
                </div>
            </div>
        </div>

        {/* Section 1: Datos del Registro */}
        <div className={sectionContainerClass}>
            <h3 className={sectionHeaderClass}>1. Datos del Registro en Archivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                    <label className={labelClass}>Libro</label>
                    <input type="text" name="libro" onChange={handleChange} className={inputClass} value={formData.libro || ''} />
                </div>
                <div>
                    <label className={labelClass}>Folio</label>
                    <input type="text" name="folio" onChange={handleChange} className={inputClass} value={formData.folio || ''} />
                </div>
                <div>
                    <label className={labelClass}>Número (Acta)</label>
                    <input type="text" name="numero" onChange={handleChange} className={inputClass} value={formData.numero || ''} />
                </div>
            </div>
        </div>

        {/* Section 2: Datos del Bautizado */}
        <div className={sectionContainerClass}>
            <h3 className={sectionHeaderClass}>2. Datos del Bautizado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                    <label className={labelClass}>Apellidos</label>
                    <input type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} className={`${inputClass} uppercase`} />
                    {errors.apellidos && <p className="text-xs text-red-600 font-medium mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.apellidos}</p>}
                </div>
                <div>
                    <label className={labelClass}>Nombres</label>
                    <input type="text" name="nombres" value={formData.nombres || ''} onChange={handleChange} className={`${inputClass} uppercase`} />
                    {errors.nombres && <p className="text-xs text-red-600 font-medium mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.nombres}</p>}
                </div>
                <div>
                    <label className={labelClass}>Sexo</label>
                    <select name="sexo" value={formData.sexo || ''} onChange={handleChange} className={inputClass}>
                        <option value="">Seleccione...</option>
                        <option value="MASCULINO">MASCULINO</option>
                        <option value="FEMENINO">FEMENINO</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Fecha de Nacimiento</label>
                    <input type="date" name="fechaNacimiento" value={toInputDate(formData.fechaNacimiento)} onChange={handleChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Lugar de Nacimiento</label>
                    <input type="text" name="lugarNacimiento" value={formData.lugarNacimiento || ''} onChange={handleChange} className={inputClass} />
                </div>
            </div>
        </div>

        {/* Section 3: Datos del Bautismo */}
        <div className={sectionContainerClass}>
            <h3 className={sectionHeaderClass}>3. Datos del Bautismo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                    <label className={labelClass}>Fecha de Bautismo</label>
                    <input type="date" name="fechaSacramento" value={toInputDate(formData.fechaSacramento)} onChange={handleChange} className={inputClass} />
                    {errors.fechaSacramento && <p className="text-xs text-red-600 font-medium mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.fechaSacramento}</p>}
                </div>
                 <div className="md:col-span-2">
                    <label className={labelClass}>Lugar Bautismo (Parroquia/Capilla)</label>
                    <input type="text" name="lugarBautismo" value={formData.lugarBautismo || ''} onChange={handleChange} className={inputClass} placeholder="Ej: Parroquia San José" />
                </div>
            </div>
        </div>

        {/* Section 4: Datos de los Padres */}
        <div className={sectionContainerClass}>
            <h3 className={sectionHeaderClass}>4. Datos de los Padres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                    <label className={labelClass}>Nombre del Padre</label>
                    <input type="text" name="nombrePadre" value={formData.nombrePadre || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Cédula del Padre</label>
                    <input type="text" name="cedulaPadre" value={formData.cedulaPadre || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Nombre de la Madre</label>
                    <input type="text" name="nombreMadre" value={formData.nombreMadre || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Cédula de la Madre</label>
                    <input type="text" name="cedulaMadre" value={formData.cedulaMadre || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                     <label className={labelClass}>Tipo de Unión de Padres</label>
                     <select name="tipoUnionPadres" value={formData.tipoUnionPadres || ''} onChange={handleChange} className={inputClass}>
                        <option value="">Seleccione...</option>
                        <option value="MATRIMONIO CATÓLICO">MATRIMONIO CATÓLICO</option>
                        <option value="MATRIMONIO CIVIL">MATRIMONIO CIVIL</option>
                        <option value="UNIÓN LIBRE">UNIÓN LIBRE</option>
                        <option value="MADRE SOLTERA">MADRE SOLTERA</option>
                        <option value="OTRO">OTRO</option>
                     </select>
                </div>
            </div>
        </div>

        {/* Section 5: Abuelos y Padrinos */}
        <div className={sectionContainerClass}>
            <h3 className={sectionHeaderClass}>5. Abuelos y Padrinos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                    <label className={labelClass}>Abuelos Paternos</label>
                    <textarea name="abuelosPaternos" value={formData.abuelosPaternos || ''} onChange={handleChange} className={`${inputClass} h-24 resize-none`} />
                </div>
                <div>
                    <label className={labelClass}>Abuelos Maternos</label>
                    <textarea name="abuelosMaternos" value={formData.abuelosMaternos || ''} onChange={handleChange} className={`${inputClass} h-24 resize-none`} />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Padrinos</label>
                    <textarea name="padrinos" value={formData.padrinos || ''} onChange={handleChange} className={`${inputClass} h-20 resize-none`} />
                </div>
            </div>
        </div>

        {/* Section 6: Datos Legales y Registro Civil */}
        <div className={sectionContainerClass}>
            <h3 className={sectionHeaderClass}>6. Datos Legales y Registro Civil</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                 <div>
                    <label className={labelClass}>Ministro (Quien Bautiza)</label>
                    <input type="text" name="ministro" value={formData.ministro || ''} onChange={handleChange} className={inputClass} />
                </div>
                 <div>
                    <label className={labelClass}>Firma Responsable (Da Fe)</label>
                    <input type="text" name="daFe" value={formData.daFe || ''} onChange={handleChange} className={inputClass} placeholder="Nombre de quien firma" />
                </div>
                <div>
                    <label className={labelClass}>Serial Reg. Civil</label>
                    <input type="text" name="serialRegistro" value={formData.serialRegistro || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>NUIP / NUIT</label>
                    <input type="text" name="nuip" value={formData.nuip || ''} onChange={handleChange} className={inputClass} />
                </div>
                 <div>
                    <label className={labelClass}>Oficina Registro (Notaría)</label>
                    <input type="text" name="oficinaRegistro" value={formData.oficinaRegistro || ''} onChange={handleChange} className={inputClass} />
                </div>
                 <div>
                    <label className={labelClass}>Fecha Expedición</label>
                    <input type="date" name="fechaExpedicionRegistro" value={toInputDate(formData.fechaExpedicionRegistro)} onChange={handleChange} className={inputClass} />
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
            <Button variant="outline" onClick={() => navigate('/parroquia/bautismo/partidas')} className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md transition-colors duration-200">
                <X className="w-4 h-4 mr-2" />
                Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading || hasErrors} className="bg-[#4B7BA7] hover:bg-[#3A6286] text-white font-medium px-4 py-2 rounded-md transition-colors duration-200">
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Cambios
            </Button>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default BaptismEditPage;
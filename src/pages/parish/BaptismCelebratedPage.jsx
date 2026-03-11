import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Save, X, Calendar, User, Users, BookOpen, PenTool, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const BaptismCelebratedPage = () => {
  const { user } = useAuth();
  const { saveBaptismToSource, validateBaptismNumbers } = useAppData();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [catalogs, setCatalogs] = useState({
      ministers: [],
      places: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cities State Management
  const [ciudades, setCiudades] = useState([]);
  const [ciudadesFiltradas, setCiudadesFiltradas] = useState([]);
  const [searchCity, setSearchCity] = useState('');

  // Ministers State Management
  const [ministersList, setMinistersList] = useState([]);
  
  // Search/Filter for "Sacerdote" (Minister)
  const [ministersFiltrados, setMinistersFiltrados] = useState([]);
  const [searchMinister, setSearchMinister] = useState('');

  // Search/Filter for "Da Fe" (MinisterFaith)
  const [ministersFaithFiltrados, setMinistersFaithFiltrados] = useState([]);
  const [searchMinisterFaith, setSearchMinisterFaith] = useState('');

  // Datos Iniciales del Formulario coincidiendo con Página de Edición y Mapeador
  const initialFormData = {
    // Sección 1: Numeración Manual
    numeroLibro: '', 
    folio: '', 
    numeroActa: '', 

    // Sección 2: Datos del Bautismo
    fechaSacramento: '', 
    lugarBautismoDetalle: '', 
    
    // Sección 3: Datos del Bautizado
    apellidos: '', 
    nombres: '', 
    sexo: '', 
    fechaNacimiento: '', 
    lugarNacimientoDetalle: '', 

    // Sección 4: Datos de los Padres
    tipoUnionPadres: '', 
    nombrePadre: '', 
    cedulaPadre: '', 
    nombreMadre: '', 
    cedulaMadre: '', 

    // Sección 5: Abuelos
    abuelosPaternos: '', 
    abuelosMaternos: '', 

    // Sección 6: Padrinos
    padrinos: '', 

    // Sección 7: Ministro / Da Fe
    ministro: '', 
    daFe: '', 
    observaciones: '' 
  };

  const [formData, setFormData] = useState(initialFormData);

  // Inicializar catálogos
  useEffect(() => {
      setCatalogs({
          ministers: ['Párroco', 'Vicario'], 
          places: ['Templo Parroquial', 'Capilla Filial']
      });
  }, []);

  // --- SOLUCIÓN: BUSCADOR AGRESIVO DEL NOMBRE DE LA PARROQUIA ---
  useEffect(() => {
      if (!user?.parishId) return;

      const loadParishName = () => {
          let finalName = '';

          try {
              // 1. Buscar exhaustivamente en "Mis Datos"
              const misDatosRaw = localStorage.getItem(`misDatos_${user.parishId}`);
              if (misDatosRaw) {
                  const misDatos = JSON.parse(misDatosRaw);
                  const registro = Array.isArray(misDatos) ? misDatos[0] : misDatos;
                  
                  if (registro) {
                      finalName = registro.nombre || registro.NOMBRE || registro.Nombre || '';
                  }
              }

              // 2. Si no lo encuentra, buscar en el Catálogo Global
              if (!finalName) {
                  const parishesRaw = localStorage.getItem('parishes');
                  if (parishesRaw) {
                      const parishes = JSON.parse(parishesRaw);
                      const parishCat = parishes.find(p => p.id === user.parishId);
                      if (parishCat) {
                          finalName = parishCat.name || parishCat.nombre || '';
                      }
                  }
              }

              // 3. Último recurso: El nombre guardado en la sesión
              if (!finalName) {
                  finalName = user.parishName || '';
              }

              // Setearlo en el formulario siempre en mayúsculas
              if (finalName) {
                  setFormData(prev => ({ 
                      ...prev, 
                      lugarBautismoDetalle: finalName.toUpperCase() 
                  }));
              }
          } catch (error) {
              console.error("Error cargando nombre de parroquia:", error);
          }
      };

      loadParishName();

      // Escuchar cambios por si se actualiza "Mis Datos"
      const handleStorageChange = (e) => {
          if (e.key === `misDatos_${user.parishId}`) {
              loadParishName();
          }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.parishId, user?.parishName]);

  // Cargar ciudades desde localStorage
  useEffect(() => {
      if (user?.dioceseId) {
          const dioceseKey = `ciudades_${user.dioceseId}`;
          try {
              let parsed = JSON.parse(localStorage.getItem(dioceseKey) || '[]');
              if (parsed.length === 0 && user.parishId) {
                  const parishKey = `ciudades_${user.parishId}`;
                  const parishData = JSON.parse(localStorage.getItem(parishKey) || '[]');
                  if (parishData.length > 0) parsed = parishData;
              }
              if (Array.isArray(parsed) && parsed.length > 0) {
                  setCiudades(parsed);
                  setCiudadesFiltradas(parsed);
              } else {
                  setCiudades([]);
                  setCiudadesFiltradas([]);
              }
          } catch (e) {
              console.error("❌ Error cargando ciudades:", e);
          }
      }
  }, [user?.dioceseId, user?.parishId]);

  // Filtrar ciudades basado en searchCity
  useEffect(() => {
      if (!searchCity) {
          setCiudadesFiltradas(ciudades);
      } else {
          const lower = searchCity.toLowerCase();
          const filtered = ciudades.filter(c => c.nombre && String(c.nombre).toLowerCase().includes(lower));
          setCiudadesFiltradas(filtered);
      }
  }, [searchCity, ciudades]);

  // Cargar Ministros desde localStorage
  useEffect(() => {
      if (!user?.parishId) return;

      const keysToCheck = [
          `parroco_${user.parishId}`, `parroco_${user.dioceseId}`,
          `parrocos_${user.parishId}`, `parrocos_${user.dioceseId}`,
          `priest_${user.parishId}`, `priest_${user.dioceseId}`,
          `priests_${user.parishId}`, `priests_${user.dioceseId}`,
          `minister_${user.parishId}`, `minister_${user.dioceseId}`,
          `ministers_${user.parishId}`, `ministers_${user.dioceseId}`,
          'parroco', 'parrocos', 'priest', 'priests', 'minister', 'ministers'
      ];

      let foundMinisters = [];

      for (const key of keysToCheck) {
          if (foundMinisters.length > 0) break;
          try {
              const storedData = localStorage.getItem(key);
              if (storedData) {
                  const parsed = JSON.parse(storedData);
                  if (Array.isArray(parsed) && parsed.length > 0) foundMinisters = parsed;
                  else if (parsed && typeof parsed === 'object') foundMinisters = [parsed];
              }
          } catch (e) {}
      }

      if (foundMinisters.length > 0) {
          setMinistersList(foundMinisters);
          setMinistersFiltrados(foundMinisters);
          setMinistersFaithFiltrados(foundMinisters);
      } else {
          setMinistersList([]);
          setMinistersFiltrados([]);
          setMinistersFaithFiltrados([]);
      }
  }, [user?.parishId, user?.dioceseId]);

  // Encontrar Párroco Activo para "Da Fe" al Cargar
  useEffect(() => {
    if (ministersList.length > 0) {
        const activePriest = ministersList.find(m => {
            const status = String(m.estado || m.status || '').toLowerCase();
            return status === 'activo' || status === 'active' || status === '1' || m.active === true;
        });

        if (activePriest) {
            const name = `${activePriest.nombre || activePriest.name} ${activePriest.apellido || ''}`.trim();
            setFormData(prev => ({ ...prev, daFe: name }));
            setSearchMinisterFaith(name);
        }
    }
  }, [ministersList]);

  // Filtrar Ministros basado en searchMinister (Sacerdote)
  useEffect(() => {
    if (!searchMinister) setMinistersFiltrados(ministersList);
    else {
        const lowerTerm = searchMinister.toLowerCase();
        setMinistersFiltrados(ministersList.filter(m => {
            const fullName = `${m.nombre || m.name} ${m.apellido || ''}`.trim().toLowerCase();
            return fullName.includes(lowerTerm);
        }));
    }
  }, [searchMinister, ministersList]);

  // Filtrar Ministros basado en searchMinisterFaith (Da Fe)
  useEffect(() => {
    if (!searchMinisterFaith) setMinistersFaithFiltrados(ministersList);
    else {
        const lowerTerm = searchMinisterFaith.toLowerCase();
        setMinistersFaithFiltrados(ministersList.filter(m => {
            const fullName = `${m.nombre || m.name} ${m.apellido || ''}`.trim().toLowerCase();
            return fullName.includes(lowerTerm);
        }));
    }
  }, [searchMinisterFaith, ministersList]);

  // Encontrar Sacerdote por Fecha de Bautismo
  useEffect(() => {
      if (!formData.fechaSacramento || ministersList.length === 0) return;

      const baptismDate = new Date(formData.fechaSacramento);
      baptismDate.setHours(0, 0, 0, 0);

      const foundMinister = ministersList.find(m => {
          const startDateStr = m.fechaIngreso || m.fecha_ingreso || m.startDate || m.start_date || m.fechaNombramiento;
          const endDateStr = m.fechaSalida || m.fecha_salida || m.endDate || m.end_date;
          if (!startDateStr) return false;

          const startDate = new Date(startDateStr);
          startDate.setHours(0, 0, 0, 0);

          let endDate = null;
          if (endDateStr) {
              endDate = new Date(endDateStr);
              endDate.setHours(0, 0, 0, 0);
          }

          return startDate <= baptismDate && (!endDate || endDate >= baptismDate);
      });

      if (foundMinister) {
          const name = `${foundMinister.nombre || foundMinister.name} ${foundMinister.apellido || ''}`.trim();
          setFormData(prev => ({ ...prev, ministro: name }));
          setSearchMinister(name);
      } else {
          setFormData(prev => ({ ...prev, ministro: '' }));
          setSearchMinister('');
      }
  }, [formData.fechaSacramento, ministersList]);

  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMinisterChange = (e) => {
      const { value } = e.target;
      setSearchMinister(value);
      setFormData(prev => ({ ...prev, ministro: value }));
  };
  
  const handleMinisterFaithChange = (e) => {
    const { value } = e.target;
    setSearchMinisterFaith(value);
    setFormData(prev => ({ ...prev, daFe: value }));
  };

  const handleCityChange = (e) => {
      const { value } = e.target;
      setSearchCity(value);
      setFormData(prev => ({ ...prev, lugarNacimientoDetalle: value }));
  };

  const validateForm = async () => {
      const requiredFields = [
          { field: 'numeroLibro', label: 'Libro' },
          { field: 'folio', label: 'Folio' },
          { field: 'numeroActa', label: 'Número' },
          { field: 'nombres', label: 'Nombres del Bautizado' },
          { field: 'apellidos', label: 'Apellidos del Bautizado' },
          { field: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
          { field: 'fechaSacramento', label: 'Fecha de Bautismo' },
          { field: 'lugarBautismoDetalle', label: 'Lugar del Bautismo' },
          { field: 'ministro', label: 'Ministro' }
      ];

      for (const req of requiredFields) {
          if (!formData[req.field]) {
              toast({ title: "Campo Requerido", description: `Por favor complete: ${req.label}`, variant: "destructive" });
              return false;
          }
      }

      if (new Date(formData.fechaNacimiento) > new Date(formData.fechaSacramento)) {
          toast({ title: "Fecha Inválida", description: "La fecha de nacimiento no puede ser posterior a la fecha de bautismo.", variant: "destructive" });
          return false;
      }

      const numberCheck = await validateBaptismNumbers(formData.numeroLibro, formData.folio, formData.numeroActa, user?.parishId);
      if (!numberCheck.valid) {
          toast({ title: "Error de Duplicidad", description: numberCheck.message, variant: "destructive" });
          return false;
      }

      return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) return;
    
    setIsSubmitting(true);

    try {
        const baptismData = {
            // Metadatos
            type: 'baptism',
            parishId: user?.parishId,
            dioceseId: user?.dioceseId, 
            estado: 'permanente',
            status: 'seated',

            // 1. Numeración (Unificada)
            libro: formData.numeroLibro,
            book_number: formData.numeroLibro, 
            folio: formData.folio,
            page_number: formData.folio, 
            numero: formData.numeroActa,
            numeroActa: formData.numeroActa,
            entry_number: formData.numeroActa,

            // 2. Datos del Sacramento
            fechaSacramento: formData.fechaSacramento,
            fecbau: formData.fechaSacramento,
            sacramentDate: formData.fechaSacramento, 
            lugarBautismo: formData.lugarBautismoDetalle,
            lugarBautismoDetalle: formData.lugarBautismoDetalle,
            lugbau: formData.lugarBautismoDetalle,

            // 3. Datos del Bautizado
            nombres: formData.nombres,
            firstName: formData.nombres, 
            apellidos: formData.apellidos,
            lastName: formData.apellidos, 
            fechaNacimiento: formData.fechaNacimiento,
            fecnac: formData.fechaNacimiento,
            birthDate: formData.fechaNacimiento, 
            lugarNacimiento: formData.lugarNacimientoDetalle,
            lugarNacimientoDetalle: formData.lugarNacimientoDetalle,
            lugnac: formData.lugarNacimientoDetalle,
            lugarn: formData.lugarNacimientoDetalle,
            sexo: formData.sexo,
            sex: formData.sexo, 

            // 4. Datos de los Padres
            tipoUnionPadres: formData.tipoUnionPadres,
            tipohijo: formData.tipoUnionPadres,
            nombrePadre: formData.nombrePadre,
            padre: formData.nombrePadre,
            fatherName: formData.nombrePadre,
            cedulaPadre: formData.cedulaPadre,
            cedupad: formData.cedulaPadre,
            fatherId: formData.cedulaPadre,
            nombreMadre: formData.nombreMadre,
            madre: formData.nombreMadre,
            motherName: formData.nombreMadre,
            cedulaMadre: formData.cedulaMadre,
            cedumad: formData.cedulaMadre,
            motherId: formData.cedulaMadre,

            // 5. Abuelos y Padrinos
            abuelosPaternos: formData.abuelosPaternos,
            abuepat: formData.abuelosPaternos,
            paternalGrandparents: formData.abuelosPaternos,
            abuelosMaternos: formData.abuelosMaternos,
            abuemat: formData.abuelosMaternos,
            maternalGrandparents: formData.abuelosMaternos,
            padrinos: formData.padrinos,
            godparents: formData.padrinos, 

            // 6. Ministro y Registro Legal
            ministro: formData.ministro,
            minister: formData.ministro,
            daFe: formData.daFe,
            dafe: formData.daFe,
            ministerFaith: formData.daFe,
            
            // Notas
            notaMarginal: formData.observaciones,
            notaAlMargen: formData.observaciones,
            marginNote: formData.observaciones,
            
            parents: [
                 formData.nombrePadre ? `${formData.nombrePadre} (Padre)` : null,
                 formData.nombreMadre ? `${formData.nombreMadre} (Madre)` : null
            ].filter(Boolean)
        };

        const result = await saveBaptismToSource(baptismData, user?.parishId, 'celebrated');
        
        if (result.success) {
            toast({ 
                title: "Bautismo registrado exitosamente", 
                description: "El registro ha sido guardado en el archivo histórico." ,
                className: "bg-green-50 border-green-200 text-green-900"
            });
            navigate('/parroquia/bautismo/partidas');
        } else {
            toast({ title: "Error al guardar", description: result.message, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error inesperado", description: "Ocurrió un error al procesar la solicitud.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title, number }) => (
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200 mt-8 first:mt-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B4932A] text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {number}
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-gray-500" />}
              {title}
          </h3>
      </div>
  );

  return (
    <DashboardLayout entityName={user?.parishName || "Parroquia"}>
      <div className="mb-6 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 font-serif">Registrar Bautismo ya Celebrado</h1>
            <p className="text-gray-600 mt-1 font-medium">Digitalización de registros físicos antiguos o externos.</p>
        </div>
        <div className="bg-yellow-50 text-yellow-900 px-4 py-2 rounded-lg text-sm border border-yellow-200 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            Este formulario guarda directamente en el archivo histórico.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4B7BA7] via-[#D4AF37] to-[#4B7BA7]"></div>

        <div className="p-8 max-w-5xl mx-auto space-y-8">
            
            {/* SECCIÓN 1: NUMERACIÓN MANUAL */}
            <section>
                <SectionHeader number="1" title="Datos de Archivo (Libro Físico)" icon={BookOpen} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Libro No. <span className="text-red-600">*</span></label>
                        <input type="text" name="numeroLibro" required value={formData.numeroLibro} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none font-mono text-lg bg-white text-gray-900 font-semibold" placeholder="ej. 12" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Folio / Página <span className="text-red-600">*</span></label>
                        <input type="text" name="folio" required value={formData.folio} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none font-mono text-lg bg-white text-gray-900 font-semibold" placeholder="ej. 45" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número de Acta <span className="text-red-600">*</span></label>
                        <input type="text" name="numeroActa" required value={formData.numeroActa} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none font-mono text-lg bg-white text-gray-900 font-semibold" placeholder="ej. 342" />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: DATOS DEL BAUTISMO */}
            <section>
                <SectionHeader number="2" title="Datos de la Celebración" icon={Calendar} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Bautismo <span className="text-red-600">*</span></label>
                        <input type="date" name="fechaSacramento" required value={formData.fechaSacramento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none hover:border-[#4B7BA7] transition-colors text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Parroquia <span className="text-red-600">*</span></label>
                        <input 
                            type="text" 
                            name="lugarBautismoDetalle" 
                            required 
                            readOnly
                            placeholder="Parroquia no configurada"
                            value={formData.lugarBautismoDetalle || ''} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none bg-gray-50 text-gray-600 cursor-not-allowed font-medium uppercase" 
                        />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: DATOS DEL BAUTIZADO */}
            <section>
                <SectionHeader number="3" title="Datos del Bautizado" icon={User} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Apellidos <span className="text-red-600">*</span></label>
                        <input type="text" name="apellidos" required value={formData.apellidos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none uppercase font-bold text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombres <span className="text-red-600">*</span></label>
                        <input type="text" name="nombres" required value={formData.nombres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none uppercase font-bold text-gray-900" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Sexo</label>
                        <select name="sexo" value={formData.sexo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none bg-white text-gray-900">
                            <option value="">Seleccione...</option>
                            <option value="MASCULINO">Masculino</option>
                            <option value="FEMENINO">Femenino</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Nacimiento <span className="text-red-600">*</span></label>
                        <input type="date" name="fechaNacimiento" required value={formData.fechaNacimiento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Lugar Nacimiento</label>
                        <input 
                            list="places-list"
                            type="text" 
                            name="lugarNacimientoDetalle" 
                            value={formData.lugarNacimientoDetalle} 
                            onChange={handleCityChange} 
                            placeholder="Seleccione o escriba..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" 
                        />
                        <datalist id="places-list">
                            {ciudadesFiltradas.length > 0 ? (
                                ciudadesFiltradas.map((ciudad) => (
                                    <option key={ciudad.id || ciudad.nombre} value={ciudad.nombre} />
                                ))
                            ) : (
                                <option value="No hay ciudades disponibles" disabled />
                            )}
                        </datalist>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 4: DATOS DE LOS PADRES */}
            <section>
                <SectionHeader number="4" title="Datos de los Padres" icon={Users} />
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Unión</label>
                    <select name="tipoUnionPadres" value={formData.tipoUnionPadres} onChange={handleChange} className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none bg-white text-gray-900">
                        <option value="">Seleccione...</option>
                        <option value="MATRIMONIO CATÓLICO">Matrimonio Católico</option>
                        <option value="MATRIMONIO CIVIL">Matrimonio Civil</option>
                        <option value="UNIÓN LIBRE">Unión Libre</option>
                        <option value="MADRE SOLTERA">Madre Soltera</option>
                        <option value="OTRO">Otro</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 hover:border-blue-300 transition-colors">
                        <h4 className="font-bold text-blue-900 text-xs uppercase mb-4 flex items-center gap-2">
                             <User className="w-3 h-3" /> Padre
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                                <input type="text" name="nombrePadre" value={formData.nombrePadre} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Identificación</label>
                                <input type="text" name="cedulaPadre" value={formData.cedulaPadre} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white text-gray-900" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-pink-50 p-5 rounded-xl border border-pink-200 hover:border-pink-300 transition-colors">
                        <h4 className="font-bold text-pink-900 text-xs uppercase mb-4 flex items-center gap-2">
                            <User className="w-3 h-3" /> Madre
                        </h4>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                                <input type="text" name="nombreMadre" value={formData.nombreMadre} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none text-sm bg-white text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Identificación</label>
                                <input type="text" name="cedulaMadre" value={formData.cedulaMadre} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none text-sm bg-white text-gray-900" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 5: ABUELOS */}
            <section>
                <SectionHeader number="5" title="Abuelos" icon={Users} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Abuelos Paternos</label>
                        <textarea name="abuelosPaternos" value={formData.abuelosPaternos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none h-24 text-sm resize-none text-gray-900" placeholder="Nombres..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Abuelos Maternos</label>
                        <textarea name="abuelosMaternos" value={formData.abuelosMaternos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none h-24 text-sm resize-none text-gray-900" placeholder="Nombres..." />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 6 & 7: PADRINOS Y MINISTRO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section>
                    <SectionHeader number="6" title="Padrinos" icon={Users} />
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombres de Padrinos</label>
                        <textarea name="padrinos" value={formData.padrinos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none h-24 text-sm resize-none text-gray-900" placeholder="Nombres completos..." />
                    </div>
                </section>
                <section>
                    <SectionHeader number="7" title="Ministro y Notas" icon={PenTool} />
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-[#111111] mb-1">Ministro (Sacerdote) <span className="text-red-600">*</span></label>
                                <input 
                                    list="ministers-list" 
                                    type="text" 
                                    name="ministro" 
                                    required 
                                    value={formData.ministro} 
                                    onChange={handleMinisterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" 
                                    placeholder="Se completa automáticamente" 
                                />
                                <datalist id="ministers-list">
                                    {ministersFiltrados.map((m, i) => {
                                        const displayName = `${m.nombre || m.name} ${m.apellido || ''}`.trim();
                                        return <option key={i} value={displayName} />;
                                    })}
                                </datalist>
                                <p className="text-xs text-gray-500 mt-1">Se completa automáticamente según la fecha del bautismo</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#111111] mb-1">Ministro (Da Fe) <span className="text-red-600">*</span></label>
                                <input 
                                    list="ministers-faith-list"
                                    type="text" 
                                    name="daFe" 
                                    value={formData.daFe} 
                                    onChange={handleMinisterFaithChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" 
                                    placeholder="Seleccione o escriba..."
                                />
                                <datalist id="ministers-faith-list">
                                    {ministersFaithFiltrados.map((m, i) => {
                                        const displayName = `${m.nombre || m.name} ${m.apellido || ''}`.trim();
                                        return <option key={i} value={displayName} />;
                                    })}
                                </datalist>
                                <p className="text-xs text-gray-500 mt-1">Párroco actual activo</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones / Notas Marginales</label>
                            <input type="text" name="observaciones" value={formData.observaciones} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                        </div>
                    </div>
                </section>
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4 sticky bottom-0 bg-white/95 backdrop-blur py-4 z-10">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(-1)} 
                    disabled={isSubmitting}
                    className="gap-2 text-gray-900 border-gray-300 hover:bg-gray-100"
                >
                    <X className="w-4 h-4" /> Cancelar
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#B4932A] hover:from-[#C4A027] hover:to-[#A4831A] text-white gap-2 px-8 shadow-lg shadow-yellow-500/20 transform active:scale-95 transition-all font-bold"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" /> 
                    )}
                    {isSubmitting ? 'Guardando...' : 'Guardar en Archivo Histórico'}
                </Button>
            </div>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default BaptismCelebratedPage;
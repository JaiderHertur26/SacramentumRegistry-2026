
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

  // Initial Form Data
  const initialFormData = {
    // Section 1: Numeración Manual
    book_number: '',
    page_number: '',
    entry_number: '',

    // Section 2: Datos del Bautismo
    sacramentDate: '',
    place: '', // Will be set from Mis Datos
    
    // Section 3: Datos del Bautizado
    lastName: '',
    firstName: '',
    sex: '',
    birthDate: '',
    birthPlace: '',

    // Section 4: Datos de los Padres
    parentsUnionType: '',
    fatherName: '',
    fatherId: '',
    motherName: '',
    motherId: '',

    // Section 5: Abuelos
    paternalGrandparents: '',
    maternalGrandparents: '',

    // Section 6: Padrinos
    godparents: '',

    // Section 7: Ministro / Da Fe
    minister: '',
    ministerFaith: '', // Stores the active priest or manually selected one
    observations: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Initialize catalogs
  useEffect(() => {
      setCatalogs({
          ministers: ['Párroco', 'Vicario'], 
          places: ['Templo Parroquial', 'Capilla Filial']
      });
  }, []);

  // Fetch Parish Name from "Mis Datos"
  useEffect(() => {
      const loadParishData = async () => {
          if (!user?.parishId) return;

          console.log("🔍 Iniciando búsqueda de datos de parroquia en localStorage...");

          const keysToCheck = [
              `misDatos_${user.parishId}`,
              `misDatos_${user.dioceseId}`,
              `mis_datos_${user.parishId}`,
              `mis_datos_${user.dioceseId}`,
              `myData_${user.parishId}`,
              `myData_${user.dioceseId}`,
              `parishData_${user.parishId}`,
              `parishData_${user.dioceseId}`,
              `parish_${user.parishId}`,
              `parish_${user.dioceseId}`,
              'misDatos',
              'mis_datos',
              'myData',
              'parishData'
          ];
          
          let parishNameFound = null;

          for (const key of keysToCheck) {
              if (parishNameFound) break; // Stop if found
              
              try {
                  const storedData = localStorage.getItem(key);
                  if (storedData) {
                      console.log(`📦 Datos encontrados en key: ${key}`);
                      const parsedData = JSON.parse(storedData);
                      
                      // Check if it's an array and has items
                      if (Array.isArray(parsedData) && parsedData.length > 0) {
                          const record = parsedData[0];
                          if (record.nombre) {
                              parishNameFound = record.nombre;
                              console.log(`✅ Nombre recuperado exitosamente: ${parishNameFound}`);
                          }
                      } 
                      // Check if it's a single object
                      else if (parsedData && typeof parsedData === 'object' && parsedData.nombre) {
                          parishNameFound = parsedData.nombre;
                          console.log(`✅ Nombre recuperado exitosamente (objeto): ${parishNameFound}`);
                      }
                  }
              } catch (error) {
                  console.warn(`⚠️ Error leyendo key ${key}:`, error);
              }
          }

          // Fallback to User Context if Mis Datos search failed
          if (!parishNameFound) {
              parishNameFound = user.parishName || user.parish_name || '';
              console.log(`📋 Usando fallback del contexto de usuario: ${parishNameFound}`);
          }

          if (parishNameFound) {
              setFormData(prev => ({ 
                  ...prev, 
                  place: parishNameFound
              }));
          } else {
              console.error("❌ No se pudo encontrar el nombre de la parroquia en ninguna fuente.");
          }
      };
      
      loadParishData();
  }, [user]);

  // Load cities from localStorage
  useEffect(() => {
      if (user?.dioceseId) {
          const dioceseKey = `ciudades_${user.dioceseId}`;
          console.log(`🔍 Buscando ciudades en: ${dioceseKey}`);
          
          try {
              let parsed = JSON.parse(localStorage.getItem(dioceseKey) || '[]');
              
              // Fallback logic for Parish scope if Diocese scope is empty
              if (parsed.length === 0 && user.parishId) {
                  const parishKey = `ciudades_${user.parishId}`;
                  const parishData = JSON.parse(localStorage.getItem(parishKey) || '[]');
                  if (parishData.length > 0) {
                      parsed = parishData;
                      console.log(`📦 Ciudades cargadas desde scope parroquial: ${parishKey}`);
                  }
              }

              if (Array.isArray(parsed) && parsed.length > 0) {
                  console.log(`✅ Ciudades cargadas: ${parsed.length}`);
                  setCiudades(parsed);
                  setCiudadesFiltradas(parsed);
              } else {
                  console.log(`ℹ️ No se encontraron ciudades.`);
                  setCiudades([]);
                  setCiudadesFiltradas([]);
              }
          } catch (e) {
              console.error("❌ Error cargando ciudades:", e);
          }
      }
  }, [user?.dioceseId, user?.parishId]);

  // Filter cities based on searchCity
  useEffect(() => {
      if (!searchCity) {
          setCiudadesFiltradas(ciudades);
      } else {
          const lower = searchCity.toLowerCase();
          const filtered = ciudades.filter(c => 
              c.nombre && String(c.nombre).toLowerCase().includes(lower)
          );
          setCiudadesFiltradas(filtered);
      }
  }, [searchCity, ciudades]);

  // Load Ministers from localStorage
  useEffect(() => {
      if (!user?.parishId) return;

      console.log("🔍 Buscando lista de ministros en localStorage...");
      console.log(`📋 parishId: ${user.parishId}`);

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
                  if (Array.isArray(parsed) && parsed.length > 0) {
                      foundMinisters = parsed;
                      console.log(`✅ Lista de ministros encontrada en: ${key}`);
                  } else if (parsed && typeof parsed === 'object') {
                      // Handle single object case by wrapping in array
                      foundMinisters = [parsed];
                      console.log(`✅ Ministro individual encontrado en: ${key}`);
                  }
              }
          } catch (e) {
              console.warn(`⚠️ Error leyendo key ${key}`, e);
          }
      }

      if (foundMinisters.length > 0) {
          setMinistersList(foundMinisters);
          setMinistersFiltrados(foundMinisters);
          setMinistersFaithFiltrados(foundMinisters); // Initialize faith filter too
          console.log(`✅ Total ministros cargados: ${foundMinisters.length}`);
      } else {
          console.log("❌ Error: No se encontraron listas de párrocos/ministros.");
          setMinistersList([]);
          setMinistersFiltrados([]);
          setMinistersFaithFiltrados([]);
      }
  }, [user?.parishId, user?.dioceseId]);

  // Find Active Priest for "Da Fe" on Load
  useEffect(() => {
    if (ministersList.length > 0) {
        console.log("🔍 Buscando párroco activo para 'Da Fe'...");
        const activePriest = ministersList.find(m => {
            const status = String(m.estado || m.status || '').toLowerCase();
            return status === 'activo' || status === 'active' || status === '1' || m.active === true;
        });

        if (activePriest) {
            const name = `${activePriest.nombre || activePriest.name} ${activePriest.apellido || ''}`.trim();
            console.log(`✅ Párroco activo encontrado: ${name}`);
            setFormData(prev => ({ ...prev, ministerFaith: name }));
            setSearchMinisterFaith(name);
        } else {
            console.log("⚠️ No se encontró párroco con estado 'Activo'.");
        }
    }
  }, [ministersList]);

  // Filter Ministers based on searchMinister (Sacerdote)
  useEffect(() => {
    if (!searchMinister) {
        setMinistersFiltrados(ministersList);
    } else {
        const lowerTerm = searchMinister.toLowerCase();
        const filtered = ministersList.filter(m => {
            const fullName = `${m.nombre || m.name} ${m.apellido || ''}`.trim().toLowerCase();
            return fullName.includes(lowerTerm);
        });
        setMinistersFiltrados(filtered);
    }
  }, [searchMinister, ministersList]);

  // Filter Ministers based on searchMinisterFaith (Da Fe)
  useEffect(() => {
    if (!searchMinisterFaith) {
        setMinistersFaithFiltrados(ministersList);
    } else {
        const lowerTerm = searchMinisterFaith.toLowerCase();
        const filtered = ministersList.filter(m => {
            const fullName = `${m.nombre || m.name} ${m.apellido || ''}`.trim().toLowerCase();
            return fullName.includes(lowerTerm);
        });
        setMinistersFaithFiltrados(filtered);
    }
  }, [searchMinisterFaith, ministersList]);

  // Find Priest by Baptism Date and Auto-populate ONLY "Sacerdote"
  useEffect(() => {
      if (!formData.sacramentDate || ministersList.length === 0) return;

      console.log("🔍 Buscando párroco según fecha del bautismo");
      console.log(`📅 Fecha del bautismo: ${formData.sacramentDate}`);

      const baptismDate = new Date(formData.sacramentDate);
      baptismDate.setHours(0, 0, 0, 0); // Normalize time

      const foundMinister = ministersList.find(m => {
          // Normalize dates from various possible field names
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

          // Logic: started BEFORE or ON baptism date AND (ended AFTER baptism date OR hasn't ended)
          const isAfterStart = startDate <= baptismDate;
          const isBeforeEnd = !endDate || endDate >= baptismDate;

          return isAfterStart && isBeforeEnd;
      });

      if (foundMinister) {
          const name = `${foundMinister.nombre || foundMinister.name} ${foundMinister.apellido || ''}`.trim();
          console.log(`✅ Párroco encontrado para fecha de bautismo: ${name}`);
          
          setFormData(prev => ({
              ...prev,
              minister: name
              // Removed ministerFaith update here to keep it independent
          }));
          
          setSearchMinister(name); // Sync search field for datalist
      } else {
          console.log("⚠️ No se encontró párroco para la fecha especificada.");
          setFormData(prev => ({
              ...prev,
              minister: ''
          }));
          setSearchMinister('');
      }

  }, [formData.sacramentDate, ministersList]);


  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
      }));
  };

  const handleMinisterChange = (e) => {
      const { value } = e.target;
      setSearchMinister(value);
      setFormData(prev => ({
          ...prev,
          minister: value
      }));
  };
  
  const handleMinisterBlur = () => {
    // Optional: validation or auto-formatting on blur can go here
  };

  const handleMinisterFaithChange = (e) => {
    const { value } = e.target;
    setSearchMinisterFaith(value);
    setFormData(prev => ({
        ...prev,
        ministerFaith: value
    }));
  };

  const handleMinisterFaithSelect = (e) => {
     // Optional: logic when leaving the field
     console.log("✅ Ministro Da Fe seleccionado:", formData.ministerFaith);
  };

  const handleCityChange = (e) => {
      const { value } = e.target;
      setSearchCity(value);
      setFormData(prev => ({ ...prev, birthPlace: value }));
  };

  const handleCitySelect = (e) => {
      const { value } = e.target;
      if (value) {
        setFormData(prev => ({ ...prev, birthPlace: value }));
      }
  };

  const validateForm = async () => {
      const requiredFields = [
          { field: 'book_number', label: 'Libro' },
          { field: 'page_number', label: 'Folio' },
          { field: 'entry_number', label: 'Número' },
          { field: 'firstName', label: 'Nombres del Bautizado' },
          { field: 'lastName', label: 'Apellidos del Bautizado' },
          { field: 'birthDate', label: 'Fecha de Nacimiento' },
          { field: 'sacramentDate', label: 'Fecha de Bautismo' },
          { field: 'place', label: 'Lugar del Bautismo' },
          { field: 'minister', label: 'Ministro' }
      ];

      for (const req of requiredFields) {
          if (!formData[req.field]) {
              toast({
                  title: "Campo Requerido",
                  description: `Por favor complete: ${req.label}`,
                  variant: "destructive"
              });
              return false;
          }
      }

      // Date Validation
      if (new Date(formData.birthDate) > new Date(formData.sacramentDate)) {
          toast({
              title: "Fecha Inválida",
              description: "La fecha de nacimiento no puede ser posterior a la fecha de bautismo.",
              variant: "destructive"
          });
          return false;
      }

      // Duplicate Numbers Validation
      const numberCheck = await validateBaptismNumbers(
          formData.book_number, 
          formData.page_number, 
          formData.entry_number, 
          user?.parishId
      );

      if (!numberCheck.valid) {
          toast({
              title: "Error de Duplicidad",
              description: numberCheck.message,
              variant: "destructive"
          });
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
            // Core Fields for Identification
            type: 'baptism',
            parishId: user?.parishId,
            dioceseId: user?.dioceseId, 
            
            // Manual Numbers
            book_number: formData.book_number,
            page_number: formData.page_number,
            entry_number: formData.entry_number,

            // Core Personal Data
            firstName: formData.firstName,
            lastName: formData.lastName,
            sacramentDate: formData.sacramentDate,
            birthDate: formData.birthDate,
            birthPlace: formData.birthPlace,
            minister: formData.minister,
            
            // Structured Relations
            parents: [
                 { name: formData.fatherName, role: 'father', idNumber: formData.fatherId },
                 { name: formData.motherName, role: 'mother', idNumber: formData.motherId }
            ].filter(p => p.name),
            
            godparents: [
                { name: formData.godparents, role: 'godparents' }
            ],
            
            // Metadata / Extended
            metadata: {
                place: formData.place,
                sex: formData.sex,
                parentsUnionType: formData.parentsUnionType,
                paternalGrandparents: formData.paternalGrandparents,
                maternalGrandparents: formData.maternalGrandparents,
                observations: formData.observations,
                ministerFaith: formData.ministerFaith // Save the manually set or active minister
            }
        };

        const result = await saveBaptismToSource(baptismData, user?.parishId, 'celebrated');
        
        if (result.success) {
            toast({ 
                title: "Bautismo registrado exitosamente", 
                description: "El registro ha sido guardado en el archivo histórico." 
            });
            navigate('/parroquia/bautismo/partidas');
        } else {
            toast({ 
                title: "Error al guardar", 
                description: result.message,
                variant: "destructive" 
            });
        }
    } catch (error) {
        toast({
            title: "Error inesperado",
            description: "Ocurrió un error al procesar la solicitud.",
            variant: "destructive"
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Helper for Section Headers
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
                        <input type="text" name="book_number" required value={formData.book_number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none font-mono text-lg bg-white text-gray-900 font-semibold" placeholder="ej. 12" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Folio / Página <span className="text-red-600">*</span></label>
                        <input type="text" name="page_number" required value={formData.page_number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none font-mono text-lg bg-white text-gray-900 font-semibold" placeholder="ej. 45" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número de Acta <span className="text-red-600">*</span></label>
                        <input type="text" name="entry_number" required value={formData.entry_number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none font-mono text-lg bg-white text-gray-900 font-semibold" placeholder="ej. 342" />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: DATOS DEL BAUTISMO */}
            <section>
                <SectionHeader number="2" title="Datos de la Celebración" icon={Calendar} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Bautismo <span className="text-red-600">*</span></label>
                        <input type="date" name="sacramentDate" required value={formData.sacramentDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none hover:border-[#4B7BA7] transition-colors text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Parroquia <span className="text-red-600">*</span></label>
                        <input 
                            type="text" 
                            name="place" 
                            required 
                            readOnly
                            value={formData.place} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none bg-gray-50 text-gray-600 cursor-not-allowed font-medium" 
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
                        <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none uppercase font-bold text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombres <span className="text-red-600">*</span></label>
                        <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none uppercase font-bold text-gray-900" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Sexo</label>
                        <select name="sex" value={formData.sex} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none bg-white text-gray-900">
                            <option value="">Seleccione...</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Nacimiento <span className="text-red-600">*</span></label>
                        <input type="date" name="birthDate" required value={formData.birthDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Lugar Nacimiento</label>
                        <input 
                            list="places-list"
                            type="text" 
                            name="birthPlace" 
                            value={formData.birthPlace} 
                            onChange={handleCityChange} 
                            onBlur={handleCitySelect}
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
                    <select name="parentsUnionType" value={formData.parentsUnionType} onChange={handleChange} className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none bg-white text-gray-900">
                        <option value="">Seleccione...</option>
                        <option value="Matrimonio Católico">Matrimonio Católico</option>
                        <option value="Matrimonio Civil">Matrimonio Civil</option>
                        <option value="Unión Libre">Unión Libre</option>
                        <option value="Madre Soltera">Madre Soltera</option>
                        <option value="Otro">Otro</option>
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
                                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Identificación</label>
                                <input type="text" name="fatherId" value={formData.fatherId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white text-gray-900" />
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
                                <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none text-sm bg-white text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Identificación</label>
                                <input type="text" name="motherId" value={formData.motherId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none text-sm bg-white text-gray-900" />
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
                        <textarea name="paternalGrandparents" value={formData.paternalGrandparents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none h-24 text-sm resize-none text-gray-900" placeholder="Nombres..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Abuelos Maternos</label>
                        <textarea name="maternalGrandparents" value={formData.maternalGrandparents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none h-24 text-sm resize-none text-gray-900" placeholder="Nombres..." />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 6 & 7: PADRINOS Y MINISTRO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section>
                    <SectionHeader number="6" title="Padrinos" icon={Users} />
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombres de Padrinos</label>
                        <textarea name="godparents" value={formData.godparents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none h-24 text-sm resize-none text-gray-900" placeholder="Nombres completos..." />
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
                                    name="minister" 
                                    required 
                                    value={formData.minister} 
                                    onChange={handleMinisterChange}
                                    onBlur={handleMinisterBlur}
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
                                    name="ministerFaith" 
                                    value={formData.ministerFaith} 
                                    onChange={handleMinisterFaithChange}
                                    onBlur={handleMinisterFaithSelect}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" 
                                    placeholder="Seleccione o escriba..."
                                />
                                <datalist id="ministers-faith-list">
                                    {ministersFaithFiltrados.map((m, i) => {
                                        const displayName = `${m.nombre || m.name} ${m.apellido || ''}`.trim();
                                        return <option key={i} value={displayName} />;
                                    })}
                                </datalist>
                                <p className="text-xs text-gray-500 mt-1">Párroco actual activo (puede cambiar manualmente)</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones / Notas Marginales</label>
                            <input type="text" name="observations" value={formData.observations} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B7BA7] outline-none text-gray-900" />
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

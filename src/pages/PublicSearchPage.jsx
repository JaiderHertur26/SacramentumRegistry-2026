
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Church, Calendar, BookOpen, Lock, User, AlertCircle, Info, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const PublicSearchPage = () => {
  const { login } = useAuth();
  const { data, getBaptisms, getConfirmations, getMatrimonios, getMisDatosList } = useAppData();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login State
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Search State
  const [searchParams, setSearchParams] = useState({
    firstName: '',
    lastName: '',
    sacramentType: '',
    dateStart: '',
    dateEnd: '',
    dioceseId: '',
    parishId: ''
  });
  
  const [results, setResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // New state for filtered parishes
  const [filteredParishes, setFilteredParishes] = useState([]);

  // Filter Parishes Effect
  useEffect(() => {
    const allParishes = data.parishes || [];

    if (searchParams.dioceseId === 'all') {
      // Filter out parishes that might not be linked to a diocese
      const validParishes = allParishes.filter(p => p.dioceseId !== null && p.dioceseId !== undefined);
      setFilteredParishes(validParishes);
    } else if (searchParams.dioceseId) {
      const filtered = allParishes.filter(p => p.dioceseId === searchParams.dioceseId);
      setFilteredParishes(filtered);
    } else {
      setFilteredParishes([]);
    }
  }, [searchParams.dioceseId, data.parishes]);

  // Derived Options for Diocese
  const dioceseOptions = useMemo(() => {
    return [
        { value: 'all', label: 'Todas las Diócesis' },
        ...data.dioceses.map(d => ({ value: d.id, label: d.name }))
    ];
  }, [data.dioceses]);

  const sacramentOptions = [
      { value: 'baptism', label: 'Bautismo' },
      { value: 'confirmation', label: 'Confirmación' },
      { value: 'marriage', label: 'Matrimonio' },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    const username = credentials.username;
    const password = credentials.password;

    // Simulate network delay for better UX
    setTimeout(() => {
        const loginResult = login(username, password);
        
        if (loginResult.success) {
            toast({ title: "Bienvenido", description: `Bienvenido, ${loginResult.user.username}` });
            setCredentials({ username: '', password: '' }); 
            navigate(loginResult.redirectPath);
        } else {
            setLoginError(loginResult.error);
            toast({ title: "Error de autenticación", description: loginResult.error, variant: "destructive" });
        }
        setLoginLoading(false);
    }, 800);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    // Validation: Diocese Required
    if (!searchParams.dioceseId) {
        toast({ title: "Campo Requerido", description: "Por favor seleccione una Diócesis.", variant: "destructive" });
        return;
    }

    // Validation: Name or Surname Required
    if (!searchParams.firstName.trim() && !searchParams.lastName.trim()) {
        toast({ 
            title: "Información Insuficiente", 
            description: "Ingrese Nombres o Apellidos para realizar la búsqueda.", 
            variant: "destructive" 
        });
        return;
    }

    if (searchParams.dateStart && searchParams.dateEnd) {
        if (new Date(searchParams.dateStart) > new Date(searchParams.dateEnd)) {
            toast({ title: "Fecha Inválida", description: "La fecha de inicio no puede ser mayor a la fecha fin.", variant: "destructive" });
            return;
        }
    }

    setSearchLoading(true);
    try {
        let allResults = [];
        
        // Determine scope of search (which parishes to check)
        let parishesToSearch = [];
        if (searchParams.parishId && searchParams.parishId !== 'all') {
             const p = data.parishes.find(p => p.id === searchParams.parishId);
             if (p) parishesToSearch.push(p);
        } else if (searchParams.dioceseId && searchParams.dioceseId !== 'all') {
             parishesToSearch = data.parishes.filter(p => p.dioceseId === searchParams.dioceseId);
        } else if (searchParams.dioceseId === 'all') {
             parishesToSearch = data.parishes;
        }

        // Search logic
        for (const parish of parishesToSearch) {
             // 1. Baptisms
             if (!searchParams.sacramentType || searchParams.sacramentType === 'baptism') {
                 const baptisms = getBaptisms(parish.id);
                 const filtered = baptisms.filter(r => matchesSearch(r, searchParams, 'baptism'));
                 allResults.push(...filtered.map(r => ({ ...r, type: 'baptism', parishId: parish.id, dioceseId: parish.dioceseId })));
             }

             // 2. Confirmations
             if (!searchParams.sacramentType || searchParams.sacramentType === 'confirmation') {
                 const confirmations = getConfirmations(parish.id);
                 const filtered = confirmations.filter(r => matchesSearch(r, searchParams, 'confirmation'));
                 allResults.push(...filtered.map(r => ({ ...r, type: 'confirmation', parishId: parish.id, dioceseId: parish.dioceseId })));
             }

             // 3. Marriages
             if (!searchParams.sacramentType || searchParams.sacramentType === 'marriage') {
                 const marriages = getMatrimonios(parish.id);
                 const filtered = marriages.filter(r => matchesSearch(r, searchParams, 'marriage'));
                 allResults.push(...filtered.map(r => ({ ...r, type: 'marriage', parishId: parish.id, dioceseId: parish.dioceseId })));
             }
        }

        setResults(allResults);

    } catch (error) {
        toast({ title: "Error", description: "Ocurrió un error al buscar.", variant: "destructive" });
        console.error(error);
    } finally {
        setSearchLoading(false);
    }
  };

  const matchesSearch = (record, params, type) => {
      // Name filter
      if (params.firstName) {
          const recordName = type === 'marriage' 
            ? `${record.groomName} ${record.brideName}` 
            : (record.firstName || record.nombres || '');
          if (!recordName.toLowerCase().includes(params.firstName.toLowerCase())) return false;
      }
      
      // Last Name filter
      if (params.lastName) {
          const recordLastName = type === 'marriage'
            ? `${record.groomSurname} ${record.brideSurname}`
            : (record.lastName || record.apellidos || '');
          if (!recordLastName.toLowerCase().includes(params.lastName.toLowerCase())) return false;
      }

      // Date Range filter
      const recordDate = record.sacramentDate || record.fechaBautismo || record.fechaConfirmacion || record.fechaMatrimonio;
      if (params.dateStart && recordDate < params.dateStart) return false;
      if (params.dateEnd && recordDate > params.dateEnd) return false;

      return true;
  };

  // Handlers for dynamic dropdowns
  const handleDioceseChange = (e) => {
      setSearchParams(prev => ({
          ...prev,
          dioceseId: e.target.value,
          parishId: '' // Clear parish when diocese changes
      }));
  };

  return (
    <>
      <Helmet>
        <title>{'Public Search'}</title>
      </Helmet>
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-0 opacity-10 pointer-events-none">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>

      <div className="min-h-screen flex flex-col lg:flex-row font-serif text-[#2C3E50] bg-gradient-to-br from-white to-[#4B7BA7]/10 relative z-10">
        <div className="w-full lg:w-1/3 bg-white p-8 lg:p-12 border-r border-gray-200 flex flex-col justify-center relative shadow-lg">
          
          <div className="max-w-md mx-auto w-full z-10">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-[#4B7BA7]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#4B7BA7]/20">
                <Church className="w-10 h-10 text-[#4B7BA7]" />
              </div>
              <h2 className="text-3xl font-bold font-serif text-[#2C3E50]">Sacramentum Registry</h2>
              <p className="text-gray-600 mt-2 font-sans">Acceso al sistema de gestión parroquial y diocesano.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 font-sans">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    placeholder="Ingrese su usuario"
                    value={credentials.username}
                    onChange={e => setCredentials({...credentials, username: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={e => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
              </div>

              {loginError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {loginError}
                  </div>
              )}

              <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C4A027] text-[#2C3E50]" disabled={loginLoading}>
                {loginLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </div>
        </div>

        <div className="w-full lg:w-2/3 p-8 lg:p-12 bg-gray-50 overflow-y-auto font-sans">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-serif text-[#2C3E50] mb-2">Consulta Pública de Sacramentos</h1>
              <p className="text-gray-600">Busque registros de sacramentos en todas las diócesis y parroquias afiliadas.</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Diocese (Required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diócesis <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    value={searchParams.dioceseId}
                    onChange={handleDioceseChange}
                    required
                  >
                    <option value="">Seleccione una Diócesis</option>
                    {dioceseOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Parish (Dynamic) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parroquia</label>
                  <select 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    value={searchParams.parishId}
                    onChange={e => setSearchParams({...searchParams, parishId: e.target.value})}
                    disabled={!searchParams.dioceseId || filteredParishes.length === 0}
                  >
                    <option value="">
                      {filteredParishes.length === 0 && searchParams.dioceseId 
                        ? "No hay Parroquias registradas en esta Diócesis" 
                        : "Seleccione una Parroquia (Opcional)"}
                    </option>
                    
                    {filteredParishes.length > 0 && (
                      <option value="all">
                        {searchParams.dioceseId === 'all' ? 'Todas las Parroquias' : 'Todas las Parroquias de esta Diócesis'}
                      </option>
                    )}

                    {filteredParishes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                 {/* Sacrament Type */}
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sacramento</label>
                  <select 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    value={searchParams.sacramentType}
                    onChange={e => setSearchParams({...searchParams, sacramentType: e.target.value})}
                  >
                    <option value="">Todos los Sacramentos</option>
                    {sacramentOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Names (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    placeholder="Nombre completo"
                    value={searchParams.firstName}
                    onChange={e => setSearchParams({...searchParams, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    placeholder="Apellidos"
                    value={searchParams.lastName}
                    onChange={e => setSearchParams({...searchParams, lastName: e.target.value})}
                  />
                </div>
                
                {/* Dates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    value={searchParams.dateStart}
                    onChange={e => setSearchParams({...searchParams, dateStart: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                    value={searchParams.dateEnd}
                    onChange={e => setSearchParams({...searchParams, dateEnd: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                  <Button type="submit" className="bg-[#4B7BA7] hover:bg-[#3B6B97] text-white gap-2 font-sans" disabled={searchLoading}>
                    <Search className="w-4 h-4" />
                    {searchLoading ? 'Buscando...' : 'Buscar Registros'}
                  </Button>
                </div>
              </form>
            </div>

            {results && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h3 className="font-semibold text-[#2C3E50] mb-4">Resultados ({results.length})</h3>
                {results.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500 font-sans">
                    No se encontraron registros que coincidan con su búsqueda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map(r => {
                       const parish = data.parishes.find(p => p.id === r.parishId);
                       const diocese = data.dioceses.find(d => d.id === r.dioceseId);
                       const sacramentName = sacramentOptions.find(o => o.value === r.type)?.label || r.type;
                       const name = r.type === 'marriage' ? `${r.groomName} & ${r.brideName}` : `${r.firstName} ${r.lastName}`;
                       
                       // Get detailed parish info from misDatos
                       const parishMisDatos = getMisDatosList(r.parishId);
                       const parishExtras = parishMisDatos.length > 0 ? parishMisDatos[0] : {};

                       return (
                        <div key={r.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-[#D4AF37] hover:shadow-lg transition-shadow font-sans">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-bold text-[#2C3E50]">{name}</h4>
                              <p className="text-gray-600 flex items-center gap-2 mt-1 text-sm">
                                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                                <span className="capitalize">{sacramentName}</span>
                              </p>
                            </div>
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              Registrado
                            </span>
                          </div>
                          
                          {/* Record Info */}
                          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 gap-2 text-sm mb-3">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Fecha: {r.sacramentDate || r.fechaBautismo || r.fechaConfirmacion || r.fechaMatrimonio}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Church className="w-4 h-4" />
                              <span>{parish?.name || 'Desconocida'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="font-semibold text-xs text-gray-400">Diócesis:</span>
                              <span>{diocese?.name || 'Desconocida'}</span>
                            </div>
                          </div>

                          {/* Parish Extras Info */}
                          {(parishExtras.direccion || parishExtras.ciudad || parishExtras.telefono || parishExtras.vicaria || parishExtras.decanato) && (
                              <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 p-2 rounded text-xs text-gray-600">
                                  <div className="flex items-center gap-1 font-semibold text-gray-700 mb-1">
                                      <Info className="w-3 h-3" />
                                      <span>Información de Parroquia</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1 pl-1">
                                      {parishExtras.direccion && (
                                          <div className="flex gap-1">
                                              <span className="font-medium text-gray-500 w-16">Dirección:</span>
                                              <span className="truncate">{parishExtras.direccion}</span>
                                          </div>
                                      )}
                                      {parishExtras.ciudad && (
                                          <div className="flex gap-1">
                                              <span className="font-medium text-gray-500 w-16">Ciudad:</span>
                                              <span>{parishExtras.ciudad}</span>
                                          </div>
                                      )}
                                      {parishExtras.telefono && (
                                          <div className="flex gap-1">
                                              <span className="font-medium text-gray-500 w-16">Teléfono:</span>
                                              <span>{parishExtras.telefono}</span>
                                          </div>
                                      )}
                                      {parishExtras.vicaria && (
                                          <div className="flex gap-1">
                                              <span className="font-medium text-gray-500 w-16">Vicaría:</span>
                                              <span>{parishExtras.vicaria}</span>
                                          </div>
                                      )}
                                      {parishExtras.decanato && (
                                          <div className="flex gap-1">
                                              <span className="font-medium text-gray-500 w-16">Decanato:</span>
                                              <span>{parishExtras.decanato}</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                        </div>
                       );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicSearchPage;

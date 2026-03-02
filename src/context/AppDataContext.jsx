
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    generateUUID,
    validateJSONStructure,
    incrementPaddedValue
} from '@/utils/supabaseHelpers';
import { separateNewAndDuplicateConfirmations } from '@/utils/confirmationJsonMapper';
import { separateNewAndDuplicateBaptisms } from '@/utils/baptismJsonMapper';
import { separateNewAndDuplicateDecrees } from '@/utils/decreeJsonMapper';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';
import { updateBaptismPartidaMarginalNote } from '@/utils/updateBaptismPartidaMarginalNote.js';
import { logAuthEvent } from '@/utils/authLogger';
import { ROLE_TYPES } from '@/config/supabaseConfig';
import { supabase, isSupabaseConfigured } from '@/lib/customSupabaseClient';

// Import Universal Backup Utilities
import {
  generateBackupChecksum,
  validateBackupStructure,
  calculateBackupSize,
  validateBackupIntegrity,
  downloadBackupFile
} from '@/utils/universalBackupHelpers';
import {
  saveBackupToLocalStorage,
  getBackupsFromLocalStorage,
  deleteBackupFromLocalStorage,
  getBackupFromLocalStorage
} from '@/utils/universalBackupStorage';

export const AppDataContext = createContext(null);

const sanitizeValue = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
      return val.name || val.username || val.label || val.role || fallback;
  }
  return String(val);
};

const sanitizeUser = (u) => {
  if (!u) return null;
  return {
    ...u,
    username: sanitizeValue(u.username, 'Usuario'),
    role: sanitizeValue(u.role, 'guest'),
    parishName: sanitizeValue(u.parishName, ''),
    dioceseName: sanitizeValue(u.dioceseName, ''),
    chancelleryName: sanitizeValue(u.chancelleryName, '')
  };
};

const initializeCollections = () => {
  const collections = [
    'users', 'dioceses', 'vicariates', 'deaneries', 'parishes',
    'chancelleries', 'sacraments', 'communications', 'catalogs',
    'diocesis', 'iglesias', 'obispos', 'parrocos', 'ciudades', 'paises', 'parroquias_externas', 'mis_datos',
    'chancellors', 'baptismCorrections', 'conceptosAnulacion', 'parishNotifications',
    'decreeReplacements', 'notasAlMargen'
  ];

  collections.forEach(key => {
    if (!localStorage.getItem(key)) {
       if (key === 'catalogs' || key === 'parishNotifications') {
           localStorage.setItem(key, JSON.stringify({}));
       } else {
           localStorage.setItem(key, JSON.stringify([]));
       }
    }
  });
};

export const AppDataProvider = ({ children }) => {
  const [data, setData] = useState({
    users: [], dioceses: [], vicariates: [], deaneries: [], parishes: [],
    chancelleries: [], sacraments: [], communications: [], catalogs: {},
    chancellors: [], misDatos: [], conceptosAnulacion: [], decreeReplacements: []
  });

  const [currentUser, setCurrentUser] = useState(() => {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return null;
      try { return JSON.parse(stored); } catch(e) { return null; }
  });

  const [baptismParameters, setBaptismParameters] = useState(null);
  const [parishNotifications, setParishNotifications] = useState({});
  const [supabaseConnected, setSupabaseConnected] = useState(Boolean(isSupabaseConfigured()));

  const loadData = useCallback(() => {
    const rawUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const entityId = currentUser?.parishId || currentUser?.dioceseId || currentUser?.parish_id || currentUser?.diocese_id || currentUser?.parroquiaId;
    const replacementsKey = entityId ? `decreeReplacements_${entityId}` : 'decreeReplacements';

    setData({
      users: rawUsers.map(sanitizeUser),
      dioceses: JSON.parse(localStorage.getItem('dioceses') || '[]'),
      vicariates: JSON.parse(localStorage.getItem('vicariates') || '[]'),
      deaneries: JSON.parse(localStorage.getItem('deaneries') || '[]'),
      parishes: JSON.parse(localStorage.getItem('parishes') || '[]'),
      chancelleries: JSON.parse(localStorage.getItem('chancelleries') || '[]'),
      sacraments: JSON.parse(localStorage.getItem('sacraments') || '[]'),
      communications: JSON.parse(localStorage.getItem('communications') || '[]'),
      catalogs: JSON.parse(localStorage.getItem('catalogs') || '{}'),
      chancellors: JSON.parse(localStorage.getItem('chancellors') || '[]'),
      misDatos: JSON.parse(localStorage.getItem('mis_datos') || '[]'),
      conceptosAnulacion: entityId ? JSON.parse(localStorage.getItem(`conceptosAnulacion_${entityId}`) || '[]') : [],
      decreeReplacements: JSON.parse(localStorage.getItem(replacementsKey) || '[]')
    });
  }, [currentUser]);

  const loadNotifications = useCallback(() => {
    const stored = localStorage.getItem('parishNotifications');
    setParishNotifications(stored ? JSON.parse(stored) : {});
  }, []);

  const loadParameters = useCallback(() => {
      setBaptismParameters(JSON.parse(localStorage.getItem('baptismParameters')) || {});
  }, []);

  useEffect(() => {
    initializeCollections();
    loadNotifications();
    loadParameters();

    const handleStorage = (e) => {
        if (e.key === 'currentUser') {
            const updated = e.newValue ? JSON.parse(e.newValue) : null;
            setCurrentUser(updated);
        }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadNotifications, loadParameters]);

  useEffect(() => {
    loadData();
  }, [loadData, currentUser]);

  const saveData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    setData(prev => ({ ...prev, [key]: value }));
  };

  const validateUserCredentials = (username, password) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = users.find(u => {
      const uName = sanitizeValue(u.username);
      return uName.toLowerCase().trim() === username.toLowerCase().trim() && u.password === password;
    });
    return foundUser ? sanitizeUser(foundUser) : null;
  };

  const initSupabaseConnection = async (url, key) => {
    try {
      if (url) localStorage.setItem('supabase_url', url);
      if (key) localStorage.setItem('supabase_key', key);
      if (!supabase || !isSupabaseConfigured()) {
        setSupabaseConnected(false);
        return { success: false, message: 'Supabase no configurado.' };
      }
      const { error } = await supabase.from('app_state').select('key_name').limit(1);
      if (error) {
        setSupabaseConnected(false);
        return { success: false, message: error.message };
      }
      setSupabaseConnected(true);
      return { success: true, message: 'Conexión Supabase activa.' };
    } catch (err) {
      setSupabaseConnected(false);
      return { success: false, message: err?.message || 'Error de conexión.' };
    }
  };

  // --- MARGINAL NOTES ENGINE ---
  const defaultMarginalNotes = useMemo(() => ({
      porCorreccion: {
          anulada: "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. PARTIDA ANULADA POR DECRETO DE CORRECCION DE BAUTISMO EL [FECHA_DECRETO]. DECRETO NRO. [NUMERO_DECRETO] VEASE EN EL LIBRO: [LIBRO_NUEVA] FOLIO: [FOLIO_NUEVA] NUMERO: [NUMERO_PARTIDA_NUEVA]. LA INFORMACION SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN BARRANQUILLA, ATLANTICO - COLOMBIA EL DIA [FECHA_EXPEDICION]..........................................................",
          nuevaPartida: "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. ESTA PARTIDA SE INSCRIBIO SEGUN DECRETO NUMERO: [NUMERO_DECRETO] DE FECHA: [FECHA_DECRETO] EXPEDIDO POR: [OFICINA_DECRETO] Y ANULA LA PARTIDA DEL LIBRO: [LIBRO_ANULADA] FOLIO: [FOLIO_ANULADA] NUMERO: [NUMERO_PARTIDA_ANULADA]. DA FE: [NOMBRE_SACERDOTE]. LA INFORMACION SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN BARRANQUILLA, ATLANTICO - COLOMBIA EL DIA [FECHA_EXPEDICION].........................................................................."
      },
      porReposicion: {
          nuevaPartida: "Esta partida se inscribe por reposición según Decreto No. [NUMERO_DECRETO] de fecha [FECHA_DECRETO], debido a la pérdida/deterioro del original. SE EXPIDE EL DIA [FECHA_EXPEDICION]."
      },
      estandar: "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. LA INFORMACION SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN BARRANQUILLA, ATLANTICO - COLOMBIA EL DIA [FECHA_EXPEDICION]........................................",
      porNotificacionMatrimonial: "EL [FECHA_NOTIFICACION], SE RECIBIÓ NOTIFICACIÓN DE MATRIMONIO CELEBRADO EL DÍA [FECHA_MATRIMONIO] EN LA PARROQUIA [PARROQUIA_MATRIMONIO], DIÓCESIS DE [DIOCESIS_MATRIMONIO], CON [NOMBRE_CONYUGE]. REGISTRADO EN EL LIBRO [LIBRO_MAT], FOLIO [FOLIO_MAT], NUMERO [NUMERO_MAT]."
  }), []);

  const obtenerNotasAlMargen = useCallback((parishId) => {
      if (!parishId) return defaultMarginalNotes;
      const key = `notasAlMargen_${String(parishId)}`;
      const stored = localStorage.getItem(key);
      if (stored) {
          try {
              const parsed = JSON.parse(stored);
              return {
                  ...defaultMarginalNotes,
                  ...parsed,
                  porCorreccion: { ...defaultMarginalNotes.porCorreccion, ...(parsed.porCorreccion || {}) },
                  porReposicion: { ...defaultMarginalNotes.porReposicion, ...(parsed.porReposicion || {}) }
              };
          } catch (e) { return defaultMarginalNotes; }
      }
      return defaultMarginalNotes;
  }, [defaultMarginalNotes]);

  const saveNotasAlMargen = useCallback((notesToSave, parishId) => {
      if (!parishId) return { success: false, message: "ID de parroquia no encontrado." };
      try {
          const key = `notasAlMargen_${String(parishId)}`;
          const existing = JSON.parse(localStorage.getItem(key) || '{}');
          const merged = { ...existing, ...notesToSave };
          localStorage.setItem(key, JSON.stringify(merged));
          return { success: true };
      } catch (e) {
          return { success: false, message: e.message };
      }
  }, []);

  const generarNotaAlMargenAnulada = useCallback((p, d, pid) => {
      const t = obtenerNotasAlMargen(pid)?.porCorreccion?.anulada || "";
      return t.replace(/\[FECHA_DECRETO\]/g, d?.fecha ? d.fecha : "___")
              .replace(/\[NUMERO_DECRETO\]/g, d?.numero || "___")
              .replace(/\[LIBRO_NUEVA\]/g, p?.libro || "___")
              .replace(/\[FOLIO_NUEVA\]/g, p?.folio || "___")
              .replace(/\[NUMERO_PARTIDA_NUEVA\]/g, p?.numero || "___");
  }, [obtenerNotasAlMargen]);

  const generarNotaAlMargenNuevaPartida = useCallback((p, d, s, pid) => {
      const t = obtenerNotasAlMargen(pid)?.porCorreccion?.nuevaPartida || "";
      let n = typeof s === 'string' ? s.toUpperCase() : (s?.nombre ? `${s.nombre} ${s.apellido}`.trim().toUpperCase() : "___");
      return t.replace(/\[NUMERO_DECRETO\]/g, d?.numero || "___")
              .replace(/\[FECHA_DECRETO\]/g, d?.fecha || "___")
              .replace(/\[OFICINA_DECRETO\]/g, d?.oficina || "CANCILLERÍA")
              .replace(/\[LIBRO_ANULADA\]/g, p?.libro || "___")
              .replace(/\[FOLIO_ANULADA\]/g, p?.folio || "___")
              .replace(/\[NUMERO_PARTIDA_ANULADA\]/g, p?.numero || "___")
              .replace(/\[NOMBRE_SACERDOTE\]/g, n);
  }, [obtenerNotasAlMargen]);

  const generarNotaAlMargenEstandar = useCallback((pid) => obtenerNotasAlMargen(pid)?.estandar || "", [obtenerNotasAlMargen]);

  // --- ENTITY GETTERS ---
  const getBaptisms = useCallback((pid) => JSON.parse(localStorage.getItem(`baptisms_${pid}`) || '[]'), []);
  const getConfirmations = useCallback((pid) => JSON.parse(localStorage.getItem(`confirmations_${pid}`) || '[]'), []);
  const getMatrimonios = useCallback((pid) => JSON.parse(localStorage.getItem(`matrimonios_${pid}`) || '[]'), []);
  const getMisDatosList = useCallback((pid) => JSON.parse(localStorage.getItem(`misDatos_${pid}`) || '[]'), []);
  const getParrocos = useCallback((pid) => JSON.parse(localStorage.getItem(`parrocos_${pid}`) || '[]'), []);
  const getObispos = useCallback((pid) => JSON.parse(localStorage.getItem(`obispos_${pid}`) || '[]'), []);

  // --- DECREE REPLACEMENT ---
  const getDecreeReplacements = useCallback((pid) => JSON.parse(localStorage.getItem(`decreeReplacements_${pid}`) || '[]'), []);
  const getDecreeReplacementByNewBaptismId = useCallback((newBaptismIdRepo, pid) => {
      if (!pid || !newBaptismIdRepo) return null;
      return getDecreeReplacements(pid).find(d => d.newBaptismIdRepo === newBaptismIdRepo);
  }, [getDecreeReplacements]);

  const createDecreeReplacement = useCallback((decreeData, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const key = `decreeReplacements_${parishId}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const newDecree = { ...decreeData, id: generateUUID(), createdAt: new Date().toISOString(), status: 'active' };
      localStorage.setItem(key, JSON.stringify([...current, newDecree]));
      loadData();
      return { success: true, data: newDecree };
  }, [loadData]);

  // --- ENTITY CREATION (ADMIN/DIOCESE) ---
  const createDiocese = async (dioceseData) => {
      const current = JSON.parse(localStorage.getItem('dioceses') || '[]');
      const newDiocese = { ...dioceseData, id: generateUUID(), createdAt: new Date().toISOString() };
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('dioceses').upsert({
              id: newDiocese.id, name: newDiocese.name, type: newDiocese.type, bishop_name: newDiocese.bishop
          });
          if (error) return { success: false, message: error.message };
      }
      saveData('dioceses', [...current, newDiocese]);
      return { success: true, data: newDiocese };
  };

  const createParish = useCallback((parishData) => {
      const current = JSON.parse(localStorage.getItem('parishes') || '[]');
      const newParish = { ...parishData, id: generateUUID(), createdAt: new Date().toISOString() };
      saveData('parishes', [...current, newParish]);
      return { success: true, data: newParish };
  }, []);

  const createVicary = useCallback((vicaryData) => {
      const current = JSON.parse(localStorage.getItem('vicariates') || '[]');
      const newVicary = { ...vicaryData, id: generateUUID(), createdAt: new Date().toISOString() };
      saveData('vicariates', [...current, newVicary]);
      return { success: true, data: newVicary };
  }, []);

  const createDecanate = useCallback((decanateData) => {
      const current = JSON.parse(localStorage.getItem('deaneries') || '[]');
      const newDecanate = { ...decanateData, id: generateUUID(), createdAt: new Date().toISOString() };
      saveData('deaneries', [...current, newDecanate]);
      return { success: true, data: newDecanate };
  }, []);

  const createVicaryEntity = useCallback((vicaryData) => {
      const current = JSON.parse(localStorage.getItem('vicariates') || '[]');
      const newVicary = { ...vicaryData, id: generateUUID(), createdAt: new Date().toISOString() };
      saveData('vicariates', [...current, newVicary]);
      return { success: true, data: newVicary };
  }, []);

  const createDecanateEntity = useCallback((decanateData) => {
      const current = JSON.parse(localStorage.getItem('deaneries') || '[]');
      const newDecanate = { ...decanateData, id: generateUUID(), createdAt: new Date().toISOString() };
      saveData('deaneries', [...current, newDecanate]);
      return { success: true, data: newDecanate };
  }, []);

  const createChanceryEntity = useCallback((chanceryData) => {
      const current = JSON.parse(localStorage.getItem('chancelleries') || '[]');
      const newChancery = { ...chanceryData, id: generateUUID(), createdAt: new Date().toISOString() };
      saveData('chancelleries', [...current, newChancery]);
      return { success: true, data: newChancery };
  }, []);

  // --- NOTIFICATIONS ---
  const getParishNotifications = useCallback((pid) => {
      const all = JSON.parse(localStorage.getItem('parishNotifications') || '{}');
      return all[pid] || [];
  }, []);

  const addNotificationToParish = useCallback((pid, ndata) => {
      try {
          const all = JSON.parse(localStorage.getItem('parishNotifications') || '{}');
          const list = all[pid] || [];
          list.unshift({ id: generateUUID(), createdAt: new Date().toISOString(), status: 'unread', ...ndata });
          all[pid] = list;
          localStorage.setItem('parishNotifications', JSON.stringify(all));
          return { success: true };
      } catch (e) { return { success: false }; }
  }, []);

  // --- PARAMETERS ---
  const saveBaptismParameters = useCallback((params) => {
      localStorage.setItem('baptismParameters', JSON.stringify(params));
      setBaptismParameters(params);
      return { success: true };
  }, []);

  const getBaptismParameters = useCallback(() => baptismParameters || JSON.parse(localStorage.getItem('baptismParameters')) || {}, [baptismParameters]);

  // --- BACKUP ---
  const createUniversalBackup = async (n, d) => {
    try {
      const payload = {};
      for(let i=0; i<localStorage.length; i++) {
          const k = localStorage.key(i);
          try { payload[k] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
      }
      const b = { metadata: { id: generateUUID(), name: n, description: d, createdAt: new Date().toISOString() }, data: payload };
      b.checksum = generateBackupChecksum(b.data);
      return saveBackupToLocalStorage(b);
    } catch (e) { return { success: false }; }
  };

  const getUniversalBackups = () => getBackupsFromLocalStorage();
  const restoreUniversalBackup = async (id) => {
      const b = getBackupFromLocalStorage(id);
      if (!b) return { success: false };
      Object.keys(b.data).forEach(k => localStorage.setItem(k, JSON.stringify(b.data[k])));
      loadData();
      return { success: true };
  };

  const deleteUniversalBackup = (id) => deleteBackupFromLocalStorage(id);

  return (
    <AppDataContext.Provider value={{
        data, loadData, currentUser, setCurrentUser, validateUserCredentials,
        getBaptisms, getConfirmations, getMatrimonios, getMisDatosList, getParrocos, getObispos,
        obtenerNotasAlMargen, saveNotasAlMargen,
        generarNotaAlMargenAnulada, generarNotaAlMargenNuevaPartida, generarNotaAlMargenEstandar,
        getParishNotifications, addNotificationToParish,
        getDecreeReplacements, getDecreeReplacementByNewBaptismId, createDecreeReplacement,
        createDiocese, createParish, createVicary, createDecanate,
        createVicaryEntity, createDecanateEntity, createChanceryEntity,
        saveBaptismParameters, getBaptismParameters,
        createUniversalBackup, getUniversalBackups, restoreUniversalBackup, deleteUniversalBackup,
        saveData, initSupabaseConnection: async () => ({ success: true }), supabaseConnected,
        getConceptosAnulacion: (pid) => JSON.parse(localStorage.getItem(`conceptosAnulacion_${pid}`) || '[]'),
        addConceptoAnulacion: (item, pid) => {
            const list = JSON.parse(localStorage.getItem(`conceptosAnulacion_${pid}`) || '[]');
            const newItem = { ...item, id: generateUUID(), createdAt: new Date().toISOString() };
            localStorage.setItem(`conceptosAnulacion_${pid}`, JSON.stringify([...list, newItem]));
            return { success: true, data: newItem };
        },
        deleteConceptoAnulacion: (id, pid) => {
            const list = JSON.parse(localStorage.getItem(`conceptosAnulacion_${pid}`) || '[]');
            localStorage.setItem(`conceptosAnulacion_${pid}`, JSON.stringify(list.filter(i => i.id !== id)));
            return { success: true };
        },
        getBaptismCorrections: (pid) => JSON.parse(localStorage.getItem(`baptismCorrections_${pid}`) || '[]')
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData error');
  return context;
};

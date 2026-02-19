
import React, { createContext, useContext, useState, useEffect } from 'react';
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

const sanitizeUser = (u) => ({
  ...u,
  username: sanitizeValue(u.username, 'Usuario'),
  role: sanitizeValue(u.role, 'guest'),
  parishName: sanitizeValue(u.parishName, ''),
  dioceseName: sanitizeValue(u.dioceseName, ''),
  chancelleryName: sanitizeValue(u.chancelleryName, '')
});

const initializeData = () => {
  const now = new Date().toISOString();
  const adminUser = {
    id: '1',
    username: 'Hertur26',
    email: 'admin@eclesia.org',
    password: '1052042443-Ht',
    role: ROLE_TYPES.ADMIN_GENERAL,
    createdAt: now
  };

  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const adminIndex = users.findIndex(u => {
      const role = typeof u.role === 'object' ? (u.role.name || u.role.role) : u.role;
      return role === ROLE_TYPES.ADMIN_GENERAL;
  });
  
  if (adminIndex === -1) {
    users.push(adminUser);
    localStorage.setItem('users', JSON.stringify(users));
  }

  const collections = [
    'dioceses', 'vicariates', 'deaneries', 'parishes', 
    'chancelleries', 'sacraments', 'communications', 'catalogs',
    'diocesis', 'iglesias', 'obispos', 'parrocos', 'ciudades', 'paises', 'parroquias_externas', 'mis_datos',
    'chancellors', 'baptismCorrections', 'conceptosAnulacion', 'parishNotifications',
    'decreeReplacements'
  ];

  collections.forEach(key => {
    if (!localStorage.getItem(key)) {
       if (key === 'catalogs' || key === 'parishNotifications') localStorage.setItem(key, JSON.stringify({}));
       else if (!key.startsWith('mis_') && !key.startsWith('baptismCorrections')) localStorage.setItem(key, JSON.stringify([]));
    }
  });
};

export const AppDataProvider = ({ children }) => {
  const [data, setData] = useState({
    users: [],
    dioceses: [],
    vicariates: [],
    deaneries: [],
    parishes: [],
    chancelleries: [],
    sacraments: [],
    communications: [],
    catalogs: {},
    chancellors: [],
    misDatos: [],
    conceptosAnulacion: [],
    decreeReplacements: []
  });

  const [iglesias, setIglesias] = useState([]);
  const [baptismParameters, setBaptismParameters] = useState(null);
  const [matrimonioParameters, setMatrimonioParameters] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [parishNotifications, setParishNotifications] = useState({});
  const [supabaseConnected, setSupabaseConnected] = useState(Boolean(isSupabaseConfigured()));

  const initSupabaseConnection = async (url, key) => {
    try {
      if (url) localStorage.setItem('supabase_url', url);
      if (key) localStorage.setItem('supabase_key', key);

      if (!supabase || !isSupabaseConfigured()) {
        setSupabaseConnected(false);
        return { success: false, message: 'Supabase no está configurado.' };
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
      return { success: false, message: err?.message || 'No fue posible conectar con Supabase.' };
    }
  };

  useEffect(() => {
    initializeData();
    loadData();
    loadParameters();
    loadNotifications();
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        logAuthEvent(parsedUser, 'CONTEXT_LOADED');
    }
  }, []);

  const loadData = () => {
    const rawUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const sanitizedUsers = rawUsers.map(sanitizeUser);
    const entityId = currentUser?.parishId || currentUser?.dioceseId;
    const replacementsKey = entityId ? `decreeReplacements_${entityId}` : 'decreeReplacements';

    setData({
      users: sanitizedUsers,
      dioceses: JSON.parse(localStorage.getItem('dioceses') || '[]'),
      vicariates: JSON.parse(localStorage.getItem('vicariates') || '[]'),
      deaneries: JSON.parse(localStorage.getItem('deaneries') || '[]'),
      parishes: JSON.parse(localStorage.getItem('parishes') || '[]'),
      chancelleries: JSON.parse(localStorage.getItem('chancelleries') || '[]'),
      sacraments: JSON.parse(localStorage.getItem('sacraments') || '[]'), 
      communications: JSON.parse(localStorage.getItem('communications') || '[]'),
      catalogs: JSON.parse(localStorage.getItem('catalogs') || '{}'),
      chancellors: JSON.parse(localStorage.getItem('chancellors') || '[]'),
      misDatos: [],
      conceptosAnulacion: [],
      decreeReplacements: JSON.parse(localStorage.getItem(replacementsKey) || '[]')
    });
  };

  const loadNotifications = () => {
    const stored = localStorage.getItem('parishNotifications');
    setParishNotifications(stored ? JSON.parse(stored) : {});
  };

  const saveData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    setData(prev => ({ ...prev, [key]: value }));
  };

  // --- ENTITY CREATION METHODS ---

  const createVicary = (vicaryData) => {
      const current = JSON.parse(localStorage.getItem('vicariates') || '[]');
      const newVicary = { ...vicaryData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newVicary];
      saveData('vicariates', updated);
      return { success: true, data: newVicary };
  };

  const createDecanate = (decanateData) => {
      const current = JSON.parse(localStorage.getItem('deaneries') || '[]');
      const newDecanate = { ...decanateData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newDecanate];
      saveData('deaneries', updated);
      return { success: true, data: newDecanate };
  };

  const createChancery = (chanceryData) => {
      const current = JSON.parse(localStorage.getItem('chancelleries') || '[]');
      const newChancery = { ...chanceryData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newChancery];
      saveData('chancelleries', updated);
      return { success: true, data: newChancery };
  };

  const createDiocese = (dioceseData) => {
      const current = JSON.parse(localStorage.getItem('dioceses') || '[]');
      const newDiocese = { ...dioceseData, type: 'diocese', id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newDiocese];
      saveData('dioceses', updated);
      return { success: true, data: newDiocese };
  };

  const createArchdiocese = (archdioceseData) => {
      const current = JSON.parse(localStorage.getItem('dioceses') || '[]');
      const newArchdiocese = { ...archdioceseData, type: 'archdiocese', id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newArchdiocese];
      saveData('dioceses', updated);
      return { success: true, data: newArchdiocese };
  };

  // --- UNIVERSAL BACKUP METHODS (NEW) ---

  /**
   * Creates a comprehensive backup of all system data
   * @param {string} backupName 
   * @param {string} backupDescription 
   */
  const createUniversalBackup = async (backupName, backupDescription = '') => {
    try {
      // 1. Collect all data keys
      const keysToBackup = [
        'dioceses', 'vicariates', 'deaneries', 'parishes', 
        'chancelleries', 'sacraments', 'communications', 'catalogs',
        'diocesis', 'iglesias', 'obispos', 'parrocos', 'ciudades', 'paises', 'parroquias_externas', 'mis_datos',
        'chancellors', 'users', 'parishNotifications',
        // Dynamic keys need scanning or approximation
      ];

      // Scan for dynamic keys in LS (e.g. baptisms_UUID)
      const dynamicKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key.startsWith('baptisms_') || 
          key.startsWith('confirmations_') || 
          key.startsWith('matrimonios_') ||
          key.startsWith('pendingBaptisms_') ||
          key.startsWith('pendingConfirmations_') ||
          key.startsWith('pendingMatrimonios_') ||
          key.startsWith('baptismParameters_') ||
          key.startsWith('confirmationParameters_') ||
          key.startsWith('matrimonioParameters_') ||
          key.startsWith('baptismCorrections_') ||
          key.startsWith('conceptosAnulacion_') ||
          key.startsWith('notasAlMargen_') ||
          key.startsWith('decreeReplacements_') ||
          key.startsWith('parrocos_') || // Parish specific aux
          key.startsWith('obispos_')
        ) {
          dynamicKeys.push(key);
        }
      }

      const allKeys = [...new Set([...keysToBackup, ...dynamicKeys])];
      const backupPayload = {};
      let totalRecords = 0;

      allKeys.forEach(key => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            backupPayload[key] = parsed;
            if (Array.isArray(parsed)) totalRecords += parsed.length;
          }
        } catch (e) {
          console.warn(`Skipping key ${key} due to parse error`);
        }
      });

      // 2. Prepare Backup Object
      const backupId = generateUUID();
      const now = new Date().toISOString();
      const content = {
        data: backupPayload
      };
      
      // 3. Generate Checksum & Metadata
      const checksum = generateBackupChecksum(content.data);
      const sizeBytes = calculateBackupSize(content);

      const finalBackupObject = {
        metadata: {
          id: backupId,
          name: backupName,
          description: backupDescription,
          versionApp: '1.0.0', // Could be dynamic
          createdAt: now,
          totalRegistros: totalRecords,
          sizeBytes: sizeBytes
        },
        checksum: checksum,
        data: backupPayload
      };

      // 4. Save
      const result = saveBackupToLocalStorage(finalBackupObject);
      return result;

    } catch (error) {
      console.error("Create Universal Backup Error:", error);
      return { success: false, message: error.message };
    }
  };

  /**
   * Retrieves list of universal backups
   */
  const getUniversalBackups = () => {
    return getBackupsFromLocalStorage();
  };

  /**
   * Restores a universal backup by overwriting LS
   * @param {string} backupId 
   */
  const restoreUniversalBackup = async (backupId) => {
    try {
      const backup = getBackupFromLocalStorage(backupId);
      if (!backup) return { success: false, message: "Backup not found." };

      // 1. Verify Integrity
      const isValid = validateBackupIntegrity(backup, backup.checksum);
      if (!isValid) return { success: false, message: "Backup integrity check failed. Data might be corrupted." };

      // 2. Validate Structure
      const structCheck = validateBackupStructure(backup);
      if (!structCheck.isValid) return { success: false, message: `Invalid backup structure. Missing: ${structCheck.missingKeys.join(', ')}` };

      // 3. Restore Data (Dangerous Operation)
      const dataKeys = Object.keys(backup.data);
      
      // Clear existing conflicting keys first (optional, but safer to avoid partial merges)
      dataKeys.forEach(key => localStorage.removeItem(key));

      // Write new keys
      dataKeys.forEach(key => {
        localStorage.setItem(key, JSON.stringify(backup.data[key]));
      });

      // 4. Reload Context
      loadData();
      
      return { success: true, message: "System restored successfully." };

    } catch (error) {
      console.error("Restore Error:", error);
      return { success: false, message: error.message };
    }
  };

  /**
   * Deletes a universal backup
   */
  const deleteUniversalBackup = (backupId) => {
    return deleteBackupFromLocalStorage(backupId);
  };

  /**
   * Exports a backup as a JSON file
   */
  const exportUniversalBackup = (backupId) => {
    const backup = getBackupFromLocalStorage(backupId);
    if (!backup) return { success: false, message: "Backup not found." };
    
    try {
      const filename = `UniversalBackup_${backup.metadata.name.replace(/\s+/g, '_')}_${backup.metadata.createdAt.split('T')[0]}.json`;
      downloadBackupFile(backup, filename);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  /**
   * Imports a backup from a JSON file
   */
  const importUniversalBackup = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          
          // Basic Validation
          const structCheck = validateBackupStructure(json);
          if (!structCheck.isValid) {
            resolve({ success: false, message: "Invalid file format." });
            return;
          }

          // Check integrity
          if (!validateBackupIntegrity(json, json.checksum)) {
             resolve({ success: false, message: "File checksum mismatch. Data corrupted." });
             return;
          }

          // Save to Local Storage List
          // If ID exists, regenerate ID to avoid conflict on import? Or reject?
          // Let's regenerate ID for imported file to treat as new copy
          json.metadata.id = generateUUID(); 
          json.metadata.name = `${json.metadata.name} (Importado)`;
          
          const saveRes = saveBackupToLocalStorage(json);
          resolve(saveRes);

        } catch (err) {
          resolve({ success: false, message: "Error parsing JSON file." });
        }
      };
      reader.onerror = () => reject({ success: false, message: "File read error" });
      reader.readAsText(file);
    });
  };

  /**
   * Gets info for a specific backup
   */
  const getUniversalBackupInfo = (backupId) => {
    const backup = getBackupFromLocalStorage(backupId);
    return backup ? backup.metadata : null;
  };

  // --- GETTERS ---
  
  const getVicaries = () => JSON.parse(localStorage.getItem('vicariates') || '[]');
  const getDecanates = () => JSON.parse(localStorage.getItem('deaneries') || '[]');
  const getChanceries = () => JSON.parse(localStorage.getItem('chancelleries') || '[]');
  const getDioceses = () => JSON.parse(localStorage.getItem('dioceses') || '[]').filter(d => d.type === 'diocese');
  const getArchdioceses = () => JSON.parse(localStorage.getItem('dioceses') || '[]').filter(d => d.type === 'archdiocese');

  // Generic createItem fallback
  const createItem = (collection, itemData) => {
      const current = JSON.parse(localStorage.getItem(collection) || '[]');
      const newItem = { ...itemData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newItem];
      saveData(collection, updated);
      return { success: true, data: newItem };
  };

  // ... (Rest of existing methods: update/delete for these entities would be good to verify but focusing on creation tasks first)

  // --- DECREE REPLACEMENT FUNCTIONS ---

  const getDecreeReplacementsBySacrament = (sacramentType, parishId) => {
      if (!parishId) return [];
      const key = `decreeReplacements_${parishId}`;
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      if (!sacramentType) return all;
      return all.filter(d => d.sacrament === sacramentType);
  };
  
  const getDecreeReplacements = (parishId) => {
      if (!parishId) return [];
      const key = `decreeReplacements_${parishId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
  };

  const getDecreeReplacementByNewBaptismId = (newBaptismIdRepo, parishId) => {
      if (!parishId || !newBaptismIdRepo) return null;
      const key = `decreeReplacements_${parishId}`;
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      return all.find(d => d.newBaptismIdRepo === newBaptismIdRepo);
  };

  const createDecreeReplacement = (decreeData, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const key = `decreeReplacements_${parishId}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      
      const newDecree = {
          ...decreeData,
          id: decreeData.id || generateUUID(),
          createdAt: new Date().toISOString(),
          status: 'active'
      };
      
      const updated = [...current, newDecree];
      localStorage.setItem(key, JSON.stringify(updated));
      setData(prev => ({ ...prev, decreeReplacements: updated })); 
      return { success: true, data: newDecree };
  };
  
  const saveDecreeReplacement = createDecreeReplacement; // Alias

  const updateDecreeReplacement = (decreeId, updatedData, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const key = `decreeReplacements_${parishId}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      
      const index = current.findIndex(d => d.id === decreeId);
      if (index === -1) return { success: false, message: "Decreto no encontrado" };
      
      current[index] = { ...current[index], ...updatedData, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(current));
      
      // Update local state if needed
      setData(prev => ({ ...prev, decreeReplacements: current }));
      return { success: true };
  };

  const deleteDecreeReplacement = (decreeId, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const key = `decreeReplacements_${parishId}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      
      const updated = current.filter(d => d.id !== decreeId);
      localStorage.setItem(key, JSON.stringify(updated));
      setData(prev => ({ ...prev, decreeReplacements: updated }));
      return { success: true };
  };
  
  // --- EXISTING FUNCTIONS ---
  const getParishNotifications = (parishId) => {
    if (!parishId) return [];
    const allNotifications = parishNotifications;
    return allNotifications[parishId] || [];
  };

  const createNotification = (notificationData) => {
    const { parish_id, parishId } = notificationData;
    const targetId = parish_id || parishId;
    
    if (!targetId) return { success: false, message: "Parish ID missing for notification" };

    const newNotification = {
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        status: 'unread',
        ...notificationData,
        decree_id: notificationData.decree_id || notificationData.decreeId,
        decree_type: notificationData.decree_type || notificationData.type,
        parish_id: targetId
    };
    
    if (!newNotification.message) {
         const messageTemplates = {
            correction: 'Cancillería acaba de crear un Decreto de Corrección que afecta una de sus partidas.',
            replacement: 'Cancillería acaba de crear un Decreto de Reposición para su parroquia.'
         };
         newNotification.message = messageTemplates[newNotification.decree_type] || 'Nueva notificación de Cancillería.';
    }

    const allNotifications = { ...parishNotifications };
    const currentParishNotifs = allNotifications[targetId] ? [...allNotifications[targetId]] : [];
    
    currentParishNotifs.unshift(newNotification);
    allNotifications[targetId] = currentParishNotifs;
    
    localStorage.setItem('parishNotifications', JSON.stringify(allNotifications));
    setParishNotifications(allNotifications);
    
    return { success: true, id: newNotification.id };
  };
  
  const addNotificationToParish = (parishId, notificationData) => {
      return createNotification({ ...notificationData, parish_id: parishId });
  };
  
  const updateNotificationStatus = (notificationId, status) => {
      let updated = false;
      const allNotifications = { ...parishNotifications };
      
      Object.keys(allNotifications).forEach(pId => {
          const list = allNotifications[pId];
          const index = list.findIndex(n => n.id === notificationId);
          if (index !== -1) {
              list[index] = { ...list[index], status: status, updatedAt: new Date().toISOString() };
              updated = true;
          }
      });
      
      if (updated) {
          localStorage.setItem('parishNotifications', JSON.stringify(allNotifications));
          setParishNotifications(allNotifications);
          return { success: true };
      }
      return { success: false, message: "Notification not found" };
  };

  const deleteNotification = (notificationId, parishId) => {
    if (!notificationId) return;
    
    const allNotifications = { ...parishNotifications };
    
    if (parishId && allNotifications[parishId]) {
        allNotifications[parishId] = allNotifications[parishId].filter(n => n.id !== notificationId);
    } else {
        Object.keys(allNotifications).forEach(pId => {
             allNotifications[pId] = allNotifications[pId].filter(n => n.id !== notificationId);
        });
    }

    localStorage.setItem('parishNotifications', JSON.stringify(allNotifications));
    setParishNotifications(allNotifications);
    return { success: true };
  };

  const getDefaultMarginalNotes = () => ({
      porCorreccion: {
          anulada: "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. PARTIDA ANULADA POR DECRETO DE CORRECCION DE BAUTISMO EL [FECHA_DECRETO]. DECRETO NRO. [NUMERO_DECRETO] VEASE EN EL LIBRO: [LIBRO_NUEVA] FOLIO: [FOLIO_NUEVA] NUMERO: [NUMERO_PARTIDA_NUEVA]. LA INFORMACION SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN BARRANQUILLA, ATLANTICO - COLOMBIA EL DIA [FECHA_EXPEDICION]..........................................................",
          nuevaPartida: "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. ESTA PARTIDA SE INSCRIBIO SEGUN DECRETO NUMERO: [NUMERO_DECRETO] DE FECHA: [FECHA_DECRETO] EXPEDIDO POR: [OFICINA_DECRETO] Y ANULA LA PARTIDA DEL LIBRO: [LIBRO_ANULADA] FOLIO: [FOLIO_ANULADA] NUMERO: [NUMERO_PARTIDA_ANULADA]. DA FE: [NOMBRE_SACERDOTE]. LA INFORMACION SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN BARRANQUILLA, ATLANTICO - COLOMBIA EL DIA [FECHA_EXPEDICION].........................................................................."
      },
      porReposicion: {
          nuevaPartida: "Esta partida se inscribe por reposición según Decreto No. [NUMERO_DECRETO] de fecha [FECHA_DECRETO], debido a la pérdida/deterioro del original. SE EXPIDE EL DIA [FECHA_EXPEDICION]."
      },
      estandar: "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. LA INFORMACION SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN BARRANQUILLA, ATLANTICO - COLOMBIA EL DIA [FECHA_EXPEDICION]........................................"
  });

  const obtenerNotasAlMargen = (parishId) => {
      if (!parishId) return getDefaultMarginalNotes();
      const key = `notasAlMargen_${parishId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
          const storedData = JSON.parse(stored);
          const defaultData = getDefaultMarginalNotes();
          return {
              ...defaultData,
              ...storedData,
              porCorreccion: {
                  ...defaultData.porCorreccion,
                  ...(storedData.porCorreccion || {})
              }
          };
      }
      return getDefaultMarginalNotes();
  };

  const saveNotasAlMargen = (notes, parishId) => {
      if (!parishId) return;
      const key = `notasAlMargen_${parishId}`;
      localStorage.setItem(key, JSON.stringify(notes));
  };
  
  const generarNotaAlMargenAnulada = (partida, decreto, parishId) => {
      const notes = obtenerNotasAlMargen(parishId);
      let template = notes?.porCorreccion?.anulada || "";
      const fecha = decreto?.fecha ? convertDateToSpanishText(decreto.fecha) : "__________";
      return template
          .replace("[FECHA_DECRETO]", fecha)
          .replace("[NUMERO_DECRETO]", decreto?.numero || "___")
          .replace("[LIBRO_NUEVA]", partida?.libro || "___")
          .replace("[FOLIO_NUEVA]", partida?.folio || "___")
          .replace("[NUMERO_PARTIDA_NUEVA]", partida?.numero || "___");
  };

  const generarNotaAlMargenNuevaPartida = (partida, decreto, sacerdote, parishId) => {
      const notes = obtenerNotasAlMargen(parishId);
      let template = notes?.porCorreccion?.nuevaPartida || "";
      const fechaDecreto = decreto?.fecha ? convertDateToSpanishText(decreto.fecha) : "__________";
      let nombreSacerdote = "___";
      if (typeof sacerdote === 'string') {
          nombreSacerdote = sacerdote.toUpperCase();
      } else if (sacerdote && (sacerdote.nombre || sacerdote.apellido)) {
          nombreSacerdote = `${sacerdote.nombre || ''} ${sacerdote.apellido || ''}`.trim().toUpperCase();
      }

      return template
          .replace("[NUMERO_DECRETO]", decreto?.numero || "___")
          .replace("[FECHA_DECRETO]", fechaDecreto)
          .replace("[OFICINA_DECRETO]", decreto?.oficina || "CANCILLERÍA")
          .replace("[LIBRO_ANULADA]", partida?.libro || "___")
          .replace("[FOLIO_ANULADA]", partida?.folio || "___")
          .replace("[NUMERO_PARTIDA_ANULADA]", partida?.numero || "___")
          .replace("[NOMBRE_SACERDOTE]", nombreSacerdote);
  };

  const generarNotaAlMargenEstandar = (parishId) => {
      const notes = obtenerNotasAlMargen(parishId);
      return notes?.estandar || "";
  };
  
  const actualizarNotaAlMargenCorreccion = (anulada, nuevaPartida, parishId) => {
      const current = obtenerNotasAlMargen(parishId);
      const updated = {
          ...current,
          porCorreccion: {
              anulada: anulada || current.porCorreccion.anulada,
              nuevaPartida: nuevaPartida || current.porCorreccion.nuevaPartida
          }
      };
      saveNotasAlMargen(updated, parishId);
      return { success: true, message: "Notas de corrección actualizadas." };
  };

  const actualizarNotaAlMargenReposicion = (nuevaPartida, parishId) => {
      const current = obtenerNotasAlMargen(parishId);
      const updated = {
          ...current,
          porReposicion: {
              nuevaPartida: nuevaPartida || current.porReposicion.nuevaPartida
          }
      };
      saveNotasAlMargen(updated, parishId);
      return { success: true, message: "Nota de reposición actualizada." };
  };

  const actualizarNotaAlMargenEstandar = (texto, parishId) => {
      const current = obtenerNotasAlMargen(parishId);
      const updated = {
          ...current,
          estandar: texto || ""
      };
      saveNotasAlMargen(updated, parishId);
      return { success: true, message: "Nota estándar actualizada." };
  };
  
  const getConceptosAnulacion = (parishId) => {
      if (!parishId) return [];
      const key = `conceptosAnulacion_${parishId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
  };

  const addConceptoAnulacion = (item, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const current = getConceptosAnulacion(parishId);
      const newItem = { 
          ...item, 
          tipo: item.tipo || 'porCorreccion',
          id: generateUUID(), 
          createdAt: new Date().toISOString() 
      };
      const updated = [...current, newItem];
      localStorage.setItem(`conceptosAnulacion_${parishId}`, JSON.stringify(updated));
      return { success: true, message: "Concepto agregado exitosamente", data: newItem };
  };

  const updateConceptoAnulacion = (id, updates, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const current = getConceptosAnulacion(parishId);
      const updated = current.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i);
      localStorage.setItem(`conceptosAnulacion_${parishId}`, JSON.stringify(updated));
      return { success: true, message: "Concepto actualizado exitosamente" };
  };

  const deleteConceptoAnulacion = (id, parishId) => {
      if (!parishId) return { success: false, message: "Falta ID de parroquia" };
      const current = getConceptosAnulacion(parishId);
      const filtered = current.filter(i => i.id !== id);
      localStorage.setItem(`conceptosAnulacion_${parishId}`, JSON.stringify(filtered));
      return { success: true, message: "Concepto eliminado exitosamente" };
  };

  const getBaptismCorrections = (parishId) => {
      if (!parishId) return [];
      const key = `baptismCorrections_${parishId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
  };

  const createBaptismCorrection = async (decreeData, originalPartidaId, newPartidaData, parishId) => {
    try {
        if (!parishId) return { success: false, message: "Parish ID missing" };

        const baptismsKey = `baptisms_${parishId}`;
        let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
        
        const originalIndex = baptisms.findIndex(b => b.id === originalPartidaId);
        if (originalIndex === -1) return { success: false, message: "Partida original no encontrada" };
        
        const originalPartida = baptisms[originalIndex];
        
        baptisms[originalIndex] = {
            ...originalPartida,
            isAnnulled: true,
            status: 'anulada',
            annulmentDecree: decreeData.decreeNumber,
            annulmentDate: decreeData.decreeDate,
            conceptoAnulacionId: decreeData.conceptoAnulacionId,
            tipoNotaAlMargen: 'porCorreccion.anulada',
            updatedAt: new Date().toISOString()
        };
        
        const paramsKey = `baptismParameters_${parishId}`;
        let params = JSON.parse(localStorage.getItem(paramsKey) || '{}');
        
        if (!params.suplementarioLibro) {
             params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };
        }
        
        const newPartida = {
            ...newPartidaData,
            id: generateUUID(),
            parishId,
            book_number: params.suplementarioLibro,
            page_number: params.suplementarioFolio,
            entry_number: params.suplementarioNumero,
            status: 'seated', 
            isSupplementary: true, 
            correctionDecreeRef: decreeData.decreeNumber,
            conceptoAnulacionId: decreeData.conceptoAnulacionId,
            tipoNotaAlMargen: 'porCorreccion.nuevaPartida',
            createdAt: new Date().toISOString()
        };
        
        baptisms.push(newPartida);
        
        params.suplementarioNumero = incrementPaddedValue(params.suplementarioNumero || '0');
        localStorage.setItem(paramsKey, JSON.stringify(params));
        localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
        
        const correctionsKey = `baptismCorrections_${parishId}`;
        let corrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
        
        const decreeRecord = {
            id: generateUUID(),
            ...decreeData,
            originalPartidaId,
            newPartidaId: newPartida.id,
            originalPartidaSummary: { ...originalPartida, book: originalPartida.book_number, page: originalPartida.page_number, entry: originalPartida.entry_number },
            newPartidaSummary: { ...newPartida, book: newPartida.book_number, page: newPartida.page_number, entry: newPartida.entry_number },
            createdAt: new Date().toISOString()
        };
        
        corrections.push(decreeRecord);
        localStorage.setItem(correctionsKey, JSON.stringify(corrections));
        
        return { success: true, message: "Decreto creado y partidas actualizadas correctamente.", data: decreeRecord };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
  };

  const deleteBaptismCorrection = (id, parishId) => {
      try {
          if (!parishId) return { success: false, message: "ID de parroquia faltante." };
          
          const correctionsKey = `baptismCorrections_${parishId}`;
          const baptismsKey = `baptisms_${parishId}`;
          
          let corrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
          let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
          
          const decreeToDelete = corrections.find(c => c.id === id);
          if (!decreeToDelete) {
              return { success: false, message: "Decreto de corrección no encontrado." };
          }
          
          const { originalPartidaId, newPartidaId } = decreeToDelete;
          
          if (newPartidaId) {
             const newBaptismIndex = baptisms.findIndex(b => b.id === newPartidaId);
             if (newBaptismIndex !== -1) {
                 baptisms.splice(newBaptismIndex, 1);
             }
          }
          
          if (originalPartidaId) {
              const originalBaptismIndex = baptisms.findIndex(b => b.id === originalPartidaId);
              if (originalBaptismIndex !== -1) {
                  const original = baptisms[originalBaptismIndex];
                  baptisms[originalBaptismIndex] = {
                      ...original,
                      status: 'seated', 
                      isAnnulled: false,
                      anulado: false,
                      annulmentDecree: undefined,
                      annulmentDate: undefined,
                      conceptoAnulacionId: undefined,
                      tipoNotaAlMargen: undefined,
                      updatedAt: new Date().toISOString()
                  };
              }
          }
          
          const updatedCorrections = corrections.filter(c => c.id !== id);
          localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
          localStorage.setItem(correctionsKey, JSON.stringify(updatedCorrections));
          
          return { success: true, message: "Decreto eliminado y partida original restaurada exitosamente." };
          
      } catch (e) {
          console.error("Error deleting baptism correction:", e);
          return { success: false, message: e.message };
      }
  };

  const updateBaptismCorrection = (id, updatedData, parishId) => {
      try {
          const correctionsKey = `baptismCorrections_${parishId}`;
          let corrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
          const index = corrections.findIndex(c => c.id === id);
          if (index === -1) return { success: false, message: "Decreto no encontrado" };
          corrections[index] = { ...corrections[index], ...updatedData, updatedAt: new Date().toISOString() };
          localStorage.setItem(correctionsKey, JSON.stringify(corrections));
          return { success: true, message: "Decreto actualizado." };
      } catch (e) {
          return { success: false, message: e.message };
      }
  };

  const getDecrees = (parishId, sacramentType) => {
      if (!parishId || !sacramentType) return [];
      const key = `decrees_${sacramentType}_${parishId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
  };

  const addDecreesFromJSON = async (decreeRecords, sacramentType) => {
      try {
          let parishId = null;
          const authUser = JSON.parse(localStorage.getItem('user')); 
          if (authUser && authUser.parishId) {
              parishId = authUser.parishId;
          } else if (currentUser && currentUser.parishId) {
               parishId = currentUser.parishId;
          } else {
               const parishes = JSON.parse(localStorage.getItem('parishes') || '[]');
               if (parishes.length > 0) parishId = parishes[0].id;
          }

          if (!parishId) return { success: false, message: "No se pudo identificar la parroquia actual para la importación." };

          const storageKey = `decrees_${sacramentType}_${parishId}`;
          const currentRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const { newDecrees, duplicateDecrees } = separateNewAndDuplicateDecrees(decreeRecords, currentRecords);
          
          if (newDecrees.length > 0) {
              const updatedRecords = [...currentRecords, ...newDecrees];
              localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
          }

          return { 
              success: true, 
              message: `${newDecrees.length} decretos importados correctamente.${duplicateDecrees.length > 0 ? ` Se ignoraron ${duplicateDecrees.length} duplicados.` : ''}`,
              addedCount: newDecrees.length,
          };
      } catch (error) {
          console.error("Error adding decrees:", error);
          return { success: false, message: error.message };
      }
  };

  const processBaptismDecreeBatch = async (decreesToImport, parishId) => {
    try {
        if (!parishId) return { success: false, message: "ID de parroquia faltante." };
        if (!decreesToImport || decreesToImport.length === 0) return { success: false, message: "No hay decretos para importar." };

        const baptismsKey = `baptisms_${parishId}`;
        const correctionsKey = `baptismCorrections_${parishId}`;
        let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
        let corrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
        let successCount = 0;
        let errorCount = 0;
        let errors = [];
        const existingDecrees = new Set(corrections.map(c => String(c.decreeNumber)));

        for (const item of decreesToImport) {
            if (!item.originalData || !item.newData) {
                 errors.push(`Decreto ${item.decreeNumber}: Datos incompletos.`);
                 errorCount++;
                 continue;
            }
            if (existingDecrees.has(String(item.decreeNumber))) continue;

            const origIndex = baptisms.findIndex(b => 
                String(b.book_number) === String(item.originalData.libro) &&
                String(b.page_number) === String(item.originalData.folio) &&
                String(b.entry_number) === String(item.originalData.numero)
            );
            const newIndex = baptisms.findIndex(b => 
                String(b.book_number) === String(item.newData.libro) &&
                String(b.page_number) === String(item.newData.folio) &&
                String(b.entry_number) === String(item.newData.numero)
            );

            if (origIndex === -1 || newIndex === -1) {
                errors.push(`Decreto ${item.decreeNumber}: Partidas no encontradas.`);
                errorCount++;
                continue;
            }

            const originalPartida = baptisms[origIndex];
            const newPartida = baptisms[newIndex];

            baptisms[origIndex] = {
                ...originalPartida,
                isAnnulled: true,
                status: 'anulada',
                annulmentDecree: item.decreeNumber,
                annulmentDate: item.decreeDate,
                conceptoAnulacionId: item.annulmentConceptCode,
                tipoNotaAlMargen: 'porCorreccion.anulada', 
                updatedAt: new Date().toISOString()
            };

            baptisms[newIndex] = {
                ...newPartida,
                correctionDecreeRef: item.decreeNumber,
                conceptoAnulacionId: item.annulmentConceptCode,
                tipoNotaAlMargen: 'porCorreccion.nuevaPartida',
                updatedAt: new Date().toISOString()
            };

            const decreeRecord = {
                id: generateUUID(),
                targetBaptismId: originalPartida.id, 
                newBaptismId: newPartida.id,         
                originalPartidaId: originalPartida.id, 
                newPartidaId: newPartida.id,
                decreeNumber: item.decreeNumber,
                annulmentConceptCode: item.annulmentConceptCode, 
                conceptoAnulacionId: item.annulmentConceptCode, 
                decreeDate: item.decreeDate,
                baptismData: { ...newPartida }, 
                observations: item.observations,
                status: 'completed',
                createdBy: item.createdBy || 'import',
                createdAt: new Date().toISOString(),
                originalPartidaSummary: { 
                    book: originalPartida.book_number, 
                    page: originalPartida.page_number, 
                    entry: originalPartida.entry_number,
                    names: `${originalPartida.nombres} ${originalPartida.apellidos}`
                },
                newPartidaSummary: { 
                    book: newPartida.book_number, 
                    page: newPartida.page_number, 
                    entry: newPartida.entry_number,
                    names: `${newPartida.nombres} ${newPartida.apellidos}`
                }
            };

            corrections.push(decreeRecord);
            existingDecrees.add(String(item.decreeNumber));
            successCount++;
        }

        localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
        localStorage.setItem(correctionsKey, JSON.stringify(corrections));
        return { success: true, message: `Importación finalizada: ${successCount} ok, ${errorCount} errores.`, stats: { success: successCount, errors: errorCount, errorDetails: errors } };

    } catch (e) {
        console.error("Error processing decree batch:", e);
        return { success: false, message: e.message };
    }
  };

  const createDioceseArchdiocese = (dioceseData, userData) => {
    try {
        const newDioceseId = generateUUID();
        let type = dioceseData.type;
        if (!type) {
            type = (dioceseData.name.toLowerCase().includes('arquidiócesis') || dioceseData.name.toLowerCase().includes('arquidiocesis')) ? 'archdiocese' : 'diocese';
        }
        
        const newDiocese = {
            ...dioceseData,
            id: newDioceseId,
            type: type,
            createdAt: new Date().toISOString()
        };
        
        const newUser = sanitizeUser({
            ...userData,
            id: generateUUID(),
            role: ROLE_TYPES.DIOCESE,
            dioceseId: newDioceseId,
            dioceseName: dioceseData.name,
            createdAt: new Date().toISOString()
        });
        
        const updatedDioceses = [...data.dioceses, newDiocese];
        const updatedUsers = [...data.users, newUser];
        
        saveData('dioceses', updatedDioceses);
        saveData('users', updatedUsers);
        
        return { success: true, data: newDiocese };
    } catch (error) {
        console.error("Error creating diocese:", error);
        return { success: false, message: error.message };
    }
  };

  const deleteDioceseArchdiocese = (id) => {
      try {
        const updatedDioceses = data.dioceses.filter(d => d.id !== id);
        const updatedUsers = data.users.filter(u => u.dioceseId !== id);
        
        saveData('dioceses', updatedDioceses);
        saveData('users', updatedUsers);
        return { success: true };
      } catch (error) {
        console.error("Error deleting diocese:", error);
        return { success: false, message: error.message };
      }
  };

  const createUser = (userData) => {
      const sanitizedUserData = sanitizeUser({
          ...userData,
          id: generateUUID(),
          createdAt: new Date().toISOString()
      });
      const updatedUsers = [...data.users, sanitizedUserData];
      saveData('users', updatedUsers);
      return sanitizedUserData;
  };

  const deleteUser = (userId) => {
      const updatedUsers = data.users.filter(u => u.id !== userId);
      saveData('users', updatedUsers);
  };

  const getUserByUsername = (username) => {
    if (!username) return null;
    return data.users.find(u => {
        const uName = sanitizeValue(u.username);
        return uName.toLowerCase() === username.toLowerCase();
    });
  };

  const getParishUsers = (dioceseId) => {
      return data.users.filter(u => u.role === ROLE_TYPES.PARISH && u.dioceseId === dioceseId);
  };

  const getChanceryUsers = (dioceseId) => {
      return data.users.filter(u => u.role === ROLE_TYPES.CHANCERY && u.dioceseId === dioceseId);
  };

  const createChancellor = (chancellorData, userData) => {
      const newChancellor = { ...chancellorData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updatedChancellors = [...data.chancellors, newChancellor];
      
      const newUser = sanitizeUser({
          ...userData,
          id: generateUUID(),
          role: ROLE_TYPES.CHANCERY,
          chancellorId: newChancellor.id,
          dioceseId: chancellorData.dioceseId,
          createdAt: new Date().toISOString()
      });
      const updatedUsers = [...data.users, newUser];

      saveData('chancellors', updatedChancellors);
      saveData('users', updatedUsers);
      return { success: true };
  };

  const getChancellorByDiocese = (dioceseId) => {
      return data.chancellors.find(c => c.dioceseId === dioceseId);
  };

  const createParish = (parishData, userData) => {
    const newParish = { ...parishData, id: generateUUID(), createdAt: new Date().toISOString() };
    const updatedParishes = [...data.parishes, newParish];
    
    const newUser = sanitizeUser({ 
        ...userData, 
        id: generateUUID(), 
        parishId: newParish.id, 
        role: ROLE_TYPES.PARISH, 
        createdAt: new Date().toISOString() 
    });
    const updatedUsers = [...data.users, newUser];

    saveData('parishes', updatedParishes);
    saveData('users', updatedUsers);
    
    return { success: true };
  };

  const getDefaultBaptismParameters = () => ({
      enablePreview: true,
      reportPrinting: false,
      ordinarioBlocked: false,
      ordinarioRestartNumber: false,
      ordinarioPartidas: 2,
      ordinarioLibro: 1,
      ordinarioFolio: 436,
      ordinarioNumero: 871,
      suplementarioBlocked: false,
      suplementarioReiniciar: false,
      suplementarioPartidas: 2,
      suplementarioLibro: 3,
      suplementarioFolio: 2,
      suplementarioNumero: 3,
      registroAdultoEn: 'ordinario',
      registroDecretoEn: 'suplementario',
      generarNotaMarginal: true,
      inscripcionNumero: '36',
      inscripcionFecha: '2025-10-11T00:00',
      inscripcionFormato: '1'
  });

  const loadParameters = () => {
      setBaptismParameters(JSON.parse(localStorage.getItem('baptismParameters')) || getDefaultBaptismParameters());
  };

  const saveBaptismParameters = (params) => {
      try {
          localStorage.setItem('baptismParameters', JSON.stringify(params));
          setBaptismParameters(params);
          return { success: true, message: "Parámetros guardados correctamente." };
      } catch (error) {
          console.error("Error saving baptism parameters:", error);
          return { success: false, message: "Error al guardar parámetros." };
      }
  };

  const getBaptismParameters = () => {
      return baptismParameters || JSON.parse(localStorage.getItem('baptismParameters')) || getDefaultBaptismParameters();
  };
  
  const getDefaultConfirmationParameters = () => ({
    enablePreview: true,
    reportPrinting: false,
    ordinarioBlocked: false,
    ordinarioRestartNumber: false,
    ordinarioPartidas: 2,
    ordinarioLibro: 1,
    ordinarioFolio: 3,
    ordinarioNumero: 5,
    suplementarioBlocked: false,
    suplementarioReiniciar: false,
    suplementarioPartidas: 2,
    suplementarioLibro: 1,
    suplementarioFolio: 1,
    suplementarioNumero: 1,
    registroInscripcionEn: 'ordinario',
    inscripcionNumero: '1',
    inscripcionFecha: '2025-11-01T00:00',
    inscripcionFormato: '1'
  });

  const getConfirmationParameters = (contextId) => {
      if (!contextId) return getDefaultConfirmationParameters();
      const storageKey = `confirmationParameters_${contextId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
          return { ...getDefaultConfirmationParameters(), ...JSON.parse(stored) };
      }
      return getDefaultConfirmationParameters();
  };

  const updateConfirmationParameters = (contextId, params) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const storageKey = `confirmationParameters_${contextId}`;
          const current = getConfirmationParameters(contextId);
          const newParams = { ...current, ...params };
          localStorage.setItem(storageKey, JSON.stringify(newParams));
          return { success: true, message: "Parámetros de confirmación actualizados." };
      } catch (error) {
          console.error("Error saving confirmation parameters:", error);
          return { success: false, message: "Error al guardar parámetros." };
      }
  };

  const resetConfirmationParameters = (contextId) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const storageKey = `confirmationParameters_${contextId}`;
          const defaults = getDefaultConfirmationParameters();
          localStorage.setItem(storageKey, JSON.stringify(defaults));
          return { success: true, message: "Parámetros restablecidos a valores por defecto.", data: defaults };
      } catch (error) {
          console.error("Error resetting parameters:", error);
          return { success: false, message: "Error al restablecer parámetros." };
      }
  };

  const getNextConfirmationNumbers = (parishId) => {
       const params = getConfirmationParameters(parishId);
       return { book: params.ordinarioLibro || 1, page: params.ordinarioFolio || 1, entry: params.ordinarioNumero || 1 };
  };

  const getDefaultMatrimonioParameters = () => ({
    enablePreview: true,
    reportPrinting: false,
    ordinarioBlocked: false,
    ordinarioRestartNumber: false,
    ordinarioPartidas: 1,
    ordinarioLibro: 1,
    ordinarioFolio: 1,
    ordinarioNumero: 1,
  });

  const getMatrimonioParameters = (contextId) => {
      if (!contextId) return getDefaultMatrimonioParameters();
      const storageKey = `matrimonioParameters_${contextId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
          return { ...getDefaultMatrimonioParameters(), ...JSON.parse(stored) };
      }
      return getDefaultMatrimonioParameters();
  };

  const updateMatrimonioParameters = (contextId, params) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const storageKey = `matrimonioParameters_${contextId}`;
          const current = getMatrimonioParameters(contextId);
          const newParams = { ...current, ...params };
          localStorage.setItem(storageKey, JSON.stringify(newParams));
          setMatrimonioParameters(newParams);
          return { success: true, message: "Parámetros de matrimonio actualizados." };
      } catch (error) {
          console.error("Error saving matrimonio parameters:", error);
          return { success: false, message: "Error al guardar parámetros." };
      }
  };

  const resetMatrimonioParameters = (contextId) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const storageKey = `matrimonioParameters_${contextId}`;
          const defaults = getDefaultMatrimonioParameters();
          localStorage.setItem(storageKey, JSON.stringify(defaults));
          setMatrimonioParameters(defaults);
          return { success: true, message: "Parámetros restablecidos a valores por defecto.", data: defaults };
      } catch (error) {
          console.error("Error resetting parameters:", error);
          return { success: false, message: "Error al restablecer parámetros." };
      }
  };

  const getNextMatrimonioNumbers = (parishId) => {
       const params = getMatrimonioParameters(parishId);
       return { book: params.ordinarioLibro || 1, page: params.ordinarioFolio || 1, entry: params.ordinarioNumero || 1 };
  };

  const getVicariesByDiocese = (dioceseId) => {
    if (!dioceseId) return [];
    return data.vicariates.filter(v => v.dioceseId === dioceseId);
  };
  
  const getAuxData = (key, contextId) => {
    const storageKey = contextId ? `${key}_${contextId}` : key;
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  };

  const saveAuxData = (key, contextId, data) => {
    const storageKey = contextId ? `${key}_${contextId}` : key;
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const genericAuxCRUD = (type, contextId) => ({
      get: () => getAuxData(type, contextId),
      add: (item) => {
          const current = getAuxData(type, contextId);
          const newItem = { ...item, id: generateUUID(), createdAt: new Date().toISOString() };
          saveAuxData(type, contextId, [...current, newItem]);
          return { success: true, message: "Registro agregado exitosamente", data: newItem };
      },
      update: (id, updates) => {
          const current = getAuxData(type, contextId);
          const updated = current.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i);
          saveAuxData(type, contextId, updated);
          return { success: true, message: "Registro actualizado exitosamente" };
      },
      delete: (id) => {
          const current = getAuxData(type, contextId);
          const filtered = current.filter(i => i.id !== id);
          saveAuxData(type, contextId, filtered);
          return { success: true, message: "Registro eliminado exitosamente" };
      }
  });

  const actualizarParrocoActual = (parishId) => {
    if (!parishId) return;
    const key = `parrocos_${parishId}`;
    const currentList = JSON.parse(localStorage.getItem(key) || '[]');
    if (currentList.length === 0) return;
    const sorted = [...currentList].sort((a, b) => {
      const dateA = new Date(a.fechaIngreso || a.fechaNombramiento || '1900-01-01');
      const dateB = new Date(b.fechaIngreso || b.fechaNombramiento || '1900-01-01');
      return dateB - dateA;
    });
    const today = new Date().toISOString().split('T')[0];
    const updatedList = sorted.map((p, index) => {
      if (index === 0) return { ...p, estado: "1", fechaSalida: today };
      const nextMoreRecentPriest = sorted[index - 1];
      const nextEntryDate = nextMoreRecentPriest.fechaIngreso || nextMoreRecentPriest.fechaNombramiento;
      return { ...p, estado: "2", fechaSalida: nextEntryDate || p.fechaSalida };
    });
    localStorage.setItem(key, JSON.stringify(updatedList));
  };
  
  const getParrocos = (parishId) => genericAuxCRUD('parrocos', parishId).get();
  const getParrocoActual = (parishId) => {
      const list = getParrocos(parishId);
      return list.find(p => p.estado === "1");
  };
  const addParroco = (item, parishId) => { 
      const result = genericAuxCRUD('parrocos', parishId).add(item); 
      if (result.success) actualizarParrocoActual(parishId); 
      return result; 
  };
  const updateParroco = (id, item, parishId) => { 
      const result = genericAuxCRUD('parrocos', parishId).update(id, item); 
      if (result.success) actualizarParrocoActual(parishId); 
      return result; 
  };
  const deleteParroco = (id, parishId) => {
      const result = genericAuxCRUD('parrocos', parishId).delete(id);
      if (result.success) actualizarParrocoActual(parishId);
      return result;
  };

  const getDiocesis = (parishId) => genericAuxCRUD('diocesis', parishId).get();
  const addDiocesis = (item, parishId) => genericAuxCRUD('diocesis', parishId).add(item);
  const updateDiocesis = (id, item, parishId) => genericAuxCRUD('diocesis', parishId).update(id, item);
  const deleteDiocesis = (id, parishId) => genericAuxCRUD('diocesis', parishId).delete(id);

  const getIglesias = (parishId) => getIglesiasList(parishId);
  const getIglesiasList = (parishId) => JSON.parse(localStorage.getItem(`iglesias_${parishId}`) || '[]');
  const addIglesia = (item, parishId) => {
      const list = getIglesiasList(parishId);
      if (list.some(i => i.codigo === item.codigo)) return { success: false, message: "Código duplicado" };
      const newItem = { ...item, id: generateUUID(), createdAt: new Date().toISOString() };
      localStorage.setItem(`iglesias_${parishId}`, JSON.stringify([...list, newItem]));
      return { success: true, message: "Iglesia agregada" };
  };
  const updateIglesia = (id, updates, parishId) => {
      const list = getIglesiasList(parishId);
      const updated = list.map(i => i.id === id ? { ...i, ...updates } : i);
      localStorage.setItem(`iglesias_${parishId}`, JSON.stringify(updated));
      return { success: true, message: "Iglesia actualizada" };
  };
  const deleteIglesia = (id, parishId) => {
      const list = getIglesiasList(parishId);
      const filtered = list.filter(i => i.id !== id);
      localStorage.setItem(`iglesias_${parishId}`, JSON.stringify(filtered));
      return { success: true, message: "Iglesia eliminada" };
  };

  const getObispos = (parishId) => genericAuxCRUD('obispos', parishId).get();
  const addObispo = (item, parishId) => genericAuxCRUD('obispos', parishId).add(item);
  const updateObispo = (id, item, parishId) => genericAuxCRUD('obispos', parishId).update(id, item);
  const deleteObispo = (id, parishId) => genericAuxCRUD('obispos', parishId).delete(id);

  const getCiudadesList = (contextId) => JSON.parse(localStorage.getItem(`ciudades_${contextId}`) || '[]');
  const addCiudad = (item, contextId) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      const list = getCiudadesList(contextId);
      const newItem = { ...item, id: generateUUID(), createdAt: new Date().toISOString() };
      localStorage.setItem(`ciudades_${contextId}`, JSON.stringify([...list, newItem]));
      return { success: true, message: "Ciudad agregada" };
  };
  const updateCiudad = (id, updates, contextId) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      const list = getCiudadesList(contextId);
      const updated = list.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i);
      localStorage.setItem(`ciudades_${contextId}`, JSON.stringify(updated));
      return { success: true, message: "Ciudad actualizada" };
  };
  const deleteCiudad = (id, contextId) => {
       if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
       const list = getCiudadesList(contextId);
       const filtered = list.filter(i => i.id !== id);
       localStorage.setItem(`ciudades_${contextId}`, JSON.stringify(filtered));
       return { success: true, message: "Ciudad eliminada" };
  };

  const importCiudades = (jsonData, contextId, append = false) => {
      if (!contextId) return { success: false, message: "No se especificó el ID de contexto." };
      try {
          const key = `ciudades_${contextId}`;
          const currentData = append ? JSON.parse(localStorage.getItem(key) || '[]') : [];
          const newItems = jsonData.data.map(item => ({
              id: generateUUID(),
              nombre: (item.data || item.nombre || '').trim(),
              source: item.source || 'import',
              count: item.count || 0,
              weight: item.weight || 0,
              createdAt: new Date().toISOString()
          })).filter(item => item.nombre);
          localStorage.setItem(key, JSON.stringify([...currentData, ...newItems]));
          return { success: true, count: newItems.length };
      } catch (e) {
          console.error("Error importando ciudades:", e);
          return { success: false, message: e.message };
      }
  };

  const getMisDatosList = (parishId) => JSON.parse(localStorage.getItem(`misDatos_${parishId}`) || '[]');
  const addMisDatosRecord = (item, parishId) => {
      const list = getMisDatosList(parishId);
      const newItem = { ...item, id: generateUUID() };
      localStorage.setItem(`misDatos_${parishId}`, JSON.stringify([...list, newItem]));
      return { success: true, message: "Registro agregado" };
  };
  const updateMisDatosRecord = (id, updates, parishId) => {
       const list = getMisDatosList(parishId);
       const updated = list.map(i => i.id === id ? { ...i, ...updates } : i);
       localStorage.setItem(`misDatos_${parishId}`, JSON.stringify(updated));
       return { success: true, message: "Registro actualizado" };
  };
  const deleteMisDatosRecord = (id, parishId) => {
       const list = getMisDatosList(parishId);
       const filtered = list.filter(i => i.id !== id);
       localStorage.setItem(`misDatos_${parishId}`, JSON.stringify(filtered));
       return { success: true, message: "Registro eliminado" };
  };
  
  const validateUserCredentials = (username, password) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = users.find(user => {
      const uName = sanitizeValue(user.username);
      return uName.toLowerCase().trim() === username.toLowerCase().trim() && user.password === password;
    });

    if (!foundUser) return null;
    return sanitizeUser(foundUser);
  };

  const importBaptisms = async () => ({ success: true });
  const addBaptismsFromJSON = async (baptismRecords, preFiltered = false) => {
      try {
          let parishId = null;
          const authUser = JSON.parse(localStorage.getItem('user')); 
          if (authUser && authUser.parishId) parishId = authUser.parishId;
          else if (currentUser && currentUser.parishId) parishId = currentUser.parishId;
          else {
               const parishes = JSON.parse(localStorage.getItem('parishes') || '[]');
               if (parishes.length > 0) parishId = parishes[0].id;
          }

          if (!parishId) return { success: false, message: "No se pudo identificar la parroquia actual." };

          const storageKey = `baptisms_${parishId}`;
          const currentRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
          
          let recordsToAdd = [];
          let ignoredCount = 0;
          let duplicateDetails = [];

          if (preFiltered) {
              recordsToAdd = baptismRecords;
          } else {
              const { newBaptisms, duplicateBaptisms } = separateNewAndDuplicateBaptisms(baptismRecords, currentRecords);
              recordsToAdd = newBaptisms;
              ignoredCount = duplicateBaptisms.length;
              duplicateDetails = duplicateBaptisms;
          }

          if (recordsToAdd.length > 0) {
              const updatedRecords = [...currentRecords, ...recordsToAdd];
              localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
          }

          return { 
              success: true, 
              message: `${recordsToAdd.length} registros importados correctamente.`,
              addedCount: recordsToAdd.length,
              ignoredCount,
              addedRecords: recordsToAdd,
              ignoredRecords: duplicateDetails
          };

      } catch (error) {
          console.error("Error adding baptisms:", error);
          return { success: false, message: error.message };
      }
  };
  
  const importConfirmations = async (json, parishId, preview) => {
      if (preview) {
          const records = json.data.map(r => ({ ...r, id: generateUUID() }));
          return { success: true, count: records.length, records, errors: [] };
      }
      const current = JSON.parse(localStorage.getItem(`confirmations_${parishId}`) || '[]');
      const newRecords = json.data.map(r => ({ ...r, id: generateUUID(), status: 'confirmed' }));
      localStorage.setItem(`confirmations_${parishId}`, JSON.stringify([...current, ...newRecords]));
      return { success: true, message: `${newRecords.length} confirmaciones importadas.` };
  };

  const addConfirmationsFromJSON = async (confirmationRecords) => {
      try {
          let parishId = null;
          const authUser = JSON.parse(localStorage.getItem('user')); 
          if (authUser && authUser.parishId) parishId = authUser.parishId;
          else if (currentUser && currentUser.parishId) parishId = currentUser.parishId;
          else {
               const parishes = JSON.parse(localStorage.getItem('parishes') || '[]');
               if (parishes.length > 0) parishId = parishes[0].id;
          }

          if (!parishId) return { success: false, message: "No se pudo identificar la parroquia." };

          const storageKey = `confirmations_${parishId}`;
          const currentRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const { newRecords, duplicateCount, duplicateDetails } = separateNewAndDuplicateConfirmations(confirmationRecords, currentRecords);

          if (newRecords.length > 0) {
              const updatedRecords = [...currentRecords, ...newRecords];
              localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
          }

          return { 
              success: true, 
              message: `${newRecords.length} registros importados.`,
              addedCount: newRecords.length,
              duplicateCount,
              duplicateDetails
          };

      } catch (error) {
          console.error("Error adding confirmations:", error);
          return { success: false, message: error.message };
      }
  };

  const importDeaths = () => ({ success: true });
  const importMarriages = async (json, parishId, preview) => {
      if (preview) {
          const records = json.data.map(r => ({ ...r, id: generateUUID() }));
          return { success: true, count: records.length, records, errors: [] };
      }
      const current = JSON.parse(localStorage.getItem(`matrimonios_${parishId}`) || '[]');
      const newRecords = json.data.map(r => ({ ...r, id: generateUUID(), status: 'celebrated' }));
      localStorage.setItem(`matrimonios_${parishId}`, JSON.stringify([...current, ...newRecords]));
      return { success: true, message: `${newRecords.length} matrimonios importados.` };
  };

  const importDiocesis = () => ({ success: true });
  const importIglesias = () => ({ success: true });
  const importObispos = () => ({ success: true });
  const importParrocos = () => ({ success: true });
  const importMisDatos = () => ({ success: true });
  const importMisDatosLegacy = () => ({ success: true });
  const importPaises = () => ({ success: true });
  const importParroquiasExternas = () => ({ success: true });

  const getBaptisms = (parishId) => JSON.parse(localStorage.getItem(`baptisms_${parishId}`) || '[]');
  const getConfirmedBaptisms = (parishId) => getBaptisms(parishId).filter(b => b.status === 'confirmed' || b.status === 'seated');
  const fetchBaptismsFromSource = async (parishId) => getBaptisms(parishId);
  const saveBaptismToSource = async (data, parishId, mode) => {
      const list = getBaptisms(parishId);
      const newItem = { ...data, id: generateUUID(), status: mode === 'celebrated' ? 'confirmed' : 'seated', createdAt: new Date().toISOString() };
      localStorage.setItem(`baptisms_${parishId}`, JSON.stringify([...list, newItem]));
      return { success: true, id: newItem.id };
  };
  const deleteBaptismFromSource = async () => ({ success: true });
  const validateBaptismNumbers = async (libro, folio, numero, parishId) => {
      const list = getBaptisms(parishId);
      const exists = list.some(r => String(r.book_number) === String(libro) && String(r.page_number) === String(folio) && String(r.entry_number) === String(numero));
      if (exists) return { valid: false, message: "Ya existe un registro con esta numeración." };
      return { valid: true };
  };
  
  const getPendingBaptisms = async (parishId) => JSON.parse(localStorage.getItem(`pendingBaptisms_${parishId}`) || '[]');
  
  const seatBaptism = async (id, parishId, updates = {}) => {
      const pending = await getPendingBaptisms(parishId);
      const record = pending.find(r => r.id === id);
      if (!record) return { success: false, message: "Registro no encontrado" };
      
      const params = JSON.parse(localStorage.getItem(`baptismParameters_${parishId}`) || '{}');
      const finalRecord = { 
          ...record, 
          ...updates, 
          status: 'celebrated', 
          book_number: params.ordinarioLibro, 
          page_number: params.ordinarioFolio, 
          entry_number: params.ordinarioNumero 
      };
      
      const list = getBaptisms(parishId);
      localStorage.setItem(`baptisms_${parishId}`, JSON.stringify([...list, finalRecord]));
      
      const newPending = pending.filter(r => r.id !== id);
      localStorage.setItem(`pendingBaptisms_${parishId}`, JSON.stringify(newPending));
      
      localStorage.setItem(`baptismParameters_${parishId}`, JSON.stringify({ ...params, ordinarioNumero: incrementPaddedValue(params.ordinarioNumero || '0') }));
      
      return { success: true, message: "Asentado exitosamente" };
  };

  const seatMultipleBaptisms = async (ids, parishId) => {
      let count = 0;
      for (const id of ids) {
          const res = await seatBaptism(id, parishId);
          if (res.success) count++;
      }
      return { success: true, message: `${count} registros asentados.` };
  };
  const getNextBaptismNumbers = (parishId) => {
       const params = JSON.parse(localStorage.getItem(`baptismParameters_${parishId}`) || '{}');
       return { book: params.ordinarioLibro || 1, page: params.ordinarioFolio || 1, entry: params.ordinarioNumero || 1 };
  };

  const getConfirmations = (parishId) => JSON.parse(localStorage.getItem(`confirmations_${parishId}`) || '[]');
  const getPendingConfirmations = async (parishId) => JSON.parse(localStorage.getItem(`pendingConfirmations_${parishId}`) || '[]');
  
  const saveConfirmationToSource = async (data, parishId, mode) => {
      const storageKey = mode === 'celebrated' ? `confirmations_${parishId}` : `pendingConfirmations_${parishId}`;
      const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newItem = { ...data, id: generateUUID(), status: mode === 'celebrated' ? 'confirmed' : 'pending', createdAt: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify([...list, newItem]));
      return { success: true, id: newItem.id };
  };

  const seatConfirmation = async (id, parishId) => {
      const pending = await getPendingConfirmations(parishId);
      const record = pending.find(r => r.id === id);
      if (!record) return { success: false, message: "Registro no encontrado" };
      
      const params = getConfirmationParameters(parishId);
      const finalRecord = { ...record, status: 'celebrated', book_number: params.ordinarioLibro || 1, page_number: params.ordinarioFolio || 1, entry_number: params.ordinarioNumero || 1 };
      
      const list = getConfirmations(parishId);
      localStorage.setItem(`confirmations_${parishId}`, JSON.stringify([...list, finalRecord]));
      
      const newPending = pending.filter(r => r.id !== id);
      localStorage.setItem(`pendingConfirmations_${parishId}`, JSON.stringify(newPending));
      
      const newNum = incrementPaddedValue(params.ordinarioNumero || '1');
      updateConfirmationParameters(parishId, { ...params, ordinarioNumero: newNum });
      
      return { success: true, message: "Asentado exitosamente" };
  };

  const seatMultipleConfirmations = async (ids, parishId) => {
      let count = 0;
      for (const id of ids) {
          const res = await seatConfirmation(id, parishId);
          if (res.success) count++;
      }
      return { success: true, message: `${count} registros asentados.` };
  };

  const validateConfirmationNumbers = async (libro, folio, numero, parishId) => {
      const list = getConfirmations(parishId);
      const exists = list.some(r => String(r.book_number) === String(libro) && String(r.page_number) === String(folio) && String(r.entry_number) === String(numero));
      if (exists) return { valid: false, message: "Numeración duplicada" };
      return { valid: true };
  };

  const getMatrimonios = (parishId) => JSON.parse(localStorage.getItem(`matrimonios_${parishId}`) || '[]');
  const getPendingMatrimonios = async (parishId) => JSON.parse(localStorage.getItem(`pendingMatrimonios_${parishId}`) || '[]');

  const saveMatrimonioToSource = async (data, parishId, mode) => {
      const storageKey = mode === 'celebrated' ? `matrimonios_${parishId}` : `pendingMatrimonios_${parishId}`;
      const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newItem = { ...data, id: generateUUID(), status: mode === 'celebrated' ? 'celebrated' : 'pending', createdAt: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify([...list, newItem]));
      return { success: true, id: newItem.id };
  };

  const seatMatrimonio = async (id, parishId) => {
      const pending = await getPendingMatrimonios(parishId);
      const record = pending.find(r => r.id === id);
      if (!record) return { success: false, message: "Registro no encontrado" };
      
      const params = getMatrimonioParameters(parishId);
      const finalRecord = { ...record, status: 'celebrated', book_number: params.ordinarioLibro || 1, page_number: params.ordinarioFolio || 1, entry_number: params.ordinarioNumero || 1 };
      
      const list = getMatrimonios(parishId);
      localStorage.setItem(`matrimonios_${parishId}`, JSON.stringify([...list, finalRecord]));
      
      const newPending = pending.filter(r => r.id !== id);
      localStorage.setItem(`pendingMatrimonios_${parishId}`, JSON.stringify(newPending));
      
      const newNum = incrementPaddedValue(params.ordinarioNumero || '1');
      updateMatrimonioParameters(parishId, { ...params, ordinarioNumero: newNum });
      
      return { success: true, message: "Asentado exitosamente" };
  };

  const seatMultipleMatrimonios = async (ids, parishId) => {
      let count = 0;
      for (const id of ids) {
          const res = await seatMatrimonio(id, parishId);
          if (res.success) count++;
      }
      return { success: true, message: `${count} registros asentados.` };
  };

  const validateMatrimonioNumbers = async (libro, folio, numero, parishId) => {
      const list = getMatrimonios(parishId);
      const exists = list.some(r => String(r.book_number) === String(libro) && String(r.page_number) === String(folio) && String(r.entry_number) === String(numero));
      if (exists) return { valid: false, message: "Numeración duplicada" };
      return { valid: true };
  };

  const fetchCatalogsFromSource = async () => [];
  const getPaises = (parishId) => getAuxData('paises', parishId);
  const getParroquiasExternas = (parishId) => getAuxData('parroquias_externas', parishId);

  return (
    <AppDataContext.Provider value={{
        data, loadData,
        validateJSONStructure,
        importBaptisms, addBaptismsFromJSON,
        importConfirmations, addConfirmationsFromJSON, importDeaths, importMarriages,
        
        getBaptisms, getConfirmedBaptisms, 
        fetchBaptismsFromSource, saveBaptismToSource, deleteBaptismFromSource, validateBaptismNumbers,
        getPendingBaptisms, seatBaptism, seatMultipleBaptisms, getNextBaptismNumbers,
        
        getConfirmations, getPendingConfirmations, saveConfirmationToSource, seatConfirmation, seatMultipleConfirmations, validateConfirmationNumbers, getNextConfirmationNumbers,
        getConfirmationParameters, updateConfirmationParameters, resetConfirmationParameters,

        getMatrimonios, getPendingMatrimonios, saveMatrimonioToSource, seatMatrimonio, seatMultipleMatrimonios, validateMatrimonioNumbers, getNextMatrimonioNumbers,
        getMatrimonioParameters, updateMatrimonioParameters, resetMatrimonioParameters,

        getBaptismCorrections,
        createBaptismCorrection,
        deleteBaptismCorrection,
        updateBaptismCorrection,
        processBaptismDecreeBatch, 

        // Decree Replacement Exports
        getDecreeReplacementsBySacrament,
        getDecreeReplacements,
        getDecreeReplacementByNewBaptismId,
        createDecreeReplacement,
        saveDecreeReplacement,
        updateDecreeReplacement,
        deleteDecreeReplacement,

        // Ecclesiastical Creation Methods
        createVicary,
        createDecanate, addDecanate: createDecanate,
        createChancery,
        createDiocese,
        createArchdiocese,
        
        // Getters for Ecclesiastical Entities
        getVicaries,
        getDecanates,
        getChanceries,
        getDioceses,
        getArchdioceses,

        importDiocesis, importIglesias, importObispos, importParrocos, importMisDatos, importMisDatosLegacy,
        importCiudades, importPaises, importParroquiasExternas,
        getDiocesis: getDiocesis, addDiocesis, updateDiocesis, deleteDiocesis,
        getIglesias, getIglesiasList, addIglesia, updateIglesia, deleteIglesia,
        getObispos, addObispo, updateObispo, deleteObispo,
        getParrocos, getParrocoActual, addParroco, updateParroco, deleteParroco, 
        actualizarParrocoActual, actualizarEstadoParrocos: actualizarParrocoActual, 
        getCiudadesList, addCiudad, updateCiudad, deleteCiudad, 
        getPaises, getParroquiasExternas,
        getMisDatosList, addMisDatosRecord, updateMisDatosRecord, deleteMisDatosRecord,
        addMisDatos: addMisDatosRecord, updateMisDatos: updateMisDatosRecord, deleteMisDatos: deleteMisDatosRecord,
        fetchCatalogsFromSource,
        validateUserCredentials,
        saveBaptismParameters, getBaptismParameters,
        saveData,
        initSupabaseConnection,
        supabaseConnected,
        iglesias,
        getVicariesByDiocese,
        createParish,
        createItem,
        createUser,
        deleteUser,
        getUserByUsername,
        getParishUsers,
        getChanceryUsers,
        createChancellor,
        getChancellorByDiocese,
        getConceptosAnulacion,
        addConceptoAnulacion,
        updateConceptoAnulacion,
        deleteConceptoAnulacion,
        getAnnulmentConcepts: getConceptosAnulacion,
        createAnnulmentConcept: addConceptoAnulacion,
        editAnnulmentConcept: updateConceptoAnulacion,
        deleteAnnulmentConcept: deleteConceptoAnulacion,
        obtenerNotasAlMargen,
        generarNotaAlMargenAnulada,
        generarNotaAlMargenNuevaPartida,
        generarNotaAlMargenEstandar,
        actualizarNotaAlMargenCorreccion,
        actualizarNotaAlMargenReposicion,
        actualizarNotaAlMargenEstandar,
        getDecrees,
        addDecreesFromJSON,
        user: currentUser,

        getParishNotifications,
        createNotification,
        addNotificationToParish,
        updateNotificationStatus,
        deleteNotification,
        
        createDioceseArchdiocese,
        deleteDioceseArchdiocese,

        // NEW: Universal Backup Methods
        createUniversalBackup,
        getUniversalBackups,
        restoreUniversalBackup,
        deleteUniversalBackup,
        exportUniversalBackup,
        importUniversalBackup,
        getUniversalBackupInfo
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within AppDataProvider');
  return context;
};

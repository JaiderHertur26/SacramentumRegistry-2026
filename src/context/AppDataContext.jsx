
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

import {
  saveDocumento,
  getAllDocumentos,
  getAllAvisos,
  updateAvisoStatus
} from '@/utils/matrimonialNotificationStorage';

import { guardarNotificacionMatrimonial } from '@/utils/matrimonialNotificationHelpers';

// Document & Avisos Helpers
import { obtenerAvisosParroquia, marcarAvisoComoVisto as marcarAvisoHelper } from '@/utils/matrimonialNotificationAvisoHelpers';
import { obtenerDocumentosParroquia, obtenerParroquiasReceptoras } from '@/utils/matrimonialNotificationDocumentHelpers';


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
    'decreeReplacements', 'decreeReplacementBaptism',
    'matrimonialNotifications', 'matrimonialNotificationAvisos'
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
  const [matrimonialNotifications, setMatrimonialNotifications] = useState([]);
  const [matrimonialNotificationAvisos, setMatrimonialNotificationAvisos] = useState([]);

  useEffect(() => {
    initializeData();
    loadData();
    loadParameters();
    loadNotifications();
    loadMatrimonialData();
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        logAuthEvent(parsedUser, 'CONTEXT_LOADED');
        
        if (parsedUser?.parishId) {
            cargarAvisosParroquia(parsedUser.parishId);
        }
    }
  }, []);

  const loadMatrimonialData = () => {
    const rawNotifs = localStorage.getItem('matrimonialNotifications');
    const rawAvisos = localStorage.getItem('matrimonialNotificationAvisos');
    if (rawNotifs) setMatrimonialNotifications(JSON.parse(rawNotifs));
    if (rawAvisos) setMatrimonialNotificationAvisos(JSON.parse(rawAvisos));
  };

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

  // --- MATRIMONIAL NOTIFICATIONS & AVISOS ---
  const handleGuardarNotificacionMatrimonial = (documento) => {
     const result = guardarNotificacionMatrimonial(documento);
     if (result.success) {
         loadMatrimonialData(); // reload state
     }
     return result;
  };

  const getDocumentosParroquia = (parishId) => {
      const allDocs = JSON.parse(localStorage.getItem('matrimonialNotifications') || '[]');
      return obtenerDocumentosParroquia(parishId, allDocs);
  };

  const getParroquiasReceptoras = (parishId) => {
      const docs = getDocumentosParroquia(parishId);
      const parishes = JSON.parse(localStorage.getItem('parishes') || '[]');
      return obtenerParroquiasReceptoras(docs, parishes);
  };

  const obtenerNotificacionesMatrimoniales = (parishId) => {
      const res = getAllDocumentos(parishId);
      return res.success ? res.data : [];
  };

  const obtenerAvisosNotificacion = (parishId) => {
      const res = getAllAvisos(parishId);
      return res.success ? res.data : [];
  };
  
  const getAvisosParroquia = (parishId) => {
      return obtenerAvisosParroquia(parishId);
  };

  const cargarAvisosParroquia = (parishId) => {
      const list = obtenerAvisosParroquia(parishId);
      setMatrimonialNotificationAvisos(list);
      return list;
  };

  const marcarAvisoComoVisto = (avisoId, userId) => {
      const res = marcarAvisoHelper(avisoId, userId || (currentUser?.id || currentUser?.username));
      if (res.success) {
          loadMatrimonialData();
          if (currentUser?.parishId) cargarAvisosParroquia(currentUser.parishId);
      }
      return res;
  };

  const getMatrimonialDocumentByBaptismPartidaId = (baptismPartidaId) => {
      if (!baptismPartidaId) return null;
      const allDocs = JSON.parse(localStorage.getItem('matrimonialNotifications') || '[]');
      return allDocs.find(d => String(d.baptismPartidaId) === String(baptismPartidaId)) || null;
  };

  const deleteNotificacionMatrimonial = (documentoId) => {
      try {
          const allDocs = JSON.parse(localStorage.getItem('matrimonialNotifications') || '[]');
          const filteredDocs = allDocs.filter(d => d.id !== documentoId);
          localStorage.setItem('matrimonialNotifications', JSON.stringify(filteredDocs));
          setMatrimonialNotifications(filteredDocs);
          return { success: true };
      } catch (error) {
          console.error("Error deleting matrimonial notification:", error);
          return { success: false, message: error.message };
      }
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

  // --- UNIVERSAL BACKUP METHODS ---
  const createUniversalBackup = async (backupName, backupDescription = '') => {
    try {
      const keysToBackup = [
        'dioceses', 'vicariates', 'deaneries', 'parishes', 
        'chancelleries', 'sacraments', 'communications', 'catalogs',
        'diocesis', 'iglesias', 'obispos', 'parrocos', 'ciudades', 'paises', 'parroquias_externas', 'mis_datos',
        'chancellors', 'users', 'parishNotifications',
        'matrimonialNotifications', 'matrimonialNotificationAvisos'
      ];
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
          key.startsWith('decreeReplacementBaptism_') ||
          key.startsWith('parrocos_') ||
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
      const backupId = generateUUID();
      const now = new Date().toISOString();
      const content = { data: backupPayload };
      const checksum = generateBackupChecksum(content.data);
      const sizeBytes = calculateBackupSize(content);
      const finalBackupObject = {
        metadata: {
          id: backupId, name: backupName, description: backupDescription,
          versionApp: '1.0.0', createdAt: now, totalRegistros: totalRecords, sizeBytes: sizeBytes
        },
        checksum: checksum, data: backupPayload
      };
      const result = saveBackupToLocalStorage(finalBackupObject);
      return result;
    } catch (error) {
      console.error("Create Universal Backup Error:", error);
      return { success: false, message: error.message };
    }
  };

  const getUniversalBackups = () => getBackupsFromLocalStorage();
  const restoreUniversalBackup = async (backupId) => {
    try {
      const backup = getBackupFromLocalStorage(backupId);
      if (!backup) return { success: false, message: "Backup not found." };
      const isValid = validateBackupIntegrity(backup, backup.checksum);
      if (!isValid) return { success: false, message: "Backup integrity check failed. Data might be corrupted." };
      const structCheck = validateBackupStructure(backup);
      if (!structCheck.isValid) return { success: false, message: `Invalid backup structure. Missing: ${structCheck.missingKeys.join(', ')}` };
      const dataKeys = Object.keys(backup.data);
      dataKeys.forEach(key => localStorage.removeItem(key));
      dataKeys.forEach(key => { localStorage.setItem(key, JSON.stringify(backup.data[key])); });
      loadData();
      return { success: true, message: "System restored successfully." };
    } catch (error) {
      console.error("Restore Error:", error);
      return { success: false, message: error.message };
    }
  };
  const deleteUniversalBackup = (backupId) => deleteBackupFromLocalStorage(backupId);
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
  const importUniversalBackup = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const structCheck = validateBackupStructure(json);
          if (!structCheck.isValid) { resolve({ success: false, message: "Invalid file format." }); return; }
          if (!validateBackupIntegrity(json, json.checksum)) { resolve({ success: false, message: "File checksum mismatch. Data corrupted." }); return; }
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

  const createItem = (collection, itemData) => {
      const current = JSON.parse(localStorage.getItem(collection) || '[]');
      const newItem = { ...itemData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updated = [...current, newItem];
      saveData(collection, updated);
      return { success: true, data: newItem };
  };

  // --- ANNULMENT CONCEPTS ---
  const getConceptosAnulacion = (parishId) => {
      if (!parishId) return [];
      const key = `conceptosAnulacion_${parishId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
  };

  const getConceptoAnulacion = (id, parishId) => {
      const contextId = parishId || currentUser?.parishId;
      if (!contextId || !id) return null;
      const all = getConceptosAnulacion(contextId);
      return all.find(c => c.id === id) || null;
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

  // --- NEW: DECREE REPLACEMENT BAPTISM & ENHANCED BAPTISM ---
  const getDecreeReplacementBaptisms = (parishId) => {
    if (!parishId) return [];
    return JSON.parse(localStorage.getItem(`decreeReplacementBaptism_${parishId}`) || '[]');
  };

  const saveDecreeReplacementBaptism = (decreeData, parishId) => {
    const contextId = parishId || currentUser?.parishId;
    if (!contextId) return { success: false, message: "Falta ID de parroquia" };
    
    console.log("📝 [AppDataContext] Guardando Decreto de Reposición:", decreeData);
    
    const key = `decreeReplacementBaptism_${contextId}`;
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const newDecree = {
        ...decreeData,
        id: decreeData.id || generateUUID(),
        createdAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify([...current, newDecree]));
    return { success: true, data: newDecree };
  };

  const saveBaptism = (newPartidaData, parishId) => {
    const contextId = parishId || currentUser?.parishId;
    if (!contextId) return { success: false, message: "Falta ID de parroquia" };
    
    console.log("📝 [AppDataContext] Guardando Partida de Bautismo:", newPartidaData);

    const mainKey = `baptisms_${contextId}`;
    const list = JSON.parse(localStorage.getItem(mainKey) || '[]');
    
    // Ensure standard properties based on newPartidaData
    const finalRecord = {
        ...newPartidaData,
        id: newPartidaData.id || generateUUID(),
        status: newPartidaData.status || 'seated',
        createdAt: new Date().toISOString()
    };
    
    // If it's a replacement, assure marginNote is preserved
    if (finalRecord.type === "replacement" || finalRecord.createdByDecree === "replacement") {
        if (finalRecord.marginNote) {
            finalRecord.notaMarginal = finalRecord.marginNote.text || finalRecord.marginNote;
        }
    }
    
    localStorage.setItem(mainKey, JSON.stringify([...list, finalRecord]));
    
    // Sync with "baptismPartidas" as requested
    const syncKey = `baptismPartidas_${contextId}`;
    localStorage.setItem(syncKey, JSON.stringify([...list, finalRecord]));

    return { success: true, data: finalRecord };
  };

  // --- DECREE REPLACEMENT FUNCTIONS ---
  const getDecreeReplacementsBySacrament = (sacramentType, parishId) => {
      if (!parishId) return [];
      // Combine normal ones and specific baptism replacements if requested
      const key = `decreeReplacements_${parishId}`;
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (sacramentType === 'bautismo') {
          const specific = getDecreeReplacementBaptisms(parishId);
          // Return both to not break old ones
          return [...all.filter(d => d.sacrament === 'bautismo' || d.type === 'replacement'), ...specific];
      }
      
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
      const found = all.find(d => d.newBaptismIdRepo === newBaptismIdRepo || d.newPartidaId === newBaptismIdRepo);
      if (found) return found;
      
      const specific = getDecreeReplacementBaptisms(parishId);
      return specific.find(d => d.newPartidaId === newBaptismIdRepo);
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
      
      console.log("📝 [AppDataContext] Actualizando Decreto:", decreeId, updatedData);

      // Check in specific baptisms first
      const specificKey = `decreeReplacementBaptism_${parishId}`;
      let specific = JSON.parse(localStorage.getItem(specificKey) || '[]');
      let index = specific.findIndex(d => d.id === decreeId);
      if (index !== -1) {
          specific[index] = { ...specific[index], ...updatedData, updatedAt: new Date().toISOString() };
          localStorage.setItem(specificKey, JSON.stringify(specific));
          return { success: true };
      }
      
      const key = `decreeReplacements_${parishId}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      
      index = current.findIndex(d => d.id === decreeId);
      if (index === -1) return { success: false, message: "Decreto no encontrado" };
      
      current[index] = { ...current[index], ...updatedData, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(current));
      
      setData(prev => ({ ...prev, decreeReplacements: current }));
      return { success: true };
  };

  // --- LÓGICA DE ELIMINACIÓN DE REPOSICIÓN (CON ROLLBACK EXHAUSTIVO) ---
  const deleteDecreeReplacement = (decreeId, parishId) => {
      try {
          if (!parishId) return { success: false, message: "Falta ID de parroquia" };
          
          const specificKey = `decreeReplacementBaptism_${parishId}`;
          const key = `decreeReplacements_${parishId}`;
          
          let specific = JSON.parse(localStorage.getItem(specificKey) || '[]');
          let current = JSON.parse(localStorage.getItem(key) || '[]');
          
          const decreeToDelete = current.find(d => d.id === decreeId) || specific.find(d => d.id === decreeId);
          if (!decreeToDelete) return { success: false, message: "Decreto no encontrado" };

          const decNum = String(decreeToDelete.numeroDecreto || decreeToDelete.decreeNumber || '');
          const targetParish = decreeToDelete.targetParishId || parishId;
          const baptismsKey = `baptisms_${targetParish}`;

          let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
          let params = JSON.parse(localStorage.getItem(`baptismParameters_${targetParish}`) || '{}');
          let deletedCount = 0;

          // 1. Eliminar partida supletoria
          baptisms = baptisms.filter(b => {
              const isCreatedByThis = (b.correctionDecreeRef === decNum || b.replacementDecreeRef === decNum || b.decreeNumber === decNum) && (b.creadoPorDecreto || b.isSupplementary);
              if (isCreatedByThis) deletedCount++;
              return !isCreatedByThis;
          });

          // 2. Revertir la original anulada
          baptisms = baptisms.map(b => {
              if (b.annulmentDecree === decNum) {
                  const newB = { ...b, status: 'seated', estado: 'seated', updatedAt: new Date().toISOString() };
                  delete newB.isAnnulled; delete newB.anulado; delete newB.annulmentDecree; delete newB.annulmentDate;
                  delete newB.conceptoAnulacionId; delete newB.tipoNotaAlMargen; delete newB.notaMarginal; delete newB.marginNote;
                  return newB;
              }
              return b;
          });

          // 3. Ajustar el contador supletorio
          if (deletedCount > 0) {
              let currentNum = parseInt(params.suplementarioNumero || '1', 10);
              if (currentNum > deletedCount) {
                  const paddedLength = String(params.suplementarioNumero || '').length || 1;
                  params.suplementarioNumero = String(currentNum - deletedCount).padStart(paddedLength, '0');
                  localStorage.setItem(`baptismParameters_${targetParish}`, JSON.stringify(params));
              }
          }

          localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
          localStorage.setItem(`baptismPartidas_${targetParish}`, JSON.stringify(baptisms));

          if (specific.some(d => d.id === decreeId)) {
              localStorage.setItem(specificKey, JSON.stringify(specific.filter(d => d.id !== decreeId)));
          }
          const updated = current.filter(d => d.id !== decreeId);
          localStorage.setItem(key, JSON.stringify(updated));
          setData(prev => ({ ...prev, decreeReplacements: updated }));

          // Clean master copy if it was chancery
          if (decreeToDelete.isMasterCopy && decreeToDelete.targetParishId) {
               const parishReplacementsKey = `decreeReplacementBaptism_${decreeToDelete.targetParishId}`;
               let parishReplacements = JSON.parse(localStorage.getItem(parishReplacementsKey) || '[]');
               const filteredParishR = parishReplacements.filter(c => String(c.decreeNumber || c.numeroDecreto) !== decNum);
               localStorage.setItem(parishReplacementsKey, JSON.stringify(filteredParishR));
          }

          return { success: true, message: "Decreto eliminado y partidas restauradas." };
      } catch (error) {
          return { success: false, message: error.message };
      }
  };
  
  // --- EXISTING FUNCTIONS ---
  const getParishNotifications = (parishId) => {
    if (!parishId) return [];
    return parishNotifications[parishId] || [];
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
  
  const addNotificationToParish = (parishId, notificationData) => createNotification({ ...notificationData, parish_id: parishId });
  
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
          nuevaPartida: "Esta partida se inscribe por reposición según Decreto No. [NUMERO_DECRETO] de fecha [FECHA_DECRETO], debido a la pérdida/deterioro del original. SE EXPIDE EL DIA [FECHA_EXPEDICION].",
          nuevaPartidaCreada: {
              textoParaNuevaPartida: "Esta partida se inscribe por reposición según Decreto No. [NUMERO_DECRETO] de fecha [FECHA_DECRETO], debido a la pérdida/deterioro del original. SE EXPIDE EL DIA [FECHA_EXPEDICION]."
          }
      },
      porNotificacionMatrimonial: {
          textoParaPartidaOriginal: "ESTA PARTIDA CORRESPONDE A PERSONA CASADA/O. DECRETO DE NOTIFICACION MATRIMONIAL [NUMERO_DECRETO] DE [FECHA_DECRETO]. MATRIMONIO CELEBRADO [FECHA_MATRIMONIO]. EXPEDIDO EL DIA [FECHA_EXPEDICION]."
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
              porCorreccion: { ...defaultData.porCorreccion, ...(storedData.porCorreccion || {}) },
              porReposicion: { ...defaultData.porReposicion, ...(storedData.porReposicion || {}) },
              porNotificacionMatrimonial: { ...defaultData.porNotificacionMatrimonial, ...(storedData.porNotificacionMatrimonial || {}) }
          };
      }
      return getDefaultMarginalNotes();
  };

  const saveNotasAlMargen = (notes, parishId) => {
      if (!parishId) return;
      localStorage.setItem(`notasAlMargen_${parishId}`, JSON.stringify(notes));
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
              nuevaPartida: nuevaPartida || current.porReposicion.nuevaPartida,
              nuevaPartidaCreada: {
                  textoParaNuevaPartida: nuevaPartida || current.porReposicion.nuevaPartidaCreada?.textoParaNuevaPartida
              }
          }
      };
      saveNotasAlMargen(updated, parishId);
      return { success: true, message: "Nota de reposición actualizada." };
  };

  const actualizarNotaAlMargenEstandar = (texto, parishId) => {
      const current = obtenerNotasAlMargen(parishId);
      const updated = { ...current, estandar: texto || "" };
      saveNotasAlMargen(updated, parishId);
      return { success: true, message: "Nota estándar actualizada." };
  };

  const getBaptismCorrections = (parishId) => {
      if (!parishId) return [];
      const key = `baptismCorrections_${parishId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
  };

  // --- LÓGICA DE ELIMINACIÓN DE CORRECCIÓN (CON ROLLBACK EXHAUSTIVO) ---
  const deleteBaptismCorrection = (id, parishId) => {
      try {
          if (!parishId) return { success: false, message: "ID de parroquia faltante." };
          const correctionsKey = `baptismCorrections_${parishId}`;
          
          let corrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
          const decreeToDelete = corrections.find(c => c.id === id);
          if (!decreeToDelete) return { success: false, message: "Decreto de corrección no encontrado." };
          
          const decNum = String(decreeToDelete.numeroDecreto || decreeToDelete.decreeNumber || '');
          
          // Si es un decreto de Cancillería, afectar la base de la parroquia destino, NO la de cancillería
          const targetParish = decreeToDelete.targetParishId || parishId;
          const baptismsKey = `baptisms_${targetParish}`;

          let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
          let params = JSON.parse(localStorage.getItem(`baptismParameters_${targetParish}`) || '{}');
          let deletedCount = 0;

          // 1. Eliminar la partida supletoria creada
          baptisms = baptisms.filter(b => {
              const isCreatedByThis = (b.correctionDecreeRef === decNum || b.replacementDecreeRef === decNum || b.decreeNumber === decNum) && (b.creadoPorDecreto || b.isSupplementary);
              if (isCreatedByThis) deletedCount++;
              return !isCreatedByThis;
          });

          // 2. Revertir la original anulada (Limpieza profunda)
          baptisms = baptisms.map(b => {
              if (b.annulmentDecree === decNum) {
                  const newB = { ...b, status: 'seated', estado: 'seated', updatedAt: new Date().toISOString() };
                  delete newB.isAnnulled; delete newB.anulado; delete newB.annulmentDecree; delete newB.annulmentDate;
                  delete newB.conceptoAnulacionId; delete newB.tipoNotaAlMargen; delete newB.notaMarginal; delete newB.marginNote;
                  return newB;
              }
              return b;
          });

          // 3. Ajustar el contador supletorio
          if (deletedCount > 0) {
              let currentNum = parseInt(params.suplementarioNumero || '1', 10);
              if (currentNum > deletedCount) {
                  const paddedLength = String(params.suplementarioNumero || '').length || 1;
                  params.suplementarioNumero = String(currentNum - deletedCount).padStart(paddedLength, '0');
                  localStorage.setItem(`baptismParameters_${targetParish}`, JSON.stringify(params));
              }
          }
          
          const updatedCorrections = corrections.filter(c => c.id !== id);
          localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
          localStorage.setItem(`baptismPartidas_${targetParish}`, JSON.stringify(baptisms));
          localStorage.setItem(correctionsKey, JSON.stringify(updatedCorrections));

          // Limpiar de parroquia si es Cancillería
          if (decreeToDelete.isMasterCopy && decreeToDelete.targetParishId) {
             const parishCorrectionsKey = `baptismCorrections_${decreeToDelete.targetParishId}`;
             let parishCorrections = JSON.parse(localStorage.getItem(parishCorrectionsKey) || '[]');
             const filteredParish = parishCorrections.filter(c => String(c.decreeNumber || c.numeroDecreto) !== decNum);
             localStorage.setItem(parishCorrectionsKey, JSON.stringify(filteredParish));
          }
          
          return { success: true, message: "Decreto eliminado. Partida restaurada y supletoria borrada." };
      } catch (e) {
          console.error("Error deleting baptism correction:", e);
          return { success: false, message: e.message };
      }
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
            isAnnulled: true, status: 'anulada',
            annulmentDecree: decreeData.decreeNumber, annulmentDate: decreeData.decreeDate,
            conceptoAnulacionId: decreeData.conceptoAnulacionId,
            tipoNotaAlMargen: 'porCorreccion.anulada', updatedAt: new Date().toISOString()
        };
        
        let params = JSON.parse(localStorage.getItem(`baptismParameters_${parishId}`) || '{}');
        if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };
        
        const newPartida = {
            ...newPartidaData,
            id: generateUUID(), parishId,
            book_number: params.suplementarioLibro, page_number: params.suplementarioFolio, entry_number: params.suplementarioNumero,
            status: 'seated', isSupplementary: true, 
            correctionDecreeRef: decreeData.decreeNumber, conceptoAnulacionId: decreeData.conceptoAnulacionId,
            tipoNotaAlMargen: 'porCorreccion.nuevaPartida', createdAt: new Date().toISOString()
        };
        
        baptisms.push(newPartida);
        params.suplementarioNumero = incrementPaddedValue(params.suplementarioNumero || '0');
        localStorage.setItem(`baptismParameters_${parishId}`, JSON.stringify(params));
        localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
        
        const correctionsKey = `baptismCorrections_${parishId}`;
        let corrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
        const decreeRecord = {
            id: generateUUID(), ...decreeData, originalPartidaId, newPartidaId: newPartida.id,
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
          if (authUser && authUser.parishId) parishId = authUser.parishId;
          else if (currentUser && currentUser.parishId) parishId = currentUser.parishId;
          else {
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

  const processBaptismDecreeBatch = async (decreesBatch, parishId) => {
        try {
            const baptismsKey = `baptisms_${parishId}`;
            const correctionsKey = `baptismCorrections_${parishId}`;
            const replacementsKey = `decreeReplacementBaptism_${parishId}`; 
            
            let allBaptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
            let existingCorrections = JSON.parse(localStorage.getItem(correctionsKey) || '[]');
            let existingReplacements = JSON.parse(localStorage.getItem(replacementsKey) || '[]');
            
            const parrocoActivo = getParrocoActual(parishId);
            const nombreSacerdote = parrocoActivo ? `${parrocoActivo.nombre || ''} ${parrocoActivo.apellido || ''}`.trim() : 'PÁRROCO ENCARGADO';
            const notasConfig = obtenerNotasAlMargen(parishId);

            const normalizeNum = (num) => String(num || '').trim().replace(/^0+/, '') || '0';

            const getNum = (val) => {
                if (val == null || val === '') return null;
                const parsed = parseInt(String(val).replace(/\D/g, ''), 10);
                return isNaN(parsed) ? null : parsed;
            };

            const isSameNum = (val1, val2) => {
                const n1 = getNum(val1);
                const n2 = getNum(val2);
                return n1 !== null && n2 !== null && n1 === n2;
            };

            let processedCount = 0;
            let duplicateCount = 0;

            decreesBatch.forEach(decree => {
                const rawDecNum = String(decree.decreto || decree.decreeNumber || '').trim();
                const normDecNum = normalizeNum(rawDecNum);

                const existsInCorrections = existingCorrections.some(c => normalizeNum(c.numeroDecreto) === normDecNum || normalizeNum(c.decreeNumber) === normDecNum);
                const existsInReplacements = existingReplacements.some(r => normalizeNum(r.numeroDecreto) === normDecNum || normalizeNum(r.decreeNumber) === normDecNum);

                if (existsInCorrections || existsInReplacements) {
                    duplicateCount++;
                    return; 
                }

                const origLib = decree.libro || (decree.originalData && decree.originalData.libro);
                const origFol = decree.folio || (decree.originalData && decree.originalData.folio);
                const origNum = decree.numero || (decree.originalData && decree.originalData.numero);

                const newLib = decree.newlib || (decree.newData && decree.newData.libro);
                const newFol = decree.newfol || (decree.newData && decree.newData.folio);
                const newNum = decree.newnum || (decree.newData && decree.newData.numero);

                const decDate = decree.fecha || decree.decreeDate;
                const decConcept = String(decree.codiconcep || decree.annulmentConceptCode || '');
                const decObs = decree.observacio || decree.observations || '';

                const isReposicion = decConcept === '005';

                let originalFound = false;
                let newFound = false;
                let originalNames = { nombres: '', apellidos: '' };
                let fullOriginalSnapshot = null;
                let fullNewSnapshot = null;

                const decretoObj = { numero: rawDecNum, fecha: decDate, oficina: 'CANCILLERÍA' };
                const partidaNuevaObj = { libro: newLib, folio: newFol, numero: newNum };
                const partidaAnuladaObj = { libro: origLib, folio: origFol, numero: origNum };

                let notaAnuladaOficial = generarNotaAlMargenAnulada(partidaNuevaObj, decretoObj, parishId);
                let notaNuevaOficial = generarNotaAlMargenNuevaPartida(partidaAnuladaObj, decretoObj, nombreSacerdote, parishId);
                
                let notaReposicion = notasConfig?.porReposicion?.nuevaPartidaCreada?.textoParaNuevaPartida 
                    || notasConfig?.porReposicion?.nuevaPartida 
                    || "ESTA PARTIDA FUE CREADA POR DECRETO DE REPOSICIÓN No. [NUMERO_DECRETO]";
                notaReposicion = notaReposicion
                    .replace(/\[NUMERO_DECRETO\]/g, rawDecNum)
                    .replace(/\[FECHA_DECRETO\]/g, convertDateToSpanishText(decDate).replace(/^EL\s+/i, ''));

                if (decObs) {
                    notaAnuladaOficial += ` OBSERVACIONES: ${decObs}`;
                    notaNuevaOficial += ` OBSERVACIONES: ${decObs}`;
                    notaReposicion += ` OBSERVACIONES: ${decObs}`;
                }

                allBaptisms = allBaptisms.map(b => {
                    const isOrig = isSameNum(b.libro || b.book_number, origLib) &&
                                   isSameNum(b.folio || b.page_number, origFol) &&
                                   isSameNum(b.numero || b.entry_number, origNum);

                    const isNew = isSameNum(b.libro || b.book_number, newLib) &&
                                  isSameNum(b.folio || b.page_number, newFol) &&
                                  isSameNum(b.numero || b.entry_number, newNum);

                    if (isOrig) {
                        originalFound = true;
                        if (!fullOriginalSnapshot) {
                            fullOriginalSnapshot = { ...b };
                            originalNames.nombres = b.nombres || b.firstName || '';
                            originalNames.apellidos = b.apellidos || b.lastName || '';
                        }
                        
                        return {
                            ...b,
                            isAnnulled: true,
                            status: 'anulada',
                            estado: 'anulada',
                            annulmentDecree: rawDecNum,
                            annulmentDate: decDate,
                            conceptoAnulacionId: decConcept,
                            tipoNotaAlMargen: isReposicion ? 'porReposicion.anulada' : 'porCorreccion.anulada',
                            notaMarginal: isReposicion ? 'PARTIDA ANULADA POR REPOSICIÓN.' : notaAnuladaOficial,
                            marginNote: isReposicion ? 'PARTIDA ANULADA POR REPOSICIÓN.' : notaAnuladaOficial,
                            updatedAt: new Date().toISOString()
                        };
                    }

                    if (isNew) {
                        newFound = true;
                        if (!fullNewSnapshot) fullNewSnapshot = { ...b };
                        if (!originalFound) {
                            originalNames.nombres = b.nombres || b.firstName || '';
                            originalNames.apellidos = b.apellidos || b.lastName || '';
                        }
                        return {
                            ...b,
                            isSupplementary: true,
                            creadoPorDecreto: true,
                            hasDecree: true,
                            numeroDecreto: rawDecNum,
                            decreeNumber: rawDecNum,
                            correctionDecreeRef: rawDecNum,
                            replacementDecreeRef: isReposicion ? rawDecNum : undefined,
                            tipoNotaAlMargen: isReposicion ? 'porReposicion.nuevaPartida' : 'porCorreccion.nuevaPartida',
                            notaMarginal: isReposicion ? notaReposicion : notaNuevaOficial,
                            marginNote: isReposicion ? notaReposicion : notaNuevaOficial,
                            updatedAt: new Date().toISOString()
                        };
                    }

                    return b;
                });

                if (newFound || originalFound) {
                    const decreeRecord = {
                        id: `import-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        type: isReposicion ? "replacement" : "correction",
                        sacrament: "bautismo",
                        numeroDecreto: rawDecNum,
                        decreeNumber: rawDecNum,
                        fechaDecreto: decDate,
                        decreeDate: decDate,
                        conceptoAnulacionId: decConcept,
                        errorEncontrado: decObs || (isReposicion ? 'Reposición Importada' : 'Corrección Importada'),
                        correccionRealizada: `L:${newLib} F:${newFol} N:${newNum}`,
                        nombres: originalNames.nombres,
                        apellidos: originalNames.apellidos,
                        targetName: `${originalNames.nombres} ${originalNames.apellidos}`.trim() || 'Sin Nombre',
                        observations: decObs,
                        originalPartidaId: fullOriginalSnapshot ? fullOriginalSnapshot.id : "unknown",
                        originalPartidaSummary: fullOriginalSnapshot ? { ...fullOriginalSnapshot } : null,
                        newPartidaSummary: { book: newLib, page: newFol, entry: newNum }, 
                        datosNuevaPartida: fullNewSnapshot || fullOriginalSnapshot || null, 
                        status: 'active',
                        createdAt: new Date().toISOString()
                    };

                    if (isReposicion) {
                        existingReplacements.push(decreeRecord);
                    } else {
                        existingCorrections.push(decreeRecord);
                    }
                    processedCount++;
                }
            });

            localStorage.setItem(baptismsKey, JSON.stringify(allBaptisms));
            localStorage.setItem(`baptismPartidas_${parishId}`, JSON.stringify(allBaptisms));
            localStorage.setItem(correctionsKey, JSON.stringify(existingCorrections));
            localStorage.setItem(replacementsKey, JSON.stringify(existingReplacements));
            
            window.dispatchEvent(new Event('storage'));

            let finalMessage = `Se procesaron y clasificaron ${processedCount} decretos correctamente.`;
            if (duplicateCount > 0) {
                finalMessage += ` Se omitieron ${duplicateCount} decretos que ya existían (número duplicado).`;
            }

            return { success: true, message: finalMessage };

        } catch (error) {
            console.error("Error en processBaptismDecreeBatch:", error);
            return { success: false, message: error.message };
        }
    };

  const createDioceseArchdiocese = (dioceseData, userData) => {
    try {
        const newDioceseId = generateUUID();
        let type = dioceseData.type || ((dioceseData.name.toLowerCase().includes('arquidiócesis') || dioceseData.name.toLowerCase().includes('arquidiocesis')) ? 'archdiocese' : 'diocese');
        const newDiocese = { ...dioceseData, id: newDioceseId, type: type, createdAt: new Date().toISOString() };
        const newUser = sanitizeUser({ ...userData, id: generateUUID(), role: ROLE_TYPES.DIOCESE, dioceseId: newDioceseId, dioceseName: dioceseData.name, createdAt: new Date().toISOString() });
        const updatedDioceses = [...data.dioceses, newDiocese];
        const updatedUsers = [...data.users, newUser];
        saveData('dioceses', updatedDioceses);
        saveData('users', updatedUsers);
        return { success: true, data: newDiocese };
    } catch (error) {
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
        return { success: false, message: error.message };
      }
  };

  const createUser = (userData) => {
      const sanitizedUserData = sanitizeUser({ ...userData, id: generateUUID(), createdAt: new Date().toISOString() });
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

  const getParishUsers = (dioceseId) => data.users.filter(u => u.role === ROLE_TYPES.PARISH && u.dioceseId === dioceseId);
  const getChanceryUsers = (dioceseId) => data.users.filter(u => u.role === ROLE_TYPES.CHANCERY && u.dioceseId === dioceseId);

  const createChancellor = (chancellorData, userData) => {
      const newChancellor = { ...chancellorData, id: generateUUID(), createdAt: new Date().toISOString() };
      const updatedChancellors = [...data.chancellors, newChancellor];
      const newUser = sanitizeUser({ ...userData, id: generateUUID(), role: ROLE_TYPES.CHANCERY, chancellorId: newChancellor.id, dioceseId: chancellorData.dioceseId, createdAt: new Date().toISOString() });
      const updatedUsers = [...data.users, newUser];
      saveData('chancellors', updatedChancellors);
      saveData('users', updatedUsers);
      return { success: true };
  };

  const updateChancellor = (id, updates) => {
      try {
          let currentChancellors = data.chancellors || [];
          let index = currentChancellors.findIndex(c => c.id === id);
          
          if (index !== -1) {
              const updated = [...currentChancellors];
              updated[index] = { ...updated[index], ...updates, updatedAt: new Date().toISOString() };
              saveData('chancellors', updated);
              return { success: true, message: "Actualizado correctamente." };
          }
          
          let currentChancelleries = data.chancelleries || [];
          let indexLegacy = currentChancelleries.findIndex(c => c.id === id);
          
          if (indexLegacy !== -1) {
              const updatedLegacy = [...currentChancelleries];
              updatedLegacy[indexLegacy] = { ...updatedLegacy[indexLegacy], ...updates, updatedAt: new Date().toISOString() };
              saveData('chancelleries', updatedLegacy);
              return { success: true, message: "Actualizado correctamente." };
          }

          return { success: false, message: 'Canciller no encontrado en la base de datos' };
      } catch (error) {
          return { success: false, message: error.message };
      }
  };

  const deleteChancellor = (id) => {
      try {
          const currentChancellors = data.chancellors?.length ? data.chancellors : JSON.parse(localStorage.getItem('chancellors') || '[]');
          const currentChancelleries = data.chancelleries?.length ? data.chancelleries : JSON.parse(localStorage.getItem('chancelleries') || '[]');
          const currentUsers = data.users?.length ? data.users : JSON.parse(localStorage.getItem('users') || '[]');

          const updatedChancellors = currentChancellors.filter(c => c.id !== id);
          const updatedChancelleries = currentChancelleries.filter(c => c.id !== id);
          const updatedUsers = currentUsers.filter(u => u.chancellorId !== id && u.chancelleryId !== id);
          
          saveData('chancellors', updatedChancellors);
          saveData('chancelleries', updatedChancelleries);
          saveData('users', updatedUsers);
          
          return { success: true, message: "Cancillería eliminada correctamente" };
      } catch (error) {
          console.error("Error deleting chancellor:", error);
          return { success: false, message: error.message };
      }
  };

  const getChancellorByDiocese = (dioceseId) => data.chancellors.find(c => c.dioceseId === dioceseId);

  const createParish = (parishData, userData) => {
    const newParish = { ...parishData, id: generateUUID(), createdAt: new Date().toISOString() };
    const updatedParishes = [...data.parishes, newParish];
    const newUser = sanitizeUser({ ...userData, id: generateUUID(), parishId: newParish.id, role: ROLE_TYPES.PARISH, createdAt: new Date().toISOString() });
    const updatedUsers = [...data.users, newUser];
    saveData('parishes', updatedParishes);
    saveData('users', updatedUsers);
    return { success: true };
  };

  const getDefaultBaptismParameters = () => ({
      enablePreview: true, reportPrinting: false, ordinarioBlocked: false, ordinarioRestartNumber: false,
      ordinarioPartidas: 2, ordinarioLibro: 1, ordinarioFolio: 436, ordinarioNumero: 871,
      suplementarioBlocked: false, suplementarioReiniciar: false, suplementarioPartidas: 2,
      suplementarioLibro: 3, suplementarioFolio: 2, suplementarioNumero: 3,
      registroAdultoEn: 'ordinario', registroDecretoEn: 'suplementario', generarNotaMarginal: true,
      inscripcionNumero: '36', inscripcionFecha: '2025-10-11T00:00', inscripcionFormato: '1'
  });

  const loadParameters = () => {
      const storedUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
      const contextId = storedUser?.parishId || storedUser?.dioceseId;
      const storageKey = contextId ? `baptismParameters_${contextId}` : 'baptismParameters';
      setBaptismParameters(JSON.parse(localStorage.getItem(storageKey)) || JSON.parse(localStorage.getItem('baptismParameters')) || getDefaultBaptismParameters());
  };

  const getBaptismParameters = (contextId) => {
      const id = contextId || currentUser?.parishId;
      const storageKey = id ? `baptismParameters_${id}` : 'baptismParameters';
      const stored = localStorage.getItem(storageKey);
      if (stored) return { ...getDefaultBaptismParameters(), ...JSON.parse(stored) };
      return baptismParameters || getDefaultBaptismParameters();
  };

  const saveBaptismParameters = (params, contextId) => {
      const id = contextId || currentUser?.parishId;
      const storageKey = id ? `baptismParameters_${id}` : 'baptismParameters';
      try {
          localStorage.setItem(storageKey, JSON.stringify(params));
          setBaptismParameters(params);
          return { success: true, message: "Parámetros guardados correctamente." };
      } catch (error) {
          return { success: false, message: "Error al guardar parámetros." };
      }
  };
  
  const getDefaultConfirmationParameters = () => ({
    enablePreview: true, reportPrinting: false, ordinarioBlocked: false, ordinarioRestartNumber: false,
    ordinarioPartidas: 2, ordinarioLibro: 1, ordinarioFolio: 3, ordinarioNumero: 5,
    suplementarioBlocked: false, suplementarioReiniciar: false, suplementarioPartidas: 2,
    suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1,
    registroInscripcionEn: 'ordinario', inscripcionNumero: '1', inscripcionFecha: '2025-11-01T00:00', inscripcionFormato: '1'
  });

  const getConfirmationParameters = (contextId) => {
      if (!contextId) return getDefaultConfirmationParameters();
      const storageKey = `confirmationParameters_${contextId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) return { ...getDefaultConfirmationParameters(), ...JSON.parse(stored) };
      return getDefaultConfirmationParameters();
  };

  const updateConfirmationParameters = (contextId, params) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const storageKey = `confirmationParameters_${contextId}`;
          const current = getConfirmationParameters(contextId);
          localStorage.setItem(storageKey, JSON.stringify({ ...current, ...params }));
          return { success: true, message: "Parámetros de confirmación actualizados." };
      } catch (error) {
          return { success: false, message: "Error al guardar parámetros." };
      }
  };

  const resetConfirmationParameters = (contextId) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const defaults = getDefaultConfirmationParameters();
          localStorage.setItem(`confirmationParameters_${contextId}`, JSON.stringify(defaults));
          return { success: true, message: "Parámetros restablecidos a valores por defecto.", data: defaults };
      } catch (error) {
          return { success: false, message: "Error al restablecer parámetros." };
      }
  };

  const getNextConfirmationNumbers = (parishId) => {
       const params = getConfirmationParameters(parishId);
       return { book: params.ordinarioLibro || 1, page: params.ordinarioFolio || 1, entry: params.ordinarioNumero || 1 };
  };

  const getDefaultMatrimonioParameters = () => ({
    enablePreview: true, reportPrinting: false, ordinarioBlocked: false, ordinarioRestartNumber: false,
    ordinarioPartidas: 1, ordinarioLibro: 1, ordinarioFolio: 1, ordinarioNumero: 1,
  });

  const getMatrimonioParameters = (contextId) => {
      if (!contextId) return getDefaultMatrimonioParameters();
      const storageKey = `matrimonioParameters_${contextId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) return { ...getDefaultMatrimonioParameters(), ...JSON.parse(stored) };
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
          return { success: false, message: "Error al guardar parámetros." };
      }
  };

  const resetMatrimonioParameters = (contextId) => {
      if (!contextId) return { success: false, message: "ID de contexto no proporcionado" };
      try {
          const defaults = getDefaultMatrimonioParameters();
          localStorage.setItem(`matrimonioParameters_${contextId}`, JSON.stringify(defaults));
          setMatrimonioParameters(defaults);
          return { success: true, message: "Parámetros restablecidos a valores por defecto.", data: defaults };
      } catch (error) {
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
              id: generateUUID(), nombre: (item.data || item.nombre || '').trim(),
              source: item.source || 'import', count: item.count || 0, weight: item.weight || 0, createdAt: new Date().toISOString()
          })).filter(item => item.nombre);
          localStorage.setItem(key, JSON.stringify([...currentData, ...newItems]));
          return { success: true, count: newItems.length };
      } catch (e) {
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
       return { success: true, message: "Registro eliminada" };
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
              addedCount: recordsToAdd.length, ignoredCount, addedRecords: recordsToAdd, ignoredRecords: duplicateDetails
          };
      } catch (error) {
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

          return { success: true, message: `${newRecords.length} registros importados.`, addedCount: newRecords.length, duplicateCount, duplicateDetails };
      } catch (error) {
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
  const importParrocos = (payload, parishId, append = false) => {
      if (!parishId) return { success: false, message: "No se especificó el ID de parroquia." };
      try {
          const key = `parrocos_${parishId}`;
          const currentData = append ? JSON.parse(localStorage.getItem(key) || '[]') : [];
          
          const newItems = payload.data.map(item => ({
              ...item,
              id: generateUUID(),
              createdAt: new Date().toISOString()
          }));
          
          localStorage.setItem(key, JSON.stringify([...currentData, ...newItems]));
          actualizarParrocoActual(parishId);
          
          return { success: true, count: newItems.length };
      } catch (e) {
          console.error("Error importando párrocos:", e);
          return { success: false, message: e.message };
      }
  };
  const importMisDatos = () => ({ success: true });
  const importMisDatosLegacy = () => ({ success: true });

  const fetchCatalogsFromSource = async () => [];
  const getPaises = (parishId) => getAuxData('paises', parishId);
  const getParroquiasExternas = (parishId) => getAuxData('parroquias_externas', parishId);
  const importPaises = () => ({ success: true });
  const importParroquiasExternas = () => ({ success: true });

  const getBaptisms = (parishId) => {
      if (!parishId) return [];
      try {
          const raw = localStorage.getItem(`baptisms_${parishId}`);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return [];
          return parsed.filter(b => b && b.id && (b.nombres || b.firstName || b.apellidos || b.lastName));
      } catch (error) {
          console.error(`[AppDataContext] Error loading baptisms for parish ${parishId}:`, error);
          return [];
      }
  };
  
  const getConfirmedBaptisms = (parishId) => {
      const all = getBaptisms(parishId);
      return all.filter(b => b.status === 'confirmed' || b.status === 'seated');
  };
  
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
  
  const getPendingBaptisms = async (parishId) => {
      if (!parishId) return [];
      try {
          const raw = localStorage.getItem(`pendingBaptisms_${parishId}`);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return [];
          return parsed.filter(b => b && b.id && (b.nombres || b.firstName || b.apellidos || b.lastName));
      } catch (error) {
          console.error(`[AppDataContext] Error loading pending baptisms for parish ${parishId}:`, error);
          return [];
      }
  };
  
  // --- MOTOR MATEMÁTICO DE CONSECUTIVOS INTELIGENTE ---
  const calculateNextConsecutive = (currentNumero, currentFolio, currentLibro, maxPartidasPorFolio, reiniciarEnFolioNuevo) => {
      let nextNumero = parseInt(currentNumero || 1, 10) + 1;
      let nextFolio = parseInt(currentFolio || 1, 10);
      let nextLibro = parseInt(currentLibro || 1, 10);
      const partidasPorFolio = parseInt(maxPartidasPorFolio || 1, 10);

      // Calcular el nuevo folio matemáticamente
      const expectedFolio = Math.ceil((parseInt(currentNumero || 1, 10) + 1) / partidasPorFolio);

      // Si el folio esperado es mayor al actual, significa que saltamos de folio
      if (expectedFolio > nextFolio) {
          nextFolio = expectedFolio;
          
          // Si el parámetro de reiniciar número en cada folio está activo
          if (reiniciarEnFolioNuevo) {
              nextNumero = 1;
          }
      }

      // Devolver como strings con zero-padding de 4 dígitos
      return {
          numero: String(nextNumero).padStart(4, '0'),
          folio: String(nextFolio).padStart(4, '0'),
          libro: String(nextLibro).padStart(4, '0')
      };
  };

  const seatBaptism = async (id, parishId, updates = {}) => {
      const pending = await getPendingBaptisms(parishId);
      const record = pending.find(r => r.id === id);
      if (!record) return { success: false, message: "Registro no encontrado" };
      
      const params = JSON.parse(localStorage.getItem(`baptismParameters_${parishId}`) || '{}');
      
      // Asignar valores formateados a 4 dígitos
      const libroAsignado = String(params.ordinarioLibro || 1).padStart(4, '0');
      const folioAsignado = String(params.ordinarioFolio || 1).padStart(4, '0');
      const numeroAsignado = String(params.ordinarioNumero || 1).padStart(4, '0');

      const finalRecord = { 
          ...record, 
          ...updates, 
          status: 'celebrated', 
          estado: 'Activo',
          book_number: libroAsignado, 
          page_number: folioAsignado, 
          entry_number: numeroAsignado,
          libro: libroAsignado,
          folio: folioAsignado,
          numero: numeroAsignado,
          numeroActa: numeroAsignado
      };
      
      const list = getBaptisms(parishId);
      localStorage.setItem(`baptisms_${parishId}`, JSON.stringify([...list, finalRecord]));
      
      const newPending = pending.filter(r => r.id !== id);
      localStorage.setItem(`pendingBaptisms_${parishId}`, JSON.stringify(newPending));
      
      // Calcular los siguientes consecutivos inteligentemente
      const nextConsecutivos = calculateNextConsecutive(
          params.ordinarioNumero || 1, 
          params.ordinarioFolio || 1, 
          params.ordinarioLibro || 1, 
          params.ordinarioPartidas || 2, 
          params.ordinarioRestartNumber
      );

      localStorage.setItem(`baptismParameters_${parishId}`, JSON.stringify({ 
          ...params, 
          ordinarioNumero: nextConsecutivos.numero,
          ordinarioFolio: nextConsecutivos.folio,
          ordinarioLibro: nextConsecutivos.libro
      }));
      
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
      
      const libroAsignado = String(params.ordinarioLibro || 1).padStart(4, '0');
      const folioAsignado = String(params.ordinarioFolio || 1).padStart(4, '0');
      const numeroAsignado = String(params.ordinarioNumero || 1).padStart(4, '0');

      const finalRecord = { 
          ...record, 
          status: 'celebrated', 
          book_number: libroAsignado, 
          page_number: folioAsignado, 
          entry_number: numeroAsignado 
      };
      
      const list = getConfirmations(parishId);
      localStorage.setItem(`confirmations_${parishId}`, JSON.stringify([...list, finalRecord]));
      
      const newPending = pending.filter(r => r.id !== id);
      localStorage.setItem(`pendingConfirmations_${parishId}`, JSON.stringify(newPending));
      
      const nextConsecutivos = calculateNextConsecutive(
          params.ordinarioNumero || 1, 
          params.ordinarioFolio || 1, 
          params.ordinarioLibro || 1, 
          params.ordinarioPartidas || 2, 
          params.ordinarioRestartNumber
      );

      updateConfirmationParameters(parishId, { 
          ...params, 
          ordinarioNumero: nextConsecutivos.numero,
          ordinarioFolio: nextConsecutivos.folio,
          ordinarioLibro: nextConsecutivos.libro
      });
      
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
      
      const libroAsignado = String(params.ordinarioLibro || 1).padStart(4, '0');
      const folioAsignado = String(params.ordinarioFolio || 1).padStart(4, '0');
      const numeroAsignado = String(params.ordinarioNumero || 1).padStart(4, '0');

      const finalRecord = { 
          ...record, 
          status: 'celebrated', 
          book_number: libroAsignado, 
          page_number: folioAsignado, 
          entry_number: numeroAsignado 
      };
      
      const list = getMatrimonios(parishId);
      localStorage.setItem(`matrimonios_${parishId}`, JSON.stringify([...list, finalRecord]));
      
      const newPending = pending.filter(r => r.id !== id);
      localStorage.setItem(`pendingMatrimonios_${parishId}`, JSON.stringify(newPending));
      
      const nextConsecutivos = calculateNextConsecutive(
          params.ordinarioNumero || 1, 
          params.ordinarioFolio || 1, 
          params.ordinarioLibro || 1, 
          params.ordinarioPartidas || 1, 
          params.ordinarioRestartNumber
      );

      updateMatrimonioParameters(parishId, { 
          ...params, 
          ordinarioNumero: nextConsecutivos.numero,
          ordinarioFolio: nextConsecutivos.folio,
          ordinarioLibro: nextConsecutivos.libro
      });
      
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

  // =======================================================================
  // --- MOTOR DE CANCILLERÍA: BÚSQUEDA GLOBAL E INYECCIÓN DUAL ---
  // =======================================================================
  
  /**
   * Global search across all parishes in a diocese
   * @param {string} book - The book number
   * @param {string} page - The page number
   * @param {string} entry - The entry number
   * @param {string} dioceseId - The ID of the diocese to search within
   * @returns {object|null} Object containing the matched record and parishId, or null if not found
   */
  const searchBaptismGlobal = (book, page, entry, dioceseId) => {
      if (!dioceseId) return null;
      
      const parishes = data.parishes.filter(p => p.dioceseId === dioceseId);
      let foundRecord = null;
      let targetParishId = null;
      
      for (const parish of parishes) {
          const records = getBaptisms(parish.id) || [];
          const match = records.find(b => 
              String(b.book_number || b.libro) === String(book) &&
              String(b.page_number || b.folio) === String(page) &&
              String(b.entry_number || b.numero) === String(entry)
          );
          
          if (match) {
              foundRecord = match;
              targetParishId = parish.id;
              break;
          }
      }
      
      return foundRecord ? { record: foundRecord, parishId: targetParishId } : null;
  };

  /**
   * Creates a correction decree at the chancery level and applies it to the target parish
   * @param {object} decreeData - Details of the correction decree
   * @param {string} originalPartidaId - ID of the original baptism record to correct
   * @param {object} newPartidaData - Data for the new replacement baptism record
   * @param {string} targetParishId - ID of the parish where the record exists
   * @param {string} chanceryId - ID of the chancery creating the correction
   * @returns {object} Result object containing success status and message
   */
    const createChanceryCorrection = async (decreeData, originalPartidaId, newPartidaData, targetParishId, chanceryId) => {
        try {
            if (!targetParishId || !chanceryId) {
                return { success: false, message: "Faltan identificadores de parroquia o cancillería." };
            }

            // --- 1. RADAR ANTI-DUPLICADOS GLOBAL (Escanea todo el sistema) ---
            const numDecretoABuscar = String(decreeData.decreeNumber || decreeData.numeroDecreto).trim();
            let isDuplicate = false;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Detectar llaves de corrección (tanto de Cancillería como de Parroquias)
                if (key.includes('baptismCorrections') || key.includes('decrees_correction') || key.includes('decreeCorrection')) {
                    try {
                        const records = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(records) && records.some(r => String(r.numeroDecreto || r.decreeNumber).trim() === numDecretoABuscar)) {
                            isDuplicate = true;
                            break; // Detenemos la búsqueda si encontramos el duplicado
                        }
                    } catch(e) {}
                }
            }

            if (isDuplicate) {
                return { 
                    success: false, 
                    message: `Operación denegada: El Decreto No. ${numDecretoABuscar} ya fue registrado previamente en el sistema por otra entidad o parroquia.` 
                };
            }

            // (Continuamos con el guardado en la bóveda de Cancillería para mantener la estructura actual)
            const chanceryCorrectionsKey = `baptismCorrections_${chanceryId}`;
            let chanceryCorrections = JSON.parse(localStorage.getItem(chanceryCorrectionsKey) || '[]');

            // --- 2. DATOS DE LA PARROQUIA DESTINO (Para membretes y Notas) ---
            const parish = data.parishes.find(p => p.id === targetParishId);
            const parishMisDatos = getMisDatosList(targetParishId)[0] || {};
            const targetParishName = (parishMisDatos.nombre || parish?.name || 'PARROQUIA DESTINO').toUpperCase();
            const targetParishCity = (parishMisDatos.ciudad || parish?.city || 'CIUDAD').toUpperCase();
            const parishLabel = `${targetParishName} - ${targetParishCity}`;

            const parrocoActivo = getParrocoActual(targetParishId);
            const nombreSacerdoteDestino = parrocoActivo
                ? `${parrocoActivo.nombre || ''} ${parrocoActivo.apellido || ''}`.trim().toUpperCase()
                : 'PÁRROCO ENCARGADO';

            // --- 3. PROCESAR PARTIDAS EN LA PARROQUIA DESTINO ---
            const baptismsKey = `baptisms_${targetParishId}`;
            let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
            const originalIndex = baptisms.findIndex(b => b.id === originalPartidaId);

            if (originalIndex === -1) return { success: false, message: "Partida original no encontrada en la parroquia." };
            const originalPartida = baptisms[originalIndex];

            // Objetos auxiliares para generar las notas
            const decretoObj = {
                numero: decreeData.decreeNumber,
                fecha: decreeData.decreeDate,
                oficina: decreeData.parroquia || 'CANCILLERÍA'
            };
            const partidaNuevaObj = {
                libro: newPartidaData.book || newPartidaData.numeroLibro,
                folio: newPartidaData.page || newPartidaData.folio,
                numero: newPartidaData.entry || newPartidaData.numeroActa
            };
            const partidaAnuladaObj = {
                libro: originalPartida.book_number || originalPartida.libro,
                folio: originalPartida.page_number || originalPartida.folio,
                numero: originalPartida.entry_number || originalPartida.numero
            };

            const notaAnulada = generarNotaAlMargenAnulada(partidaNuevaObj, decretoObj, targetParishId);
            const notaNueva = generarNotaAlMargenNuevaPartida(partidaAnuladaObj, decretoObj, nombreSacerdoteDestino, targetParishId);

            // A. Actualizar Partida Original
            baptisms[originalIndex] = {
                ...originalPartida,
                isAnnulled: true, status: 'anulada', estado: 'anulada',
                annulmentDecree: decreeData.decreeNumber, annulmentDate: decreeData.decreeDate,
                conceptoAnulacionId: decreeData.conceptoAnulacionId,
                notaMarginal: notaAnulada, marginNote: notaAnulada,
                updatedAt: new Date().toISOString()
            };

            // B. Crear Partida Supletoria
            let params = JSON.parse(localStorage.getItem(`baptismParameters_${targetParishId}`) || '{}');
            if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

            const newPartida = {
                ...newPartidaData,
                id: generateUUID(), parishId: targetParishId,
                book_number: newPartidaData.book || params.suplementarioLibro,
                page_number: newPartidaData.page || params.suplementarioFolio,
                entry_number: newPartidaData.entry || params.suplementarioNumero,
                status: 'seated', isSupplementary: true, creadoPorDecreto: true, hasDecree: true,
                correctionDecreeRef: decreeData.decreeNumber,
                notaMarginal: notaNueva, marginNote: notaNueva,
                createdAt: new Date().toISOString()
            };
            baptisms.push(newPartida);

            // Guardar BD y actualizar parámetros en la parroquia
            localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
            localStorage.setItem(`baptismPartidas_${targetParishId}`, JSON.stringify(baptisms));
            
            // Incrementar supletorio matemáticamente
            const nextSupletorio = calculateNextConsecutive(
                params.suplementarioNumero || 1, 
                params.suplementarioFolio || 1, 
                params.suplementarioLibro || 1, 
                params.suplementarioPartidas || 2, 
                params.suplementarioReiniciar
            );

            localStorage.setItem(`baptismParameters_${targetParishId}`, JSON.stringify({ 
                ...params, 
                suplementarioNumero: nextSupletorio.numero,
                suplementarioFolio: nextSupletorio.folio,
                suplementarioLibro: nextSupletorio.libro
            }));
            
            // --- 4. GENERAR REGISTROS DE DECRETO (Sincronizados) ---
            const commonDecreeInfo = {
                ...decreeData,
                type: 'correction',
                sacrament: 'bautismo',
                originalPartidaId,
                newPartidaId: newPartida.id,
                nombreSacerdoteDestino, 
                targetParishId,
                targetParishName: parishLabel,
                originalPartidaSummary: { ...originalPartida, book: partidaAnuladaObj.libro, page: partidaAnuladaObj.folio, entry: partidaAnuladaObj.numero },
                newPartidaSummary: { ...newPartida, book: newPartida.book_number, page: newPartida.page_number, entry: newPartida.entry_number },
                targetName: decreeData.targetName || `${originalPartida.nombres || originalPartida.firstName || ''} ${originalPartida.apellidos || originalPartida.lastName || ''}`.trim(),
                createdAt: new Date().toISOString()
            };

            // Guardar en Parroquia (Membrete = Parroquia)
            const parishDecreesKey = `baptismCorrections_${targetParishId}`;
            let parishDecrees = JSON.parse(localStorage.getItem(parishDecreesKey) || '[]');
            parishDecrees.push({ ...commonDecreeInfo, id: generateUUID(), parroquia: parishLabel });
            localStorage.setItem(parishDecreesKey, JSON.stringify(parishDecrees));

            // Guardar en Cancillería (Membrete = Cancillería + isMasterCopy)
            const chanceryDecreeRecord = {
                ...commonDecreeInfo,
                id: generateUUID(),
                isMasterCopy: true
            };
            chanceryCorrections.push(chanceryDecreeRecord);
            localStorage.setItem(chanceryCorrectionsKey, JSON.stringify(chanceryCorrections));

            window.dispatchEvent(new Event('storage'));
            return { success: true, message: "Decreto emitido y vinculado correctamente.", data: chanceryDecreeRecord };

        } catch (e) {
            console.error("Error en createChanceryCorrection:", e);
            return { success: false, message: e.message };
        }
    };

    // =======================================================================
  // --- MOTOR CANCILLERÍA: DECRETOS DE REPOSICIÓN (INYECCIÓN DUAL) ---
  // =======================================================================
  const createChanceryReplacement = async (decreeData, newPartidaData, targetParishId, chanceryId) => {
      try {
        if (!targetParishId || !chanceryId) return { success: false, message: "Faltan identificadores." };

        // --- 1. RADAR ANTI-DUPLICADOS GLOBAL (Escanea todo el sistema) ---
        const numDecretoABuscar = String(decreeData.numeroDecreto || decreeData.decreeNumber).trim();
        let isDuplicate = false;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('decreeReplacement') || key.includes('decrees_replacement')) {
                try {
                    const records = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(records) && records.some(r => String(r.numeroDecreto || r.decreeNumber).trim() === numDecretoABuscar)) {
                        isDuplicate = true;
                        break;
                    }
                } catch(e) {}
            }
        }

        if (isDuplicate) {
            return { 
                success: false, 
                message: `Operación denegada: El Decreto de Reposición No. ${numDecretoABuscar} ya fue registrado previamente en el sistema.` 
            };
        }
        // -------------------------------------------------------------------

        const chanceryReplacementsKey = `decreeReplacementBaptism_${chanceryId}`;
        let chanceryReplacements = JSON.parse(localStorage.getItem(chanceryReplacementsKey) || '[]');

        // 2. TRADUCIR EL CONCEPTO
        const todosConceptos = getConceptosAnulacion(chanceryId) || [];
        const conceptoReal = todosConceptos.find(c => String(c.id) === String(decreeData.conceptoAnulacionId));
        const nombreConceptoText = conceptoReal ? conceptoReal.concepto : 'DECRETO DE REPOSICIÓN DE BAUTISMO';

        // 3. DATOS DE LA PARROQUIA DESTINO
        const parish = data.parishes.find(p => p.id === targetParishId);
        const parishMisDatos = getMisDatosList(targetParishId)[0] || {};
        const targetParishName = (parishMisDatos.nombre || parish?.name || 'PARROQUIA DESTINO').toUpperCase();
        const targetParishCity = (parishMisDatos.ciudad || parish?.city || 'CIUDAD').toUpperCase();
        const parishLabel = `${targetParishName} - ${targetParishCity}`;

        const parrocoActivo = getParrocoActual(targetParishId);
        const nombreSacerdoteDestino = parrocoActivo ? `${parrocoActivo.nombre || ''} ${parrocoActivo.apellido || ''}`.trim().toUpperCase() : 'PÁRROCO ENCARGADO';

        // 4. CREAR PARTIDA SUPLETORIA
        const baptismsKey = `baptisms_${targetParishId}`;
        let baptisms = JSON.parse(localStorage.getItem(baptismsKey) || '[]');
        let params = JSON.parse(localStorage.getItem(`baptismParameters_${targetParishId}`) || '{}');
        if (!params.suplementarioLibro) params = { ...params, suplementarioLibro: 1, suplementarioFolio: 1, suplementarioNumero: 1 };

        // --- TRADUCTOR DE FECHAS Y AÑOS A LETRAS ---
        const formatFechaLetras = (fechaStr) => {
            if (!fechaStr) return '___';
            const partes = fechaStr.split('-');
            if (partes.length !== 3) return fechaStr;

            const dias = ['UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE', 'TREINTA', 'TREINTA Y UN'];
            const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

            const dia = parseInt(partes[2], 10);
            const mes = parseInt(partes[1], 10);
            const anio = parseInt(partes[0], 10);

            const getAnioLetras = (year) => {
                if (year === 2000) return 'DOS MIL';
                const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
                const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
                const veintes = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
                const decenas = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
                const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

                let res = '';
                const miles = Math.floor(year / 1000);
                if (miles === 1) res += 'MIL ';
                else if (miles === 2) res += 'DOS MIL ';

                const restMiles = year % 1000;
                const cents = Math.floor(restMiles / 100);
                if (cents > 0) res += centenas[cents] + ' ';

                const decUnits = restMiles % 100;
                if (decUnits > 0) {
                    if (decUnits < 10) res += unidades[decUnits];
                    else if (decUnits < 20) res += especiales[decUnits - 10];
                    else if (decUnits < 30) res += veintes[decUnits - 20];
                    else {
                        const d = Math.floor(decUnits / 10);
                        const u = decUnits % 10;
                        res += decenas[d];
                        if (u > 0) res += ' Y ' + unidades[u];
                    }
                }
                return res.trim();
            };

            const anioLetras = getAnioLetras(anio);
            return `${dias[dia - 1] || dia} DE ${meses[mes - 1] || mes} DE ${anioLetras}`;
        };

        // --- LA NOTA MARGINAL DINÁMICA Y COMPLETA ---
        const causaText = nombreConceptoText.toUpperCase(); 
        const fechaDecretoText = formatFechaLetras(decreeData.fechaDecreto || decreeData.decreeDate);
        const expDate = newPartidaData.fechaExpedicion || newPartidaData.fechaExpedicionRegistro;
        const fechaExpText = expDate ? ` SE EXPIDE EL DÍA ${formatFechaLetras(expDate)}.` : '';
        
        // Arreglo gramatical: Si el concepto tiene la palabra "Pérdida", "Deterioro" o "Destrucción", añade "LA" u "EL".
        const conectorCausa = causaText.includes('PÉRDIDA') || causaText.includes('DETERIORO') || causaText.includes('DESTRUCCIÓN') 
            ? `LA ${causaText} DEL ORIGINAL` 
            : `${causaText}`;

        const notaReposicion = `ESTA PARTIDA SE INSCRIBE POR REPOSICIÓN SEGÚN DECRETO NO. ${decreeData.numeroDecreto || decreeData.decreeNumber || '___'} DE FECHA ${fechaDecretoText}, DEBIDO A ${conectorCausa}.${fechaExpText}`;

        const newPartida = {
          id: generateUUID(), 
          parishId: targetParishId,
          book_number: newPartidaData.numeroLibro || params.suplementarioLibro,
          page_number: newPartidaData.folio || params.suplementarioFolio,
          entry_number: newPartidaData.numeroActa || params.suplementarioNumero,
          
          // --- MAPEO EXACTO PARA LA BD DE LA PARROQUIA ---
          nombres: newPartidaData.firstName,
          apellidos: newPartidaData.lastName,
          fechaNacimiento: newPartidaData.birthDate,
          lugarNacimiento: newPartidaData.lugarNacimientoDetalle,
          fechaSacramento: newPartidaData.sacramentDate,
          lugarBautismo: newPartidaData.lugarBautismo,
          nombrePadre: newPartidaData.fatherName,
          cedulaPadre: newPartidaData.ceduPadre,
          nombreMadre: newPartidaData.motherName,
          cedulaMadre: newPartidaData.ceduMadre,
          tipoUnionPadres: parseInt(newPartidaData.tipoUnionPadres) || 1,
          sexo: newPartidaData.sex,
          abuelosPaternos: newPartidaData.paternalGrandparents,
          abuelosMaternos: newPartidaData.maternalGrandparents,
          padrinos: newPartidaData.godparents,
          ministro: newPartidaData.minister,
          daFe: newPartidaData.ministerFaith || nombreSacerdoteDestino,
          
          // NOMBRES EXACTOS DE REGISTRO CIVIL
          serialRegistro: newPartidaData.serialRegCivil,
          nuip: newPartidaData.nuipNuit,
          oficinaRegistro: newPartidaData.oficinaRegistro,
          fechaExpedicionRegistro: newPartidaData.fechaExpedicion,

          // ESTADOS Y NOTA MARGINAL
          status: 'seated', 
          estado: 'Activo', 
          isSupplementary: true, 
          creadoPorDecreto: true, 
          hasDecree: true,
          correctionDecreeRef: decreeData.numeroDecreto,
          replacementDecreeRef: decreeData.numeroDecreto,
          notaMarginal: notaReposicion,
          marginNote: notaReposicion,   
          createdAt: new Date().toISOString()
        };
        
        baptisms.push(newPartida);
        
        // Guardar BD y actualizar parámetros en la parroquia
        localStorage.setItem(baptismsKey, JSON.stringify(baptisms));
        localStorage.setItem(`baptismPartidas_${targetParishId}`, JSON.stringify(baptisms));
        
        // Incrementar supletorio matemáticamente
        const nextSupletorio = calculateNextConsecutive(
            params.suplementarioNumero || 1, 
            params.suplementarioFolio || 1, 
            params.suplementarioLibro || 1, 
            params.suplementarioPartidas || 2, 
            params.suplementarioReiniciar
        );

        localStorage.setItem(`baptismParameters_${targetParishId}`, JSON.stringify({ 
            ...params, 
            suplementarioNumero: nextSupletorio.numero,
            suplementarioFolio: nextSupletorio.folio,
            suplementarioLibro: nextSupletorio.libro
        }));

        // 5. GENERAR REGISTRO DE DECRETO (Para las Vistas de Tabla)
        const fullName = `${newPartida.nombres || ''} ${newPartida.apellidos || ''}`.trim().toUpperCase();
        const commonDecreeInfo = {
          ...decreeData,
          decreeNumber: decreeData.numeroDecreto,
          decreeDate: decreeData.fechaDecreto,    
          type: 'replacement', 
          sacrament: 'bautismo',
          newPartidaId: newPartida.id, 
          nombreSacerdoteDestino, 
          targetParishId, 
          targetParishName: parishLabel,
          targetName: fullName, 
          nombres: newPartida.nombres, 
          apellidos: newPartida.apellidos,
          concepto: nombreConceptoText, 
          causa: nombreConceptoText,    
          estado: 'Activo',             
          status: 'Activo',             
          newPartidaSummary: { book: newPartida.book_number, page: newPartida.page_number, entry: newPartida.entry_number },
          datosNuevaPartida: newPartida,
          createdAt: new Date().toISOString()
        };

        // Guardar Copia en Parroquia
        const parishReplacementsKey = `decreeReplacementBaptism_${targetParishId}`;
        let parishReplacements = JSON.parse(localStorage.getItem(parishReplacementsKey) || '[]');
        parishReplacements.push({ ...commonDecreeInfo, id: generateUUID(), parroquia: parishLabel });
        localStorage.setItem(parishReplacementsKey, JSON.stringify(parishReplacements));

        // Guardar Copia en Cancillería (Copia Maestra)
        const chanceryDecreeRecord = { ...commonDecreeInfo, id: generateUUID(), isMasterCopy: true };
        chanceryReplacements.push(chanceryDecreeRecord);
        localStorage.setItem(chanceryReplacementsKey, JSON.stringify(chanceryReplacements));

        window.dispatchEvent(new Event('storage'));
        return { success: true, message: "Decreto emitido.", data: chanceryDecreeRecord };
      } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
      }
  };

  return (
    <AppDataContext.Provider value={{
        data, loadData,
        validateJSONStructure,
        
        // Bautismos
        getBaptisms, 
        getPendingBaptisms, 
        saveBaptismToSource,
        validateBaptismNumbers,
        seatBaptism,
        importBaptisms,
        addBaptismsFromJSON,
        seatMultipleBaptisms,
        getNextBaptismNumbers,

        // Decretos Parroquiales
        getBaptismCorrections,
        createBaptismCorrection,
        deleteBaptismCorrection,
        updateBaptismCorrection,
        processBaptismDecreeBatch,

        getDecreeReplacementsBySacrament,
        getDecreeReplacementBaptisms,
        createDecreeReplacement,
        saveDecreeReplacementBaptism,
        updateDecreeReplacement,
        deleteDecreeReplacement,
        getDecreeReplacementByNewBaptismId,
        saveDecreeReplacement,
        saveBaptism,

        // MOTOR CANCILLERÍA
        searchBaptismGlobal,
        createChanceryCorrection,
        createChanceryReplacement,

        // Entidades y Creación
        createVicary,
        createDecanate, addDecanate: createDecanate,
        createChancery,
        createDiocese,
        createArchdiocese,
        getVicaries,
        getDecanates,
        getChanceries,
        getDioceses,
        getArchdioceses,
        createDioceseArchdiocese,
        deleteDioceseArchdiocese,
        createUser,
        deleteUser,
        getUserByUsername,
        getParishUsers,
        getChanceryUsers,
        createChancellor,
        updateChancellor,
        deleteChancellor,
        getChancellorByDiocese,
        createParish,
        createItem,

        // Utils
        getConceptosAnulacion,
        getConceptoAnulacion,
        addConceptoAnulacion,
        updateConceptoAnulacion,
        deleteConceptoAnulacion,
        getAnnulmentConcepts: getConceptosAnulacion,
        createAnnulmentConcept: addConceptoAnulacion,
        editAnnulmentConcept: updateConceptoAnulacion,
        deleteAnnulmentConcept: deleteConceptoAnulacion,
        getMisDatosList,
        addMisDatosRecord, 
        updateMisDatosRecord, 
        deleteMisDatosRecord,
        addMisDatos: addMisDatosRecord, 
        updateMisDatos: updateMisDatosRecord, 
        deleteMisDatos: deleteMisDatosRecord,
        getParrocos,
        getParrocoActual, 
        addParroco, 
        updateParroco, 
        deleteParroco, 
        actualizarParrocoActual, 
        actualizarEstadoParrocos: actualizarParrocoActual,
        obtenerNotasAlMargen,
        generarNotaAlMargenAnulada,
        generarNotaAlMargenNuevaPartida,
        generarNotaAlMargenEstandar,
        actualizarNotaAlMargenCorreccion,
        actualizarNotaAlMargenReposicion,
        actualizarNotaAlMargenEstandar,
        getBaptismParameters,
        saveBaptismParameters,
        getDecrees,
        addDecreesFromJSON,

        // Notificaciones
        getParishNotifications,
        createNotification,
        updateNotificationStatus,
        deleteNotification,
        addNotificationToParish,

        // Backups
        createUniversalBackup,
        getUniversalBackups,
        restoreUniversalBackup,
        deleteUniversalBackup,
        exportUniversalBackup,
        importUniversalBackup,
        getUniversalBackupInfo,

        // Matrimonios
        matrimonialNotifications,
        matrimonialNotificationAvisos,
        guardarNotificacionMatrimonial: handleGuardarNotificacionMatrimonial,
        obtenerNotificacionesMatrimoniales,
        obtenerAvisosNotificacion,
        obtenerAvisosParroquia: getAvisosParroquia,
        cargarAvisosParroquia,
        marcarAvisoComoVisto,
        marcarAvisoComoVistoAntiguo: updateAvisoStatus, 
        deleteNotificacionMatrimonial,
        getDocumentosParroquia,
        getParroquiasReceptoras,
        getMatrimonialDocumentByBaptismPartidaId,
        getMatrimonios, getPendingMatrimonios, saveMatrimonioToSource, seatMatrimonio, seatMultipleMatrimonios, validateMatrimonioNumbers, getNextMatrimonioNumbers, getMatrimonioParameters, updateMatrimonioParameters, resetMatrimonioParameters,
        importMarriages,

        // Confirmaciones
        getConfirmations, getPendingConfirmations, saveConfirmationToSource, seatConfirmation, seatMultipleConfirmations, validateConfirmationNumbers, getNextConfirmationNumbers, getConfirmationParameters, updateConfirmationParameters, resetConfirmationParameters,
        importConfirmations, addConfirmationsFromJSON,

        // Auxiliares
        importDiocesis, importIglesias, importObispos, importParrocos, importMisDatos, importMisDatosLegacy, importCiudades, importPaises, importParroquiasExternas,
        getDiocesis, addDiocesis, updateDiocesis, deleteDiocesis,
        getIglesias, getIglesiasList, addIglesia, updateIglesia, deleteIglesia,
        getObispos, addObispo, updateObispo, deleteObispo,
        getCiudadesList, addCiudad, updateCiudad, deleteCiudad, 
        getPaises, getParroquiasExternas,
        importDeaths,
        fetchCatalogsFromSource,
        validateUserCredentials,
        saveData,
        iglesias,
        getVicariesByDiocese,
        user: currentUser
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

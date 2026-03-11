
export const saveMisDatosToLocalStorage = (misDatos, entityId) => {
    if (!entityId) {
        console.error("EntityId is required to save misDatos");
        return false;
    }
    
    try {
        const key = `misDatos_${entityId}`;
        localStorage.setItem(key, JSON.stringify(misDatos));
        return true;
    } catch (error) {
        console.error("Error saving misDatos to localStorage:", error);
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            throw new Error("La cuota de almacenamiento local se ha excedido. Libere espacio o importe menos registros.");
        }
        throw new Error("No se pudieron guardar los datos en el almacenamiento local.");
    }
};

export const getMisDatosFromLocalStorage = (entityId) => {
    if (!entityId) return [];
    
    try {
        const key = `misDatos_${entityId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error("Error retrieving misDatos from localStorage:", error);
        return [];
    }
};

export const clearMisDatosFromLocalStorage = (entityId) => {
    if (!entityId) return;
    try {
        const key = `misDatos_${entityId}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Error clearing misDatos from localStorage:", error);
    }
};

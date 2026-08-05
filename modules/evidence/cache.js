// Cache simples em memória - SEM FIREBASE
// Substituído para eliminar dependência do Firebase Admin

let cacheMemoria = {};
const CACHE_MAX = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

module.exports = {
    getCache: async function(key) {
        const entry = cacheMemoria[key];
        if (!entry) return null;
        
        // Verifica TTL
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            delete cacheMemoria[key];
            return null;
        }
        return entry.value;
    },
    
    setCache: async function(key, value) {
        // Limita o tamanho do cache
        const keys = Object.keys(cacheMemoria);
        if (keys.length >= CACHE_MAX) {
            // Remove a entrada mais antiga (LRU simples)
            let oldest = keys[0];
            for (let i = 1; i < keys.length; i++) {
                if (cacheMemoria[keys[i]].timestamp < cacheMemoria[oldest].timestamp) {
                    oldest = keys[i];
                }
            }
            delete cacheMemoria[oldest];
        }
        
        cacheMemoria[key] = {
            value: value,
            timestamp: Date.now()
        };
        return true;
    },
    
    hasValidCache: async function(key) {
        const entry = cacheMemoria[key];
        if (!entry) return false;
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            delete cacheMemoria[key];
            return false;
        }
        return true;
    },
    
    invalidateCache: async function(key) {
        delete cacheMemoria[key];
    }
};
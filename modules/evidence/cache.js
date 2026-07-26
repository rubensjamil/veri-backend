// Cache simples em memória - SEM FIREBASE
let cacheMemoria = {};

module.exports = {
    getCache: async function(key) {
        return cacheMemoria[key] || null;
    },
    setCache: async function(key, value) {
        cacheMemoria[key] = value;
        return true;
    },
    hasValidCache: async function(key) {
        return !!cacheMemoria[key];
    },
    invalidateCache: async function(key) {
        delete cacheMemoria[key];
    }
};
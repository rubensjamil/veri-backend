// Cache simples em memória - SEM FIREBASE
let cacheMemoria = {};

module.exports = {
    getCache: async function(key) {
        if (!key) return null;
        const cached = cacheMemoria[key];
        if (!cached) return null;
        if (cached && cached.dados && cached.dados.cnpj_encontrado) {
            return cached;
        }
        return null;
    },
    setCache: async function(key, value) {
        if (!key || !value) return false;
        try {
            cacheMemoria[key] = value;
            return true;
        } catch (err) {
            console.warn('Erro ao salvar cache:', err.message);
            return false;
        }
    },
    hasValidCache: async function(key) {
        if (!key) return false;
        const cached = cacheMemoria[key];
        return !!(cached && cached.dados && cached.dados.cnpj_encontrado);
    },
    invalidateCache: async function(key) {
        if (!key) return false;
        delete cacheMemoria[key];
        return true;
    }
};
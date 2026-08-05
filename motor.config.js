// ============================================
// motor.config.js - Configurações técnicas do Motor VERI
// ============================================

module.exports = {
    // Timeouts e limites operacionais
    TIMEOUT_GEMINI_MS: 45000,
    CACHE_MEMORIA_MAX: 200,

    // Limites de recomendação
    LIMITES: {
        SIGA: 35,
        ATENCAO: 65,
        PARE: 65
    },

    // Ordens de porte para Risco Relacional
    ORDEM_PORTE: {
        'MEI': 1,
        'ME': 2,
        'EPP': 3,
        'MEDIO': 4,
        'GRANDE': 5,
        'GIGANTE': 5
    },

    // Faturamento anual por porte
    FATURAMENTO_ANUAL: {
        'MEI': 81000,
        'ME': 360000,
        'EPP': 4800000,
        'MEDIO': 12000000,
        'GRANDE': 50000000,
        'GIGANTE': 50000000
    },

    // Níveis de risco
    NIVEIS_RISCO: {
        CRITICO: 15.0,
        ALTO: 5.0,
        MEDIO: 2.0
    },

    // Valores padrão
    DEFAULTS: {
        PORTE_SOLICITANTE: 'MEDIO',
        RESOLUTIVIDADE: 15,
        DESCONTINUIDADE: 15,
        VERACIDADE: 10,
        COMPORTAMENTAL: 15,
        INTEGRIDADE: 50,
        REPUTACIONAL: 15,
        RELACIONAL: 50,
        FINANCEIRO: 25
    },

    // Versão da metodologia
    METODOLOGIA_VERSAO: 'VERI 3.2'
};
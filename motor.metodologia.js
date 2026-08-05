// ============================================
// motor.metodologia.js - Metodologia VERI (Patrimônio Intelectual)
// ============================================

module.exports = {
    // ============================================
    // PESOS DOS FATORES
    // ============================================
    PESOS: {
        FINANCEIRO: 1.5,
        RESOLUTIVIDADE: 0.3,
        DESCONTINUIDADE: 0.3,
        VERACIDADE: 0.2,
        COMPORTAMENTAL: 0.2,
        INTEGRIDADE: 0.2,
        DETERIORACAO: 0.1,
        CONTRATUAL: 0.1,
        REPUTACIONAL: 0.2,
        RELACIONAL: 0.8
    },

    // ============================================
    // REGRAS METODOLÓGICAS
    // ============================================
    REGRAS: {
        FINANCEIRO: {
            PF: {
                LIMITES: [50, 30, 20, 10],
                VALORES: [100, 80, 60, 30, 10]
            },
            PJ: {
                LIMITES: [0.5, 1, 2, 3, 5],
                VALORES: [5, 15, 30, 50, 70, 90]
            }
        },
        DESCONTINUIDADE: {
            LIMITES: [1, 2, 3, 5, 10],
            VALORES: [80, 60, 40, 25, 10, 5]
        },
        VERACIDADE: {
            BAIXADA: 90,
            SUSPENSA: 60,
            INAPTA: 60,
            ATIVA: 10
        },
        COMPORTAMENTAL: {
            CONHECIMENTO: {
                MUITO: 0.6,
                RAZOAVEL: 1.0,
                POUCO: 1.3,
                NENHUM: 1.6
            },
            EXPERIENCIA: {
                POSITIVA: 0.6,
                NEUTRA: 1.0,
                NEGATIVA: 1.5
            },
            TEMPO_RELACAO: {
                LIMITES: [36, 24, 12, 6],
                VALORES: [0.3, 0.5, 0.7, 0.9, 1.0]
            }
        },
        RELACIONAL: {
            DIFERENCA: {
                0: 20,
                1: 40,
                2: 60,
                3: 80
            }
        },
        INTEGRIDADE: {
            GRANDE: 0,
            GIGANTE: 0,
            DEFAULT: 50
        }
    },

    METADADOS: {
        NOME: 'VERI',
        VERSAO: '3.2',
        DATA_REFERENCIA: '2026-07-06',
        DESCRICAO: 'Motor de decisão baseado em evidências e contexto'
    }
};
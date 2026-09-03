// ============================================================
// motor.metodologia.js - Metodologia VERI
// PESOS E REGRAS PARA OS 10 FATORES DE RISCO
// ============================================================

module.exports = {
    // ============================================================
    // PESOS DE CADA FATOR (soma total = 17.0)
    // FINANCEIRO = 8.5 (50% do score global)
    // ============================================================
    PESOS: {
        FINANCEIRO: 8.5,
        RESOLUTIVIDADE: 1.0,
        DESCONTINUIDADE: 1.2,
        VERACIDADE: 0.8,
        COMPORTAMENTAL: 1.0,
        INTEGRIDADE: 0.9,
        DETERIORACAO: 1.1,
        CONTRATUAL: 0.7,
        REPUTACIONAL: 0.8,
        RELACIONAL: 1.0
    },

    // ============================================================
    // REGRAS POR FATOR
    // ============================================================
    REGRAS: {
        FINANCEIRO: {
            PF: {
                LIMITES: [60, 40, 25, 10],
                VALORES: [90, 70, 50, 30, 15]
            },
            PJ: {
                LIMITES: [0.05, 0.10, 0.20, 0.35, 0.50],
                VALORES: [5, 15, 30, 50, 70, 90]
            }
        },

        DESCONTINUIDADE: {
            LIMITES: [0.5, 1, 2, 5, 10],
            VALORES: [80, 60, 40, 20, 10, 5]
        },

        VERACIDADE: {
            BAIXADA: 80,
            SUSPENSA: 60,
            DEFAULT: 20
        },

        COMPORTAMENTAL: {
            CONHECIMENTO: {
                'NENHUM': 1.5,
                'POUCO': 1.3,
                'RAZOAVEL': 1.0,
                'BEM': 0.7
            },
            EXPERIENCIA: {
                'NEGATIVA': 1.5,
                'NENHUMA': 1.2,
                'NEUTRA': 1.0,
                'POSITIVA': 0.7
            },
            TEMPO_RELACAO: {
                LIMITES: [36, 24, 12, 6],
                VALORES: [0.6, 0.8, 1.0, 1.2, 1.5]
            }
        },

        INTEGRIDADE: {
            GRANDE: 0,
            DEFAULT: 50
        },

        RELACIONAL: {
            DIFERENCA: {
                0: 30,
                1: 50,
                2: 70,
                3: 90,
                4: 100
            }
        }
    },

    VERSAO: 'VERI 3.3'
};
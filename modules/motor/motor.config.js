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
        'GIGANTE': 5,
        'MICRO EMPRESA': 1,
        'MICROEMPRESA': 1,
        'EMPRESA INDIVIDUAL': 1,
        'MICRO EMPREENDEDOR INDIVIDUAL': 1,
        'EMPRESA DE PEQUENO PORTE': 2,
        'PEQUENO PORTE': 2
    },

    // Faturamento anual por porte
    FATURAMENTO_ANUAL: {
        'MEI': 81000,
        'ME': 360000,
        'EPP': 4800000,
        'MEDIO': 12000000,
        'GRANDE': 50000000,
        'GIGANTE': 50000000,
        'MICRO EMPRESA': 81000,
        'MICROEMPRESA': 81000,
        'EMPRESA INDIVIDUAL': 81000,
        'MICRO EMPREENDEDOR INDIVIDUAL': 81000,
        'EMPRESA DE PEQUENO PORTE': 360000,
        'PEQUENO PORTE': 360000
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

// ============================================================
// AÇÕES PROTETIVAS POR PREOCUPAÇÃO + TIPO DE NEGÓCIO
// ============================================================
module.exports.ACOES_PROTETIVAS = {
    P01: {
        comprar: 'Suspenda o fornecimento e cobre imediatamente.',
        vender: 'Exija avalista ou nota promissória antes de entregar.',
        contratar: 'Exija comprovação de capacidade financeira antes de iniciar.',
        analisar: 'Solicite certidões negativas e demonstrações financeiras antes de negociar.'
    },
    P02: {
        comprar: 'Cobre juros e multas; suspenda após 30 dias.',
        vender: 'Venda com entrada de 30% e cobre multa por atraso.',
        contratar: 'Inclua multa por atraso e exija garantias.',
        analisar: 'Peça histórico de pagamentos e referências comerciais.'
    },
    P03: {
        comprar: 'Inclua multa rescisória e exija garantias contratuais.',
        vender: 'Exija garantias contratuais e preveja multa rescisória.',
        contratar: 'Inclua multa rescisória e cláusulas de penalidade.',
        analisar: 'Solicite histórico de cumprimento de contratos com outros parceiros.'
    },
    P04: {
        comprar: 'Suspenda tudo, faça B.O. e acione a Justiça.',
        vender: 'Suspenda tudo, faça B.O. e acione a Justiça.',
        contratar: 'Suspenda tudo, faça B.O. e acione a Justiça.',
        analisar: 'Solicite documentos originais e verifique a autenticidade das informações.'
    },
    P05: {
        comprar: 'Exija amostras e laudos antes da compra.',
        vender: 'Exija especificações e garantia por escrito.',
        contratar: 'Exija comprovação de qualidade e referências.',
        analisar: 'Solicite certificações e referências de clientes anteriores.'
    },
    P06: {
        comprar: 'Exija cronograma e multa por atraso.',
        vender: 'Exija cronograma e multa por atraso.',
        contratar: 'Exija cronograma e multa por atraso.',
        analisar: 'Solicite histórico de cumprimento de prazos e capacidade operacional.'
    },
    P07: {
        comprar: 'Monitore de perto a execução do negócio.',
        vender: 'Monitore de perto a execução do negócio.',
        contratar: 'Monitore de perto a execução do negócio.',
        analisar: 'Peça esclarecimentos adicionais sobre a preocupação mencionada.'
    }
};

module.exports.ACAO_PADRAO = 'Monitore de perto a execução do negócio.';
module.exports.ACAO_PARE = '🚨 Interrompa este negócio agora. O risco é crítico.';
// ============================================================
// veri.engine.js - Motor VERI (único e soberano)
// 10 fatores de risco - PESOS E METODOLOGIA
// CORRIGIDO: ticket para compra usa SOLICITANTE, venda usa ANALISADO
// CORRIGIDO: topRiscos sempre inclui FINANCEIRO + 3 maiores
// CORRIGIDO: percentual de comprometimento usa faturamento REAL
// CORRIGIDO: RISCO ENTRE AS PARTES com conhecimento, experiência e recomendação
// CORRIGIDO: RISCO DE INTERRUPÇÃO (ex-DESCONTINUIDADE) com situação cadastral
// CORRIGIDO: RISCO DE INTEGRIDADE com situação cadastral
// ============================================================

const config = require('../motor.config.js');
const metodologia = require('../motor.metodologia.js');

// ============================================
// MAPEAMENTO DE PORTAS (INTERNO)
// ============================================
const DESCRICAO_PORTAS = {
    'empresa_fornecedor': 'Fornecedor',
    'empresa_loja': 'Loja',
    'empresa_cliente_pj': 'Cliente PJ',
    'pessoa_contratar': 'Contratação',
    'pessoa_sociedade': 'Sociedade',
    'pessoa_comprador_pf': 'Comprador PF',
    'pessoa_vendedor_pf': 'Vendedor PF',
    'contrato_unico': 'Contrato',
    'financas_unico': 'Finanças',
    'link_unico': 'Link de Oferta',
    'leads_unico': 'Leads',
    'lotes_unico': 'Lotes'
};

// ============================================
// FUNÇÕES DE CÁLCULO POR FATOR
// ============================================

function calcularFinanceiro(dados) {
    const { analisado, solicitante, negocio, relacionamento, analise_para } = dados;
    const valorNegocio = negocio.valor || 0;
    const parcelas = negocio.parcelas || 1;
    const valorParcela = valorNegocio / parcelas;

    const negocioStr = dados.negocio || '';
    const isCompra = negocioStr.startsWith('comprar') || negocioStr.startsWith('contratar');
    const isVenda = negocioStr.startsWith('vender');

    let ticketUsado = 0;
    let fonte = '';

    // ============================================================
    // CORREÇÃO: COMPRA usa SOLICITANTE, VENDA usa ANALISADO
    // ============================================================
    if (isCompra) {
        // Quem compra é o solicitante
        if (solicitante.tipo === 'pessoa' && solicitante.renda && solicitante.renda > 0) {
            ticketUsado = solicitante.renda / 30;
            fonte = 'renda_solicitante';
        } else if (solicitante.tipo === 'pessoa') {
            // PF sem renda informada: usa fallback genérico (R$ 5.000/mês)
            ticketUsado = 5000 / 30;
            fonte = 'renda_pf_fallback';
        } else if (solicitante.tipo === 'empresa') {
            ticketUsado = calcularTicketDiario(solicitante.porte || 'MEDIO');
            fonte = 'porte_solicitante';
        } else {
            // Fallback: ticket médio do relacionamento
            ticketUsado = relacionamento.ticket_medio || 5000;
            fonte = 'ticket_medio_fallback';
        }
    } else if (isVenda) {
        // ============================================================
        // CORREÇÃO: Para VENDA, usa o faturamento REAL do analisado
        // ============================================================
        if (analisado.tipo === 'pessoa' && analisado.renda && analisado.renda > 0) {
            ticketUsado = analisado.renda / 30;
            fonte = 'renda_analisado';
        } else if (analisado.tipo === 'pessoa') {
            ticketUsado = 5000 / 30;
            fonte = 'renda_pf_fallback';
        } else if (analisado.tipo === 'empresa') {
            // PRIORIDADE: faturamento_anual real (do banco regional)
            if (analisado.faturamento_anual && analisado.faturamento_anual > 0) {
                ticketUsado = analisado.faturamento_anual / 12 / 30;
                fonte = 'faturamento_real_analisado';
            } else {
                // Fallback: porte do analisado
                ticketUsado = calcularTicketDiario(analisado.porte || 'MEDIO');
                fonte = 'porte_analisado';
            }
        } else {
            ticketUsado = relacionamento.ticket_medio || 5000;
            fonte = 'ticket_medio_fallback';
        }
    } else {
        // Caso não identificado (fallback geral)
        ticketUsado = calcularTicketDiario(analisado.porte || 'MEDIO');
        fonte = 'porte_analisado_fallback';
    }

    // Garantia de ticket mínimo
    if (ticketUsado === 0) {
        ticketUsado = 1000;
        fonte = 'valor_padrao';
    }

    let proporcaoRaw = 0;
    if (ticketUsado > 0 && valorParcela > 0) {
        proporcaoRaw = valorParcela / ticketUsado;
    }

    let financeiro = config.DEFAULTS.FINANCEIRO;
    if (proporcaoRaw > 0) {
        // Determina se a parte que paga é PF (para regras diferenciadas)
        const isPFParte = (isCompra && solicitante.tipo === 'pessoa') || (isVenda && analisado.tipo === 'pessoa');

        if (isPFParte) {
            const comprometimentoPercent = proporcaoRaw * 100;
            const regras = metodologia.REGRAS.FINANCEIRO.PF;
            if (comprometimentoPercent >= regras.LIMITES[0]) financeiro = regras.VALORES[0];
            else if (comprometimentoPercent >= regras.LIMITES[1]) financeiro = regras.VALORES[1];
            else if (comprometimentoPercent >= regras.LIMITES[2]) financeiro = regras.VALORES[2];
            else if (comprometimentoPercent >= regras.LIMITES[3]) financeiro = regras.VALORES[3];
            else financeiro = regras.VALORES[4];
        } else {
            const regras = metodologia.REGRAS.FINANCEIRO.PJ;
            if (proporcaoRaw < regras.LIMITES[0]) financeiro = regras.VALORES[0];
            else if (proporcaoRaw < regras.LIMITES[1]) financeiro = regras.VALORES[1];
            else if (proporcaoRaw < regras.LIMITES[2]) financeiro = regras.VALORES[2];
            else if (proporcaoRaw < regras.LIMITES[3]) financeiro = regras.VALORES[3];
            else if (proporcaoRaw < regras.LIMITES[4]) financeiro = regras.VALORES[4];
            else financeiro = regras.VALORES[5];
        }
    }

    if (negocio.tipo_pagamento === 'aprazo') {
        financeiro = Math.min(100, financeiro * 1.2);
    }

    return {
        pontuacao: Math.round(financeiro),
        ticket_estimado: ticketUsado,
        fonte: fonte
    };
}

// ============================================
// DEMAIS FUNÇÕES (MANTIDAS)
// ============================================

function calcularDescontinuidade(dados) {
    const { analisado } = dados;
    const tempoMercado = calcularTempoMercado(analisado.data_abertura);
    const situacao = (analisado.situacao || 'ATIVA').toUpperCase();

    const regras = metodologia.REGRAS.DESCONTINUIDADE;
    let descontinuidade = config.DEFAULTS.DESCONTINUIDADE;

    // 1. Base pelo tempo de mercado
    if (tempoMercado < regras.LIMITES[0]) descontinuidade = regras.VALORES[0];
    else if (tempoMercado < regras.LIMITES[1]) descontinuidade = regras.VALORES[1];
    else if (tempoMercado < regras.LIMITES[2]) descontinuidade = regras.VALORES[2];
    else if (tempoMercado < regras.LIMITES[3]) descontinuidade = regras.VALORES[3];
    else if (tempoMercado < regras.LIMITES[4]) descontinuidade = regras.VALORES[4];
    else descontinuidade = regras.VALORES[5];

    // 2. Ajuste pela situação cadastral
    const situacoesCriticas = ['BAIXADA', 'SUSPENSA', 'INAPTA', 'INATIVA', 'CANCELADA', 'NULA', 'LIQUIDACAO', 'RECUPERACAO JUDICIAL', 'FALENCIA', 'INTERVENCAO'];
    if (situacoesCriticas.indexOf(situacao) !== -1) {
        descontinuidade = Math.min(100, descontinuidade + 40);
    } else if (situacao === 'ATIVA') {
        // mantém o valor base (sem ajuste)
    } else {
        descontinuidade = Math.min(100, descontinuidade + 10);
    }

    return { pontuacao: descontinuidade, tempo_mercado_anos: tempoMercado };
}

function calcularVeracidade(dados) {
    const { analisado } = dados;
    const situacao = (analisado.situacao || 'ATIVA').toUpperCase();
    const regras = metodologia.REGRAS.VERACIDADE;
    let veracidade = config.DEFAULTS.VERACIDADE;

    if (situacao === 'BAIXADA') veracidade = regras.BAIXADA;
    else if (situacao === 'SUSPENSA' || situacao === 'INAPTA') veracidade = regras.SUSPENSA;

    return { pontuacao: veracidade, situacao: situacao };
}

function calcularComportamental(dados) {
    const { relacionamento } = dados;
    const conhecimento = relacionamento.conhecimento || 'razoavel';
    const experiencia = relacionamento.experiencia || 'neutra';
    const meses = relacionamento.meses || 0;

    const regrasConhecimento = metodologia.REGRAS.COMPORTAMENTAL.CONHECIMENTO;
    const regrasExperiencia = metodologia.REGRAS.COMPORTAMENTAL.EXPERIENCIA;
    const regrasTempo = metodologia.REGRAS.COMPORTAMENTAL.TEMPO_RELACAO;

    let fC = regrasConhecimento[conhecimento.toUpperCase()] || 1.0;
    let fE = regrasExperiencia[experiencia.toUpperCase()] || 1.0;

    let fM = 1.0;
    if (meses >= regrasTempo.LIMITES[0]) fM = regrasTempo.VALORES[0];
    else if (meses >= regrasTempo.LIMITES[1]) fM = regrasTempo.VALORES[1];
    else if (meses >= regrasTempo.LIMITES[2]) fM = regrasTempo.VALORES[2];
    else if (meses >= regrasTempo.LIMITES[3]) fM = regrasTempo.VALORES[3];
    else fM = regrasTempo.VALORES[4];

    let comportamental = Math.min(100, config.DEFAULTS.COMPORTAMENTAL * Math.max(0.2, Math.min(2.0, fM * fE * fC)));

    return { pontuacao: comportamental };
}

function calcularIntegridade(dados) {
    const { analisado } = dados;
    const porteAnalisado = analisado.porte || '';
    const situacao = (analisado.situacao || 'ATIVA').toUpperCase();
    const regras = metodologia.REGRAS.INTEGRIDADE;
    let integridade = config.DEFAULTS.INTEGRIDADE;

    // Base pelo porte
    if (porteAnalisado === 'GRANDE' || porteAnalisado === 'DEMAIS') {
        integridade = regras.GRANDE; // 0
    }
    if (!porteAnalisado) {
        integridade = regras.DEFAULT; // 50
    }

    // Ajuste pela situação cadastral
    const situacoesCriticas = ['BAIXADA', 'SUSPENSA', 'INAPTA', 'INATIVA', 'CANCELADA', 'NULA', 'LIQUIDACAO', 'LIQUIDACAO JUDICIAL', 'RECUPERACAO JUDICIAL', 'FALENCIA', 'INTERVENCAO'];
    if (situacoesCriticas.indexOf(situacao) !== -1) {
        integridade = Math.min(100, integridade + 30);
    } else if (situacao === 'ATIVA') {
        // mantém o valor base
    } else {
        integridade = Math.min(100, integridade + 10);
    }

    return { pontuacao: integridade };
}

function calcularDeterioracao(dados) {
    const { analisado } = dados;
    const situacao = (analisado.situacao || 'ATIVA').toUpperCase();
    let deterioracao = 0;

    if (situacao === 'BAIXADA') deterioracao = 90;
    else if (situacao === 'SUSPENSA' || situacao === 'INAPTA') deterioracao = 50;

    return { pontuacao: deterioracao };
}

// ============================================================
// CORREÇÃO: RISCO ENTRE AS PARTES com fatores de relacionamento
// ============================================================
function aplicarFatoresRelacionais(base, relacionamento) {
    if (!relacionamento) return base;

    const conhecimento = relacionamento.conhecimento || 'razoavel';
    const experiencia = relacionamento.experiencia || 'neutra';
    const recomendacao = relacionamento.recomendacao || 'nao';

    const fatoresConhecimento = {
        'nenhum': 1.5,
        'pouco': 1.3,
        'razoavel': 1.0,
        'bem': 0.7
    };

    const fatoresExperiencia = {
        'negativa': 1.5,
        'nenhuma': 1.2,
        'neutra': 1.0,
        'positiva': 0.7
    };

    const fatoresRecomendacao = {
        'sim': 0.7,
        'nao': 1.3
    };

    const fC = fatoresConhecimento[conhecimento] || 1.0;
    const fE = fatoresExperiencia[experiencia] || 1.0;
    const fR = fatoresRecomendacao[recomendacao] || 1.0;

    let ajustado = base * fC * fE * fR;
    ajustado = Math.max(0, Math.min(100, ajustado));

    return ajustado;
}

function calcularRelacional(dados) {
    const { analisado, solicitante, relacionamento } = dados;
    let porteAnalisado = analisado.porte || '';
    let porteSolicitante = solicitante.porte || config.DEFAULTS.PORTE_SOLICITANTE;

    // Tratamento para PF
    if (analisado.tipo === 'pessoa') {
        const ordem = config.ORDEM_PORTE;
        const sol = ordem[porteSolicitante] || 3;
        const anal = 0;
        const diferencaPorte = Math.abs(sol - anal);
        const regras = metodologia.REGRAS.RELACIONAL.DIFERENCA;
        let relacional = regras[diferencaPorte] || 80;
        // Aplicar fatores de relacionamento
        relacional = aplicarFatoresRelacionais(relacional, relacionamento);
        return { 
            pontuacao: Math.round(relacional), 
            porte_solicitante: porteSolicitante, 
            porte_analisado: 'PESSOA_FISICA' 
        };
    }

    // Fallback para porte do analisado
    if (!porteAnalisado || porteAnalisado === 'N/A' || porteAnalisado === '') {
        if (analisado.faturamento_anual && analisado.faturamento_anual > 0) {
            const faturamento = analisado.faturamento_anual;
            if (faturamento <= 81000) porteAnalisado = 'MEI';
            else if (faturamento <= 360000) porteAnalisado = 'ME';
            else if (faturamento <= 4800000) porteAnalisado = 'EPP';
            else if (faturamento <= 12000000) porteAnalisado = 'MEDIO';
            else porteAnalisado = 'GRANDE';
        } else {
            porteAnalisado = 'MEDIO';
        }
    }

    const ordem = config.ORDEM_PORTE;
    const sol = ordem[porteSolicitante] || 3;
    const anal = ordem[porteAnalisado] || 3;
    const diferencaPorte = Math.abs(sol - anal);

    const regras = metodologia.REGRAS.RELACIONAL.DIFERENCA;
    let relacional = regras[diferencaPorte] || 80;

    if (diferencaPorte >= 3) {
        relacional = Math.min(100, relacional * 1.2);
    }

    // Aplicar fatores de relacionamento
    relacional = aplicarFatoresRelacionais(relacional, relacionamento);

    return { 
        pontuacao: Math.round(relacional), 
        porte_solicitante: porteSolicitante, 
        porte_analisado: porteAnalisado 
    };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function calcularTicketDiario(porte) {
    const anual = config.FATURAMENTO_ANUAL[porte] || 0;
    return anual ? Math.round(anual / 12 / 30) : 0;
}

function calcularTempoMercado(dataAbertura) {
    if (!dataAbertura) return 0;
    return (new Date() - new Date(dataAbertura)) / (1000 * 60 * 60 * 24 * 365);
}

function getNivelRisco(contrib) {
    const niveis = config.NIVEIS_RISCO;
    if (contrib >= niveis.CRITICO) return 'CRITICO';
    if (contrib >= niveis.ALTO) return 'ALTO';
    if (contrib >= niveis.MEDIO) return 'MEDIO';
    return 'BAIXO';
}

// ============================================================
// FUNÇÕES AUXILIARES ADICIONADAS DA VERSÃO ATUAL
// ============================================================

function getNivelImpacto(dias) {
    if (dias <= 1) return { nivel: 'Muito Baixo', cor: '🟢', classe: 'muito-baixo' };
    if (dias <= 5) return { nivel: 'Baixo', cor: '🟢', classe: 'baixo' };
    if (dias <= 10) return { nivel: 'Moderado', cor: '🟡', classe: 'moderado' };
    if (dias <= 15) return { nivel: 'Alto', cor: '🟠', classe: 'alto' };
    if (dias <= 20) return { nivel: 'Muito Alto', cor: '🔴', classe: 'muito-alto' };
    return { nivel: 'Crítico', cor: '🔴🔴', classe: 'critico' };
}

function getNivelProbabilidade(percentual) {
    if (percentual <= 15) return { nivel: 'Muito Baixo', cor: '🟢', classe: 'muito-baixo' };
    if (percentual <= 34) return { nivel: 'Baixo', cor: '🟢', classe: 'baixo' };
    if (percentual <= 54) return { nivel: 'Moderado', cor: '🟡', classe: 'moderado' };
    if (percentual <= 74) return { nivel: 'Alto', cor: '🟠', classe: 'alto' };
    if (percentual <= 100) return { nivel: 'Muito Alto', cor: '🔴', classe: 'muito-alto' };
    return { nivel: 'Crítico', cor: '🔴🔴', classe: 'critico' };
}

function calcularDiasComprometimento(valor, tipo, renda, faturamentoAnual, porte) {
    if (!valor || valor <= 0) return 0;
    var ticketDiario = 0;
    if (tipo === 'pessoa_fisica' || tipo === 'pessoa') {
        var rendaMensal = renda || 3367;
        ticketDiario = rendaMensal / 30;
    } else {
        var faturamentoMensal = 0;
        if (faturamentoAnual) {
            faturamentoMensal = faturamentoAnual / 12;
        } else if (porte) {
            var faturamentoAnualPorPorte = {
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
            };
            var p = porte.toUpperCase().trim();
            faturamentoMensal = (faturamentoAnualPorPorte[p] || 12000000) / 12;
        }
        if (faturamentoMensal > 0) {
            ticketDiario = faturamentoMensal / 30;
        }
    }
    if (ticketDiario > 0) {
        return Math.round((valor / ticketDiario) * 10) / 10;
    }
    return 0;
}
// ============================================
// FUNÇÃO PRINCIPAL: calcularRiscos
// ============================================

function calcularRiscos(dados) {
    const situacaoRaw = (dados.analisado && dados.analisado.situacao) ? dados.analisado.situacao.toUpperCase() : 'ATIVA';

    const palavrasCriticas = [
        'BAIXADA', 'INATIVA', 'CANCELADA', 'SUSPENSA', 'NULA',
        'LIQUIDAÇÃO', 'LIQUIDACAO', 'RECUPERAÇÃO', 'RECUPERACAO',
        'FALÊNCIA', 'FALENCIA', 'INTERVENÇÃO', 'INTERVENCAO',
        'INAPTA', 'INAPTIDÃO'
    ];

    const isCritica = palavrasCriticas.some(function(palavra) {
        return situacaoRaw.indexOf(palavra) !== -1;
    });

    if (isCritica) {
        const scoreGlobal = 95;
        const recuperabilidade = 5;
        const recomendacao = 'PARE';

        const riscoCritico = {
            risco: 'SITUAÇÃO CRÍTICA',
            pontuacao: 100,
            contribuicao: 30,
            nivel: 'CRITICO'
        };

        const riscos = [
            riscoCritico,
            { risco: 'FINANCEIRO', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'RESOLUTIVIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'RISCO DE INTERRUPÇÃO', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'VERACIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'COMPORTAMENTAL', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'INTEGRIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'DETERIORACAO', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'CONTRATUAL', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'REPUTACIONAL', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'RISCO ENTRE AS PARTES', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' }
        ];

        const topRiscos = [riscoCritico];

        const porta = dados.porta_entrada || 'empresa';
        const sub = dados.subsecao || 'unico';
        const chaveTipo = porta + '_' + sub;
        const tipoAnalise = DESCRICAO_PORTAS[chaveTipo] || 'Geral';

        return {
            score_global: scoreGlobal,
            recuperabilidade: recuperabilidade,
            recomendacao: recomendacao,
            risco_principal: 'SITUAÇÃO CRÍTICA',
            riscos: riscos,
            top_riscos: topRiscos,
            tipo_analise: tipoAnalise,
            ticket_estimado: 0,
            tempo_mercado_anos: 0,
            porte_solicitante: (dados.solicitante && dados.solicitante.porte) || 'MEDIO',
            porte_analisado: (dados.analisado && dados.analisado.porte) || '',
            metodologia: config.METODOLOGIA_VERSAO,
            percentual_comprometimento: 0,
            alerta: {
                tipo: 'SITUACAO_CRITICA',
                mensagem: 'A empresa está com situação "' + situacaoRaw + '". Negócios com essa situação são considerados inviáveis.',
                acao_recomendada: 'Não prossiga com este negócio.'
            }
        };
    }

    const financeiroResult = calcularFinanceiro(dados);
    const descontinuidadeResult = calcularDescontinuidade(dados);
    const veracidadeResult = calcularVeracidade(dados);
    const comportamentalResult = calcularComportamental(dados);
    const integridadeResult = calcularIntegridade(dados);
    const deterioracaoResult = calcularDeterioracao(dados);
    const relacionalResult = calcularRelacional(dados);

    // ============================================================
    // CORREÇÃO: PERCENTUAL DE COMPROMETIMENTO com faturamento REAL
    // ============================================================
    var percentualComprometimento = 0;
    var valorNegocio = dados.negocio.valor || 0;
    var parcelas = dados.negocio.parcelas || 1;
    var valorParcela = (parcelas > 0) ? valorNegocio / parcelas : valorNegocio;

    // Para VENDA, usa o faturamento REAL do analisado
    var negocioStr = dados.negocio || '';
    var isVenda = negocioStr.startsWith('vender');
    
    var ticketUsado = financeiroResult.ticket_estimado || 0;
    
    // Se for venda e tiver faturamento_anual real, recalcula
    if (isVenda && dados.analisado && dados.analisado.faturamento_anual && dados.analisado.faturamento_anual > 0) {
        ticketUsado = dados.analisado.faturamento_anual / 12 / 30;
    }

    if (ticketUsado > 0 && valorParcela > 0) {
        percentualComprometimento = Math.round((valorParcela / ticketUsado) * 100);
    }

    const resolutividade = config.DEFAULTS.RESOLUTIVIDADE;
    const contratual = 0;
    const reputacional = config.DEFAULTS.REPUTACIONAL;

    const fatores = [
        { nome: 'FINANCEIRO', pontuacao: financeiroResult.pontuacao, peso: metodologia.PESOS.FINANCEIRO },
        { nome: 'RESOLUTIVIDADE', pontuacao: resolutividade, peso: metodologia.PESOS.RESOLUTIVIDADE },
        { nome: 'RISCO DE INTERRUPÇÃO', pontuacao: descontinuidadeResult.pontuacao, peso: metodologia.PESOS.DESCONTINUIDADE },
        { nome: 'VERACIDADE', pontuacao: veracidadeResult.pontuacao, peso: metodologia.PESOS.VERACIDADE },
        { nome: 'COMPORTAMENTAL', pontuacao: comportamentalResult.pontuacao, peso: metodologia.PESOS.COMPORTAMENTAL },
        { nome: 'INTEGRIDADE', pontuacao: integridadeResult.pontuacao, peso: metodologia.PESOS.INTEGRIDADE },
        { nome: 'DETERIORACAO', pontuacao: deterioracaoResult.pontuacao, peso: metodologia.PESOS.DETERIORACAO },
        { nome: 'CONTRATUAL', pontuacao: contratual, peso: metodologia.PESOS.CONTRATUAL },
        { nome: 'REPUTACIONAL', pontuacao: reputacional, peso: metodologia.PESOS.REPUTACIONAL },
        { nome: 'RISCO ENTRE AS PARTES', pontuacao: relacionalResult.pontuacao, peso: metodologia.PESOS.RELACIONAL }
    ];

    const totalPonderado = fatores.reduce((acc, f) => acc + (f.pontuacao * f.peso), 0);
    const scoreGlobal = Math.min(99, Math.max(1, Math.round(totalPonderado / 6.0 * 10) / 10));
    const recuperabilidade = 100 - scoreGlobal;

    const fatorDivisor = totalPonderado > 0 ? totalPonderado : 1;
    const riscos = fatores.map(f => {
        const contribuicao = Math.round((f.pontuacao * f.peso / fatorDivisor) * scoreGlobal * 10) / 10;
        return {
            risco: f.nome,
            pontuacao: f.pontuacao,
            contribuicao: contribuicao,
            nivel: getNivelRisco(contribuicao)
        };
    });

    let recomendacao = 'SIGA';
    if (scoreGlobal > 65) {
        recomendacao = 'PARE';
    } else if (scoreGlobal >= 35 && scoreGlobal <= 65) {
        recomendacao = 'ATENCAO';
    }

    // ============================================================
    // TOP RISCOS: FINANCEIRO SEMPRE + 3 MAIORES DOS DEMAIS
    // ============================================================
    var financeiroObj = null;
    var demaisRiscos = [];

    for (var i = 0; i < riscos.length; i++) {
        if (riscos[i].risco === 'FINANCEIRO') {
            financeiroObj = riscos[i];
        } else {
            demaisRiscos.push(riscos[i]);
        }
    }

    // Ordena os demais riscos por contribuição decrescente
    demaisRiscos.sort(function(a, b) {
        return b.contribuicao - a.contribuicao;
    });

    // Pega os 3 maiores dos demais
    var top3 = demaisRiscos.slice(0, 3);

    // Monta a lista final: FINANCEIRO + top3
    var topRiscos = [];
    if (financeiroObj) {
        topRiscos.push(financeiroObj);
    }
    for (var j = 0; j < top3.length; j++) {
        topRiscos.push(top3[j]);
    }

    // Se por algum motivo não houver financeiro (fallback), adiciona um genérico
    if (topRiscos.length === 0) {
        topRiscos.push({ risco: 'FINANCEIRO', contribuicao: 0, nivel: 'BAIXO' });
    }

    // Garante que sempre tenha 4 itens (preenche com os próximos se necessário)
    var idx = 0;
    while (topRiscos.length < 4 && idx < riscos.length) {
        var item = riscos[idx];
        if (!topRiscos.some(function(r) { return r.risco === item.risco; })) {
            topRiscos.push(item);
        }
        idx++;
    }

    const porta = dados.porta_entrada || 'empresa';
    const sub = dados.subsecao || 'unico';
    const chaveTipo = porta + '_' + sub;
    const tipoAnalise = DESCRICAO_PORTAS[chaveTipo] || 'Geral';

    // ============================================================
    // CÁLCULO DE DIAS DE COMPROMETIMENTO PARA RETORNO
    // ============================================================
    var analisadoTipo = dados.analisado.tipo || 'empresa';
    var analisadoRenda = dados.analisado.renda || 0;
    var analisadoFaturamentoAnual = dados.analisado.faturamento_anual || null;
    var analisadoPorte = dados.analisado.porte || 'MEDIO';
    var solicitanteTipo = dados.solicitante.tipo || 'empresa';
    var solicitanteRenda = dados.solicitante.renda || 0;
    var solicitanteFaturamentoAnual = dados.solicitante.faturamento_anual || null;
    var solicitantePorte = dados.solicitante.porte || 'MEDIO';

    var diasAnalisado = calcularDiasComprometimento(
        valorNegocio,
        analisadoTipo,
        analisadoRenda,
        analisadoFaturamentoAnual,
        analisadoPorte
    );
    var diasSolicitante = calcularDiasComprometimento(
        valorNegocio,
        solicitanteTipo,
        solicitanteRenda,
        solicitanteFaturamentoAnual,
        solicitantePorte
    );

    var impactoAnalisado = getNivelImpacto(diasAnalisado);
    var impactoSolicitante = getNivelImpacto(diasSolicitante);

    return {
        score_global: scoreGlobal,
        recuperabilidade: recuperabilidade,
        recomendacao: recomendacao,
        risco_principal: topRiscos[0]?.risco || 'FINANCEIRO',
        riscos: riscos,
        top_riscos: topRiscos,
        tipo_analise: tipoAnalise,
        ticket_estimado: ticketUsado || 0,
        tempo_mercado_anos: Math.round(descontinuidadeResult.tempo_mercado_anos * 10) / 10 || 0,
        porte_solicitante: relacionalResult.porte_solicitante || 'MEDIO',
        porte_analisado: relacionalResult.porte_analisado || '',
        metodologia: config.METODOLOGIA_VERSAO,
        percentual_comprometimento: percentualComprometimento,
        dias_comprometimento: diasAnalisado,
        impacto_analisado: {
            dias: diasAnalisado,
            nivel: impactoAnalisado.nivel,
            cor: impactoAnalisado.cor
        },
        impacto_solicitante: {
            dias: diasSolicitante,
            nivel: impactoSolicitante.nivel,
            cor: impactoSolicitante.cor
        }
    };
}

module.exports = {
    calcularRiscos,
    calcularFinanceiro,
    calcularDescontinuidade,
    calcularVeracidade,
    calcularComportamental,
    calcularIntegridade,
    calcularDeterioracao,
    calcularRelacional,
    calcularTicketDiario,
    calcularTempoMercado,
    getNivelRisco,
    getNivelImpacto,
    getNivelProbabilidade,
    calcularDiasComprometimento,
    aplicarFatoresRelacionais
};
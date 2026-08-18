// ============================================================
// motor/veri.engine.js - Motor de Cálculo VERI
// VERSÃO: 4.1.0
// CORRIGIDO: Normalização do risco financeiro antes da recomendação
// CORRIGIDO: Limiar PARE = 55% de ameaça OU risco financeiro >= 20 dias
// CORRIGIDO: Risco financeiro retornado é o normalizado (não o bruto)
// ============================================================

const config = require('../motor.config');

// ============================================================
// ESCALA DE IMPACTO (7 NÍVEIS) - DEFINITIVA
// ============================================================
function getNivelImpacto(dias) {
    if (dias <= 1) return { nivel: 'Muito Baixo', cor: '🟢', classe: 'muito-baixo' };
    if (dias <= 5) return { nivel: 'Baixo', cor: '🟢', classe: 'baixo' };
    if (dias <= 10) return { nivel: 'Moderado', cor: '🟡', classe: 'moderado' };
    if (dias <= 15) return { nivel: 'Alto', cor: '🟠', classe: 'alto' };
    if (dias <= 20) return { nivel: 'Muito Alto', cor: '🔴', classe: 'muito-alto' };
    return { nivel: 'Crítico', cor: '🔴🔴', classe: 'critico' };
}

// ============================================================
// CÁLCULO DE DIAS DE COMPROMETIMENTO
// ============================================================
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

// ============================================================
// FUNÇÃO PRINCIPAL - CALCULAR RISCOS
// ============================================================
function calcularRiscos(dados) {
    // ============================================================
    // 1. EXTRAIR DADOS DE ENTRADA
    // ============================================================
    var analisado = dados.analisado || {};
    var solicitante = dados.solicitante || {};
    var relacionamento = dados.relacionamento || {};
    var negocio = dados.negocio || {};
    var preocupacao = dados.preocupacao || null;
    var portaEntrada = dados.porta_entrada || 'empresa';
    var subsecao = dados.subsecao || 'fornecedor';

    var valorNegocio = negocio.valor || 0;
    var parcelas = negocio.parcelas || 1;
    var tipoPagamento = negocio.tipo_pagamento || 'avista';
    var isParcelado = (tipoPagamento === 'aprazo' || tipoPagamento === 'a prazo') && parcelas > 1;
    var valorEfetivo = isParcelado ? (valorNegocio / parcelas) : valorNegocio;

    var analisadoTipo = analisado.tipo || 'empresa';
    var analisadoRenda = analisado.renda || 0;
    var analisadoFaturamentoAnual = analisado.faturamento_anual || null;
    var analisadoPorte = analisado.porte || 'MEDIO';
    var analisadoSituacao = analisado.situacao || 'ATIVA';
    var analisadoDataAbertura = analisado.data_abertura || '';
    var analisadoUf = analisado.uf || '';

    var solicitanteTipo = solicitante.tipo || 'empresa';
    var solicitanteRenda = solicitante.renda || 0;
    var solicitanteFaturamentoAnual = solicitante.faturamento_anual || null;
    var solicitantePorte = solicitante.porte || 'MEDIO';

    // ============================================================
    // 2. CÁLCULO DO SCORE GLOBAL (AMEAÇA)
    // ============================================================
    // Base: 50% (neutro)
    var scoreGlobal = 50;

    // Fator 1: Porte do analisado (MEI/ME/EPP aumentam o risco)
    var porteAnalisado = (analisadoPorte || 'MEDIO').toUpperCase().trim();
    var portesRisco = {
        'MEI': 15,
        'ME': 12,
        'EPP': 8,
        'MEDIO': 5,
        'GRANDE': 0,
        'GIGANTE': -5
    };
    var fatorPorte = portesRisco[porteAnalisado] || 0;
    scoreGlobal += fatorPorte;

    // Fator 2: Relação de porte (solicitante vs analisado)
    var ordemPorte = { 'MEI': 1, 'ME': 2, 'EPP': 3, 'MEDIO': 4, 'GRANDE': 5, 'GIGANTE': 5 };
    var solPorte = ordemPorte[(solicitantePorte || 'MEDIO').toUpperCase().trim()] || 4;
    var analPorte = ordemPorte[porteAnalisado] || 4;
    if (solPorte < analPorte) {
        scoreGlobal += 10; // Solicitante menor que analisado → maior risco para ele
    } else if (analPorte < solPorte) {
        scoreGlobal -= 5; // Analisado menor → risco menor para o solicitante
    }

    // Fator 3: Conhecimento e experiência
    var conhecimento = relacionamento.conhecimento || 'razoavel';
    var experiencia = relacionamento.experiencia || 'neutra';
    if (conhecimento === 'nenhum') scoreGlobal += 10;
    else if (conhecimento === 'pouco') scoreGlobal += 5;
    else if (conhecimento === 'maisoumenos') scoreGlobal += 0;
    else if (conhecimento === 'bem') scoreGlobal -= 5;

    if (experiencia === 'negativa') scoreGlobal += 15;
    else if (experiencia === 'neutra') scoreGlobal += 5;
    else if (experiencia === 'positiva') scoreGlobal -= 5;
    else if (experiencia === 'nenhuma') scoreGlobal += 5;

    // Fator 4: Preocupação do usuário (aumenta o risco)
    if (preocupacao) {
        var preocupacoesPeso = {
            'P01': 15, // não pagar
            'P02': 12, // atraso
            'P03': 10, // quebra de contrato
            'P04': 20, // fraude
            'P05': 8,  // qualidade
            'P06': 8   // atraso na entrega
        };
        scoreGlobal += preocupacoesPeso[preocupacao] || 0;
    }

    // Fator 5: Situação cadastral irregular
    var situacoesCriticas = [
        'BAIXADA', 'SUSPENSA', 'INAPTA', 'INATIVA', 'CANCELADA',
        'NULA', 'LIQUIDACAO', 'LIQUIDACAO JUDICIAL', 'RECUPERACAO JUDICIAL',
        'INTERVENCAO', 'FALENCIA', 'INAPTIDAO'
    ];
    if (situacoesCriticas.indexOf(analisadoSituacao.toUpperCase().trim()) !== -1) {
        scoreGlobal = 99; // Ameaça máxima
    }

    // Fator 6: Tempo de mercado (desconto para empresas antigas)
    if (analisadoDataAbertura) {
        var anos = ((new Date() - new Date(analisadoDataAbertura)) / (1000 * 60 * 60 * 24 * 365));
        if (anos > 10) scoreGlobal -= 5;
        else if (anos > 5) scoreGlobal -= 2;
        else if (anos < 2) scoreGlobal += 8;
    }

    // Fator 7: Valor do negócio vs faturamento (comprometimento)
    var diasAnalisado = calcularDiasComprometimento(
        valorEfetivo,
        analisadoTipo,
        analisadoRenda,
        analisadoFaturamentoAnual,
        analisadoPorte
    );
    if (diasAnalisado > 20) scoreGlobal += 15;
    else if (diasAnalisado > 15) scoreGlobal += 10;
    else if (diasAnalisado > 10) scoreGlobal += 5;

    // Garantir que scoreGlobal fique entre 0 e 100
    scoreGlobal = Math.max(0, Math.min(100, Math.round(scoreGlobal)));

    // Recuperabilidade (oportunidade) = 100 - ameaça
    var recuperabilidade = 100 - scoreGlobal;

    // ============================================================
    // 3. CÁLCULO DOS RISCOS INDIVIDUAIS (CONTRIBUIÇÕES BRUTAS)
    // ============================================================
    var riscos = [];

    // Risco Financeiro
    var contribFinanceiro = 0;
    if (diasAnalisado > 20) contribFinanceiro = 90;
    else if (diasAnalisado > 15) contribFinanceiro = 70;
    else if (diasAnalisado > 10) contribFinanceiro = 50;
    else if (diasAnalisado > 5) contribFinanceiro = 30;
    else if (diasAnalisado > 1) contribFinanceiro = 15;
    else contribFinanceiro = 5;
    // Ajuste fino baseado no valor do negócio
    if (valorNegocio > 100000) contribFinanceiro += 10;
    else if (valorNegocio > 50000) contribFinanceiro += 5;
    riscos.push({ risco: 'FINANCEIRO', contribuicao: contribFinanceiro, nivel: getNivelImpacto(diasAnalisado).nivel });

    // Risco entre as partes
    var contribPartes = 0;
    if (solPorte < analPorte) contribPartes = 20;
    else if (analPorte < solPorte) contribPartes = 5;
    else contribPartes = 10;
    // Ajuste por conhecimento
    if (conhecimento === 'nenhum') contribPartes += 10;
    else if (conhecimento === 'pouco') contribPartes += 5;
    riscos.push({ risco: 'RISCO ENTRE AS PARTES', contribuicao: contribPartes, nivel: 'BAIXO' });

    // Risco de Descontinuidade
    var contribDescontinuidade = 0;
    if (analisadoDataAbertura) {
        var anosMercado = ((new Date() - new Date(analisadoDataAbertura)) / (1000 * 60 * 60 * 24 * 365));
        if (anosMercado < 2) contribDescontinuidade = 40;
        else if (anosMercado < 5) contribDescontinuidade = 25;
        else if (anosMercado < 10) contribDescontinuidade = 10;
        else contribDescontinuidade = 5;
    } else {
        contribDescontinuidade = 15;
    }
    riscos.push({ risco: 'DESCONTINUIDADE', contribuicao: contribDescontinuidade, nivel: 'BAIXO' });

    // Risco de Integridade
    var contribIntegridade = 0;
    if (analisadoSituacao !== 'ATIVA' && analisadoSituacao !== '') {
        contribIntegridade = 30;
    } else {
        contribIntegridade = 5;
    }
    riscos.push({ risco: 'INTEGRIDADE', contribuicao: contribIntegridade, nivel: 'BAIXO' });

    // Risco Reputacional (baseado em evidências externas, mas estimado)
    var contribReputacional = 10; // valor padrão, será ajustado pelo frontend com evidências
    riscos.push({ risco: 'REPUTACIONAL', contribuicao: contribReputacional, nivel: 'BAIXO' });

    // Risco Comportamental
    var contribComportamental = 0;
    if (experiencia === 'negativa') contribComportamental = 30;
    else if (experiencia === 'neutra') contribComportamental = 15;
    else if (experiencia === 'nenhuma') contribComportamental = 10;
    else contribComportamental = 5;
    riscos.push({ risco: 'COMPORTAMENTAL', contribuicao: contribComportamental, nivel: 'BAIXO' });

    // Risco de Resolutividade
    var contribResolutividade = 5;
    riscos.push({ risco: 'RESOLUTIVIDADE', contribuicao: contribResolutividade, nivel: 'BAIXO' });

    // Risco de Deterioração
    var contribDeterioracao = 5;
    riscos.push({ risco: 'DETERIORACAO', contribuicao: contribDeterioracao, nivel: 'BAIXO' });

    // Risco Contratual (se houver contrato)
    var contribContratual = 5;
    riscos.push({ risco: 'CONTRATUAL', contribuicao: contribContratual, nivel: 'BAIXO' });

    // ============================================================
    // 4. NORMALIZAÇÃO DOS RISCOS (SOMA = SCORE_GLOBAL)
    // ============================================================
    var somaContrib = 0;
    for (var i = 0; i < riscos.length; i++) {
        somaContrib += riscos[i].contribuicao;
    }
    if (somaContrib === 0) somaContrib = 1;

    var fatorNormalizacao = scoreGlobal / somaContrib;
    var riscosNormalizados = riscos.map(function(r) {
        return {
            risco: r.risco,
            contribuicao: r.contribuicao,
            contribuicaoNormalizada: Math.round((r.contribuicao * fatorNormalizacao) * 10) / 10,
            nivel: r.nivel
        };
    });

    // ============================================================
    // 5. EXTRAIR RISCO FINANCEIRO NORMALIZADO
    // ============================================================
    var riscoFinanceiroNormalizado = 0;
    for (var j = 0; j < riscosNormalizados.length; j++) {
        if (riscosNormalizados[j].risco === 'FINANCEIRO') {
            riscoFinanceiroNormalizado = riscosNormalizados[j].contribuicaoNormalizada;
            break;
        }
    }

    // ============================================================
    // 6. CÁLCULO DO NÍVEL DE IMPACTO DO RISCO FINANCEIRO NORMALIZADO
    // ============================================================
    // Convertemos o percentual normalizado em dias aproximados
    var diasFinanceiroNormalizado = Math.round((riscoFinanceiroNormalizado / 100) * 20 * 10) / 10; // 20 dias = 100%
    var nivelFinanceiro = getNivelImpacto(diasFinanceiroNormalizado);

    // ============================================================
    // 7. DEFINIÇÃO DA RECOMENDAÇÃO (USANDO DADOS NORMALIZADOS)
    // ============================================================
    var recomendacao = 'SIGA';
    if (scoreGlobal >= 55 || nivelFinanceiro.nivel === 'Crítico') {
        recomendacao = 'PARE';
    } else if (scoreGlobal >= 35) {
        recomendacao = 'ATENCAO';
    } else {
        recomendacao = 'SIGA';
    }

    // ============================================================
    // 8. TOP RISCOS (3 MAIORES + FINANCEIRO, ORDENADOS)
    // ============================================================
    var topRiscos = [];
    var riscosSemFinanceiro = riscosNormalizados.filter(function(r) { return r.risco !== 'FINANCEIRO'; });
    riscosSemFinanceiro.sort(function(a, b) {
        return b.contribuicaoNormalizada - a.contribuicaoNormalizada;
    });
    var top3 = riscosSemFinanceiro.slice(0, 3);
    topRiscos = top3.slice();
    // Adiciona o financeiro se não estiver no top3
    var temFinanceiro = topRiscos.some(function(r) { return r.risco === 'FINANCEIRO'; });
    if (!temFinanceiro) {
        topRiscos.push(riscosNormalizados.find(function(r) { return r.risco === 'FINANCEIRO'; }));
    }
    // Ordena os topRiscos por contribuicaoNormalizada decrescente
    topRiscos.sort(function(a, b) {
        return b.contribuicaoNormalizada - a.contribuicaoNormalizada;
    });

    // ============================================================
    // 9. IMPACTO PARA ANALISADO E SOLICITANTE (EM DIAS)
    // ============================================================
    var diasAnalisadoTotal = calcularDiasComprometimento(
        valorNegocio, // usado o valor total, não a parcela, para comprometimento total
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

    var impactoAnalisado = getNivelImpacto(diasAnalisadoTotal);
    var impactoSolicitante = getNivelImpacto(diasSolicitante);

    // ============================================================
    // 10. PERCENTUAL DE COMPROMETIMENTO
    // ============================================================
    var percentualComprometimento = 0;
    if (analisadoFaturamentoAnual) {
        var faturamentoMensalAnalisado = analisadoFaturamentoAnual / 12;
        if (faturamentoMensalAnalisado > 0) {
            percentualComprometimento = Math.round((valorEfetivo / faturamentoMensalAnalisado) * 100);
        }
    } else if (analisadoTipo === 'pessoa_fisica') {
        var rendaMensalAnalisado = analisadoRenda || 3367;
        if (rendaMensalAnalisado > 0) {
            percentualComprometimento = Math.round((valorEfetivo / rendaMensalAnalisado) * 100);
        }
    }

    // ============================================================
    // 11. RESULTADO FINAL
    // ============================================================
    var resultado = {
        score_global: scoreGlobal,
        recuperabilidade: recuperabilidade,
        recomendacao: recomendacao,
        risco_principal: 'FINANCEIRO',
        riscos: riscosNormalizados,
        top_riscos: topRiscos,
        risco_financeiro_normalizado: riscoFinanceiroNormalizado,
        risco_financeiro_nivel: nivelFinanceiro.nivel,
        percentual_comprometimento: percentualComprometimento,
        dias_comprometimento: diasAnalisadoTotal,
        impacto_analisado: {
            dias: diasAnalisadoTotal,
            nivel: impactoAnalisado.nivel,
            cor: impactoAnalisado.cor
        },
        impacto_solicitante: {
            dias: diasSolicitante,
            nivel: impactoSolicitante.nivel,
            cor: impactoSolicitante.cor
        },
        acao_protetiva: null, // será definido pelo frontend
        situacao_irregular: situacoesCriticas.indexOf(analisadoSituacao.toUpperCase().trim()) !== -1,
        // Metadados
        _meta: {
            versao: '4.1.0',
            timestamp: new Date().toISOString(),
            porte_analisado: porteAnalisado,
            porte_solicitante: solicitantePorte,
            dias_analisado: diasAnalisadoTotal,
            dias_solicitante: diasSolicitante
        }
    };

    return resultado;
}

module.exports = {
    calcularRiscos,
    getNivelImpacto,
    calcularDiasComprometimento
};
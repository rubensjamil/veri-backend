// ============================================================
// motor/veri.engine.js - Motor de Cálculo VERI
// VERSÃO: 4.2.0
// CORRIGIDO: Escala granular para classificação de probabilidade
// CORRIGIDO: Risco financeiro normalizado usa a mesma escala do score global
// CORRIGIDO: Recomendação baseada em score >= 55 OU risco financeiro >= 55%
// ============================================================

const config = require('../motor.config');

// ============================================================
// ESCALA DE IMPACTO (DIAS) - PARA IMPACTO DO NEGÓCIO
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
// ESCALA GRANULAR DE PROBABILIDADE - PARA RISCOS INDIVIDUAIS
// ============================================================
function getNivelProbabilidade(percentual) {
    if (percentual <= 15) return { nivel: 'Muito Baixo', cor: '🟢', classe: 'muito-baixo' };
    if (percentual <= 34) return { nivel: 'Baixo', cor: '🟢', classe: 'baixo' };
    if (percentual <= 54) return { nivel: 'Moderado', cor: '🟡', classe: 'moderado' };
    if (percentual <= 74) return { nivel: 'Alto', cor: '🟠', classe: 'alto' };
    if (percentual <= 100) return { nivel: 'Muito Alto', cor: '🔴', classe: 'muito-alto' };
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
    // 2. CÁLCULO DO SCORE GLOBAL (AMEAÇA) - SOMA DOS 10 RISCOS
    // ============================================================
    var scoreGlobal = 0;

    // Risco 1: Financeiro (baseado no comprometimento)
    var contribFinanceiro = 0;
    var diasAnalisado = calcularDiasComprometimento(
        valorEfetivo,
        analisadoTipo,
        analisadoRenda,
        analisadoFaturamentoAnual,
        analisadoPorte
    );
    if (diasAnalisado > 20) contribFinanceiro = 30;
    else if (diasAnalisado > 15) contribFinanceiro = 25;
    else if (diasAnalisado > 10) contribFinanceiro = 20;
    else if (diasAnalisado > 5) contribFinanceiro = 15;
    else if (diasAnalisado > 1) contribFinanceiro = 8;
    else contribFinanceiro = 3;
    if (valorNegocio > 100000) contribFinanceiro += 5;
    else if (valorNegocio > 50000) contribFinanceiro += 3;
    scoreGlobal += contribFinanceiro;

    // Risco 2: Risco entre as partes
    var ordemPorte = { 'MEI': 1, 'ME': 2, 'EPP': 3, 'MEDIO': 4, 'GRANDE': 5, 'GIGANTE': 5 };
    var solPorte = ordemPorte[(solicitantePorte || 'MEDIO').toUpperCase().trim()] || 4;
    var analPorte = ordemPorte[(analisadoPorte || 'MEDIO').toUpperCase().trim()] || 4;
    var contribPartes = 0;
    if (solPorte < analPorte) contribPartes = 15;
    else if (analPorte < solPorte) contribPartes = 5;
    else contribPartes = 8;
    var conhecimento = relacionamento.conhecimento || 'razoavel';
    if (conhecimento === 'nenhum') contribPartes += 5;
    else if (conhecimento === 'pouco') contribPartes += 3;
    scoreGlobal += contribPartes;

    // Risco 3: Descontinuidade
    var contribDescontinuidade = 0;
    if (analisadoDataAbertura) {
        var anosMercado = ((new Date() - new Date(analisadoDataAbertura)) / (1000 * 60 * 60 * 24 * 365));
        if (anosMercado < 2) contribDescontinuidade = 20;
        else if (anosMercado < 5) contribDescontinuidade = 12;
        else if (anosMercado < 10) contribDescontinuidade = 6;
        else contribDescontinuidade = 3;
    } else {
        contribDescontinuidade = 10;
    }
    scoreGlobal += contribDescontinuidade;

    // Risco 4: Integridade
    var contribIntegridade = 0;
    var situacoesCriticas = [
        'BAIXADA', 'SUSPENSA', 'INAPTA', 'INATIVA', 'CANCELADA',
        'NULA', 'LIQUIDACAO', 'LIQUIDACAO JUDICIAL', 'RECUPERACAO JUDICIAL',
        'INTERVENCAO', 'FALENCIA', 'INAPTIDAO'
    ];
    if (situacoesCriticas.indexOf(analisadoSituacao.toUpperCase().trim()) !== -1) {
        contribIntegridade = 25;
    } else {
        contribIntegridade = 5;
    }
    scoreGlobal += contribIntegridade;

    // Risco 5: Reputacional (base estimada, será ajustada por evidências externas)
    var contribReputacional = 8;
    scoreGlobal += contribReputacional;

    // Risco 6: Comportamental
    var experiencia = relacionamento.experiencia || 'neutra';
    var contribComportamental = 0;
    if (experiencia === 'negativa') contribComportamental = 15;
    else if (experiencia === 'neutra') contribComportamental = 8;
    else if (experiencia === 'nenhuma') contribComportamental = 6;
    else contribComportamental = 3;
    scoreGlobal += contribComportamental;

    // Risco 7: Resolutividade
    var contribResolutividade = 5;
    scoreGlobal += contribResolutividade;

    // Risco 8: Deterioração
    var contribDeterioracao = 4;
    scoreGlobal += contribDeterioracao;

    // Risco 9: Contratual
    var contribContratual = 4;
    scoreGlobal += contribContratual;

    // Risco 10: Preocupação do usuário
    var contribPreocupacao = 0;
    if (preocupacao) {
        var preocupacoesPeso = {
            'P01': 10, // não pagar
            'P02': 8,  // atraso
            'P03': 6,  // quebra de contrato
            'P04': 15, // fraude
            'P05': 5,  // qualidade
            'P06': 5   // atraso na entrega
        };
        contribPreocupacao = preocupacoesPeso[preocupacao] || 0;
    }
    scoreGlobal += contribPreocupacao;

    // Garantir que scoreGlobal fique entre 0 e 100
    scoreGlobal = Math.max(0, Math.min(100, Math.round(scoreGlobal)));

    // Recuperabilidade (oportunidade) = 100 - ameaça
    var recuperabilidade = 100 - scoreGlobal;

    // ============================================================
    // 3. MONTAR LISTA DE RISCOS COM CONTRIBUIÇÕES BRUTAS
    // ============================================================
    var riscos = [
        { risco: 'FINANCEIRO', contribuicao: contribFinanceiro },
        { risco: 'RISCO ENTRE AS PARTES', contribuicao: contribPartes },
        { risco: 'DESCONTINUIDADE', contribuicao: contribDescontinuidade },
        { risco: 'INTEGRIDADE', contribuicao: contribIntegridade },
        { risco: 'REPUTACIONAL', contribuicao: contribReputacional },
        { risco: 'COMPORTAMENTAL', contribuicao: contribComportamental },
        { risco: 'RESOLUTIVIDADE', contribuicao: contribResolutividade },
        { risco: 'DETERIORACAO', contribuicao: contribDeterioracao },
        { risco: 'CONTRATUAL', contribuicao: contribContratual },
        { risco: 'PREOCUPACAO', contribuicao: contribPreocupacao }
    ];
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
            contribuicaoNormalizada: Math.round((r.contribuicao * fatorNormalizacao) * 10) / 10
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
    // 6. CLASSIFICAR O RISCO FINANCEIRO COM ESCALA GRANULAR
    // ============================================================
    var nivelFinanceiro = getNivelProbabilidade(riscoFinanceiroNormalizado);

    // ============================================================
    // 7. DEFINIÇÃO DA RECOMENDAÇÃO
    // ============================================================
    var recomendacao = 'SIGA';
    if (scoreGlobal >= 55 || nivelFinanceiro.nivel === 'Alto' || nivelFinanceiro.nivel === 'Muito Alto' || nivelFinanceiro.nivel === 'Crítico') {
        recomendacao = 'PARE';
    } else if (scoreGlobal >= 35) {
        recomendacao = 'ATENCAO';
    } else {
        recomendacao = 'SIGA';
    }

    // ============================================================
    // 8. TOP RISCOS (3 MAIORES + FINANCEIRO, ORDENADOS)
    // ============================================================
    var riscosSemFinanceiro = riscosNormalizados.filter(function(r) { return r.risco !== 'FINANCEIRO'; });
    riscosSemFinanceiro.sort(function(a, b) {
        return b.contribuicaoNormalizada - a.contribuicaoNormalizada;
    });
    var top3 = riscosSemFinanceiro.slice(0, 3);
    var topRiscos = top3.slice();
    var temFinanceiro = topRiscos.some(function(r) { return r.risco === 'FINANCEIRO'; });
    if (!temFinanceiro) {
        var financeiroObj = riscosNormalizados.find(function(r) { return r.risco === 'FINANCEIRO'; });
        if (financeiroObj) topRiscos.push(financeiroObj);
    }
    topRiscos.sort(function(a, b) {
        return b.contribuicaoNormalizada - a.contribuicaoNormalizada;
    });

    // ============================================================
    // 9. IMPACTO PARA ANALISADO E SOLICITANTE (EM DIAS)
    // ============================================================
    var diasAnalisadoTotal = calcularDiasComprometimento(
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
        risco_financeiro_cor: nivelFinanceiro.cor,
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
        acao_protetiva: null,
        situacao_irregular: situacoesCriticas.indexOf(analisadoSituacao.toUpperCase().trim()) !== -1,
        _meta: {
            versao: '4.2.0',
            timestamp: new Date().toISOString(),
            porte_analisado: analisadoPorte,
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
    getNivelProbabilidade,
    calcularDiasComprometimento
};
// ============================================================
// veri.engine.js - Motor VERI (único e soberano)
// 10 fatores de risco - PESOS E METODOLOGIA
// CORRIGIDO: ticket para compra usa SOLICITANTE, venda usa ANALISADO
// CORRIGIDO: topRiscos sempre inclui FINANCEIRO + 3 maiores
// CORRIGIDO: percentual de comprometimento usa faturamento REAL
// CORRIGIDO: RISCO ENTRE AS PARTES com fallback inteligente
// ADAPTADO: Valor da Contratação/Compra/Venda
// CORRIGIDO: Percentual de comprometimento para PF usa renda mensal
// CORRIGIDO: Cálculo do ticketDiario com fallback por porte
// CORRIGIDO: DEMAIS substituído por GIGANTE
// CORRIGIDO: Adicionado dias_comprometimento no retorno
// CORRIGIDO: Impacto financeiro SEMPRE com base em quem assume o compromisso
// CORRIGIDO: Nomes por extenso da BrasilAPI (MICRO EMPRESA, etc.) mapeados para MEI/ME
// CORRIGIDO: Recomendação considera IMPACTO + PROBABILIDADE (dias > 15 = PARE)
// CORRIGIDO: Ajuste de riscos críticos (percentual = 99% - soma dos outros 3)
// 🔧 CORRIGIDO: dias_comprometimento agora considera valor da parcela se for parcelado
// 🔧 CORRIGIDO: Nova escala de impacto (Muito Baixo, Baixo, Moderado, Alto, Muito Alto)
// 🔧 CORRIGIDO: Fallback IBGE para PF (R$ 3.367,00/mês)
// 🔧 CORRIGIDO: Terminologia "dias de trabalho" para PF e "dias de faturamento" para PJ
// ============================================================

const config = require('../../motor.config.js');
const metodologia = require('../../motor.metodologia.js');

// ============================================
// MAPEAMENTO DE PORTAS (INTERNO)
// ============================================
var DESCRICAO_PORTAS = {
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
// FUNÇÃO AUXILIAR: Normalizar porte (fallback)
// ============================================
function normalizarPorte(porte) {
    if (!porte) return null;
    var p = porte.toUpperCase().trim();
    
    var mapeamento = {
        'MICRO EMPRESA': 'MEI',
        'MICROEMPRESA': 'MEI',
        'EMPRESA INDIVIDUAL': 'MEI',
        'MICRO EMPREENDEDOR INDIVIDUAL': 'MEI',
        'EMPRESA DE PEQUENO PORTE': 'ME',
        'PEQUENO PORTE': 'ME'
    };
    
    return mapeamento[p] || porte;
}

// ============================================
// FUNÇÃO: Obter faturamento anual por porte
// ============================================
function obterFaturamentoAnual(porte) {
    var porteNormalizado = normalizarPorte(porte) || porte;
    
    var faturamentoAnual = {
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
    
    return faturamentoAnual[porteNormalizado] || faturamentoAnual['MEDIO'];
}

// ============================================
// FUNÇÕES DE CÁLCULO POR FATOR
// ============================================

function calcularFinanceiro(dados) {
    var analisado = dados.analisado;
    var solicitante = dados.solicitante;
    var negocio = dados.negocio;
    var relacionamento = dados.relacionamento;
    var valorNegocio = negocio.valor || 0;
    var parcelas = negocio.parcelas || 1;
    var valorParcela = valorNegocio / parcelas;

    var negocioStr = typeof dados.negocio === 'string' ? dados.negocio : String((dados.negocio && dados.negocio.tipo) || (dados.negocio && dados.negocio.negocio) || '');

    var isCompra = negocioStr.startsWith('comprar') || negocioStr.startsWith('contratar');
    var isVenda = negocioStr.startsWith('vender');
    var ticketUsado = 0;
    var fonte = '';

    if (isCompra) {
        if (solicitante.tipo === 'pessoa' && solicitante.renda && solicitante.renda > 0) {
            ticketUsado = solicitante.renda / 30;
            fonte = 'renda_solicitante';
        } else if (solicitante.tipo === 'empresa' && solicitante.faturamento_anual && solicitante.faturamento_anual > 0) {
            ticketUsado = solicitante.faturamento_anual / 12 / 30;
            fonte = 'faturamento_solicitante';
        } else if (solicitante.tipo === 'empresa') {
            var porteNormalizado = normalizarPorte(solicitante.porte) || solicitante.porte || 'MEDIO';
            ticketUsado = calcularTicketDiarioPorPorte(porteNormalizado);
            fonte = 'porte_solicitante';
        } else {
            ticketUsado = relacionamento.ticket_medio || 5000;
            fonte = 'ticket_medio_fallback';
        }
    } else if (isVenda) {
        if (analisado.tipo === 'pessoa' && analisado.renda && analisado.renda > 0) {
            ticketUsado = analisado.renda / 30;
            fonte = 'renda_analisado';
        } else if (analisado.tipo === 'pessoa') {
            ticketUsado = 5000 / 30;
            fonte = 'renda_pf_fallback';
        } else if (analisado.tipo === 'empresa') {
            if (analisado.faturamento_anual && analisado.faturamento_anual > 0) {
                ticketUsado = analisado.faturamento_anual / 12 / 30;
                fonte = 'faturamento_real_analisado';
            } else {
                var porteNormalizado = normalizarPorte(analisado.porte) || analisado.porte || 'MEDIO';
                ticketUsado = calcularTicketDiarioPorPorte(porteNormalizado);
                fonte = 'porte_analisado';
            }
        } else {
            ticketUsado = relacionamento.ticket_medio || 5000;
            fonte = 'ticket_medio_fallback';
        }
    } else {
        var porteNormalizado = normalizarPorte(analisado.porte) || analisado.porte || 'MEDIO';
        ticketUsado = calcularTicketDiarioPorPorte(porteNormalizado);
        fonte = 'porte_analisado_fallback';
    }

    if (ticketUsado === 0) {
        ticketUsado = 1000;
        fonte = 'valor_padrao';
    }

    var proporcaoRaw = 0;
    if (ticketUsado > 0 && valorParcela > 0) {
        proporcaoRaw = valorParcela / ticketUsado;
    }

    var financeiro = config.DEFAULTS.FINANCEIRO;
    if (proporcaoRaw > 0) {
        var isPFParte = (isCompra && solicitante.tipo === 'pessoa') || (isVenda && analisado.tipo === 'pessoa');

        if (isPFParte) {
            var comprometimentoPercent = proporcaoRaw * 100;
            var regras = metodologia.REGRAS.FINANCEIRO.PF;
            if (comprometimentoPercent >= regras.LIMITES[0]) financeiro = regras.VALORES[0];
            else if (comprometimentoPercent >= regras.LIMITES[1]) financeiro = regras.VALORES[1];
            else if (comprometimentoPercent >= regras.LIMITES[2]) financeiro = regras.VALORES[2];
            else if (comprometimentoPercent >= regras.LIMITES[3]) financeiro = regras.VALORES[3];
            else financeiro = regras.VALORES[4];
        } else {
            var regras = metodologia.REGRAS.FINANCEIRO.PJ;
            if (proporcaoRaw < regras.LIMITES[0]) financeiro = regras.VALORES[0];
            else if (proporcaoRaw < regras.LIMITES[1]) financeiro = regras.VALORES[1];
            else if (proporcaoRaw < regras.LIMITES[2]) financeiro = regras.VALORES[2];
            else if (proporcaoRaw < regras.LIMITES[3]) financeiro = regras.VALORES[3];
            else if (proporcaoRaw < regras.LIMITES[4]) financeiro = regras.VALORES[4];
            else financeiro = regras.VALORES[5];
        }
    }

    if (negocio.tipo_pagamento === 'a prazo') {
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
    var analisado = dados.analisado;
    var tempoMercado = calcularTempoMercado(analisado.data_abertura);
    var regras = metodologia.REGRAS.DESCONTINUIDADE;
    var descontinuidade = config.DEFAULTS.DESCONTINUIDADE;

    if (tempoMercado < regras.LIMITES[0]) descontinuidade = regras.VALORES[0];
    else if (tempoMercado < regras.LIMITES[1]) descontinuidade = regras.VALORES[1];
    else if (tempoMercado < regras.LIMITES[2]) descontinuidade = regras.VALORES[2];
    else if (tempoMercado < regras.LIMITES[3]) descontinuidade = regras.VALORES[3];
    else if (tempoMercado < regras.LIMITES[4]) descontinuidade = regras.VALORES[4];
    else descontinuidade = regras.VALORES[5];

    return { pontuacao: descontinuidade, tempo_mercado_anos: tempoMercado };
}

function calcularVeracidade(dados) {
    var analisado = dados.analisado;
    var situacao = (analisado.situacao || 'ATIVA').toUpperCase();
    var regras = metodologia.REGRAS.VERACIDADE;
    var veracidade = config.DEFAULTS.VERACIDADE;

    if (situacao === 'BAIXADA') veracidade = regras.BAIXADA;
    else if (situacao === 'SUSPENSA' || situacao === 'INAPTA') veracidade = regras.SUSPENSA;

    return { pontuacao: veracidade, situacao: situacao };
}

function calcularComportamental(dados) {
    var relacionamento = dados.relacionamento;
    var conhecimento = relacionamento.conhecimento || 'razoavel';
    var experiencia = relacionamento.experiencia || 'neutra';
    var meses = relacionamento.meses || 0;

    var regrasConhecimento = metodologia.REGRAS.COMPORTAMENTAL.CONHECIMENTO;
    var regrasExperiencia = metodologia.REGRAS.COMPORTAMENTAL.EXPERIENCIA;
    var regrasTempo = metodologia.REGRAS.COMPORTAMENTAL.TEMPO_RELACAO;

    var fC = regrasConhecimento[conhecimento.toUpperCase()] || 1.0;
    var fE = regrasExperiencia[experiencia.toUpperCase()] || 1.0;

    var fM = 1.0;
    if (meses >= regrasTempo.LIMITES[0]) fM = regrasTempo.VALORES[0];
    else if (meses >= regrasTempo.LIMITES[1]) fM = regrasTempo.VALORES[1];
    else if (meses >= regrasTempo.LIMITES[2]) fM = regrasTempo.VALORES[2];
    else if (meses >= regrasTempo.LIMITES[3]) fM = regrasTempo.VALORES[3];
    else fM = regrasTempo.VALORES[4];

    var comportamental = Math.min(100, config.DEFAULTS.COMPORTAMENTAL * Math.max(0.2, Math.min(2.0, fM * fE * fC)));

    return { pontuacao: comportamental };
}

function calcularIntegridade(dados) {
    var analisado = dados.analisado;
    var porteAnalisado = normalizarPorte(analisado.porte) || analisado.porte || '';
    var regras = metodologia.REGRAS.INTEGRIDADE;
    var integridade = config.DEFAULTS.INTEGRIDADE;

    if (porteAnalisado === 'GRANDE' || porteAnalisado === 'GIGANTE') {
        integridade = regras.GRANDE;
    }
    if (!porteAnalisado) {
        integridade = regras.DEFAULT;
    }

    return { pontuacao: integridade };
}

function calcularDeterioracao(dados) {
    var analisado = dados.analisado;
    var situacao = (analisado.situacao || 'ATIVA').toUpperCase();
    var deterioracao = 0;

    if (situacao === 'BAIXADA') deterioracao = 90;
    else if (situacao === 'SUSPENSA' || situacao === 'INAPTA') deterioracao = 50;

    return { pontuacao: deterioracao };
}

function calcularRelacional(dados) {
    var analisado = dados.analisado;
    var solicitante = dados.solicitante;
    
    var porteAnalisado = normalizarPorte(analisado.porte) || analisado.porte || '';
    var porteSolicitante = normalizarPorte(solicitante.porte) || solicitante.porte || config.DEFAULTS.PORTE_SOLICITANTE;

    if (analisado.tipo === 'pessoa') {
        var ordem = config.ORDEM_PORTE;
        var sol = ordem[porteSolicitante] || 3;
        var anal = 0;
        var diferencaPorte = Math.abs(sol - anal);
        var regras = metodologia.REGRAS.RELACIONAL.DIFERENCA;
        var relacional = regras[diferencaPorte] || 80;
        return { 
            pontuacao: relacional, 
            porte_solicitante: porteSolicitante, 
            porte_analisado: 'PESSOA_FISICA' 
        };
    }

    if (!porteAnalisado || porteAnalisado === 'N/A' || porteAnalisado === '') {
        if (analisado.faturamento_anual && analisado.faturamento_anual > 0) {
            var faturamento = analisado.faturamento_anual;
            if (faturamento <= 81000) porteAnalisado = 'MEI';
            else if (faturamento <= 360000) porteAnalisado = 'ME';
            else if (faturamento <= 4800000) porteAnalisado = 'EPP';
            else if (faturamento <= 12000000) porteAnalisado = 'MEDIO';
            else if (faturamento <= 50000000) porteAnalisado = 'GRANDE';
            else porteAnalisado = 'GIGANTE';
        } else {
            porteAnalisado = 'MEDIO';
        }
    }

    var ordem = config.ORDEM_PORTE;
    var sol = ordem[porteSolicitante] || 3;
    var anal = ordem[porteAnalisado] || 3;
    var diferencaPorte = Math.abs(sol - anal);

    var regras = metodologia.REGRAS.RELACIONAL.DIFERENCA;
    var relacional = regras[diferencaPorte] || 80;

    if (diferencaPorte >= 3) {
        relacional = Math.min(100, relacional * 1.2);
    }

    return { 
        pontuacao: Math.round(relacional), 
        porte_solicitante: porteSolicitante, 
        porte_analisado: porteAnalisado 
    };
}

// ============================================
// FUNÇÕES AUXILIARES (CORRIGIDAS)
// ============================================

function calcularTicketDiarioPorPorte(porte) {
    var faturamentoAnual = obterFaturamentoAnual(porte);
    return faturamentoAnual ? Math.round(faturamentoAnual / 12 / 30) : 0;
}

function calcularTempoMercado(dataAbertura) {
    if (!dataAbertura) return 0;
    return (new Date() - new Date(dataAbertura)) / (1000 * 60 * 60 * 24 * 365);
}

function getNivelRisco(contrib) {
    var niveis = config.NIVEIS_RISCO;
    if (contrib >= niveis.CRITICO) return 'CRITICO';
    if (contrib >= niveis.ALTO) return 'ALTO';
    if (contrib >= niveis.MEDIO) return 'MEDIO';
    return 'BAIXO';
}

// 🔧 NOVA ESCALA DE IMPACTO
function getNivelImpacto(dias) {
    if (dias <= 0.3) return { nivel: 'Muito Baixo', cor: '🟢' };
    if (dias <= 3) return { nivel: 'Baixo', cor: '🟢' };
    if (dias <= 7) return { nivel: 'Moderado', cor: '🟡' };
    if (dias <= 15) return { nivel: 'Alto', cor: '🟠' };
    return { nivel: 'Muito Alto', cor: '🔴' };
}

// 🔧 FUNÇÃO PARA CALCULAR TICKET DIÁRIO COM FALLBACK IBGE PARA PF
function calcularTicketDiario(parte) {
    if (!parte || !parte.tipo) return 0;
    if (parte.tipo === 'pessoa_fisica' || parte.tipo === 'pessoa') {
        var renda = (parte.renda && parte.renda > 0) ? parte.renda : 3367; // IBGE 2025
        return renda / 30;
    }
    if (parte.tipo === 'empresa' || parte.tipo === 'pessoa_juridica') {
        var faturamentoMensal = 0;
        if (parte.faturamento_anual) {
            faturamentoMensal = parte.faturamento_anual / 12;
        } else if (parte.porte && parte.porte !== 'N/A') {
            faturamentoMensal = calcularFaturamentoMensalPorPorte(parte.porte);
        }
        return faturamentoMensal / 30;
    }
    return 0;
}

function calcularFaturamentoMensalPorPorte(porte) {
    var faturamentoAnual = obterFaturamentoAnual(porte);
    return faturamentoAnual ? faturamentoAnual / 12 : 0;
}

// 🔧 FUNÇÃO PARA CALCULAR IMPACTO EM DIAS
function calcularImpacto(valorEfetivo, parte) {
    var ticketDiario = calcularTicketDiario(parte);
    if (ticketDiario > 0 && valorEfetivo > 0) {
        var dias = Math.round((valorEfetivo / ticketDiario) * 10) / 10;
        return {
            dias: dias,
            ticket: ticketDiario,
            nivel: getNivelImpacto(dias)
        };
    }
    return { dias: 0, ticket: 0, nivel: { nivel: 'Não calculado', cor: '⚪' } };
}

// ============================================================
// 🔧 AJUSTE DE RISCOS CRÍTICOS
// ============================================================
function ajustarRiscosCriticos(topRiscos) {
    var temCritico = false;
    var indiceCritico = -1;
    for (var i = 0; i < topRiscos.length; i++) {
        if (topRiscos[i].nivel === 'CRITICO') {
            temCritico = true;
            indiceCritico = i;
            break;
        }
    }
    
    if (!temCritico) return topRiscos;
    
    var outrosRiscos = [];
    for (var j = 0; j < topRiscos.length; j++) {
        if (j !== indiceCritico) {
            outrosRiscos.push(topRiscos[j]);
        }
    }
    
    var somaOutros = 0;
    for (var k = 0; k < outrosRiscos.length; k++) {
        somaOutros += outrosRiscos[k].contribuicao;
    }
    
    var novoPercentual = 99 - somaOutros;
    if (novoPercentual < 50) novoPercentual = 50;
    
    topRiscos[indiceCritico].contribuicao = Math.round(novoPercentual * 10) / 10;
    topRiscos[indiceCritico].nivel = 'CRITICO';
    
    console.log('🔧 AJUSTE CRÍTICO: risco ' + topRiscos[indiceCritico].risco + ' ajustado para ' + topRiscos[indiceCritico].contribuicao + '% (soma outros: ' + somaOutros + '%)');
    
    return topRiscos;
}
// ============================================
// FUNÇÃO PRINCIPAL: calcularRiscos
// ============================================

function calcularRiscos(dados) {
    var situacaoRaw = (dados.analisado && dados.analisado.situacao) ? dados.analisado.situacao.toUpperCase() : 'ATIVA';

    var palavrasCriticas = [
        'BAIXADA', 'INATIVA', 'CANCELADA', 'SUSPENSA', 'NULA',
        'LIQUIDAÇÃO', 'LIQUIDACAO', 'RECUPERAÇÃO', 'RECUPERACAO',
        'FALÊNCIA', 'FALENCIA', 'INTERVENÇÃO', 'INTERVENCAO',
        'INAPTA', 'INAPTIDÃO'
    ];

    var isCritica = false;
    for (var i = 0; i < palavrasCriticas.length; i++) {
        if (situacaoRaw.indexOf(palavrasCriticas[i]) !== -1) {
            isCritica = true;
            break;
        }
    }

    if (isCritica) {
        var scoreGlobal = 95;
        var recuperabilidade = 5;
        var recomendacao = 'PARE';

        var riscoCritico = {
            risco: 'SITUAÇÃO CRÍTICA',
            pontuacao: 100,
            contribuicao: 30,
            nivel: 'CRITICO'
        };

        var riscos = [
            riscoCritico,
            { risco: 'FINANCEIRO', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'RESOLUTIVIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'DESCONTINUIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'VERACIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'COMPORTAMENTAL', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'INTEGRIDADE', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'DETERIORACAO', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'CONTRATUAL', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'REPUTACIONAL', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' },
            { risco: 'RISCO ENTRE AS PARTES', pontuacao: 0, contribuicao: 0, nivel: 'BAIXO' }
        ];

        var topRiscos = [riscoCritico];

        var porta = dados.porta_entrada || 'empresa';
        var sub = dados.subsecao || 'unico';
        var chaveTipo = porta + '_' + sub;
        var tipoAnalise = DESCRICAO_PORTAS[chaveTipo] || 'Geral';

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
            dias_comprometimento: 0,
            nivel_impacto: { nivel: 'Crítico', cor: '🔴' },
            alerta: {
                tipo: 'SITUACAO_CRITICA',
                mensagem: 'A empresa está com situação "' + situacaoRaw + '". Negócios com essa situação são considerados inviáveis.',
                acao_recomendada: 'Não prossiga com este negócio.'
            }
        };
    }

    var financeiroResult = calcularFinanceiro(dados);
    var descontinuidadeResult = calcularDescontinuidade(dados);
    var veracidadeResult = calcularVeracidade(dados);
    var comportamentalResult = calcularComportamental(dados);
    var integridadeResult = calcularIntegridade(dados);
    var deterioracaoResult = calcularDeterioracao(dados);
    var relacionalResult = calcularRelacional(dados);

    // ============================================================
    // PERCENTUAL DE COMPROMETIMENTO E DIAS (COM VALOR DA PARCELA)
    // ============================================================
    var percentualComprometimento = 0;
    var valorNegocio = dados.negocio.valor || 0;
    var parcelas = dados.negocio.parcelas || 1;
    var valorParcela = (parcelas > 0) ? valorNegocio / parcelas : valorNegocio;

    var negocioStr = typeof dados.negocio === 'string'
        ? dados.negocio
        : String((dados.negocio && dados.negocio.tipo) || (dados.negocio && dados.negocio.negocio) || '');

    var isCompra = negocioStr.startsWith('comprar') || negocioStr.startsWith('contratar');
    var isVenda = negocioStr.startsWith('vender');

    // Ticket diário para cálculo do percentual de comprometimento (quem assume o compromisso)
    var ticketDiario = 0;
    if (isCompra) {
        // Compra: solicitante paga
        var parteSolicitante = {
            tipo: dados.solicitante.tipo || 'empresa',
            renda: dados.solicitante.renda || 0,
            porte: dados.solicitante.porte || 'MEDIO',
            faturamento_anual: dados.solicitante.faturamento_anual || null
        };
        ticketDiario = calcularTicketDiario(parteSolicitante);
    } else if (isVenda) {
        // Venda: analisado paga
        var parteAnalisado = {
            tipo: dados.analisado.tipo || 'empresa',
            renda: dados.analisado.renda || 0,
            porte: dados.analisado.porte || 'MEDIO',
            faturamento_anual: dados.analisado.faturamento_anual || null
        };
        ticketDiario = calcularTicketDiario(parteAnalisado);
    } else {
        // Fallback: usa analisado
        var parteAnalisadoFallback = {
            tipo: dados.analisado.tipo || 'empresa',
            renda: dados.analisado.renda || 0,
            porte: dados.analisado.porte || 'MEDIO',
            faturamento_anual: dados.analisado.faturamento_anual || null
        };
        ticketDiario = calcularTicketDiario(parteAnalisadoFallback);
    }

    if (ticketDiario > 0 && valorParcela > 0) {
        percentualComprometimento = Math.round((valorParcela / ticketDiario) * 100);
    }

    // 🔧 DIAS COMPROMETIMENTO: usa valor da parcela se for parcelado
    var pagamento = dados.negocio.tipo_pagamento || 'avista';
    var valorBaseParaImpacto = (pagamento === 'aprazo' || pagamento === 'a prazo') && parcelas > 1
        ? valorParcela
        : valorNegocio;

    var diasComprometimento = 0;
    if (ticketDiario > 0 && valorBaseParaImpacto > 0) {
        diasComprometimento = Math.round((valorBaseParaImpacto / ticketDiario) * 10) / 10;
    }

    var nivelImpacto = getNivelImpacto(diasComprometimento);

    console.log('🧮 PERCENTUAL: valorParcela:', valorParcela, 'ticketDiario:', ticketDiario, 'percentual:', percentualComprometimento);
    console.log('📆 DIAS COMPROMETIMENTO (base:', valorBaseParaImpacto, '):', diasComprometimento, 'NÍVEL:', nivelImpacto.nivel);

    var resolutividade = config.DEFAULTS.RESOLUTIVIDADE;
    var contratual = 0;
    var reputacional = config.DEFAULTS.REPUTACIONAL;

    var fatores = [
        { nome: 'FINANCEIRO', pontuacao: financeiroResult.pontuacao, peso: metodologia.PESOS.FINANCEIRO },
        { nome: 'RESOLUTIVIDADE', pontuacao: resolutividade, peso: metodologia.PESOS.RESOLUTIVIDADE },
        { nome: 'DESCONTINUIDADE', pontuacao: descontinuidadeResult.pontuacao, peso: metodologia.PESOS.DESCONTINUIDADE },
        { nome: 'VERACIDADE', pontuacao: veracidadeResult.pontuacao, peso: metodologia.PESOS.VERACIDADE },
        { nome: 'COMPORTAMENTAL', pontuacao: comportamentalResult.pontuacao, peso: metodologia.PESOS.COMPORTAMENTAL },
        { nome: 'INTEGRIDADE', pontuacao: integridadeResult.pontuacao, peso: metodologia.PESOS.INTEGRIDADE },
        { nome: 'DETERIORACAO', pontuacao: deterioracaoResult.pontuacao, peso: metodologia.PESOS.DETERIORACAO },
        { nome: 'CONTRATUAL', pontuacao: contratual, peso: metodologia.PESOS.CONTRATUAL },
        { nome: 'REPUTACIONAL', pontuacao: reputacional, peso: metodologia.PESOS.REPUTACIONAL },
        { nome: 'RISCO ENTRE AS PARTES', pontuacao: relacionalResult.pontuacao, peso: metodologia.PESOS.RELACIONAL }
    ];

    var totalPonderado = 0;
    for (var f = 0; f < fatores.length; f++) {
        totalPonderado += fatores[f].pontuacao * fatores[f].peso;
    }
    var scoreGlobal = Math.min(99, Math.max(1, Math.round(totalPonderado / 6.0 * 10) / 10));
    var recuperabilidade = 100 - scoreGlobal;

    var fatorDivisor = totalPonderado > 0 ? totalPonderado : 1;
    var riscos = [];
    for (var f = 0; f < fatores.length; f++) {
        var contribuicao = Math.round((fatores[f].pontuacao * fatores[f].peso / fatorDivisor) * scoreGlobal * 10) / 10;
        riscos.push({
            risco: fatores[f].nome,
            pontuacao: fatores[f].pontuacao,
            contribuicao: contribuicao,
            nivel: getNivelRisco(contribuicao)
        });
    }

    // ============================================================
    // RECOMENDAÇÃO considerando IMPACTO + PROBABILIDADE + RISCOS CRÍTICOS
    // ============================================================
    var recomendacao = 'SIGA';

    var temRiscoCritico = false;
    for (var i = 0; i < riscos.length; i++) {
        if (riscos[i].nivel === 'CRITICO') {
            temRiscoCritico = true;
            break;
        }
    }
    if (temRiscoCritico) {
        recomendacao = 'PARE';
        console.log('⚠️ RISCO CRÍTICO detectado: forçando PARE');
    }

    if (!temRiscoCritico) {
        if (scoreGlobal > 65) {
            recomendacao = 'PARE';
        } else if (scoreGlobal >= 35 && scoreGlobal <= 65) {
            recomendacao = 'ATENCAO';
        }
    }

    if (diasComprometimento > 15) {
        recomendacao = 'PARE';
        console.log('⚠️ IMPACTO CRÍTICO (' + diasComprometimento + ' dias): forçando PARE');
    } else if (diasComprometimento > 7 && recomendacao === 'SIGA') {
        recomendacao = 'ATENCAO';
        console.log('⚠️ IMPACTO ALTO (' + diasComprometimento + ' dias): ajustando para ATENCAO');
    }

    console.log('📊 RECOMENDAÇÃO FINAL:', recomendacao, '(score:', scoreGlobal, 'dias:', diasComprometimento, ')');

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

    demaisRiscos.sort(function(a, b) {
        return b.contribuicao - a.contribuicao;
    });

    var top3 = demaisRiscos.slice(0, 3);

    var topRiscos = [];
    if (financeiroObj) {
        topRiscos.push(financeiroObj);
    }
    for (var j = 0; j < top3.length; j++) {
        topRiscos.push(top3[j]);
    }

    if (topRiscos.length === 0) {
        topRiscos.push({ risco: 'FINANCEIRO', contribuicao: 0, nivel: 'BAIXO' });
    }

    while (topRiscos.length < 4 && topRiscos.length < riscos.length) {
        var item = riscos[topRiscos.length];
        if (!topRiscos.some(function(r) { return r.risco === item.risco; })) {
            topRiscos.push(item);
        }
    }

    // ============================================================
    // APLICA AJUSTE DE RISCOS CRÍTICOS
    // ============================================================
    topRiscos = ajustarRiscosCriticos(topRiscos);

    // ============================================================
    // RISCO PRINCIPAL: o primeiro da lista ajustada
    // ============================================================
    var riscoPrincipal = (topRiscos[0] && topRiscos[0].risco) || 'FINANCEIRO';

    var porta = dados.porta_entrada || 'empresa';
    var sub = dados.subsecao || 'unico';
    var chaveTipo = porta + '_' + sub;
    var tipoAnalise = DESCRICAO_PORTAS[chaveTipo] || 'Geral';

    console.log('📊 MOTOR: score:', scoreGlobal, 'percentual:', percentualComprometimento, 'dias:', diasComprometimento);

    return {
        score_global: scoreGlobal,
        recuperabilidade: recuperabilidade,
        recomendacao: recomendacao,
        risco_principal: riscoPrincipal,
        riscos: riscos,
        top_riscos: topRiscos,
        tipo_analise: tipoAnalise,
        ticket_estimado: ticketDiario || 0,
        tempo_mercado_anos: Math.round(descontinuidadeResult.tempo_mercado_anos * 10) / 10 || 0,
        porte_solicitante: relacionalResult.porte_solicitante || 'MEDIO',
        porte_analisado: relacionalResult.porte_analisado || '',
        metodologia: config.METODOLOGIA_VERSAO,
        percentual_comprometimento: percentualComprometimento,
        dias_comprometimento: diasComprometimento,
        nivel_impacto: nivelImpacto
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
    calcularTicketDiarioPorPorte,
    getNivelRisco,
    getNivelImpacto,
    calcularTicketDiario,
    calcularImpacto
};
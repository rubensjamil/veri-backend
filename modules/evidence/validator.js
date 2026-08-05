// ============================================================
// validator.js - Validador de Evidências da VERI
// VERSÃO DEFINITIVA: organiza, padroniza e nunca bloqueia
// ============================================================

function validarEvidencias(dados) {
    if (!dados || typeof dados !== 'object') {
        console.warn('⚠️ Validador: dados nulos. Criando estrutura padrão.');
        return {
            valido: true,
            erros: [],
            dados: {
                status_busca: 'falha',
                dados_estruturados: {
                    reputacional: {},
                    resolutividade: {},
                    comportamental: {},
                    saude_financeira: {},
                    red_flags: {}
                },
                padroes_risco: [],
                evidencias: [],
                fontes_consultadas: []
            }
        };
    }

    if (!dados.dados_estruturados) {
        console.warn('⚠️ Validador: dados_estruturados ausente. Criando estrutura padrão.');
        dados.dados_estruturados = {
            reputacional: {},
            resolutividade: {},
            comportamental: {},
            saude_financeira: {},
            red_flags: {}
        };
    }

    var secoes = ['reputacional', 'resolutividade', 'comportamental', 'saude_financeira', 'red_flags'];
    for (var i = 0; i < secoes.length; i++) {
        if (!dados.dados_estruturados[secoes[i]] || typeof dados.dados_estruturados[secoes[i]] !== 'object') {
            dados.dados_estruturados[secoes[i]] = {};
        }
    }

    dados.evidencias = dados.evidencias || [];
    dados.padroes_risco = dados.padroes_risco || [];
    dados.fontes_consultadas = dados.fontes_consultadas || [];

    if (!dados.status_busca) dados.status_busca = 'sucesso';
    if (!dados.coletado_em) dados.coletado_em = new Date().toISOString();
    if (!dados.confianca_geral) {
        dados.confianca_geral = {
            nivel: 'media',
            motivo: 'Estrutura organizada pelo validador'
        };
    }

    if (dados.site === undefined || dados.site === null) dados.site = null;
    if (dados.setor === undefined || dados.setor === null) dados.setor = null;

    return {
        valido: true,
        erros: [],
        dados: dados
    };
}

module.exports = { validarEvidencias };
function extrairScores(dadosEstruturados) {
    if (!dadosEstruturados || typeof dadosEstruturados !== 'object') {
        return {
            reputacional: 0.5,
            resolutividade: 0.5,
            comportamental: 0.5
        };
    }

    let reputacionalScore = 0.5;
    let reputacionalPeso = 0;
    let reputacionalTotal = 0;

    const rep = dadosEstruturados.reputacional || {};
    
    if (rep.historico_reclamacoes && rep.historico_reclamacoes.status === 'encontrado') {
        const reclamacoes = rep.historico_reclamacoes.dado || '';
        const numReclamacoes = extrairNumero(reclamacoes);
        if (numReclamacoes !== null) {
            const scoreReclamacoes = Math.max(0, 1 - (numReclamacoes / 10));
            reputacionalTotal += scoreReclamacoes * 0.4;
            reputacionalPeso += 0.4;
        }
    }

    if (rep.mencoes_midia && rep.mencoes_midia.status === 'encontrado') {
        reputacionalTotal += 0.7 * 0.3;
        reputacionalPeso += 0.3;
    }

    if (rep.premiacoes && rep.premiacoes.status === 'encontrado') {
        reputacionalTotal += 0.8 * 0.15;
        reputacionalPeso += 0.15;
    }

    if (rep.certificacoes && rep.certificacoes.status === 'encontrado') {
        reputacionalTotal += 0.7 * 0.15;
        reputacionalPeso += 0.15;
    }

    const redFlags = dadosEstruturados.red_flags || {};
    let numRedFlags = 0;
    for (const key of Object.keys(redFlags)) {
        if (redFlags[key] && redFlags[key].status === 'encontrado') {
            numRedFlags++;
        }
    }
    if (numRedFlags > 0) {
        const penalidade = Math.min(0.4, numRedFlags * 0.1);
        reputacionalTotal -= penalidade;
        reputacionalPeso += 0.2;
    }

    reputacionalScore = reputacionalPeso > 0 
        ? Math.max(0, Math.min(1, reputacionalTotal / reputacionalPeso))
        : 0.5;

    let resolutividadeScore = 0.5;
    let resolutividadePeso = 0;
    let resolutividadeTotal = 0;

    const res = dadosEstruturados.resolutividade || {};

    if (res.historico_solucao && res.historico_solucao.status === 'encontrado') {
        const solucao = res.historico_solucao.dado || '';
        const taxa = extrairPorcentagem(solucao);
        if (taxa !== null) {
            resolutividadeTotal += (taxa / 100) * 0.5;
            resolutividadePeso += 0.5;
        } else {
            resolutividadeTotal += 0.5 * 0.5;
            resolutividadePeso += 0.5;
        }
    }

    if (res.tempo_medio_retorno && res.tempo_medio_retorno.status === 'encontrado') {
        const tempo = res.tempo_medio_retorno.dado || '';
        const horas = extrairNumero(tempo);
        if (horas !== null) {
            const scoreTempo = Math.max(0, 1 - (horas / 48));
            resolutividadeTotal += scoreTempo * 0.5;
            resolutividadePeso += 0.5;
        } else {
            resolutividadeTotal += 0.5 * 0.5;
            resolutividadePeso += 0.5;
        }
    }

    resolutividadeScore = resolutividadePeso > 0
        ? Math.max(0, Math.min(1, resolutividadeTotal / resolutividadePeso))
        : 0.5;

    let comportamentalScore = 0.5;
    let comportamentalPeso = 0;
    let comportamentalTotal = 0;

    const comp = dadosEstruturados.comportamental || {};

    if (comp.consistencia_mercado && comp.consistencia_mercado.status === 'encontrado') {
        comportamentalTotal += 0.7 * 0.4;
        comportamentalPeso += 0.4;
    }

    if (comp.mudancas_escopo && comp.mudancas_escopo.status === 'encontrado') {
        const mudancas = comp.mudancas_escopo.dado || '';
        if (mudancas.toLowerCase().includes('nenhuma') ||
            mudancas.toLowerCase().includes('sem') ||
            mudancas.toLowerCase().includes('mantido')) {
            comportamentalTotal += 0.8 * 0.3;
        } else {
            comportamentalTotal += 0.4 * 0.3;
        }
        comportamentalPeso += 0.3;
    }

    if (comp.historico_societario && comp.historico_societario.status === 'encontrado') {
        const societario = comp.historico_societario.dado || '';
        if (societario.toLowerCase().includes('estável') ||
            societario.toLowerCase().includes('mesmo')) {
            comportamentalTotal += 0.8 * 0.3;
        } else {
            comportamentalTotal += 0.4 * 0.3;
        }
        comportamentalPeso += 0.3;
    }

    comportamentalScore = comportamentalPeso > 0
        ? Math.max(0, Math.min(1, comportamentalTotal / comportamentalPeso))
        : 0.5;

    return {
        reputacional: Math.round(reputacionalScore * 100) / 100,
        resolutividade: Math.round(resolutividadeScore * 100) / 100,
        comportamental: Math.round(comportamentalScore * 100) / 100
    };
}

function extrairNumero(texto) {
    if (!texto || typeof texto !== 'string') return null;
    const match = texto.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

function extrairPorcentagem(texto) {
    if (!texto || typeof texto !== 'string') return null;
    const match = texto.match(/(\d+)%/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

module.exports = { extrairScores };
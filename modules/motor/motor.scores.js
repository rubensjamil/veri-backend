/**
 * Extrai scores dos eixos do JSON de evidências
 * Os scores são usados pelo Motor VERI para calcular o risco
 * 
 * @param {Object} dadosBrutos - O objeto dados_brutos do JSON do Gemini
 * @returns {Object} Scores normalizados (0 a 1)
 */
export function extrairScores(dadosBrutos) {
  if (!dadosBrutos || typeof dadosBrutos !== 'object') {
    return {
      reputacional: 0.5,
      resolutividade: 0.5,
      comportamental: 0.5
    };
  }

  // 1. Score Reputacional (0 a 1)
  // Baseado em: reclamações, menções na mídia, prêmios, certificações
  let reputacionalScore = 0.5;
  let reputacionalPeso = 0;
  let reputacionalTotal = 0;

  const rep = dadosBrutos.reputacional || {};
  
  // Reclamações - quanto menos, melhor
  if (rep.historico_reclamacoes && rep.historico_reclamacoes.status === 'encontrado') {
    const reclamacoes = rep.historico_reclamacoes.dado || '';
    const numReclamacoes = extrairNumero(reclamacoes);
    if (numReclamacoes !== null) {
      // 0 reclamações = 1.0, 10+ reclamações = 0.0
      const scoreReclamacoes = Math.max(0, 1 - (numReclamacoes / 10));
      reputacionalTotal += scoreReclamacoes * 0.4;
      reputacionalPeso += 0.4;
    }
  }

  // Menções na mídia - quanto mais positivas, melhor
  if (rep.mencoes_midia && rep.mencoes_midia.status === 'encontrado') {
    const mencoes = rep.mencoes_midia.dado || '';
    // Menções na mídia são positivas (empresa mencionada)
    reputacionalTotal += 0.7 * 0.3;
    reputacionalPeso += 0.3;
  }

  // Prêmios e certificações - quanto mais, melhor
  if (rep.premiacoes && rep.premiacoes.status === 'encontrado') {
    reputacionalTotal += 0.8 * 0.15;
    reputacionalPeso += 0.15;
  }
  if (rep.certificacoes && rep.certificacoes.status === 'encontrado') {
    reputacionalTotal += 0.7 * 0.15;
    reputacionalPeso += 0.15;
  }

  // Red flags reduzem o score
  const redFlags = dadosBrutos.red_flags || {};
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

  // 2. Score Resolutividade (0 a 1)
  // Baseado em: histórico de solução, tempo de retorno
  let resolutividadeScore = 0.5;
  let resolutividadePeso = 0;
  let resolutividadeTotal = 0;

  const res = dadosBrutos.resolutividade || {};

  if (res.historico_solucao && res.historico_solucao.status === 'encontrado') {
    const solucao = res.historico_solucao.dado || '';
    const taxa = extrairPorcentagem(solucao);
    if (taxa !== null) {
      const scoreSolucao = taxa / 100;
      resolutividadeTotal += scoreSolucao * 0.5;
      resolutividadePeso += 0.5;
    } else {
      // Fallback: se não encontrar porcentagem, assume média
      resolutividadeTotal += 0.5 * 0.5;
      resolutividadePeso += 0.5;
    }
  }

  if (res.tempo_medio_retorno && res.tempo_medio_retorno.status === 'encontrado') {
    const tempo = res.tempo_medio_retorno.dado || '';
    const horas = extrairNumero(tempo);
    if (horas !== null) {
      // Quanto menor o tempo de retorno, melhor (1h = 1.0, 48h+ = 0.0)
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

  // 3. Score Comportamental (0 a 1)
  // Baseado em: consistência no mercado, histórico societário
  let comportamentalScore = 0.5;
  let comportamentalPeso = 0;
  let comportamentalTotal = 0;

  const comp = dadosBrutos.comportamental || {};

  if (comp.consistencia_mercado && comp.consistencia_mercado.status === 'encontrado') {
    const consistencia = comp.consistencia_mercado.dado || '';
    // Se tem consistência, é positivo
    comportamentalTotal += 0.7 * 0.4;
    comportamentalPeso += 0.4;
  }

  if (comp.mudancas_escopo && comp.mudancas_escopo.status === 'encontrado') {
    const mudancas = comp.mudancas_escopo.dado || '';
    // Verifica se há menção de "nenhuma alteração" ou "sem mudanças"
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

/**
 * Extrai o primeiro número de uma string
 */
function extrairNumero(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const match = texto.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extrai porcentagem de uma string (ex: "80%" → 80)
 */
function extrairPorcentagem(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const match = texto.match(/(\d+)%/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
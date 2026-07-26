// ============================================================
// gemini.client.js - Gemini SOMENTE ESTRUTURA
// NÃO busca dados. NÃO inventa. Só organiza.
// PROMPT v6: + setor, consumidor.gov, sanções, tendências
// ============================================================

const { GoogleGenAI } = require('@google/genai');

const VERSAO_PROMPT_GEMINI = 'v6';
const VERSAO_SCHEMA = '1.3';

// ============================================================
// PROMPT ATUALIZADO
// ============================================================
const PROMPT_VERI = `
Você é um estruturador de evidências da plataforma VERI.

Tarefa: Organizar os dados brutos recebidos no formato JSON abaixo.

REGRAS:
- Mantenha a estrutura exata do JSON.
- Preencha apenas campos com dados disponíveis.
- Se um dado não existir, use "status": "nao_encontrado" e "dado": null.
- Cada evidência deve ter: id, descricao, fonte, url, coletado_em.
- Cada red flag deve ter: id, descricao, fonte, url.

*INSTRUÇÕES ESPECIAIS:*

1. *CAMPO "site":* Analise os dados brutos (google_search, noticias, reclame_aqui) para encontrar o site oficial da empresa. Se encontrar um domínio, preencha o campo "site". Se não, deixe como null.

2. *CAMPO "setor":* Analise os dados brutos para identificar o setor de atuação da empresa (ex: varejo, indústria, serviços, tecnologia, agronegócio). Se não encontrar, deixe como null.

3. *CAMPO "consumidor_gov":* Se houver menções ao Consumidor.gov nos dados brutos, organize como evidências em "red_flags.consumidor_gov".

4. *CAMPO "sancoes":* Se houver menções a sanções, penalidades ou multas (ex: Cade, Bacen, SUSEP), organize como evidências em "red_flags.sancoes".

5. *CAMPO "tendencias":* Se houver informações sobre evolução da situação (ex: piora ou melhora nas reclamações), organize como evidência em "red_flags.tendencias".

6. *CAMPO "historico_relacionamento":* Se houver menções a relacionamentos anteriores ou histórico de negócios, organize em "comportamental.historico_relacionamento".

FORMATO EXATO DE SAÍDA:
{
  "status_busca": "sucesso",
  "coletado_em": "2026-07-10T10:00:00",
  "confianca_geral": { "nivel": "alta", "motivo": "Evidências encontradas" },
  "site": "www.exemplo.com.br",
  "setor": "Varejo",
  "dados_estruturados": {
    "reputacional": {
      "historico_reclamacoes": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "mencoes_midia": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "premiacoes": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "certificacoes": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] }
    },
    "resolutividade": {
      "historico_solucao": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "tempo_medio_retorno": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] }
    },
    "comportamental": {
      "consistencia_mercado": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "historico_societario": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "historico_relacionamento": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] }
    },
    "saude_financeira": {
      "situacao": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] }
    },
    "red_flags": {
      "fraudes": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "processos_criminais": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "sancoes": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "processos_judiciais": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "consumidor_gov": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] },
      "tendencias": { "status": "nao_encontrado", "dado": null, "evidencias": [], "red_flags": [] }
    }
  }
}
`;

function parseGeminiSafe(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
        var start = text.indexOf('{');
        var end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            var slice = text.substring(start, end + 1);
            try {
                return JSON.parse(slice);
            } catch (e) {
                throw new Error('GEMINI_INVALID_JSON_CORRUPTED');
            }
        }
        throw new Error('GEMINI_NO_VALID_JSON');
    }
}

async function estruturar(fontes, timeoutMs) {
    timeoutMs = timeoutMs || 60000;

    var apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY não configurada');
    }

    var ai = new GoogleGenAI({ apiKey: apiKey });

    var prompt = PROMPT_VERI + '\n\nDADOS BRUTOS (FONTES):\n' + JSON.stringify(fontes, null, 2);

    var modelos = [
        'gemini-2.5-flash',
        'gemini-3-flash-preview',
        'gemini-1.5-flash'
    ];

    var ultimoErro = null;

    for (var i = 0; i < modelos.length; i++) {
        var modelo = modelos[i];

        try {
            console.log('Tentando modelo:', modelo);

            var timeoutPromise = new Promise(function(_, reject) {
                setTimeout(function() { reject(new Error('TIMEOUT_60S')); }, timeoutMs);
            });

            var requestPromise = ai.models.generateContent({
                model: modelo,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.0,
                    topP: 0.95,
                },
            });

            var response = await Promise.race([requestPromise, timeoutPromise]);
            var text = response.text;

            if (!text) {
                throw new Error('RESPOSTA_VAZIA_GEMINI');
            }

            var estruturado = parseGeminiSafe(text);
            estruturado._modelo_usado = modelo;
            estruturado._versao_prompt = VERSAO_PROMPT_GEMINI;
            estruturado._versao_schema = VERSAO_SCHEMA;

            console.log('Modelo usado com sucesso:', modelo);
            return estruturado;

        } catch (error) {
            ultimoErro = error;
            var erroMsg = error.message || '';
            console.warn('Modelo ' + modelo + ' falhou:', erroMsg);

            if (erroMsg.includes('NOT_FOUND') || erroMsg.includes('429') || 
                erroMsg.includes('503') || erroMsg.includes('UNAVAILABLE') ||
                erroMsg.includes('TIMEOUT') || erroMsg.includes('RESPOSTA_VAZIA')) {
                continue;
            }

            return {
                status_busca: 'falha',
                coletado_em: new Date().toISOString(),
                confianca_geral: { nivel: 'baixa', motivo: 'Erro na estruturação' },
                site: null,
                setor: null,
                dados_estruturados: {
                    reputacional: {},
                    resolutividade: {},
                    comportamental: {},
                    saude_financeira: {},
                    red_flags: {
                        processos_judiciais: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] },
                        consumidor_gov: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] },
                        sancoes: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] },
                        tendencias: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] }
                    }
                },
                _erro: error.message,
                _versao_prompt: VERSAO_PROMPT_GEMINI,
                _versao_schema: VERSAO_SCHEMA,
                _modelo_usado: modelo
            };
        }
    }

    return {
        status_busca: 'falha',
        coletado_em: new Date().toISOString(),
        confianca_geral: { nivel: 'baixa', motivo: 'Todos os modelos falharam' },
        site: null,
        setor: null,
        dados_estruturados: {
            reputacional: {},
            resolutividade: {},
            comportamental: {},
            saude_financeira: {},
            red_flags: {
                processos_judiciais: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] },
                consumidor_gov: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] },
                sancoes: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] },
                tendencias: { status: 'nao_encontrado', dado: null, evidencias: [], red_flags: [] }
            }
        },
        _erro: ultimoErro ? ultimoErro.message : 'Falha desconhecida',
        _versao_prompt: VERSAO_PROMPT_GEMINI,
        _versao_schema: VERSAO_SCHEMA,
        _modelo_usado: 'nenhum'
    };
}

module.exports = { estruturar };
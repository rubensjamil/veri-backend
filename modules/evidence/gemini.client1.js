Microsoft Windows [versão 10.0.19045.6466]
(c) Microsoft Corporation. Todos os direitos reservados.

C:\Users\User>cd Desktop

C:\Users\User\Desktop>cd backend
O sistema não pode encontrar o caminho especificado.

C:\Users\User\Desktop>ce backend
'ce' não é reconhecido como um comando interno
ou externo, um programa operável ou um arquivo em lotes.

C:\Users\User\Desktop>cd backend
O sistema não pode encontrar o caminho especificado.

C:\Users\User\Desktop>cd veri-backend

C:\Users\User\Desktop\veri-backend>cd modules

C:\Users\User\Desktop\veri-backend\modules>cd evidence

C:\Users\User\Desktop\veri-backend\modules\evidence>cd gemini.client1.js
O nome do diretório é inválido.

C:\Users\User\Desktop\veri-backend\modules\evidence>type "C:\Users\User\Desktop\veri-backend\modules\evidence\gemini.client1.js"
// ============================================================
// gemini.client.js - Gemini + DeepSeek (fallback)
// Gemini como principal, DeepSeek como fallback
// Timeout: 90 segundos
// ============================================================

const { GoogleGenAI } = require('@google/genai');

const VERSAO_PROMPT_GEMINI = 'v6';
const VERSAO_SCHEMA = '1.3';

// ============================================================
// PROMPT COMPLETO (v6) ÔÇô usado por ambos os modelos
// ============================================================
const PROMPT_VERI = `
Voc├¬ ├® um estruturador de evid├¬ncias da plataforma VERI.

Tarefa: Organizar os dados brutos recebidos no formato JSON abaixo.

REGRAS:
- Mantenha a estrutura exata do JSON.
- Preencha apenas campos com dados dispon├¡veis.
- Se um dado n├úo existir, use "status": "nao_encontrado" e "dado": null.
- Cada evid├¬ncia deve ter: id, descricao, fonte, url, coletado_em.
- Cada red flag deve ter: id, descricao, fonte, url.

*INSTRU├ç├òES ESPECIAIS:*

1. *CAMPO "site":* Analise os dados brutos (google_search, noticias, reclame_aqui) para encontrar o site oficial da empresa. Se encontrar um dom├¡nio, preencha o campo "site". Se n├úo, deixe como null.

2. *CAMPO "setor":* Analise os dados brutos para identificar o setor de atua├º├úo da empresa (ex: varejo, ind├║stria, servi├ºos, tecnologia, agroneg├│cio). Se n├úo encontrar, deixe como null.

3. *CAMPO "consumidor_gov":* Se houver men├º├Áes ao Consumidor.gov nos dados brutos, organize como evid├¬ncias em "red_flags.consumidor_gov".

4. *CAMPO "sancoes":* Se houver men├º├Áes a san├º├Áes, penalidades ou multas (ex: Cade, Bacen, SUSEP), organize como evid├¬ncias em "red_flags.sancoes".

5. *CAMPO "tendencias":* Se houver informa├º├Áes sobre evolu├º├úo da situa├º├úo (ex: piora ou melhora nas reclama├º├Áes), organize como evid├¬ncia em "red_flags.tendencias".

6. *CAMPO "historico_relacionamento":* Se houver men├º├Áes a relacionamentos anteriores ou hist├│rico de neg├│cios, organize em "comportamental.historico_relacionamento".

FORMATO EXATO DE SA├ìDA:
{
  "status_busca": "sucesso",
  "coletado_em": "2026-07-10T10:00:00",
  "confianca_geral": { "nivel": "alta", "motivo": "Evid├¬ncias encontradas" },
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

// ============================================================
// FUN├ç├âO PARA CHAMAR A DEEPSEEK API
// ============================================================
async function chamarDeepSeek(prompt, timeoutMs) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY n├úo configurada');
    }

    const url = 'https://api.deepseek.com/v1/chat/completions';
    const body = {
        model: 'deepseek-chat', // ou 'deepseek-reasoner'
        messages: [
            { role: 'system', content: 'Voc├¬ ├® um assistente que retorna apenas JSON v├ílido.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.0,
        response_format: { type: 'json_object' }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('DeepSeek API error: ' + response.status + ' - ' + errorText);
        }

        const data = await response.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) {
            throw new Error('DeepSeek resposta vazia');
        }
        return parseGeminiSafe(content);
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

// ============================================================
// FUN├ç├âO PRINCIPAL: estruturar (Gemini + fallback DeepSeek)
// ============================================================
async function estruturar(fontes, timeoutMs) {
    timeoutMs = timeoutMs || 90000; // 90 segundos

    var apiKeyGemini = process.env.GOOGLE_API_KEY;
    var prompt = PROMPT_VERI + '\n\nDADOS BRUTOS (FONTES):\n' + JSON.stringify(fontes, null, 2);

    // ============================================================
    // 1. TENTA GEMINI
    // ============================================================
    if (apiKeyGemini) {
        var modelos = [
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-2.5-pro'
        ];

        var ai = new GoogleGenAI({ apiKey: apiKeyGemini });

        for (var i = 0; i < modelos.length; i++) {
            var modelo = modelos[i];
            try {
                console.log('Tentando Gemini modelo:', modelo);

                var timeoutPromise = new Promise(function(_, reject) {
                    setTimeout(function() { reject(new Error('TIMEOUT_GEMINI')); }, timeoutMs);
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
                estruturado._provedor = 'gemini';

                console.log('Ô£à Gemini usado com sucesso:', modelo);
                return estruturado;

            } catch (error) {
                var erroMsg = error.message || '';
                console.warn('ÔØî Gemini ' + modelo + ' falhou:', erroMsg);
                if (erroMsg.includes('TIMEOUT_GEMINI') || erroMsg.includes('429') || erroMsg.includes('503') || erroMsg.includes('NOT_FOUND')) {
                    continue;
                }
                // Se for outro erro, n├úo tenta os pr├│ximos modelos
                break;
            }
        }
    }

    // ============================================================
    // 2. FALLBACK: DEEPSEEK
    // ============================================================
    try {
        console.log('Tentando DeepSeek como fallback...');
        var resultadoDeepSeek = await chamarDeepSeek(prompt, timeoutMs);
        resultadoDeepSeek._modelo_usado = 'deepseek-chat';
        resultadoDeepSeek._versao_prompt = VERSAO_PROMPT_GEMINI;
        resultadoDeepSeek._versao_schema = VERSAO_SCHEMA;
        resultadoDeepSeek._provedor = 'deepseek';
        console.log('Ô£à DeepSeek usado com sucesso.');
        return resultadoDeepSeek;
    } catch (error) {
        console.warn('ÔØî DeepSeek falhou:', error.message);
    }

    // ============================================================
    // 3. FALLBACK FINAL: ESTRUTURA VAZIA
    // ============================================================
    console.warn('Todos os provedores falharam. Retornando fallback vazio.');
    return {
        status_busca: 'falha',
        coletado_em: new Date().toISOString(),
        confianca_geral: { nivel: 'baixa', motivo: 'Falha em todos os provedores' },
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
        _erro: 'Falha geral',
        _versao_prompt: VERSAO_PROMPT_GEMINI,
        _versao_schema: VERSAO_SCHEMA,
        _modelo_usado: 'nenhum'
    };
}

module.exports = { estruturar };
C:\Users\User\Desktop\veri-backend\modules\evidence>
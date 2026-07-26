// ============================================================
// gemini.client.js - Cliente Gemini com fallback para DeepSeek
// CORRIGIDO: Modelos atualizados para os disponíveis no projeto
// CORRIGIDO: Timeout e AbortController
// CORRIGIDO: Sem caracteres especiais
// ============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const axios = require('axios');

// ============================================================
// MODELOS DISPONIVEIS NO PROJETO
// ============================================================
const MODELOS_GEMINI = [
    'gemini-2.5-flash',       // ✅ Mais rápido e disponível
    'gemini-2.0-flash',       // ✅ Rápido e estável
    'gemini-flash-latest'     // ✅ Última versão do Flash
];

const VERSAO_PROMPT = 'v6';
const VERSAO_SCHEMA = '1.3';
const TIMEOUT_MS = 90000;

// ============================================================
// PROMPT E SCHEMA
// ============================================================
const PROMPT_SISTEMA = `
Voce e a VERI, uma plataforma de analise previa para decisoes de negocios.
Sua funcao e estruturar evidencias coletadas sobre uma empresa ou pessoa em um formato JSON padronizado.

*Formato de saida obrigatorio:*
{
  "status_busca": "sucesso" ou "falha",
  "coletado_em": "ISO timestamp",
  "confianca_geral": {
    "nivel": "alta" | "media" | "baixa",
    "motivo": "texto explicativo"
  },
  "site": "url do site ou null",
  "setor": "setor da empresa ou null",
  "dados_estruturados": {
    "reputacional": {
      "mencoes_midia": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo das mencoes ou null",
        "evidencias": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      },
      "historico_reclamacoes": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      }
    },
    "resolutividade": {
      "reclame_aqui": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      }
    },
    "comportamental": {
      "redes_sociais": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      }
    },
    "saude_financeira": {
      "faturamento": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      }
    },
    "red_flags": {
      "processos_judiciais": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [],
        "red_flags": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      },
      "consumidor_gov": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [],
        "red_flags": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      },
      "sancoes": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [],
        "red_flags": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      },
      "tendencias": {
        "status": "encontrado" | "parcial" | "nao_encontrado",
        "dado": "resumo ou null",
        "evidencias": [],
        "red_flags": [
          { "descricao": "texto", "url": "link", "fonte": "nome" }
        ]
      }
    }
  }
}
`;

// ============================================================
// FUNCAO PRINCIPAL: estruturar
// ============================================================
async function estruturar(fontes, timeoutMs) {
    const timeout = timeoutMs || TIMEOUT_MS;

    if (!fontes || Object.keys(fontes).length === 0) {
        console.warn('Nenhuma fonte fornecida para o Gemini.');
        return criarEstruturaVazia('Nenhuma fonte disponivel');
    }

    const dadosParaPrompt = prepararDadosParaPrompt(fontes);

    for (const modelo of MODELOS_GEMINI) {
        try {
            console.log('Tentando Gemini modelo: ' + modelo);
            const resultado = await tentarGemini(modelo, dadosParaPrompt, timeout);
            if (resultado) {
                console.log('Gemini usado com sucesso: ' + modelo);
                return resultado;
            }
        } catch (err) {
            console.warn('Gemini ' + modelo + ' falhou:', err.message);
        }
    }

    console.log('Tentando DeepSeek como fallback...');
    try {
        const resultadoDeepSeek = await tentarDeepSeek(dadosParaPrompt, timeout);
        if (resultadoDeepSeek) {
            console.log('DeepSeek usado como fallback.');
            return resultadoDeepSeek;
        }
    } catch (err) {
        console.warn('DeepSeek falhou:', err.message);
    }

    console.error('Todos os provedores falharam. Retornando fallback vazio.');
    return criarEstruturaVazia('Falha em todos os provedores');
}

// ============================================================
// FUNCAO: tentar Gemini
// ============================================================
async function tentarGemini(modelo, dados, timeoutMs) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.warn('GOOGLE_API_KEY nao configurada.');
        return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelo,
        generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
        ]
    });

    const prompt = montarPromptCompleto(dados);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const responseText = result.response.text();
        if (!responseText) {
            console.warn('Resposta vazia do Gemini.');
            return null;
        }

        const jsonStr = extrairJSON(responseText);
        if (!jsonStr) {
            console.warn('Nenhum JSON encontrado na resposta do Gemini.');
            return null;
        }

        const parsed = JSON.parse(jsonStr);
        if (!parsed.dados_estruturados) {
            console.warn('Estrutura invalida retornada pelo Gemini.');
            return null;
        }

        parsed.status_busca = 'sucesso';
        parsed.coletado_em = new Date().toISOString();
        parsed._versao_prompt = VERSAO_PROMPT;
        parsed._versao_schema = VERSAO_SCHEMA;
        parsed._modelo_usado = modelo;

        return parsed;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn('Timeout no Gemini (' + timeoutMs + 'ms).');
        } else {
            console.warn('Erro no Gemini:', err.message);
        }
        return null;
    }
}

// ============================================================
// FUNCAO: tentar DeepSeek (fallback)
// ============================================================
async function tentarDeepSeek(dados, timeoutMs) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.warn('DEEPSEEK_API_KEY nao configurada.');
        return null;
    }

    const prompt = montarPromptCompleto(dados);

    try {
        const response = await axios({
            method: 'POST',
            url: 'https://api.deepseek.com/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            data: {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'Voce e um assistente especializado em analise de negocios. Responda apenas com JSON valido.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 8192
            },
            timeout: timeoutMs
        });

        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
            return null;
        }

        const responseText = response.data.choices[0].message.content;
        const jsonStr = extrairJSON(responseText);
        if (!jsonStr) return null;

        const parsed = JSON.parse(jsonStr);
        if (!parsed.dados_estruturados) return null;

        parsed.status_busca = 'sucesso';
        parsed.coletado_em = new Date().toISOString();
        parsed._versao_prompt = VERSAO_PROMPT;
        parsed._versao_schema = VERSAO_SCHEMA;
        parsed._modelo_usado = 'deepseek-chat';

        return parsed;
    } catch (err) {
        console.warn('Erro no DeepSeek:', err.message);
        return null;
    }
}

// ============================================================
// FUNCOES AUXILIARES
// ============================================================

function prepararDadosParaPrompt(fontes) {
    const dados = {};
    
    if (fontes.google_search && fontes.google_search.length > 0) {
        dados.google_search = fontes.google_search.slice(0, 10).map(function(item) {
            return {
                titulo: item.title || '',
                snippet: item.snippet || '',
                link: item.link || ''
            };
        });
    }

    if (fontes.noticias && fontes.noticias.length > 0) {
        dados.noticias = fontes.noticias.slice(0, 10).map(function(item) {
            return {
                titulo: item.title || '',
                snippet: item.snippet || '',
                link: item.link || '',
                data: item.publishedAt || ''
            };
        });
    }

    if (fontes.reclame_aqui && fontes.reclame_aqui.length > 0) {
        dados.reclame_aqui = fontes.reclame_aqui.slice(0, 5).map(function(item) {
            return {
                titulo: item.titulo || item.title || '',
                descricao: item.descricao || item.snippet || '',
                url: item.url || item.link || ''
            };
        });
    }

    if (fontes.processos_judiciais && fontes.processos_judiciais.length > 0) {
        dados.processos_judiciais = fontes.processos_judiciais.slice(0, 10).map(function(item) {
            return {
                titulo: item.titulo || '',
                descricao: item.descricao || '',
                url: item.url || '',
                tribunal: item.tribunal || ''
            };
        });
    }

    if (fontes.protestos && fontes.protestos.length > 0) {
        dados.protestos = fontes.protestos.slice(0, 5).map(function(item) {
            return {
                titulo: item.titulo || '',
                descricao: item.descricao || '',
                url: item.url || ''
            };
        });
    }

    if (fontes.consumidor_gov && fontes.consumidor_gov.length > 0) {
        dados.consumidor_gov = fontes.consumidor_gov.slice(0, 5).map(function(item) {
            return {
                titulo: item.titulo || '',
                descricao: item.descricao || '',
                url: item.url || ''
            };
        });
    }

    return dados;
}

function montarPromptCompleto(dados) {
    const dadosStr = JSON.stringify(dados, null, 2);
    return PROMPT_SISTEMA + '\n\n*Dados coletados para analise:\n' + dadosStr + '\n\nInstrucao final:* Analise os dados acima e produza o JSON estruturado conforme o schema fornecido.';
}

function extrairJSON(texto) {
    var match = texto.match(/json\s*([\s\S]*?)\s*/);
    if (match && match[1]) {
        return match[1].trim();
    }

    var matchBrace = texto.match(/\{[\s\S]*\}/);
    if (matchBrace) {
        return matchBrace[0].trim();
    }

    return null;
}

function criarEstruturaVazia(motivo) {
    return {
        status_busca: 'falha',
        coletado_em: new Date().toISOString(),
        confianca_geral: {
            nivel: 'baixa',
            motivo: motivo || 'Falha geral'
        },
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
        _erro: motivo || 'Falha geral',
        _versao_prompt: VERSAO_PROMPT,
        _versao_schema: VERSAO_SCHEMA,
        _modelo_usado: 'nenhum'
    };
}

module.exports = { estruturar };
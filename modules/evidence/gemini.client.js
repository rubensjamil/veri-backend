// ============================================================
// gemini.client.js - Cliente Gemini com fallback para DeepSeek
// VERSÃO DEFINITIVA - CONSOLIDADA
// ============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const axios = require('axios');

const MODELOS_GEMINI = [
    'gemini-flash-latest'
];

const VERSAO_PROMPT = 'v11';
const VERSAO_SCHEMA = '1.5';
const TIMEOUT_MS = 45000;

const PROMPT_EVIDENCIAS = `
Extraia evidencias relevantes das fontes fornecidas, não busque indefinidamente evidencias, a medida que for encontrando vá entregando sendo no minimo uma e no máximo 3 evidencias, priorize eviencias de fraudes, investigação policial e de investimentos e evidencias de crescimento, melhorias e, ou deterioração de imagem da analisada.

Cada evidencia deve ter:
- titulo (resumo)
- descricao (detalhe)
- tipo (financeira|reputacional|judicial|contratual|protesto|noticia|consumidor)
- criticidade (baixa|media|alta)
- fonte (nome da fonte)
- url (link)
- data (quando aplicavel)

Retorne APENAS JSON no formato:
{
  "evidencias": [...],
  "padroes_risco": [],
  "fontes_consultadas": []
}

Nenhum texto antes ou depois. Apenas JSON.
`;

function extrairJSON(texto) {
    if (!texto) return null;
    texto = texto.trim();

    if (texto.startsWith("json")) {
        texto = texto.replace(/^json\s*/, "");
        texto = texto.replace(/\s*$/, "");
        texto = texto.trim();
    } else if (texto.startsWith("")) {
        texto = texto.replace(/^\s*/, "");
        texto = texto.replace(/\s*$/, "");
        texto = texto.trim();
    }

    let inicio = -1;
    let fim = -1;
    let contador = 0;

    for (let i = 0; i < texto.length; i++) {
        if (texto[i] === '{') {
            if (inicio === -1) inicio = i;
            contador++;
        } else if (texto[i] === '}') {
            contador--;
            if (contador === 0) {
                fim = i;
                break;
            }
        }
    }

    if (inicio === -1 || fim === -1) {
        console.warn("Nenhum JSON encontrado na resposta.");
        return null;
    }

    return texto.substring(inicio, fim + 1);
}

function parseSeguro(texto) {
    if (!texto || typeof texto !== 'string') return null;

    let limpo = texto
        .replace(/^\uFEFF/, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\r\n]+/g, ' ')
        .trim();

    try {
        return JSON.parse(limpo);
    } catch (e) {
        console.warn("Erro no JSON.parse (primeira tentativa):", e.message);

        const extraido = extrairJSON(limpo);
        if (extraido) {
            try {
                return JSON.parse(extraido);
            } catch (e2) {
                console.warn("Erro no JSON.parse (segunda tentativa):", e2.message);
            }
        }

        limpo = limpo.replace(/,\s*}/g, '}');
        limpo = limpo.replace(/,\s*]/g, ']');

        try {
            return JSON.parse(limpo);
        } catch (e3) {
            console.warn("Falha completa no parse.");
            return null;
        }
    }
}

function garantirEstruturaMinima(dados) {
    if (!dados || typeof dados !== 'object') {
        return criarEstruturaVazia('Dados nulos');
    }

    if (!dados.dados_estruturados) {
        dados.dados_estruturados = {
            reputacional: {},
            resolutividade: {},
            comportamental: {},
            saude_financeira: {},
            red_flags: {}
        };
    }

    const secoes = ['reputacional', 'resolutividade', 'comportamental', 'saude_financeira', 'red_flags'];
    for (let i = 0; i < secoes.length; i++) {
        if (!dados.dados_estruturados[secoes[i]]) {
            dados.dados_estruturados[secoes[i]] = {};
        }
    }

    dados.evidencias = dados.evidencias || [];
    dados.padroes_risco = dados.padroes_risco || [];
    dados.fontes_consultadas = dados.fontes_consultadas || [];

    if (dados.evidencias.length > 3) {
        dados.evidencias = dados.evidencias.slice(0, 3);
    }

    if (!dados.status_busca) dados.status_busca = 'sucesso';
    if (!dados.coletado_em) dados.coletado_em = new Date().toISOString();
    if (!dados.confianca_geral) {
        dados.confianca_geral = {
            nivel: 'media',
            motivo: 'Estrutura garantida pelo sistema'
        };
    }

    return dados;
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
            red_flags: {}
        },
        padroes_risco: [],
        evidencias: [],
        fontes_consultadas: [],
        _erro: motivo || 'Falha geral',
        _versao_prompt: VERSAO_PROMPT,
        _versao_schema: VERSAO_SCHEMA,
        _modelo_usado: 'nenhum'
    };
}

async function estruturar(fontes, timeoutMs) {
    const timeout = timeoutMs || TIMEOUT_MS;

    console.log('📊 ORQUESTRADOR -> GEMINI: Fontes recebidas');
    console.log('📊 google_search:', fontes.google_search ? fontes.google_search.length : 0);
    console.log('📊 noticias:', fontes.noticias ? fontes.noticias.length : 0);
    console.log('📊 processos_judiciais:', fontes.processos_judiciais ? fontes.processos_judiciais.length : 0);
    console.log('📊 reclame_aqui:', fontes.reclame_aqui ? fontes.reclame_aqui.length : 0);
    console.log('📊 consumidor_gov:', fontes.consumidor_gov ? fontes.consumidor_gov.length : 0);
    console.log('📊 protestos:', fontes.protestos ? fontes.protestos.length : 0);

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
                return garantirEstruturaMinima(resultado);
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
            return garantirEstruturaMinima(resultadoDeepSeek);
        }
    } catch (err) {
        console.warn('DeepSeek falhou:', err.message);
    }

    console.error('Todos os provedores falharam. Retornando fallback vazio.');
    return criarEstruturaVazia('Falha em todos os provedores');
}

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
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
        ]
    });

    const prompt = montarPromptCompleto(dados);
    console.log("📊 Prompt possui", prompt.length, "caracteres");

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

        console.log("📊 Resposta Gemini:", responseText.length, "caracteres");
        console.log("📊 Resposta Gemini (bruta):", responseText.substring(0, 500));

        const jsonStr = extrairJSON(responseText);
        if (!jsonStr) {
            console.warn('Nenhum JSON encontrado na resposta.');
            console.warn('Resposta completa:', responseText);
            return null;
        }

        console.log("📊 JSON extraído (primeiros 200 caracteres):", jsonStr.substring(0, 200));

        const parsed = parseSeguro(jsonStr);
        if (!parsed) {
            console.warn('Falha ao fazer parse do JSON.');
            console.warn('JSON que falhou:', jsonStr);
            return null;
        }

        parsed.evidencias = parsed.evidencias || [];
        parsed.padroes_risco = parsed.padroes_risco || [];
        parsed.fontes_consultadas = parsed.fontes_consultadas || [];
        parsed.dados_estruturados = parsed.dados_estruturados || {};

        console.log('📊 Gemini retornou', parsed.evidencias.length, 'evidências');

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

async function tentarDeepSeek(dados, timeoutMs) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.warn('DEEPSEEK_API_KEY nao configurada.');
        return null;
    }

    const prompt = montarPromptCompleto(dados);
    console.log("📊 Prompt DeepSeek possui", prompt.length, "caracteres");

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
                    { role: 'system', content: 'Voce e um assistente especializado. Responda apenas com JSON valido, no schema especificado.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 4096
            },
            timeout: timeoutMs
        });

        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
            return null;
        }

        const responseText = response.data.choices[0].message.content;
        console.log("📊 Resposta DeepSeek:", responseText.length, "caracteres");

        const jsonStr = extrairJSON(responseText);
        if (!jsonStr) {
            console.warn('Nenhum JSON encontrado na resposta DeepSeek.');
            console.warn('Resposta DeepSeek completa:', responseText);
            return null;
        }

        console.log("📊 JSON DeepSeek (primeiros 200):", jsonStr.substring(0, 200));

        const parsed = parseSeguro(jsonStr);
        if (!parsed) {
            console.warn('Falha ao fazer parse do JSON DeepSeek.');
            console.warn('JSON DeepSeek que falhou:', jsonStr);
            return null;
        }

        parsed.evidencias = parsed.evidencias || [];
        parsed.padroes_risco = parsed.padroes_risco || [];
        parsed.fontes_consultadas = parsed.fontes_consultadas || [];
        parsed.dados_estruturados = parsed.dados_estruturados || {};

        console.log('📊 DeepSeek retornou', parsed.evidencias.length, 'evidências');

        return parsed;
    } catch (err) {
        console.warn('Erro no DeepSeek:', err.message);
        return null;
    }
}

function prepararDadosParaPrompt(fontes) {
    const dados = {};

    if (fontes.google_search && fontes.google_search.length > 0) {
        dados.google_search = fontes.google_search.slice(0, 3).map(function(item) {
            return {
                titulo: (item.title || '').substring(0, 100),
                snippet: (item.snippet || '').substring(0, 200),
                link: item.link || ''
            };
        });
    }

    if (fontes.noticias && fontes.noticias.length > 0) {
        dados.noticias = fontes.noticias.slice(0, 3).map(function(item) {
            return {
                titulo: (item.title || '').substring(0, 100),
                snippet: (item.snippet || '').substring(0, 200),
                link: item.link || '',
                data: item.publishedAt || ''
            };
        });
    }

    if (fontes.reclame_aqui && fontes.reclame_aqui.length > 0) {
        dados.reclame_aqui = fontes.reclame_aqui.slice(0, 2).map(function(item) {
            return {
                titulo: (item.titulo || item.title || '').substring(0, 100),
                descricao: (item.descricao || item.snippet || '').substring(0, 200),
                url: item.url || item.link || ''
            };
        });
    }

    if (fontes.processos_judiciais && fontes.processos_judiciais.length > 0) {
        dados.processos_judiciais = fontes.processos_judiciais.slice(0, 3).map(function(item) {
            return {
                titulo: (item.titulo || '').substring(0, 100),
                descricao: (item.descricao || '').substring(0, 200),
                url: item.url || '',
                tribunal: item.tribunal || ''
            };
        });
    }

    if (fontes.protestos && fontes.protestos.length > 0) {
        dados.protestos = fontes.protestos.slice(0, 2).map(function(item) {
            return {
                titulo: (item.titulo || '').substring(0, 100),
                descricao: (item.descricao || '').substring(0, 200),
                url: item.url || ''
            };
        });
    }

    if (fontes.consumidor_gov && fontes.consumidor_gov.length > 0) {
        dados.consumidor_gov = fontes.consumidor_gov.slice(0, 2).map(function(item) {
            return {
                titulo: (item.titulo || '').substring(0, 100),
                descricao: (item.descricao || '').substring(0, 200),
                url: item.url || ''
            };
        });
    }

    return dados;
}

function montarPromptCompleto(dados) {
    const dadosStr = JSON.stringify(dados, null, 2);
    return PROMPT_EVIDENCIAS + '\n\n*Dados recebidos do orquestrador:*\n' + dadosStr;
}

module.exports = { estruturar };
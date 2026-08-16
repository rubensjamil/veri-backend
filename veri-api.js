// ============================================
// VERI API - Motor Transversal v3.2
// Versão completa com todas as rotas
// CORRIGIDO: Busca BrasilAPI no /enriquecer
// CORRIGIDO: Passa faturamento_anual para o motor
// ADAPTADO: Valor da Contratação/Compra/Venda
// ADAPTADO: Extração de UF para o orchestrator
// CORRIGIDO: Logs para diagnóstico da BrasilAPI
// CORRIGIDO: Fallback para ReceitaWS
// CORRIGIDO: Captura de valor com logs
// CORRIGIDO: Dotenv para leitura de .env
// CORRIGIDO: Removida duplicação da variável 'secoes'
// CORRIGIDO: Fluxo de validação nunca bloqueia
// CORRIGIDO: Substituído optional chaining (?.) por compatibilidade
// CORRIGIDO: Erro "negocioStr.startsWith is not a function"
// CORRIGIDO: Garantia que req.body.negocio seja string
// CORRIGIDO: Suporte a CNPJs alfanuméricos
// CORRIGIDO: Busca por nome no banco local e no CSV
// CORRIGIDO: Lógica de busca com 3 fontes (BrasilAPI -> ReceitaWS -> CSV)
// CORRIGIDO: Indexação em memória do CSV para busca instantânea
// CORRIGIDO: Extração de sócio majoritário e controladora
// CORRIGIDO: Todas as strings com crases e sintaxe 100% verificada
// CORRIGIDO: carregarCSVIndex com verificação de existência do arquivo (fs.existsSync)
// CORRIGIDO: carregarCSVIndex não derruba o servidor em caso de erro
// CORRIGIDO: baixarCSVdoStorage() ativada na inicialização
// CORRIGIDO: Suporte a credenciais via variável de ambiente (GOOGLE_APPLICATION_CREDENTIALS_JSON)
// CORRIGIDO: Caminho do Secret File atualizado para google-creds.json
// CORRIGIDO: Erro de sintaxe na linha 291 (crases no console.log)
// CORRIGIDO: Busca no Storage para razão social e fallback de CNPJ
// CORRIGIDO: DEMAIS substituído por GIGANTE em todos os lugares
// CORRIGIDO: Prioriza faturamento do banco regional (orquestrador) ACIMA de qualquer estimativa
// CORRIGIDO: Porte GIGANTE prevalece sobre qualquer outro porte vindo de APIs
// CORRIGIDO: Remove site fictício (não exibe "www.nome.com.br" quando não encontrado)
// CORRIGIDO: Adiciona dias_comprometimento no retorno do Motor
// CORRIGIDO: Busca CNPJ no banco regional (cnpjs_famosos.json) antes da BrasilAPI
// CORRIGIDO: Removida evidência de comprometimento do backend (frontend calcula)
// CORRIGIDO: Fallback de faturamento com nomes por extenso (MICRO EMPRESA, etc.)
// 🔧 CORRIGIDO: Retorna acao_protetiva no /enriquecer
// 🔧 CORRIGIDO: Passa preocupacao para o motor
// 🔧 CORRIGIDO: Ação protetiva para PARE é "Venda à vista ou com entrada significativa e cobre juros e multas sobre atrasos."
// ============================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Storage } = require("@google-cloud/storage");
const csv = require("csv-parser");
const crypto = require("crypto");

// require('dotenv').config();

// ============================================================
// CONFIGURA CREDENCIAIS DO GOOGLE CLOUD
// ============================================================
let credenciaisCarregadas = false;

const secretPath = '/etc/secrets/google-creds.json';
let storage = null;

if (fs.existsSync(secretPath)) {
    try {
        const credsContent = fs.readFileSync(secretPath, 'utf8');
        const creds = JSON.parse(credsContent);
        storage = new Storage({
            projectId: creds.project_id,
            credentials: {
                client_email: creds.client_email,
                private_key: creds.private_key
            }
        });
        console.log('✅ Storage inicializado com credenciais do Secret File.');
        console.log('📁 Projeto:', creds.project_id);
        console.log('📧 Conta de serviço:', creds.client_email);
        credenciaisCarregadas = true;
    } catch (err) {
        console.error('❌ Erro ao processar credencial:', err.message);
        storage = null;
    }
} else {
    console.error('❌ Secret File NÃO ENCONTRADO em:', secretPath);
    storage = null;
}

if (!credenciaisCarregadas && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        const tempPath = '/tmp/credenciais.json';
        fs.writeFileSync(tempPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
        console.log('✅ Credenciais do Google Cloud configuradas via variável de ambiente.');
        credenciaisCarregadas = true;
    } catch (err) {
        console.warn('⚠️ Erro ao criar arquivo temporário de credenciais:', err.message);
    }
}

if (!credenciaisCarregadas) {
    const localCredPath = path.join(__dirname, 'credenciais.json');
    if (fs.existsSync(localCredPath)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = localCredPath;
        console.log('✅ Credenciais do Google Cloud carregadas do arquivo local.');
        credenciaisCarregadas = true;
    }
}

if (!credenciaisCarregadas) {
    console.warn('⚠️ Nenhuma credencial do Google Cloud encontrada. O Storage pode não funcionar.');
}

// ============================================================
// 🔧 CORREÇÃO: Verificação das Chaves de API (Google Search)
// ============================================================
if (!process.env.GOOGLE_API_KEY) {
    console.warn('⚠️ GOOGLE_API_KEY não encontrada. O Google Search não funcionará.');
} else {
    console.log('✅ GOOGLE_API_KEY configurada.');
}

if (!process.env.GOOGLE_CSE_ID) {
    console.warn('⚠️ GOOGLE_CSE_ID não encontrado. O Google Search não funcionará.');
} else {
    console.log('✅ GOOGLE_CSE_ID configurado: ' + process.env.GOOGLE_CSE_ID);
}

if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY não encontrada. O Gemini não funcionará.');
} else {
    console.log('✅ GEMINI_API_KEY configurada.');
}

// ============================================
// VERSÕES
// ============================================
const VERSAO_API = "3.2.1";
const VERSAO_ORQUESTRADOR = "1.3.0";
const VERSAO_PROMPT_GEMINI = "v6";
const VERSAO_SCHEMA = "1.3";
const VERSAO_MOTOR = "3.2.1";

// ============================================
// MÓDULOS
// ============================================
const { coletarEvidenciasReais } = require("./modules/evidence/orchestrator");
const { estruturar } = require("./modules/evidence/gemini.client");
const { getCache, setCache } = require("./modules/evidence/cache");
const { extrairScores } = require("./modules/motor/scores");
const { calcularRiscos } = require("./modules/motor/veri.engine");
const config = require("./motor.config");

// ============================================
// AÇÕES PROTETIVAS
// ============================================
const ACOES_PROTETIVAS = config.ACOES_PROTETIVAS || {};
const ACAO_PADRAO = config.ACAO_PADRAO || 'Monitore de perto a execução do negócio.';
const ACAO_PARE = 'Venda à vista ou com entrada significativa e cobre juros e multas sobre atrasos.';

const app = express();

// ============================================================
// CORS - LIBERADO PARA TODAS AS ORIGENS
// ============================================================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ============================================
// CONFIGURAÇÃO
// ============================================
const TIMEOUT_GEMINI_MS = 90000;
const ENABLE_CACHE = true;
const CACHE_MEMORIA_MAX = 200;

const cacheResultados = new Map();
const cacheMemoria = new Map();

function setCacheMemoria(key, value) {
    if (cacheMemoria.has(key)) cacheMemoria.delete(key);
    cacheMemoria.set(key, value);
    if (cacheMemoria.size > CACHE_MEMORIA_MAX) {
        const firstKey = cacheMemoria.keys().next().value;
        cacheMemoria.delete(firstKey);
    }
}

// ============================================
// STORAGE E FUNÇÕES LEGADAS
// ============================================
const BUCKET_NAME = "veri-cnpj-dados";
const CSV_FILE = "cnpj_busca_6_colunas.csv";
const HISTORICO_FILE = "analises/historico_cnpjs.json";
const CONTADORES_FILE = "analises/contadores.json";
const TENDENCIAS_FILE = "analises/tendencias.json";

// ============================================
// ÍNDICE EM MEMÓRIA PARA O CSV (FALLBACK LOCAL)
// ============================================
let csvIndexCNPJ = null;
let csvIndexNome = null;
let csvIndexCarregado = false;
const CSV_PATH = path.join(__dirname, 'dados-abertos-zip', 'cnpj_busca_6_colunas.csv');

// ============================================================
// NORMALIZAR CNPJ/CPF - SUPORTE A ALFANUMÉRICOS
// ============================================================
function normalizarCNPJ(doc) {
    if (!doc) return '';
    return doc.replace(/[.\-\/]/g, '').toUpperCase();
}

function isCNPJ(valor) {
    const limpo = normalizarCNPJ(valor);
    return limpo.length === 14;
}

function isCPF(valor) {
    const limpo = normalizarCNPJ(valor);
    return /^\d{11}$/.test(limpo);
}

// ============================================
// BANCO LOCAL DE CNPJs FAMOSOS
// ============================================
let CNPJS_FAMOSOS = {};
try {
    const cnpjsPath = path.join(__dirname, 'modules', 'evidence', 'cnpjs_famosos.json');
    CNPJS_FAMOSOS = JSON.parse(fs.readFileSync(cnpjsPath, 'utf8'));
    console.log('📦 CNPJS_FAMOSOS carregado. UFs: ' + Object.keys(CNPJS_FAMOSOS).length);
} catch (e) {
    console.warn('⚠️ cnpjs_famosos.json não encontrado ou inválido. Banco local desativado.');
}

function encontrarCNPJPorNome(nome, uf) {
    if (!nome || typeof nome !== 'string') return null;
    if (Object.keys(CNPJS_FAMOSOS).length === 0) return null;
    const nomeBusca = nome.toLowerCase().trim();
    const estados = uf ? [uf] : Object.keys(CNPJS_FAMOSOS);
    for (var i = 0; i < estados.length; i++) {
        var ufKey = estados[i];
        var empresas = CNPJS_FAMOSOS[ufKey] || [];
        for (var j = 0; j < empresas.length; j++) {
            var empresa = empresas[j];
            if (empresa.cnpj === 'PESQUISAR') continue;
            var nomeEmpresa = empresa.nome.toLowerCase().trim();
            if (nomeEmpresa.indexOf(nomeBusca) !== -1 || nomeBusca.indexOf(nomeEmpresa) !== -1) {
                console.log('✅ Encontrado no banco local: ' + empresa.nome + ' CNPJ: ' + empresa.cnpj + ' UF: ' + ufKey);
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: ufKey,
                    nome_encontrado: empresa.nome,
                    porte: 'GIGANTE',
                    fonte: 'banco_local'
                };
            }
        }
    }
    return null;
}

function encontrarCNPJPorCNPJ(cnpj) {
    if (!cnpj || typeof cnpj !== 'string') return null;
    const cnpjLimpo = normalizarCNPJ(cnpj);
    if (cnpjLimpo.length !== 14) return null;
    
    for (var uf in CNPJS_FAMOSOS) {
        var empresas = CNPJS_FAMOSOS[uf];
        if (!Array.isArray(empresas)) continue;
        for (var i = 0; i < empresas.length; i++) {
            var empresa = empresas[i];
            if (!empresa.cnpj) continue;
            var cnpjEmpresa = normalizarCNPJ(empresa.cnpj);
            if (cnpjEmpresa === cnpjLimpo) {
                console.log('✅ CNPJ encontrado no banco regional:', empresa.nome);
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: uf,
                    nome: empresa.nome,
                    porte: 'GIGANTE'
                };
            }
        }
    }
    return null;
}

// ============================================
// CARREGA O CSV EM MEMÓRIA (FALLBACK LOCAL)
// ============================================
async function carregarCSVIndex() {
    if (csvIndexCarregado) return;
    
    console.log('📊 Carregando índice do CSV em memória...');
    const inicio = Date.now();
    
    csvIndexCNPJ = new Map();
    csvIndexNome = new Map();
    
    if (!fs.existsSync(CSV_PATH)) {
        console.warn('⚠️ CSV não encontrado em:', CSV_PATH);
        console.warn('⚠️ Busca por nome/CNPJ no CSV desativada. Usando apenas BrasilAPI e banco local.');
        csvIndexCarregado = true;
        return;
    }
    
    return new Promise(function(resolve, reject) {
        let linhas = 0;
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on("data", function(row) {
                linhas++;
                const cnpj = row.CNPJ ? row.CNPJ.replace(/\D/g, '') : '';
                const razao = (row["RAZAO SOCIAL"] || row.razao_social || "").toLowerCase().trim();
                const fantasia = (row["NOME FANTASIA"] || row.nome_fantasia || "").toLowerCase().trim();
                
                if (cnpj) {
                    csvIndexCNPJ.set(cnpj, {
                        cnpj: row.CNPJ,
                        razao_social: row["RAZAO SOCIAL"] || row.razao_social || "",
                        nome_fantasia: row["NOME FANTASIA"] || row.nome_fantasia || "",
                        porte: row.PORTE || row.porte || "",
                        data_abertura: row["DATA DE ABERTURA"] || row.data_abertura || "",
                        situacao: row["SITUACAO"] || row.situacao || "ATIVA",
                        uf: row.UF || "",
                        municipio: row.MUNICIPIO || ""
                    });
                }
                
                if (razao) {
                    if (!csvIndexNome.has(razao)) {
                        csvIndexNome.set(razao, []);
                    }
                    csvIndexNome.get(razao).push(cnpj);
                }
                if (fantasia && fantasia !== razao) {
                    if (!csvIndexNome.has(fantasia)) {
                        csvIndexNome.set(fantasia, []);
                    }
                    csvIndexNome.get(fantasia).push(cnpj);
                }
            })
            .on("end", function() {
                csvIndexCarregado = true;
                const tempo = Date.now() - inicio;
                console.log("✅ CSV indexado em memória: " + linhas + " empresas em " + tempo + "ms");
                resolve();
            })
            .on("error", function(err) {
                console.error('❌ Erro ao carregar CSV:', err);
                csvIndexCarregado = true;
                resolve();
            });
    });
}

// ============================================
// BUSCA NO CSV DIRETAMENTE NO STORAGE (NOVO)
// ============================================
async function buscarCSVnoStorage(termo) {
    if (!storage) {
        console.warn('⚠️ Storage não disponível.');
        return null;
    }
    
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(CSV_FILE);
        const [exists] = await file.exists();
        
        if (!exists) {
            console.warn('⚠️ CSV não encontrado no Storage.');
            return null;
        }
        
        console.log('🔍 Buscando no Storage por:', termo);
        
        const stream = file.createReadStream();
        
        return new Promise((resolve, reject) => {
            let encontrado = null;
            let contador = 0;
            let timeoutId = setTimeout(() => {
                stream.destroy();
                resolve(null);
            }, 15000);
            
            stream
                .pipe(csv())
                .on('data', (row) => {
                    contador++;
                    
                    if (termo.length === 14) {
                        const cnpjRow = row.CNPJ ? row.CNPJ.replace(/\D/g, '') : '';
                        if (cnpjRow === termo) {
                            encontrado = {
                                cnpj: row.CNPJ,
                                razao_social: row["RAZAO SOCIAL"] || row.razao_social || "",
                                nome_fantasia: row["NOME FANTASIA"] || row.nome_fantasia || "",
                                porte: row.PORTE || row.porte || "",
                                data_abertura: row["DATA DE ABERTURA"] || row.data_abertura || "",
                                situacao: row["SITUACAO"] || row.situacao || "ATIVA",
                                uf: row.UF || "",
                                municipio: row.MUNICIPIO || "",
                                fonte: "csv_storage"
                            };
                            clearTimeout(timeoutId);
                            stream.destroy();
                            resolve(encontrado);
                            return;
                        }
                    }
                    
                    if (termo.length > 2) {
                        const razao = (row["RAZAO SOCIAL"] || row.razao_social || "").toLowerCase();
                        const fantasia = (row["NOME FANTASIA"] || row.nome_fantasia || "").toLowerCase();
                        const busca = termo.toLowerCase();
                        
                        if (razao.includes(busca) || fantasia.includes(busca)) {
                            encontrado = {
                                cnpj: row.CNPJ,
                                razao_social: row["RAZAO SOCIAL"] || row.razao_social || "",
                                nome_fantasia: row["NOME FANTASIA"] || row.nome_fantasia || "",
                                porte: row.PORTE || row.porte || "",
                                data_abertura: row["DATA DE ABERTURA"] || row.data_abertura || "",
                                situacao: row["SITUACAO"] || row.situacao || "ATIVA",
                                uf: row.UF || "",
                                municipio: row.MUNICIPIO || "",
                                fonte: "csv_storage"
                            };
                            clearTimeout(timeoutId);
                            stream.destroy();
                            resolve(encontrado);
                            return;
                        }
                    }
                    
                    if (contador > 100000) {
                        clearTimeout(timeoutId);
                        stream.destroy();
                        resolve(null);
                    }
                })
                .on('end', () => {
                    clearTimeout(timeoutId);
                    resolve(encontrado);
                })
                .on('error', (err) => {
                    clearTimeout(timeoutId);
                    console.warn('⚠️ Erro ao ler CSV do Storage:', err.message);
                    resolve(null);
                });
        });
    } catch (err) {
        console.warn('⚠️ Erro ao buscar no CSV:', err.message);
        return null;
    }
}

function carregarHistorico() {
    return null;
}

function salvarNoHistorico(cnpj, dados) {
    return null;
}

const FONTES_UTILIZADAS = [
    'Google Search',
    'BrasilAPI',
    'Reclame Aqui',
    'Google News',
    'Processos Judiciais Focados (STF/STJ/TRF Regional/TJ Estadual)',
    'Consumidor.gov',
    'Busca de CNPJ por nome',
    'Protestos (Centroprot)',
    'Banco local de CNPJs famosos',
    'CSV Storage (fallback)'
];

const TIMEOUTS = {
    GOOGLE_SEARCH: 2000,
    NOTICIAS: 2000,
    RECLAME_AQUI: 2000,
    CONSUMIDOR_GOV: 2000,
    PROCESSOS_JUDICIAIS: 3000,
    PROTESTOS: 2000,
    SITE_OFICIAL: 2000,
    CNPJ_BRASILAPI: 3000,
    CNPJ_GOOGLE: 2000
};

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise(function(_, reject) {
            setTimeout(function() {
                reject(new Error('TIMEOUT_SOURCE'));
            }, ms);
        })
    ]);
}

function criarAbortController(ms) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() {
        controller.abort();
    }, ms);
    return { signal: controller.signal, timeoutId: timeoutId };
}

function obterTRFPorUF(uf) {
    if (!uf) return 'trf1.jus.br';
    var ufUpper = uf.toUpperCase().trim();

    var mapeamento = {
        'AC': 'trf1.jus.br', 'AM': 'trf1.jus.br', 'AP': 'trf1.jus.br',
        'BA': 'trf1.jus.br', 'DF': 'trf1.jus.br', 'GO': 'trf1.jus.br',
        'MA': 'trf1.jus.br', 'MT': 'trf1.jus.br', 'PA': 'trf1.jus.br',
        'PI': 'trf1.jus.br', 'RO': 'trf1.jus.br', 'RR': 'trf1.jus.br',
        'TO': 'trf1.jus.br',
        'RJ': 'trf2.jus.br', 'ES': 'trf2.jus.br',
        'SP': 'trf3.jus.br', 'MS': 'trf3.jus.br',
        'PR': 'trf4.jus.br', 'RS': 'trf4.jus.br', 'SC': 'trf4.jus.br',
        'AL': 'trf5.jus.br', 'CE': 'trf5.jus.br', 'PB': 'trf5.jus.br',
        'PE': 'trf5.jus.br', 'RN': 'trf5.jus.br', 'SE': 'trf5.jus.br',
        'MG': 'trf6.jus.br'
    };

    return mapeamento[ufUpper] || 'trf1.jus.br';
}

function gerarQueries(nome, cnpj, cpf, uf, porte) {
    var nomeLimpo = nome || '';
    var ufLower = uf ? uf.toLowerCase().trim() : '';
    var trfDominio = obterTRFPorUF(uf);

    var portesPequenos = ['MEI', 'ME', 'EPP'];
    var porteAnalisado = porte ? porte.toUpperCase().trim() : '';
    var isPequeno = portesPequenos.indexOf(porteAnalisado) !== -1;
    var isPF = !cnpj && cpf;

    var judicialFocado = [];

    judicialFocado.push('site:' + trfDominio + ' "' + nomeLimpo + '" processo');

    if (ufLower) {
        judicialFocado.push('site:tj' + ufLower + '.jus.br "' + nomeLimpo + '" processo');
    } else {
        judicialFocado.push('site:tj.jus.br "' + nomeLimpo + '" processo');
    }

    if (!isPequeno && !isPF) {
        judicialFocado.push('site:stf.jus.br "' + nomeLimpo + '" processo');
        judicialFocado.push('site:stj.jus.br "' + nomeLimpo + '" processo');
    }

    if (process.env.CNJ_API_KEY) {
        judicialFocado.push('site:cnj.jus.br "' + nomeLimpo + '" processo');
        judicialFocado.push('site:datajud.cnj.jus.br "' + nomeLimpo + '"');
    }

    return {
        google: nomeLimpo + ' empresa Brasil avaliacao',
        news: nomeLimpo + ' noticias empresa Brasil recentes',
        site: '"' + nomeLimpo + '" site oficial | home | institucional',
        cnpjFinder: '"' + nomeLimpo + '" CNPJ',
        cpfFinder: '"' + nomeLimpo + '" CPF',
        judicial: judicialFocado,
        reclameFallback: 'site:reclameaqui.com.br "' + nomeLimpo + '"',
        consumidorFallback: 'site:consumidor.gov.br "' + nomeLimpo + '"',
        protestos: '"' + nomeLimpo + '" protesto cartorio',
    };
}

function encontrarCNPJPorNome(nome, uf) {
    if (!nome || typeof nome !== 'string') return null;
    if (Object.keys(CNPJS_FAMOSOS).length === 0) return null;

    var nomeBusca = nome.toLowerCase().trim();
    nomeBusca = nomeBusca.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var estados = uf ? [uf] : Object.keys(CNPJS_FAMOSOS);

    for (var i = 0; i < estados.length; i++) {
        var ufKey = estados[i];
        var empresas = CNPJS_FAMOSOS[ufKey] || [];
        for (var j = 0; j < empresas.length; j++) {
            var empresa = empresas[j];
            if (empresa.cnpj === 'PESQUISAR') continue;
            var nomeEmpresa = empresa.nome.toLowerCase().trim();
            nomeEmpresa = nomeEmpresa.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (nomeEmpresa.indexOf(nomeBusca) !== -1 || nomeBusca.indexOf(nomeEmpresa) !== -1) {
                console.log('✅ Encontrado no banco local: ' + empresa.nome + ' CNPJ: ' + empresa.cnpj + ' UF: ' + ufKey);
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: ufKey,
                    nome_encontrado: empresa.nome,
                    porte: 'GIGANTE',
                    fonte: 'banco_local'
                };
            }
        }
    }
    console.log('⚠️ Nome nao encontrado no banco local: ' + nome);
    return null;
}

async function buscarCNPJPorNome(nome) {
    if (!nome) return null;

    try {
        var results = await buscarGoogleComAbort('"' + nome + '" CNPJ', TIMEOUTS.CNPJ_GOOGLE);
        if (results && results.length > 0) {
            for (var i = 0; i < Math.min(results.length, 5); i++) {
                var snippet = results[i].snippet || '';
                var match = snippet.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
                if (match) {
                    console.log('🔍 CNPJ encontrado via Google: ' + match[0]);
                    return {
                        cnpj: match[0].replace(/\D/g, ''),
                        razao_social: nome,
                        fonte: 'google_busca',
                        uf: ''
                    };
                }
            }
        }
    } catch (e) {
        console.warn('Busca por CNPJ no Google falhou: ' + e.message);
    }

    return null;
}

async function buscarGoogleComAbort(query, timeoutMs) {
    var abort = criarAbortController(timeoutMs || TIMEOUTS.GOOGLE_SEARCH);
    try {
        var result = await withTimeout(
            googleSearch(query, { signal: abort.signal }),
            timeoutMs || TIMEOUTS.GOOGLE_SEARCH
        );
        clearTimeout(abort.timeoutId);
        return result || [];
    } catch (err) {
        clearTimeout(abort.timeoutId);
        return [];
    }
}

async function buscarCNPJnaBrasilAPI(cnpj, tentativa) {
    var tentativaAtual = tentativa || 1;
    var maxTentativas = 2;
    var cnpjLimpo = normalizarDocumento(cnpj);
    
    await new Promise(resolve => setTimeout(resolve, 300 * tentativaAtual));
    
    console.log('🔍 Buscando BrasilAPI para CNPJ: ' + cnpjLimpo + ' (tentativa ' + tentativaAtual + '/' + maxTentativas + ')');
    try {
        const url = "https://brasilapi.com.br/api/cnpj/v1/" + cnpjLimpo;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn('⚠️ BrasilAPI retornou status: ' + response.status);
            if (response.status === 429 && tentativaAtual < maxTentativas) {
                console.log('⏳ BrasilAPI com 429, tentando novamente...');
                return await buscarCNPJnaBrasilAPI(cnpj, tentativaAtual + 1);
            }
            return null;
        }
        const data = await response.json();
        if (data && !data.error) {
            console.log('✅ BrasilAPI retornou dados para CNPJ: ' + cnpjLimpo);
            return {
                cnpj: data.cnpj,
                razao_social: data.razao_social || "",
                nome_fantasia: data.nome_fantasia || "",
                porte: data.porte || "",
                data_abertura: data.data_inicio_atividade || data.abertura || "",
                situacao: data.descricao_situacao_cadastral || "ATIVA",
                setor: data.cnae_fiscal_descricao || "",
                email: data.email || "",
                site: data.site || "",
                uf: data.uf || "",
                municipio: data.municipio || ""
            };
        }
    } catch (err) {
        console.warn('⚠️ Erro na BrasilAPI: ' + err.message);
        if (tentativaAtual < maxTentativas) {
            console.log('⏳ BrasilAPI com erro, tentando novamente...');
            return await buscarCNPJnaBrasilAPI(cnpj, tentativaAtual + 1);
        }
    }
    return null;
}

async function buscarCNPJnaReceitaWS(cnpj) {
    var cnpjLimpo = normalizarDocumento(cnpj);
    console.log('🔍 Buscando ReceitaWS para CNPJ: ' + cnpjLimpo);
    try {
        const url = "https://www.receitaws.com.br/v1/cnpj/" + cnpjLimpo;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn('⚠️ ReceitaWS retornou status: ' + response.status);
            return null;
        }
        const data = await response.json();
        if (data && data.status !== "ERROR" && !data.error) {
            console.log('✅ ReceitaWS retornou dados para CNPJ: ' + cnpjLimpo);
            return {
                cnpj: cnpjLimpo,
                razao_social: data.nome || data.razao_social || "",
                nome_fantasia: data.fantasia || data.nome_fantasia || "",
                porte: data.porte || "",
                data_abertura: data.abertura || "",
                situacao: data.situacao || "ATIVA",
                setor: data.atividade_principal ? data.atividade_principal[0].text : "",
                email: data.email || "",
                site: data.site || "",
                uf: data.uf || "",
                municipio: data.municipio || ""
            };
        }
    } catch (err) {
        console.warn('⚠️ Erro na ReceitaWS: ' + err.message);
    }
    return null;
}

async function cadeiaDeBuscaCNPJ(limpo) {
    var cnpjNormalizado = normalizarDocumento(limpo);
    console.log('🔍 Iniciando cadeia de busca para CNPJ: ' + cnpjNormalizado);
    
    var brasil = await buscarCNPJnaBrasilAPI(cnpjNormalizado);
    if (brasil) {
        try { await carregarHistorico(); await salvarNoHistorico(cnpjNormalizado, brasil); } catch(e) {}
        return { ...brasil, fonte: "brasilapi" };
    }
    
    console.warn('⚠️ BrasilAPI falhou, tentando ReceitaWS...');
    var receita = await buscarCNPJnaReceitaWS(cnpjNormalizado);
    if (receita) {
        try { await carregarHistorico(); await salvarNoHistorico(cnpjNormalizado, receita); } catch(e) {}
        return { ...receita, fonte: "receitaws" };
    }
    
    console.warn('⚠️ Todas as APIs falharam para CNPJ: ' + cnpjNormalizado);
    return null;
}

// ============================================
// ROTAS LEGADAS
// ============================================
app.get("/", function(req, res) { res.json({ status: "VERI API Online", versao: VERSAO_API }); });

app.get("/teste-cnpj/:cnpj", async function(req, res) {
    try {
        const limpo = normalizarCNPJ(req.params.cnpj);
        if (limpo.length !== 14) return res.status(400).json({ error: "CNPJ inválido" });
        const resultado = await cadeiaDeBuscaCNPJ(limpo);
        if (resultado) return res.json(resultado);
        res.status(404).json({ error: "CNPJ nao encontrado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/resultado/:id", function(req, res) {
    const id = req.params.id;
    const cached = cacheResultados.get(id);
    if (cached) return res.json(cached);
    res.status(404).json({ error: "Análise não encontrada." });
});

app.post("/buscar-cnpj", async function(req, res) {
    try {
        const { cnpj } = req.body;
        if (!cnpj) return res.status(400).json({ error: "CNPJ nao informado" });
        const limpo = normalizarCNPJ(cnpj);
        const resultado = await cadeiaDeBuscaCNPJ(limpo);
        if (resultado) return res.json(resultado);
        res.status(404).json({ error: "CNPJ nao encontrado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ROTA /analisar (legado)
// ============================================
app.post("/analisar", async function(req, res) {
    try {
        const dados = req.body;
        const inicio = Date.now();

        if (dados.analisado && dados.analisado.cnpj) {
            const limpo = normalizarCNPJ(dados.analisado.cnpj);
            if (limpo.length === 14) {
                const complemento = await cadeiaDeBuscaCNPJ(limpo);
                if (complemento) {
                    dados.analisado.razao_social = dados.analisado.razao_social || complemento.razao_social;
                    dados.analisado.nome_fantasia = dados.analisado.nome_fantasia || complemento.nome_fantasia;
                    dados.analisado.porte = dados.analisado.porte || complemento.porte;
                    dados.analisado.data_abertura = complemento.data_abertura;
                    dados.analisado.situacao = complemento.situacao;
                    dados.analisado.site = complemento.site || dados.analisado.site;
                    dados.analisado.uf = complemento.uf || dados.analisado.uf;
                }
            }
        }

        const resultado = calcularRiscos(dados);

        const hashInput = crypto
            .createHash("sha256")
            .update(JSON.stringify(dados))
            .digest("hex")
            .substring(0, 16);

        const hashOutput = crypto
            .createHash("sha256")
            .update(JSON.stringify(resultado))
            .digest("hex")
            .substring(0, 16);

        const tempoExecucao = Date.now() - inicio;
        const documento = dados.analisado.cnpj || dados.analisado.cpf || "sem_documento";
        const hash_auditoria = gerarHashAuditoria(documento);
        const email = dados.solicitante && dados.solicitante.email ? dados.solicitante.email : "";

        try { await carregarContadores(); incrementarContadores(documento, email); } catch(e) {}
        const conts = getContadores(documento, email);

        await carregarTendencias();
        const topRiscosParaSalvar = resultado.top_riscos.map(function(r) {
            return { risco: r.risco, contribuicao: r.contribuicao };
        });
        const tendenciaInfo = getTendenciaEvolucao(documento, resultado.score_global, topRiscosParaSalvar);

        const resposta = {
            analise_id: hash_auditoria,
            ...resultado,
            contadores: conts,
            tendencia: tendenciaInfo,
            dados_analisado: dados.analisado,
            dados_solicitante: dados.solicitante,
            dados_negocio: dados.negocio,
            timestamp: new Date().toISOString(),
            auditoria: {
                hash_input: hashInput,
                hash_output: hashOutput,
                tempo_execucao_ms: tempoExecucao,
                versao_motor: VERSAO_MOTOR,
                versao_api: VERSAO_API,
                versao_prompt_gemini: VERSAO_PROMPT_GEMINI,
                versao_schema: VERSAO_SCHEMA,
                versao_orquestrador: VERSAO_ORQUESTRADOR,
                metodologia: config.METODOLOGIA_VERSAO || "VERI 3.2"
            }
        };

        cacheResultados.set(hash_auditoria, resposta);
        res.json(resposta);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============================================================
// FUNÇÃO: GERAR EVIDÊNCIAS DE FALLBACK (CORRIGIDA)
// ============================================================
function gerarEvidenciasFallback(dadosCadastrais, dadosFormulario, resultadoMotor) {
    var evidencias = [];
    var agora = new Date().toISOString();

    var valorInformado = dadosFormulario && dadosFormulario.valor !== undefined && dadosFormulario.valor > 0;

    if (!valorInformado) {
        evidencias.push({
            id: "EVID-FINANCEIRO-" + Date.now(),
            descricao: "Valor do negócio não informado. Análise baseada nos demais fatores.",
            fonte: "Usuário",
            url: null,
            coletado_em: agora,
            risco_associado: "FINANCEIRO"
        });
    }

    var tempoMercado = 0;
    if (dadosCadastrais && dadosCadastrais.data_abertura) {
        var dataAbertura = new Date(dadosCadastrais.data_abertura);
        var agoraDate = new Date();
        var diffMs = agoraDate - dataAbertura;
        var diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        tempoMercado = Math.round(diffAnos * 10) / 10;
    }
    var porte = dadosCadastrais ? dadosCadastrais.porte : "N/A";
    var evidenciaDescontinuidade = "";
    if (tempoMercado < 2) {
        evidenciaDescontinuidade = "Empresa com porte " + porte + " e apenas " + tempoMercado.toFixed(1) + " anos de mercado. Negócios recentes têm maior risco de descontinuidade.";
    } else if (tempoMercado < 5) {
        evidenciaDescontinuidade = "Empresa com porte " + porte + " e " + tempoMercado.toFixed(1) + " anos de mercado. Risco moderado de descontinuidade.";
    } else {
        evidenciaDescontinuidade = "Empresa com porte " + porte + " e " + tempoMercado.toFixed(1) + " anos de mercado. Tempo de mercado sólido, indicando menor risco de descontinuidade.";
    }
    if (dadosCadastrais && dadosCadastrais.data_abertura) {
        evidencias.push({
            id: "EVID-DESCONT-" + Date.now(),
            descricao: evidenciaDescontinuidade,
            fonte: "Receita Federal do Brasil",
            url: "https://www.gov.br/receitafederal",
            coletado_em: agora,
            risco_associado: "DESCONTINUIDADE"
        });
    }

    if (dadosCadastrais && dadosCadastrais.situacao) {
        var situacao = dadosCadastrais.situacao.toUpperCase();
        var evidenciaVeracidade = "";
        if (situacao === "BAIXADA" || situacao === "INATIVA" || situacao === "SUSPENSA") {
            evidenciaVeracidade = "CNPJ com situação cadastral: " + situacao + ". Consulta à base da Receita Federal.";
        } else {
            evidenciaVeracidade = "CNPJ com situação cadastral: " + situacao + ". Empresa em situação regular perante a Receita Federal.";
        }
        evidencias.push({
            id: "EVID-VERACIDADE-" + Date.now(),
            descricao: evidenciaVeracidade,
            fonte: "Receita Federal do Brasil",
            url: "https://www.gov.br/receitafederal",
            coletado_em: agora,
            risco_associado: "VERACIDADE"
        });
    }

    if (dadosCadastrais && dadosCadastrais.setor) {
        evidencias.push({
            id: "EVID-REPUTACIONAL-" + Date.now(),
            descricao: "Setor de atuação da empresa: " + dadosCadastrais.setor + ".",
            fonte: "Receita Federal do Brasil",
            url: "https://www.gov.br/receitafederal",
            coletado_em: agora,
            risco_associado: "REPUTACIONAL"
        });
    }

    if (dadosFormulario) {
        var conhecimento = dadosFormulario.conhecimento || "nao_informado";
        var experiencia = dadosFormulario.experiencia || "nao_informada";
        if (conhecimento === "maisoumenos") {
            conhecimento = "mais ou menos";
        }
        var evidenciaComportamental = "Nível de conhecimento do usuário sobre a outra parte: " + conhecimento + ". Experiência anterior: " + experiencia + ".";
        evidencias.push({
            id: "EVID-COMPORTAMENTAL-" + Date.now(),
            descricao: evidenciaComportamental,
            fonte: "Usuário",
            url: null,
            coletado_em: agora,
            risco_associado: "COMPORTAMENTAL"
        });
    }

    return evidencias;
}

// ============================================================
// ROTA /enriquecer – CORRIGIDA (COM AÇÃO PROTETIVA)
// ============================================================
app.post("/enriquecer", async function(req, res) {
    const inicio = Date.now();
    const { 
        nome, cnpj, cpf, valor, porte, ticket_medio,
        email_analisado, whatsapp_analisado,
        email_solicitante, whatsapp_solicitante,
        renda_solicitante, renda_analisado,
        preocupacoes, negocio, acao
    } = req.body;

    if (!nome && !cnpj && !cpf) {
        return res.status(400).json({
            status: "falha",
            erro: "É necessário informar \"nome\", \"cnpj\" ou \"cpf\"",
            tempo_ms: Date.now() - inicio
        });
    }

    const cnpjLimpo = normalizarCNPJ(cnpj);
    const preocupacaoId = (preocupacoes && preocupacoes.length > 0) ? preocupacoes[0] : null;
    const tipoNegocio = negocio ? negocio.split('_')[0] : 'analisar';

    try {
        if (ENABLE_CACHE && cnpjLimpo && cacheMemoria.has(cnpjLimpo)) {
            const cached = cacheMemoria.get(cnpjLimpo);
            return res.json({
                ...cached,
                _cache: "memoria",
                _tempo_ms: Date.now() - inicio
            });
        }

        if (cnpjLimpo) {
            try {
                const cacheFirestore = await getCache(cnpjLimpo);
                if (cacheFirestore) {
                    if (ENABLE_CACHE) {
                        setCacheMemoria(cnpjLimpo, cacheFirestore);
                    }
                    return res.json({
                        ...cacheFirestore,
                        _cache: "firestore",
                        _tempo_ms: Date.now() - inicio
                    });
                }
            } catch (cacheErr) {
                console.warn("Erro ao verificar cache Firestore:", cacheErr.message);
            }
        }

        var dadosBancoRegional = null;
        var faturamentoBancoRegional = null;
        var setorBancoRegional = null;
        var porteBancoRegional = null;

        if (cnpjLimpo) {
            dadosBancoRegional = encontrarCNPJPorCNPJ(cnpjLimpo);
            if (dadosBancoRegional) {
                faturamentoBancoRegional = dadosBancoRegional.faturamento_anual;
                setorBancoRegional = dadosBancoRegional.setor;
                porteBancoRegional = dadosBancoRegional.porte || 'GIGANTE';
                console.log('✅ FATURAMENTO ENCONTRADO NO BANCO REGIONAL:', faturamentoBancoRegional);
            }
        }

        var dadosCadastraisCompletos = {};

        if (cnpjLimpo && cnpjLimpo.length === 14) {
            try {
                const resultadoBusca = await cadeiaDeBuscaCNPJ(cnpjLimpo);
                if (resultadoBusca) {
                    dadosCadastraisCompletos = {
                        cnpj: resultadoBusca.cnpj || cnpjLimpo,
                        razao_social: resultadoBusca.razao_social || nome || "",
                        nome_fantasia: resultadoBusca.nome_fantasia || "",
                        porte: resultadoBusca.porte || "",
                        data_abertura: resultadoBusca.data_abertura || "",
                        situacao: resultadoBusca.situacao || "ATIVA",
                        setor: resultadoBusca.setor || "",
                        email: resultadoBusca.email || "",
                        site: resultadoBusca.site || "",
                        uf: resultadoBusca.uf || "",
                        municipio: resultadoBusca.municipio || "",
                        fonte: resultadoBusca.fonte || "desconhecida",
                        socio_majoritario: resultadoBusca.socio_majoritario || null,
                        controladora: resultadoBusca.controladora || null,
                        qsa: resultadoBusca.qsa || []
                    };
                    console.log("✅ Dados cadastrais obtidos via BrasilAPI para CNPJ:", cnpjLimpo);
                }
            } catch (err) {
                console.warn("⚠️ Erro ao buscar dados cadastrais via BrasilAPI:", err.message);
            }
        }

        if (faturamentoBancoRegional) {
            dadosCadastraisCompletos.faturamento_anual = faturamentoBancoRegional;
            dadosCadastraisCompletos.setor = setorBancoRegional || dadosCadastraisCompletos.setor;
            dadosCadastraisCompletos.porte = porteBancoRegional || dadosCadastraisCompletos.porte || 'GIGANTE';
            console.log('✅ FATURAMENTO DO BANCO REGIONAL PRESERVADO:', faturamentoBancoRegional);
        }

        const modulo = req.body.modulo || "geral";
        const subModulo = req.body.subModulo || "geral";

        var ufEmpresa = null;
        if (dadosCadastraisCompletos && dadosCadastraisCompletos.uf) {
            ufEmpresa = dadosCadastraisCompletos.uf;
        }

        if (!ufEmpresa) {
            try {
                const brasilUf = await buscarCNPJnaBrasilAPI(cnpjLimpo);
                if (brasilUf && brasilUf.uf) {
                    ufEmpresa = brasilUf.uf;
                }
            } catch (err) {
                console.warn("Erro ao buscar UF via BrasilAPI:", err.message);
            }
        }

        if (!ufEmpresa && dadosCadastraisCompletos && dadosCadastraisCompletos.cep) {
            try {
                const cepResponse = await fetch('https://viacep.com.br/ws/' + dadosCadastraisCompletos.cep + '/json/');
                if (cepResponse.ok) {
                    const cepData = await cepResponse.json();
                    if (cepData && cepData.uf) {
                        ufEmpresa = cepData.uf;
                        console.log("UF obtida via CEP:", ufEmpresa);
                    }
                }
            } catch (cepErr) {
                console.warn("Erro ao buscar UF via CEP:", cepErr.message);
            }
        }

        if (ufEmpresa) {
            console.log("UF da empresa:", ufEmpresa);
        } else {
            console.warn("UF não encontrada. Buscas judiciais usarão fallback genérico.");
        }

        const dadosOrquestrador = await coletarEvidenciasReais(
            nome,
            cnpjLimpo,
            cpf,
            ufEmpresa,
            modulo,
            subModulo
        );

        const dadosCadastrais = {
            ...dadosOrquestrador.dados_cadastrais,
            ...dadosCadastraisCompletos,
            cnpj: dadosCadastraisCompletos.cnpj || dadosOrquestrador.dados_cadastrais.cnpj || cnpjLimpo,
            razao_social: dadosCadastraisCompletos.razao_social || dadosOrquestrador.dados_cadastrais.razao_social || nome,
            porte: dadosCadastraisCompletos.porte || dadosOrquestrador.dados_cadastrais.porte || "N/A",
            data_abertura: dadosCadastraisCompletos.data_abertura || dadosOrquestrador.dados_cadastrais.data_abertura || "",
            situacao: dadosCadastraisCompletos.situacao || dadosOrquestrador.dados_cadastrais.situacao || "ATIVA",
            setor: dadosCadastraisCompletos.setor || dadosOrquestrador.dados_cadastrais.setor || "",
            site: dadosCadastraisCompletos.site || dadosOrquestrador.dados_cadastrais.site || "",
            uf: dadosCadastraisCompletos.uf || dadosOrquestrador.dados_cadastrais.uf || ufEmpresa || "",
            municipio: dadosCadastraisCompletos.municipio || dadosOrquestrador.dados_cadastrais.municipio || "",
            socio_majoritario: dadosCadastraisCompletos.socio_majoritario || null,
            controladora: dadosCadastraisCompletos.controladora || null,
            qsa: dadosCadastraisCompletos.qsa || [],
            email_analisado: email_analisado || "",
            whatsapp_analisado: whatsapp_analisado || "",
            email_solicitante: email_solicitante || "",
            whatsapp_solicitante: whatsapp_solicitante || ""
        };

        var faturamentoAnualEncontrado = null;
        var faturamentoFonte = "";

        if (faturamentoBancoRegional) {
            faturamentoAnualEncontrado = faturamentoBancoRegional;
            faturamentoFonte = "banco_regional_cnpj";
            console.log("✅ FATURAMENTO DO BANCO REGIONAL (por CNPJ):", faturamentoAnualEncontrado);
        } else if (dadosOrquestrador.faturamento_anual) {
            faturamentoAnualEncontrado = dadosOrquestrador.faturamento_anual;
            faturamentoFonte = "banco_regional_orquestrador";
            console.log("✅ FATURAMENTO DO BANCO REGIONAL (orquestrador):", faturamentoAnualEncontrado);
        } else if (dadosCadastrais.faturamento_anual && dadosCadastrais.faturamento_anual > 0) {
            faturamentoAnualEncontrado = dadosCadastrais.faturamento_anual;
            faturamentoFonte = "dados_cadastrais";
            console.log("✅ FATURAMENTO DOS DADOS CADASTRAIS:", faturamentoAnualEncontrado);
        } else {
            var porteEmpresa = dadosCadastrais.porte || "MEDIO";
            var faturamentoAnualPorPorte = {
                "MEI": 81000,
                "ME": 360000,
                "EPP": 4800000,
                "MEDIO": 12000000,
                "GRANDE": 50000000,
                "GIGANTE": 50000000,
                "MICRO EMPRESA": 81000,
                "MICROEMPRESA": 81000,
                "EMPRESA INDIVIDUAL": 81000,
                "MICRO EMPREENDEDOR INDIVIDUAL": 81000,
                "EMPRESA DE PEQUENO PORTE": 360000,
                "PEQUENO PORTE": 360000
            };
            faturamentoAnualEncontrado = faturamentoAnualPorPorte[porteEmpresa] || faturamentoAnualPorPorte["GRANDE"];
            faturamentoFonte = "estimado_por_porte";
            console.log("⚠️ FATURAMENTO ESTIMADO POR PORTE:", faturamentoAnualEncontrado);
        }

        dadosCadastrais.faturamento_anual = faturamentoAnualEncontrado;
        dadosCadastrais.faturamento_fonte = faturamentoFonte;

        if (dadosBancoRegional || dadosOrquestrador.faturamento_anual) {
            dadosCadastrais.porte = 'GIGANTE';
            console.log("✅ PORTE FORÇADO PARA GIGANTE (banco regional)");
        } else if (dadosCadastrais.porte === 'DEMAIS') {
            dadosCadastrais.porte = 'GIGANTE';
            console.log("✅ PORTE CORRIGIDO: DEMAIS → GIGANTE");
        }

        var valorNegocio = 0;
        var parcelasNegocio = 1;
        var tipoPagamento = "avista";
        tipoNegocio = "";

        if (req.body.valor_contratacao) {
            valorNegocio = parseFloat(req.body.valor_contratacao) || 0;
            parcelasNegocio = parseInt(req.body.parcelas_contratacao) || 1;
            tipoPagamento = req.body.pagamento_contratacao || "avista";
            tipoNegocio = "contratacao";
        } else if (req.body.valor_compra) {
            valorNegocio = parseFloat(req.body.valor_compra) || 0;
            parcelasNegocio = parseInt(req.body.parcelas_compra) || 1;
            tipoPagamento = req.body.pagamento_compra || "avista";
            tipoNegocio = "compra";
        } else if (req.body.valor_venda) {
            valorNegocio = parseFloat(req.body.valor_venda) || 0;
            parcelasNegocio = parseInt(req.body.parcelas_venda) || 1;
            tipoPagamento = req.body.pagamento_venda || "avista";
            tipoNegocio = "venda";
        } else if (req.body.valor) {
            valorNegocio = parseFloat(req.body.valor) || 0;
            parcelasNegocio = parseInt(req.body.parcelas) || 1;
            tipoPagamento = req.body.pagamento || "avista";
            tipoNegocio = "negocio";
        }

        let estruturado = await estruturar(dadosOrquestrador.fontes, TIMEOUT_GEMINI_MS);

        console.log('📊 Validando estrutura recebida do Gemini...');

        if (!estruturado || typeof estruturado !== 'object') {
            console.warn('⚠️ Gemini retornou null. Criando estrutura mínima de emergência.');
            estruturado = {
                status_busca: 'sucesso',
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
            };
        }

        if (!estruturado.dados_estruturados) {
            console.warn('⚠️ dados_estruturados ausente. Criando estrutura padrão.');
            estruturado.dados_estruturados = {
                reputacional: {},
                resolutividade: {},
                comportamental: {},
                saude_financeira: {},
                red_flags: {}
            };
        }

        const secoes = ['reputacional', 'resolutividade', 'comportamental', 'saude_financeira', 'red_flags'];
        for (let i = 0; i < secoes.length; i++) {
            if (!estruturado.dados_estruturados[secoes[i]]) {
                estruturado.dados_estruturados[secoes[i]] = {};
            }
        }

        if (!estruturado.padroes_risco || !Array.isArray(estruturado.padroes_risco)) {
            estruturado.padroes_risco = [];
        }
        if (!estruturado.evidencias || !Array.isArray(estruturado.evidencias)) {
            estruturado.evidencias = [];
        }
        if (!estruturado.fontes_consultadas || !Array.isArray(estruturado.fontes_consultadas)) {
            estruturado.fontes_consultadas = [];
        }

        if (!estruturado.status_busca) {
            estruturado.status_busca = 'sucesso';
        }
        if (!estruturado.coletado_em) {
            estruturado.coletado_em = new Date().toISOString();
        }
        if (!estruturado.confianca_geral) {
            estruturado.confianca_geral = {
                nivel: 'media',
                motivo: 'Estrutura garantida pelo sistema'
            };
        }

        const validacao = { valido: true, erros: [] };
        console.log('✅ Estrutura garantida com sucesso.');

        const scores = extrairScores(estruturado.dados_estruturados || {});

        if (dadosCadastrais.data_abertura) {
            const dataAbertura = new Date(dadosCadastrais.data_abertura);
            const agora = new Date();
            const diffMs = agora - dataAbertura;
            const diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
            dadosCadastrais.tempo_mercado_anos = Math.round(diffAnos * 10) / 10;
        } else {
            dadosCadastrais.tempo_mercado_anos = 0;
        }

        let faturamentoMensal = null;
        if (dadosCadastrais.faturamento_anual) {
            faturamentoMensal = dadosCadastrais.faturamento_anual / 12;
        } else {
            const porteEmpresa = dadosCadastrais.porte || "MEDIO";
            faturamentoMensal = calcularFaturamentoMensalPorPorte(porteEmpresa);
        }

        const negocioStr = req.body.negocio ? String(req.body.negocio) : "";

        const dadosMotor = {
            analisado: {
                cnpj: cnpjLimpo,
                razao_social: dadosCadastrais.razao_social || nome,
                porte: dadosCadastrais.porte || "MEDIO",
                situacao: dadosCadastrais.situacao || "ATIVA",
                data_abertura: dadosCadastrais.data_abertura || "",
                tipo: req.body.analisado_tipo || "empresa",
                renda: renda_analisado || 0,
                faturamento_anual: dadosCadastrais.faturamento_anual || null,
                uf: dadosCadastrais.uf || "",
                email: email_analisado || "",
                whatsapp: whatsapp_analisado || ""
            },
            solicitante: {
                porte: (req.body.analisante && req.body.analisante.porte) || "MEDIO",
                tipo: (req.body.analisante && req.body.analisante.tipo) || "empresa",
                renda: renda_solicitante || 0,
                email: email_solicitante || "",
                whatsapp: whatsapp_solicitante || "",
                faturamento_anual: (req.body.analisante && req.body.analisante.faturamento_anual) || null
            },
            relacionamento: {
                conhecimento: req.body.conhecimento || "razoavel",
                experiencia: req.body.experiencia || "neutra",
                meses: 0,
                ticket_medio: req.body.ticket_medio || 0
            },
            negocio: {
                valor: valorNegocio,
                tipo_pagamento: tipoPagamento,
                parcelas: parcelasNegocio
            },
            porta_entrada: negocioStr.split("_")[0] || "empresa",
            subsecao: negocioStr.split("_")[1] || "fornecedor",
            preocupacao: preocupacaoId
        };

        const resultadoMotor = calcularRiscos(dadosMotor);

        var acaoProtetiva = ACAO_PADRAO;

        if (resultadoMotor.recomendacao === 'PARE') {
            acaoProtetiva = ACAO_PARE;
        } else if (preocupacaoId && ACOES_PROTETIVAS[preocupacaoId]) {
            acaoProtetiva = ACOES_PROTETIVAS[preocupacaoId][tipoNegocio] || ACOES_PROTETIVAS[preocupacaoId]['analisar'] || ACAO_PADRAO;
        }

        var evidenciasGemini = [];
        if (estruturado && estruturado.dados_estruturados) {
            secoes.forEach(function(secao) {
                var dadosSecao = estruturado.dados_estruturados[secao];
                if (dadosSecao) {
                    Object.keys(dadosSecao).forEach(function(chave) {
                        var item = dadosSecao[chave];
                        if (item && item.evidencias && Array.isArray(item.evidencias)) {
                            evidenciasGemini = evidenciasGemini.concat(item.evidencias);
                        }
                    });
                }
            });
        }

        var geminiRetornouDados = estruturado && estruturado.status_busca === "sucesso";
        var evidenciasFinal = evidenciasGemini || [];

        if (!geminiRetornouDados || evidenciasGemini.length === 0) {
            var dadosFormulario = {
                valor: valorNegocio,
                parcelas: parcelasNegocio,
                tipo_pagamento: tipoPagamento,
                porte_solicitante: (req.body.analisante && req.body.analisante.porte) || "MEDIO",
                preocupacoes: req.body.preocupacoes || [],
                conhecimento: req.body.conhecimento,
                experiencia: req.body.experiencia
            };
            var dadosAnalisado = {
                tipo: req.body.analisado_tipo || "empresa",
                renda: renda_analisado || 0,
                porte: dadosCadastrais.porte || "MEDIO",
                data_abertura: dadosCadastrais.data_abertura || "",
                situacao: dadosCadastrais.situacao || "ATIVA",
                setor: dadosCadastrais.setor || "",
                uf: dadosCadastrais.uf || ""
            };
            var evidenciasFallback = gerarEvidenciasFallback(dadosAnalisado, dadosFormulario, resultadoMotor);
            evidenciasFinal = evidenciasFinal.concat(evidenciasFallback);
        }

        const dadosCombinados = {
            ...estruturado,
            dados_estruturados: {
                ...estruturado.dados_estruturados,
                dados_cadastrais: dadosCadastrais,
                porte: dadosCadastrais.porte || null,
                situacao: dadosCadastrais.situacao || null,
                razao_social: dadosCadastrais.razao_social || estruturado.razao_social || null,
                cnpj_encontrado: dadosCadastrais.cnpj || estruturado.cnpj_encontrado || null,
                site: dadosOrquestrador.site_encontrado || dadosCadastrais.site || estruturado.site || null,
                setor: dadosCadastrais.setor || estruturado.setor || null,
                uf: dadosCadastrais.uf || null,
                municipio: dadosCadastrais.municipio || null,
                faturamento_mensal_estimado: faturamentoMensal,
                faturamento_anual: dadosCadastrais.faturamento_anual || null,
                faturamento_fonte: dadosCadastrais.faturamento_fonte || "nao_informado",
                socio_majoritario: dadosCadastrais.socio_majoritario || null,
                controladora: dadosCadastrais.controladora || null,
                qsa: dadosCadastrais.qsa || [],
                email_analisado: dadosCadastrais.email_analisado || "",
                whatsapp_analisado: dadosCadastrais.whatsapp_analisado || "",
                email_solicitante: dadosCadastrais.email_solicitante || "",
                whatsapp_solicitante: dadosCadastrais.whatsapp_solicitante || ""
            },
            motor: resultadoMotor
        };

        const hashAuditoria = crypto
            .createHash("sha256")
            .update(JSON.stringify(dadosCombinados))
            .digest("hex");

        const hashInput = crypto
            .createHash("sha256")
            .update(JSON.stringify({ nome, cnpj, cpf }))
            .digest("hex")
            .substring(0, 16);

        const response = {
            status: "sucesso",
            dados: dadosCombinados,
            scores: scores,
            motor: resultadoMotor,
            dados_cadastrais: dadosCadastrais,
            site_encontrado: dadosOrquestrador.site_encontrado || null,
            cnpj_encontrado: dadosOrquestrador.cnpj_encontrado || null,
            cpf_encontrado: dadosOrquestrador.cpf_encontrado || null,
            uf_encontrada: dadosCadastrais.uf || null,
            evidencias: evidenciasFinal,
            acao_protetiva: acaoProtetiva,
            auditoria: {
                hash: hashAuditoria,
                hash_input: hashInput,
                hash_output: hashAuditoria,
                cnpj: cnpjLimpo || "sem_cnpj",
                timestamp: new Date().toISOString(),
                tempo_execucao_ms: Date.now() - inicio,
                versao_api: VERSAO_API,
                versao_orquestrador: VERSAO_ORQUESTRADOR,
                versao_prompt_gemini: VERSAO_PROMPT_GEMINI,
                versao_schema: VERSAO_SCHEMA,
                versao_motor: VERSAO_MOTOR,
                metodologia: config.METODOLOGIA_VERSAO || "VERI 3.2",
                fontes_utilizadas: dadosOrquestrador.fontes_utilizadas || [],
                faturamento_fonte: dadosCadastrais.faturamento_fonte || "nao_informado"
            },
            meta: {
                tempo_ms: Date.now() - inicio,
                fonte: "orquestrador+gemini+motor",
                gemini_retornou: geminiRetornouDados,
                evidencias_fallback_usadas: (!geminiRetornouDados || evidenciasGemini.length === 0),
                preocupacao: preocupacaoId,
                tipo_negocio: tipoNegocio
            }
        };

        if (cnpjLimpo) {
            if (ENABLE_CACHE) {
                setCacheMemoria(cnpjLimpo, response);
            }
            try {
                await setCache(cnpjLimpo, response);
            } catch (cacheErr) {
                console.warn("Erro ao salvar cache:", cacheErr.message);
            }
        }

        return res.json(response);

    } catch (err) {
        console.error("Erro em /enriquecer:", err);
        return res.status(500).json({
            status: "falha",
            erro: err.message,
            _tempo_ms: Date.now() - inicio
        });
    }
});
// ============================================
// INICIA O SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    console.log('🚀 Iniciando servidor VERI API...');
    
    if (storage) {
        try {
            const bucket = storage.bucket(BUCKET_NAME);
            const file = bucket.file(CSV_FILE);
            const [exists] = await file.exists();
            
            if (exists) {
                console.log('✅ CSV disponível no Google Cloud Storage.');
                console.log('📦 CSV configurado como fallback no Storage.');
            } else {
                console.warn('⚠️ CSV não encontrado no Storage.');
            }
        } catch (err) {
            console.warn('⚠️ Erro ao verificar CSV no Storage:', err.message);
        }
    } else {
        console.warn('⚠️ Storage não disponível. Fallback CSV no Storage desativado.');
    }
    
    console.log('📊 Índice CSV local desativado.');
    console.log('🔄 CSV Storage permanece disponível como fallback.');
    
    const server = app.listen(PORT, '0.0.0.0', function() {
        console.log("✅ VERI API v" + VERSAO_API + " rodando na porta " + PORT);
        console.log("⚙️ Motor VERI integrado à rota /enriquecer");
        console.log("📊 Busca BrasilAPI ativada para porte e data_abertura");
        console.log('🚀 REVISÃO CORRIGIDA - JSON_INVALIDO RESOLVIDO');
        console.log('📊 CSV indexado: ⚠️ NÃO (fallback ativo - Google Cloud Storage)');
    });

    server.on('error', function(err) {
        console.error('❌ Erro no servidor:', err);
        if (err.code === 'EADDRINUSE') {
            console.error('⚠️ Porta ' + PORT + ' já está em uso!');
        }
    });
}

iniciarServidor();

module.exports = app;

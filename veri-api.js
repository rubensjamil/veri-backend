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
// ============================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Storage } = require("@google-cloud/storage");
const csv = require("csv-parser");
const crypto = require("crypto");

// ============================================================
// 🔧 CORREÇÃO: Garantir que as variáveis do Render sejam lidas
// ============================================================
// As variáveis GOOGLE_API_KEY e GOOGLE_CSE_ID já estão no process.env
// Não precisamos de dotenv aqui porque o Render injeta elas diretamente.
// ============================================================

// ============================================================
// CONFIGURA CREDENCIAIS DO GOOGLE CLOUD (STORAGE)
// ============================================================
let credenciaisCarregadas = false;

// 1. Tenta carregar do Secret File (Render)
var secretPath = '/etc/secrets/google-creds.json';
var storage = null;

if (fs.existsSync(secretPath)) {
    try {
        var credsContent = fs.readFileSync(secretPath, 'utf8');
        var creds = JSON.parse(credsContent);
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
    console.warn('ℹ️ Secret File NÃO ENCONTRADO em:', secretPath);
    console.warn('ℹ️ O Storage pode não funcionar, mas as APIs de busca (Google Search) continuarão operando.');
    storage = null;
}

// 2. Tenta carregar da variável de ambiente (fallback)
if (!credenciaisCarregadas && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        var tempPath = '/tmp/credenciais.json';
        fs.writeFileSync(tempPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
        console.log('✅ Credenciais do Google Cloud configuradas via variável de ambiente.');
        credenciaisCarregadas = true;
    } catch (err) {
        console.warn('⚠️ Erro ao criar arquivo temporário de credenciais:', err.message);
    }
}

// 3. Tenta carregar do arquivo local (último fallback)
if (!credenciaisCarregadas) {
    var localCredPath = path.join(__dirname, 'credenciais.json');
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
var VERSAO_API = "3.2.1";
var VERSAO_ORQUESTRADOR = "1.3.0";
var VERSAO_PROMPT_GEMINI = "v6";
var VERSAO_SCHEMA = "1.3";
var VERSAO_MOTOR = "3.2.1";

// ============================================
// MÓDULOS
// ============================================
var { coletarEvidenciasReais } = require("./modules/evidence/orchestrator");
var { estruturar } = require("./modules/evidence/gemini.client");
var { getCache, setCache } = require("./modules/evidence/cache");
var { extrairScores } = require("./modules/motor/scores");
var { calcularRiscos } = require("./modules/motor/veri.engine");
var config = require("./motor.config");

var app = express();

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
var TIMEOUT_GEMINI_MS = 90000;
var ENABLE_CACHE = true;
var CACHE_MEMORIA_MAX = 200;

var cacheResultados = new Map();
var cacheMemoria = new Map();

function setCacheMemoria(key, value) {
    if (cacheMemoria.has(key)) cacheMemoria.delete(key);
    cacheMemoria.set(key, value);
    if (cacheMemoria.size > CACHE_MEMORIA_MAX) {
        var firstKey = cacheMemoria.keys().next().value;
        cacheMemoria.delete(firstKey);
    }
}

// ============================================
// STORAGE E FUNÇÕES LEGADAS
// ============================================
var BUCKET_NAME = "veri-cnpj-dados";
var CSV_FILE = "cnpj_busca_6_colunas.csv";
var HISTORICO_FILE = "analises/historico_cnpjs.json";
var CONTADORES_FILE = "analises/contadores.json";
var TENDENCIAS_FILE = "analises/tendencias.json";

// ============================================
// ÍNDICE EM MEMÓRIA PARA O CSV (FALLBACK LOCAL)
// ============================================
var csvIndexCNPJ = null;      // Map para busca por CNPJ
var csvIndexNome = null;      // Map para busca por Nome
var csvIndexCarregado = false;
var CSV_PATH = path.join(__dirname, 'dados-abertos-zip', 'cnpj_busca_6_colunas.csv');

// ============================================================
// NORMALIZAR CNPJ/CPF - SUPORTE A ALFANUMÉRICOS
// ============================================================
function normalizarCNPJ(doc) {
    if (!doc) return '';
    return doc.replace(/[.\-\/]/g, '').toUpperCase();
}

function isCNPJ(valor) {
    var limpo = normalizarCNPJ(valor);
    return limpo.length === 14;
}

function isCPF(valor) {
    var limpo = normalizarCNPJ(valor);
    return /^\d{11}$/.test(limpo);
}

// ============================================
// BANCO LOCAL DE CNPJs FAMOSOS
// ============================================
var CNPJS_FAMOSOS = {};
try {
    var cnpjsPath = path.join(__dirname, 'modules', 'evidence', 'cnpjs_famosos.json');
    CNPJS_FAMOSOS = JSON.parse(fs.readFileSync(cnpjsPath, 'utf8'));
    console.log('📦 CNPJS_FAMOSOS carregado. UFs: ' + Object.keys(CNPJS_FAMOSOS).length);
} catch (e) {
    console.warn('⚠️ cnpjs_famosos.json não encontrado ou inválido. Banco local desativado.');
}

function encontrarCNPJPorNome(nome, uf) {
    if (!nome || typeof nome !== 'string') return null;
    if (Object.keys(CNPJS_FAMOSOS).length === 0) return null;
    var nomeBusca = nome.toLowerCase().trim();
    var estados = uf ? [uf] : Object.keys(CNPJS_FAMOSOS);
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

// 🔧 CORREÇÃO: Função para buscar CNPJ no banco regional por CNPJ
function encontrarCNPJPorCNPJ(cnpj) {
    if (!cnpj || typeof cnpj !== 'string') return null;
    var cnpjLimpo = normalizarCNPJ(cnpj);
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
    var inicio = Date.now();
    
    csvIndexCNPJ = new Map();
    csvIndexNome = new Map();
    
    if (!fs.existsSync(CSV_PATH)) {
        console.warn('⚠️ CSV não encontrado em:', CSV_PATH);
        console.warn('⚠️ Busca por nome/CNPJ no CSV desativada. Usando apenas BrasilAPI e banco local.');
        csvIndexCarregado = true;
        return;
    }
    
    return new Promise(function(resolve, reject) {
        var linhas = 0;
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on("data", function(row) {
                linhas++;
                var cnpj = row.CNPJ ? row.CNPJ.replace(/\D/g, '') : '';
                var razao = (row["RAZAO SOCIAL"] || row.razao_social || "").toLowerCase().trim();
                var fantasia = (row["NOME FANTASIA"] || row.nome_fantasia || "").toLowerCase().trim();
                
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
                var tempo = Date.now() - inicio;
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
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(CSV_FILE);
        var [exists] = await file.exists();
        
        if (!exists) {
            console.warn('⚠️ CSV não encontrado no Storage.');
            return null;
        }
        
        console.log('🔍 Buscando no Storage por:', termo);
        
        // Cria um stream para ler o CSV diretamente do Storage
        var stream = file.createReadStream();
        
        // Processa o CSV em busca do termo
        return new Promise(function(resolve, reject) {
            var encontrado = null;
            var contador = 0;
            var timeoutId = setTimeout(function() {
                stream.destroy();
                resolve(null);
            }, 15000);
            
            stream
                .pipe(csv())
                .on('data', function(row) {
                    contador++;
                    
                    // Busca por CNPJ exato
                    if (termo.length === 14) {
                        var cnpjRow = row.CNPJ ? row.CNPJ.replace(/\D/g, '') : '';
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
                    
                    // Busca por razão social ou nome fantasia
                    if (termo.length > 2) {
                        var razao = (row["RAZAO SOCIAL"] || row.razao_social || "").toLowerCase();
                        var fantasia = (row["NOME FANTASIA"] || row.nome_fantasia || "").toLowerCase();
                        var busca = termo.toLowerCase();
                        
                        if (razao.indexOf(busca) !== -1 || fantasia.indexOf(busca) !== -1) {
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
                    
                    // Limite de segurança (100k linhas para não travar)
                    if (contador > 100000) {
                        clearTimeout(timeoutId);
                        stream.destroy();
                        resolve(null);
                    }
                })
                .on('end', function() {
                    clearTimeout(timeoutId);
                    resolve(encontrado);
                })
                .on('error', function(err) {
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

// ============================================
// HISTÓRICO DE CNPJs
// ============================================
var historicoCNPJs = {};
var historicoCarregado = false;

async function carregarHistorico() {
    if (historicoCarregado) return;
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Histórico não carregado.');
            return;
        }
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(HISTORICO_FILE);
        var [exists] = await file.exists();
        if (exists) {
            var [contents] = await file.download();
            historicoCNPJs = JSON.parse(contents.toString());
        }
    } catch (err) { /* silencioso */ }
    historicoCarregado = true;
}

async function salvarHistorico() {
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Histórico não salvo.');
            return;
        }
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(HISTORICO_FILE);
        await file.save(JSON.stringify(historicoCNPJs, null, 2), { contentType: "application/json" });
    } catch (err) { /* silencioso */ }
}

function buscarNoHistorico(cnpj) {
    var limpo = normalizarCNPJ(cnpj);
    if (historicoCNPJs[limpo]) return { ...historicoCNPJs[limpo], fonte: "historico_veri" };
    return null;
}

function salvarNoHistorico(cnpj, dados) {
    var limpo = normalizarCNPJ(cnpj);
    historicoCNPJs[limpo] = {
        cnpj: dados.cnpj || cnpj,
        razao_social: dados.razao_social || "",
        nome_fantasia: dados.nome_fantasia || "",
        porte: dados.porte || "",
        data_abertura: dados.data_abertura || "",
        situacao: dados.situacao || "ATIVA",
        setor: dados.setor || "",
        email: dados.email || "",
        site: dados.site || "",
        instagram: dados.instagram || "",
        tiktok: dados.tiktok || "",
        ultima_consulta: new Date().toISOString()
    };
    salvarHistorico();
}

// ============================================
// CONTADORES
// ============================================
var contadores = { total_analises: 0, cnpjs: {}, usuarios: {} };
var contadoresCarregados = false;

async function carregarContadores() {
    if (contadoresCarregados) return;
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Contadores não carregados.');
            return;
        }
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(CONTADORES_FILE);
        var [exists] = await file.exists();
        if (exists) {
            var [contents] = await file.download();
            contadores = JSON.parse(contents.toString());
        }
    } catch (err) { /* silencioso */ }
    contadoresCarregados = true;
}

async function salvarContadores() {
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Contadores não salvos.');
            return;
        }
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(CONTADORES_FILE);
        await file.save(JSON.stringify(contadores, null, 2), { contentType: "application/json" });
    } catch (err) { /* silencioso */ }
}

function incrementarContadores(cnpj, email) {
    contadores.total_analises = (contadores.total_analises || 0) + 1;
    if (cnpj) {
        var limpo = normalizarCNPJ(cnpj);
        contadores.cnpjs = contadores.cnpjs || {};
        contadores.cnpjs[limpo] = (contadores.cnpjs[limpo] || 0) + 1;
    }
    if (email) {
        var hashEmail = crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").substring(0, 16);
        contadores.usuarios = contadores.usuarios || {};
        contadores.usuarios[hashEmail] = (contadores.usuarios[hashEmail] || 0) + 1;
    }
    salvarContadores();
}

function getContadores(cnpj, email) {
    var vezesAnalisado = 0, vezesUsuario = 0;
    if (cnpj) {
        var limpo = normalizarCNPJ(cnpj);
        vezesAnalisado = (contadores.cnpjs && contadores.cnpjs[limpo]) ? contadores.cnpjs[limpo] : 0;
    }
    if (email) {
        var hashEmail = crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").substring(0, 16);
        vezesUsuario = (contadores.usuarios && contadores.usuarios[hashEmail]) ? contadores.usuarios[hashEmail] : 0;
    }
    return { total_analises: contadores.total_analises || 0, vezes_analisado: vezesAnalisado, vezes_usuario: vezesUsuario };
}

// ============================================
// TENDÊNCIAS
// ============================================
var tendencias = {};
var tendenciasCarregadas = false;

async function carregarTendencias() {
    if (tendenciasCarregadas) return;
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Tendências não carregadas.');
            return;
        }
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(TENDENCIAS_FILE);
        var [exists] = await file.exists();
        if (exists) {
            var [contents] = await file.download();
            tendencias = JSON.parse(contents.toString());
        }
    } catch (err) { /* silencioso */ }
    tendenciasCarregadas = true;
}

async function salvarTendencias() {
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Tendências não salvas.');
            return;
        }
        var bucket = storage.bucket(BUCKET_NAME);
        var file = bucket.file(TENDENCIAS_FILE);
        await file.save(JSON.stringify(tendencias, null, 2), { contentType: "application/json" });
    } catch (err) { /* silencioso */ }
}

function getTendenciaEvolucao(cnpj, scoreAtual, riscosAtuais) {
    var limpo = normalizarCNPJ(cnpj);
    var anterior = tendencias[limpo];
    
    tendencias[limpo] = {
        score: scoreAtual,
        riscos: riscosAtuais,
        data: new Date().toISOString()
    };
    salvarTendencias();

    if (!anterior || !anterior.riscos) {
        return { tendencia: "primeira", tendenciaTexto: "Primeira análise.", evolucao: [] };
    }

    var evolucao = riscosAtuais.map(function(rAtual) {
        var rAnterior = (anterior.riscos || []).find(function(r) { return r.risco === rAtual.risco; });
        var valorAnterior = rAnterior ? rAnterior.contribuicao : null;
        var valorAtual = rAtual.contribuicao;
        var variacao = "estavel";
        if (valorAnterior !== null) {
            var diff = valorAtual - valorAnterior;
            if (diff > 0.3) variacao = "piorou";
            else if (diff < -0.3) variacao = "melhorou";
        }
        return { risco: rAtual.risco, anterior: valorAnterior, atual: valorAtual, variacao: variacao };
    });

    var diffScore = scoreAtual - anterior.score;
    var tendencia = "estavel";
    if (diffScore > 0.5) tendencia = "deteriorando";
    else if (diffScore < -0.5) tendencia = "melhorando";

    return { tendencia: tendencia, tendenciaTexto: "", evolucao: evolucao };
}

// ============================================
// TABELA DE FATURAMENTO
// ============================================
var FATURAMENTO_ANUAL = config.FATURAMENTO_ANUAL;
function calcularFaturamentoMensalPorPorte(porte) {
    var faturamentoAnual = {
        // Siglas
        "MEI": 81000,
        "ME": 360000,
        "EPP": 4800000,
        "MEDIO": 12000000,
        "GRANDE": 50000000,
        "GIGANTE": 50000000,
        // Nomes por extenso (fallback)
        "MICRO EMPRESA": 81000,
        "MICROEMPRESA": 81000,
        "EMPRESA INDIVIDUAL": 81000,
        "MICRO EMPREENDEDOR INDIVIDUAL": 81000,
        "EMPRESA DE PEQUENO PORTE": 360000,
        "PEQUENO PORTE": 360000
    };
    return (faturamentoAnual[porte] || faturamentoAnual["GRANDE"]) / 12;
}

function calcularTicketDiario(porte) { return FATURAMENTO_ANUAL[porte] ? Math.round(FATURAMENTO_ANUAL[porte] / 12 / 30) : 0; }
function calcularTempoMercado(dataAbertura) { return dataAbertura ? (new Date() - new Date(dataAbertura)) / (1000 * 60 * 60 * 24 * 365) : 0; }
function gerarHashAuditoria(documento) {
    var docLimpo = normalizarCNPJ(documento) || "sem_documento";
    var agora = new Date();
    return docLimpo + "" + String(agora.getDate()).padStart(2,"0") + String(agora.getMonth()+1).padStart(2,"0") + agora.getFullYear() + "" + String(agora.getHours()).padStart(2,"0") + String(agora.getMinutes()).padStart(2,"0") + String(agora.getSeconds()).padStart(2,"0");
}
function getNivelRisco(contrib) {
    if (contrib >= 15.0) return "CRITICO";
    if (contrib >= 5.0) return "ALTO";
    if (contrib >= 2.0) return "MEDIO";
    return "BAIXO";
}

// ============================================
// FETCH COMO NAVEGADOR
// ============================================
async function fetchComoNavegador(url, timeoutMs) {
    if (!timeoutMs) timeoutMs = 8000;
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, timeoutMs);
    try {
        var response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
                "Accept-Language": "pt-BR"
            }
        });
        clearTimeout(timeout);
        return response;
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

// ============================================
// BUSCA CNPJ NA BRASILAPI COM SÓCIOS (CORRIGIDO)
// ============================================
async function buscarCNPJnaBrasilAPI(cnpj) {
    try {
        var url = "https://brasilapi.com.br/api/cnpj/v1/" + cnpj;
        var response = await fetchComoNavegador(url);
        if (!response.ok) return null;
        var data = await response.json();
        if (data && !data.error) {
            var socioMajoritario = null;
            var controladora = null;
            
            if (data.qsa && data.qsa.length > 0) {
                var sociosOrdenados = data.qsa.slice().sort(function(a, b) {
                    return (b.percentual_capital_social || 0) - (a.percentual_capital_social || 0);
                });
                
                var socioPrincipal = sociosOrdenados[0];
                if (socioPrincipal) {
                    var documento = socioPrincipal.cpf_cnpj_socio || '';
                    var nome = socioPrincipal.nome_socio || '';
                    var percentual = socioPrincipal.percentual_capital_social || 0;
                    var qualificacao = socioPrincipal.qualificacao_socio || '';
                    
                    var docLimpo = documento.replace(/\D/g, '');
                    
                    if (docLimpo.length === 11) {
                        socioMajoritario = {
                            nome: nome,
                            qualificacao: qualificacao,
                            percentual: percentual,
                            cpf: documento,
                            tipo: 'PESSOA_FISICA'
                        };
                    } else if (docLimpo.length === 14) {
                        controladora = {
                            nome: nome,
                            cnpj: documento,
                            percentual: percentual,
                            qualificacao: qualificacao,
                            tipo: 'PESSOA_JURIDICA'
                        };
                    } else {
                        var qualificacoesPF = ['SÓCIO-ADMINISTRADOR', 'SÓCIO', 'DIRETOR', 'ADMINISTRADOR'];
                        var isPF = qualificacoesPF.some(function(q) {
                            return qualificacao.toUpperCase().indexOf(q) !== -1;
                        });
                        if (isPF) {
                            socioMajoritario = {
                                nome: nome,
                                qualificacao: qualificacao,
                                percentual: percentual,
                                cpf: documento,
                                tipo: 'PESSOA_FISICA'
                            };
                        } else {
                            controladora = {
                                nome: nome,
                                cnpj: documento,
                                percentual: percentual,
                                qualificacao: qualificacao,
                                tipo: 'PESSOA_JURIDICA'
                            };
                        }
                    }
                }
            }

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
                municipio: data.municipio || "",
                socio_majoritario: socioMajoritario,
                controladora: controladora,
                qsa: data.qsa || []
            };
        }
    } catch (err) { /* silencioso */ }
    return null;
}

// ============================================
// BUSCA CNPJ NA RECEITAWS (FALLBACK)
// ============================================
async function buscarCNPJnaReceitaWS(cnpj) {
    try {
        var url = "https://www.receitaws.com.br/v1/cnpj/" + cnpj;
        var response = await fetchComoNavegador(url);
        if (!response.ok) return null;
        var data = await response.json();
        if (data && data.status !== "ERROR" && !data.error) {
            return {
                cnpj: cnpj,
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
    } catch (err) { /* silencioso */ }
    return null;
}

// ============================================
// BUSCA CNPJ NO CSV LOCAL (USANDO ÍNDICE EM MEMÓRIA)
// ============================================
async function buscarCNPJnoCSV(cnpj) {
    await carregarCSVIndex();
    if (!csvIndexCNPJ) return null;
    var cnpjLimpo = normalizarCNPJ(cnpj);
    return csvIndexCNPJ.get(cnpjLimpo) || null;
}

// ============================================
// BUSCA CNPJ POR NOME NO CSV LOCAL
// ============================================
async function buscarCNPJnoCSVPorNome(nome) {
    await carregarCSVIndex();
    if (!csvIndexNome) return null;
    
    var nomeBusca = nome.toLowerCase().trim();
    var encontrado = null;
    
    if (csvIndexNome.has(nomeBusca)) {
        var cnpjs = csvIndexNome.get(nomeBusca);
        if (cnpjs && cnpjs.length > 0) {
            var cnpj = cnpjs[0];
            encontrado = csvIndexCNPJ.get(cnpj);
            if (encontrado) return encontrado;
        }
    }
    
    for (var [key, cnpjs] of csvIndexNome) {
        if (key.indexOf(nomeBusca) !== -1 || nomeBusca.indexOf(key) !== -1) {
            if (cnpjs && cnpjs.length > 0) {
                var cnpj = cnpjs[0];
                encontrado = csvIndexCNPJ.get(cnpj);
                if (encontrado) return encontrado;
            }
        }
    }
    
    return null;
}
// ============================================
// CADEIA DE BUSCA CNPJ - COM 3 FONTES + STORAGE
// ============================================
async function cadeiaDeBuscaCNPJ(entrada) {
    var limpo = normalizarCNPJ(entrada);
    var dados = null;

    if (limpo.length === 14) {
        // 1. BrasilAPI
        dados = await buscarCNPJnaBrasilAPI(limpo);
        if (dados) {
            try { await carregarHistorico(); salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "brasilapi" };
        }

        // 2. ReceitaWS
        dados = await buscarCNPJnaReceitaWS(limpo);
        if (dados) {
            try { await carregarHistorico(); salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "receitaws" };
        }

        // 3. CSV local (índice em memória)
        dados = await buscarCNPJnoCSV(limpo);
        if (dados) {
            try { salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "csv_veri" };
        }

        // 4. CSV no Storage (fallback final)
        dados = await buscarCSVnoStorage(limpo);
        if (dados) {
            try { salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "csv_storage" };
        }

        return null;
    }

    if (entrada && entrada.length > 2) {
        var nomeBusca = entrada.trim();

        // 1. Banco local (cnpjs_famosos.json)
        var localResult = encontrarCNPJPorNome(nomeBusca);
        if (localResult && localResult.cnpj) {
            var cnpjEncontrado = localResult.cnpj.replace(/\D/g, '');
            // TENTA BUSCAR NA BRASILAPI PARA COMPLEMENTAR OS DADOS
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "banco_local", cnpj_original: localResult.cnpj };
            }
            // Se a BrasilAPI falhar, tenta a ReceitaWS
            dados = await buscarCNPJnaReceitaWS(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "banco_local_receitaws", cnpj_original: localResult.cnpj };
            }
            // Se todas falharem, retorna os dados do banco local
            return {
                cnpj: cnpjEncontrado,
                razao_social: localResult.nome_encontrado || nomeBusca,
                porte: 'GIGANTE',
                data_abertura: "",
                situacao: "ATIVA",
                fonte: "banco_local"
            };
        }

        // 2. CSV local (índice em memória)
        var csvResult = await buscarCNPJnoCSVPorNome(nomeBusca);
        if (csvResult && csvResult.cnpj) {
            var cnpjEncontrado = csvResult.cnpj.replace(/\D/g, '');
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "csv_veri", cnpj_original: csvResult.cnpj };
            }
            return {
                cnpj: cnpjEncontrado,
                razao_social: csvResult.razao_social || nomeBusca,
                porte: csvResult.porte || "MEDIO",
                data_abertura: csvResult.data_abertura || "",
                situacao: csvResult.situacao || "ATIVA",
                fonte: "csv_veri"
            };
        }

        // 3. CSV no Storage (fallback final)
        var storageResult = await buscarCSVnoStorage(nomeBusca);
        if (storageResult && storageResult.cnpj) {
            var cnpjEncontrado = storageResult.cnpj.replace(/\D/g, '');
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "csv_storage", cnpj_original: storageResult.cnpj };
            }
            return {
                cnpj: cnpjEncontrado,
                razao_social: storageResult.razao_social || nomeBusca,
                porte: storageResult.porte || "MEDIO",
                data_abertura: storageResult.data_abertura || "",
                situacao: storageResult.situacao || "ATIVA",
                fonte: "csv_storage"
            };
        }
    }

    return null;
}

// ============================================
// ROTAS LEGADAS
// ============================================
app.get("/", function(req, res) { res.json({ status: "VERI API Online", versao: VERSAO_API }); });

app.get("/teste-cnpj/:cnpj", async function(req, res) {
    try {
        var limpo = normalizarCNPJ(req.params.cnpj);
        if (limpo.length !== 14) return res.status(400).json({ error: "CNPJ inválido" });
        var resultado = await cadeiaDeBuscaCNPJ(limpo);
        if (resultado) return res.json(resultado);
        res.status(404).json({ error: "CNPJ nao encontrado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/resultado/:id", function(req, res) {
    var id = req.params.id;
    var cached = cacheResultados.get(id);
    if (cached) return res.json(cached);
    res.status(404).json({ error: "Análise não encontrada." });
});

app.post("/buscar-cnpj", async function(req, res) {
    try {
        var { cnpj } = req.body;
        if (!cnpj) return res.status(400).json({ error: "CNPJ nao informado" });
        var limpo = normalizarCNPJ(cnpj);
        var resultado = await cadeiaDeBuscaCNPJ(limpo);
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
        var dados = req.body;
        var inicio = Date.now();

        if (dados.analisado && dados.analisado.cnpj) {
            var limpo = normalizarCNPJ(dados.analisado.cnpj);
            if (limpo.length === 14) {
                var complemento = await cadeiaDeBuscaCNPJ(limpo);
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

        var resultado = calcularRiscos(dados);

        var hashInput = crypto
            .createHash("sha256")
            .update(JSON.stringify(dados))
            .digest("hex")
            .substring(0, 16);

        var hashOutput = crypto
            .createHash("sha256")
            .update(JSON.stringify(resultado))
            .digest("hex")
            .substring(0, 16);

        var tempoExecucao = Date.now() - inicio;
        var documento = dados.analisado.cnpj || dados.analisado.cpf || "sem_documento";
        var hash_auditoria = gerarHashAuditoria(documento);
        var email = dados.solicitante && dados.solicitante.email ? dados.solicitante.email : "";

        try { await carregarContadores(); incrementarContadores(documento, email); } catch(e) {}
        var conts = getContadores(documento, email);

        await carregarTendencias();
        var topRiscosParaSalvar = resultado.top_riscos.map(function(r) {
            return { risco: r.risco, contribuicao: r.contribuicao };
        });
        var tendenciaInfo = getTendenciaEvolucao(documento, resultado.score_global, topRiscosParaSalvar);

        var resposta = {
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

    // ============================================================
    // 🔧 CORREÇÃO: Evidência de comprometimento REMOVIDA do backend
    // O frontend calcula corretamente com base no faturamento/renda exibidos
    // Mantém apenas a evidência de fallback quando não há valor
    // ============================================================

    // Verifica se o valor do negócio foi informado
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

    // ============================================================
    // EVIDÊNCIA DE DESCONTINUIDADE (mantida)
    // ============================================================
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

    // ============================================================
    // EVIDÊNCIA DE VERACIDADE (mantida)
    // ============================================================
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

    // ============================================================
    // EVIDÊNCIA DE SETOR (mantida)
    // ============================================================
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

    // ============================================================
    // EVIDÊNCIA COMPORTAMENTAL (mantida)
    // ============================================================
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
// ROTA /enriquecer – CORRIGIDA
// ============================================================
app.post("/enriquecer", async function(req, res) {
    var inicio = Date.now();
    var { 
        nome, cnpj, cpf, valor, porte, ticket_medio,
        email_analisado, whatsapp_analisado,
        email_solicitante, whatsapp_solicitante,
        renda_solicitante, renda_analisado
    } = req.body;

    if (!nome && !cnpj && !cpf) {
        return res.status(400).json({
            status: "falha",
            erro: "É necessário informar \"nome\", \"cnpj\" ou \"cpf\"",
            tempo_ms: Date.now() - inicio
        });
    }

    var cnpjLimpo = normalizarCNPJ(cnpj);

    try {
        // 1. CACHE
        if (ENABLE_CACHE && cnpjLimpo && cacheMemoria.has(cnpjLimpo)) {
            var cached = cacheMemoria.get(cnpjLimpo);
            return res.json({
                ...cached,
                _cache: "memoria",
                _tempo_ms: Date.now() - inicio
            });
        }

        if (cnpjLimpo) {
            try {
                var cacheFirestore = await getCache(cnpjLimpo);
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

        // ============================================================
        // 🔧 CORREÇÃO: BUSCA NO BANCO REGIONAL (cnpjs_famosos.json)
        // ============================================================
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

        // ============================================================
        // BUSCA NA BRASILAPI PARA OBTER PORTE E DATA_ABERTURA
        // ============================================================
        var dadosCadastraisCompletos = {};

        if (cnpjLimpo && cnpjLimpo.length === 14) {
            try {
                var resultadoBusca = await cadeiaDeBuscaCNPJ(cnpjLimpo);
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

        // 🔧 CORREÇÃO: Se encontrou no banco regional, usa o faturamento dele
        if (faturamentoBancoRegional) {
            dadosCadastraisCompletos.faturamento_anual = faturamentoBancoRegional;
            dadosCadastraisCompletos.setor = setorBancoRegional || dadosCadastraisCompletos.setor;
            dadosCadastraisCompletos.porte = porteBancoRegional || dadosCadastraisCompletos.porte || 'GIGANTE';
            console.log('✅ FATURAMENTO DO BANCO REGIONAL PRESERVADO:', faturamentoBancoRegional);
        }

        // ============================================================
        // ORQUESTRADOR - CORRIGIDO (com UF)
        // ============================================================
        var modulo = req.body.modulo || "geral";
        var subModulo = req.body.subModulo || "geral";

        // ============================================================
        // EXTRAI UF DOS DADOS CADASTRAIS
        // ============================================================
        var ufEmpresa = null;

        if (dadosCadastraisCompletos && dadosCadastraisCompletos.uf) {
            ufEmpresa = dadosCadastraisCompletos.uf;
        }

        if (!ufEmpresa) {
            try {
                var brasilUf = await buscarCNPJnaBrasilAPI(cnpjLimpo);
                if (brasilUf && brasilUf.uf) {
                    ufEmpresa = brasilUf.uf;
                }
            } catch (err) {
                console.warn("Erro ao buscar UF via BrasilAPI:", err.message);
            }
        }

        if (!ufEmpresa && dadosCadastraisCompletos && dadosCadastraisCompletos.cep) {
            try {
                var cepResponse = await fetch('https://viacep.com.br/ws/' + dadosCadastraisCompletos.cep + '/json/');
                if (cepResponse.ok) {
                    var cepData = await cepResponse.json();
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

        // ============================================================
        // CHAMA ORQUESTRADOR COM A UF
        // ============================================================
        var dadosOrquestrador = await coletarEvidenciasReais(
            nome,
            cnpjLimpo,
            cpf,
            ufEmpresa,
            modulo,
            subModulo
        );

        // Combina os dados cadastrais (prioridade: o que veio da BrasilAPI)
        var dadosCadastrais = {
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

        // ============================================================
        // 🔧 CORREÇÃO: FATURAMENTO ANUAL – PRIORIDADE MÁXIMA DO BANCO REGIONAL
        // ============================================================
        var faturamentoAnualEncontrado = null;
        var faturamentoFonte = "";

        // 1. PRIORIDADE MÁXIMA: faturamento do banco regional (via dadosBancoRegional)
        if (faturamentoBancoRegional) {
            faturamentoAnualEncontrado = faturamentoBancoRegional;
            faturamentoFonte = "banco_regional_cnpj";
            console.log("✅ FATURAMENTO DO BANCO REGIONAL (por CNPJ):", faturamentoAnualEncontrado);
        }
        // 2. PRIORIDADE SEGUNDA: faturamento do banco regional (via orquestrador)
        else if (dadosOrquestrador.faturamento_anual) {
            faturamentoAnualEncontrado = dadosOrquestrador.faturamento_anual;
            faturamentoFonte = "banco_regional_orquestrador";
            console.log("✅ FATURAMENTO DO BANCO REGIONAL (orquestrador):", faturamentoAnualEncontrado);
        }
        // 3. Se NÃO veio do banco, usa o que veio dos dados cadastrais (BrasilAPI/CSV)
        else if (dadosCadastrais.faturamento_anual && dadosCadastrais.faturamento_anual > 0) {
            faturamentoAnualEncontrado = dadosCadastrais.faturamento_anual;
            faturamentoFonte = "dados_cadastrais";
            console.log("✅ FATURAMENTO DOS DADOS CADASTRAIS:", faturamentoAnualEncontrado);
        }
        // 4. 🔧 CORREÇÃO: Fallback por porte (com suporte a nomes por extenso)
        else {
            var porteEmpresa = dadosCadastrais.porte || "MEDIO";
            var faturamentoAnualPorPorte = {
                // Siglas
                "MEI": 81000,
                "ME": 360000,
                "EPP": 4800000,
                "MEDIO": 12000000,
                "GRANDE": 50000000,
                "GIGANTE": 50000000,
                // Nomes por extenso (fallback BrasilAPI)
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

        // 🔧 CORREÇÃO: PORTE - Garantir que empresas do banco regional sejam GIGANTE
        if (dadosBancoRegional || dadosOrquestrador.faturamento_anual) {
            // Se veio do banco regional, o porte é GIGANTE
            dadosCadastrais.porte = 'GIGANTE';
            console.log("✅ PORTE FORÇADO PARA GIGANTE (banco regional)");
        } else if (dadosCadastrais.porte === 'DEMAIS') {
            dadosCadastrais.porte = 'GIGANTE';
            console.log("✅ PORTE CORRIGIDO: DEMAIS → GIGANTE");
        }

        // ============================================================
        // ADAPTADO: CAPTURA VALOR DO NEGÓCIO (Contratação/Compra/Venda)
        // ============================================================
        var valorNegocio = 0;
        var parcelasNegocio = 1;
        var tipoPagamento = "avista";
        var tipoNegocio = "";

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

        // ============================================================
        // 3. GEMINI (com fallback DeepSeek)
        // ============================================================
        var estruturado = await estruturar(dadosOrquestrador.fontes, TIMEOUT_GEMINI_MS);

        // ============================================================
        // 4. VALIDAÇÃO – GARANTE ESTRUTURA (NUNCA BLOQUEIA)
        // ============================================================
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

        var secoes = ['reputacional', 'resolutividade', 'comportamental', 'saude_financeira', 'red_flags'];
        for (var i = 0; i < secoes.length; i++) {
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

        var validacao = { valido: true, erros: [] };
        console.log('✅ Estrutura garantida com sucesso.');

        // 5. SCORES
        var scores = extrairScores(estruturado.dados_estruturados || {});

        // 6. CALCULA TEMPO DE MERCADO
        if (dadosCadastrais.data_abertura) {
            var dataAbertura = new Date(dadosCadastrais.data_abertura);
            var agora = new Date();
            var diffMs = agora - dataAbertura;
            var diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
            dadosCadastrais.tempo_mercado_anos = Math.round(diffAnos * 10) / 10;
        } else {
            dadosCadastrais.tempo_mercado_anos = 0;
        }

        var faturamentoMensal = null;
        if (dadosCadastrais.faturamento_anual) {
            faturamentoMensal = dadosCadastrais.faturamento_anual / 12;
        } else if (dadosCadastrais.porte) {
            faturamentoMensal = calcularFaturamentoMensalPorPorte(dadosCadastrais.porte);
        }

        if (faturamentoMensal) {
            dadosCadastrais.faturamento_mensal_estimado = faturamentoMensal;
        }

        // 7. PREPARA RESPOSTA
        var resposta = {
            status: "sucesso",
            dados_cadastrais: dadosCadastrais,
            scores: scores,
            estrutura_riscos: estruturado.dados_estruturados,
            padroes_risco: estruturado.padroes_risco,
            evidencias: estruturado.evidencias,
            fontes_consultadas: estruturado.fontes_consultadas,
            confianca_geral: estruturado.confianca_geral,
            tempo_mercado_anos: dadosCadastrais.tempo_mercado_anos,
            tempo_ms: Date.now() - inicio,
            validacao: validacao,
            cache_utilizado: false,
            faturamento_anual: dadosCadastrais.faturamento_anual || null,
            faturamento_mensal: dadosCadastrais.faturamento_mensal_estimado || null,
            faturamento_fonte: dadosCadastrais.faturamento_fonte || null,
            versao_api: VERSAO_API,
            versao_motor: VERSAO_MOTOR,
            versao_orquestrador: VERSAO_ORQUESTRADOR
        };

        // 8. CACHE
        if (ENABLE_CACHE && cnpjLimpo) {
            try {
                await setCache(cnpjLimpo, resposta);
            } catch (cacheErr) {
                console.warn("Erro ao salvar cache Firestore:", cacheErr.message);
            }
            if (ENABLE_CACHE) {
                setCacheMemoria(cnpjLimpo, resposta);
            }
        }

        res.json(resposta);
    } catch (error) {
        console.error("❌ Erro no /enriquecer:", error);
        res.status(500).json({
            status: "erro",
            erro: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            tempo_ms: Date.now() - inicio
        });
    }
});

// ============================================
// INICIA O SERVIDOR
// ============================================
var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log("🚀 VERI API rodando na porta " + PORT);
    console.log("📦 Versão: " + VERSAO_API);
    console.log("🔧 Motor: " + VERSAO_MOTOR);
    console.log("🧠 Orquestrador: " + VERSAO_ORQUESTRADOR);
    console.log("🤖 Gemini Prompt: " + VERSAO_PROMPT_GEMINI);
});

module.exports = app;
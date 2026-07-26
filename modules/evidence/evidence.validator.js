import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

// Carrega o schema de validação
const schemaPath = join(__dirname, '../../schemas/evidence.schema.v1.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

/**
 * Valida se o JSON do Gemini está no formato correto
 * @param {Object} data - JSON a ser validado
 * @returns {Object} { valido: boolean, erros: string[] }
 */
export function validarEvidencias(data) {
  const erros = [];

  // Verifica campos obrigatórios
  if (!data.status_busca) {
    erros.push('Campo "status_busca" é obrigatório');
  } else if (!['sucesso', 'parcial', 'falha'].includes(data.status_busca)) {
    erros.push('status_busca deve ser: sucesso, parcial ou falha');
  }

  if (!data.coletado_em) {
    erros.push('Campo "coletado_em" é obrigatório');
  } else if (isNaN(Date.parse(data.coletado_em))) {
    erros.push('coletado_em deve ser uma data válida (ISO 8601)');
  }

  if (!data.confianca_geral) {
    erros.push('Campo "confianca_geral" é obrigatório');
  } else if (!['alta', 'media', 'baixa'].includes(data.confianca_geral)) {
    erros.push('confianca_geral deve ser: alta, media ou baixa');
  }

  // Verifica se dados_brutos existe
  if (!data.dados_brutos || typeof data.dados_brutos !== 'object') {
    erros.push('Campo "dados_brutos" é obrigatório e deve ser um objeto');
  }

  // Verifica os eixos principais
  const eixos = ['reputacional', 'resolutividade', 'comportamental', 'saude_financeira', 'red_flags'];
  for (const eixo of eixos) {
    if (!data.dados_brutos[eixo]) {
      erros.push(Eixo "${eixo}" não encontrado em dados_brutos);
    }
  }

  // Valida IDs das evidências (se houver)
  function validarIds(obj, prefixo) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      const item = obj[key];
      if (item && typeof item === 'object') {
        // Verifica evidencias
        if (Array.isArray(item.evidencias)) {
          for (const ev of item.evidencias) {
            if (ev.id && !ev.id.startsWith('EV-')) {
              erros.push(ID de evidência inválido: ${ev.id}. Deve começar com EV-);
            }
            if (!ev.url) {
              erros.push(Evidência ${ev.id || 'sem ID'} não possui URL);
            }
          }
        }
        // Verifica red_flags
        if (Array.isArray(item.red_flags)) {
          for (const rf of item.red_flags) {
            if (rf.id && !rf.id.startsWith('RF-')) {
              erros.push(ID de red flag inválido: ${rf.id}. Deve começar com RF-);
            }
            if (!rf.url) {
              erros.push(Red flag ${rf.id || 'sem ID'} não possui URL);
            }
          }
        }
      }
    }
  }

  validarIds(data.dados_brutos, 'EV');

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Validação simplificada - retorna apenas booleano
 */
export function isEvidenciasValido(data) {
  return validarEvidencias(data).valido;
}
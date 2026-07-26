C:\Users\User\Desktop\veri-backend\modules\evidence>type "C:\Users\User\Desktop\veri-backend\modules\evidence\validator.js"
function validar(dados) {
    var erros = [];

    if (!dados.dados_cadastrais) {
        erros.push({ campo: "dados_cadastrais", mensagem: "campo obrigatorio" });
    } else {
        if (!dados.dados_cadastrais.razao_social) erros.push({ campo: "dados_cadastrais.razao_social", mensagem: "campo obrigatorio" });
        if (!dados.dados_cadastrais.cnpj && !dados.dados_cadastrais.cpf) erros.push({ campo: "dados_cadastrais.cnpj/cpf", mensagem: "pelo menos um e obrigatorio" });
    }

    if (!dados.reputacao) {
        erros.push({ campo: "reputacao", mensagem: "campo obrigatorio" });
    } else {
        if (dados.reputacao.mencoes === undefined || dados.reputacao.mencoes === null) erros.push({ campo: "reputacao.mencoes", mensagem: "campo obrigatorio" });
        if (!dados.reputacao.sentimento) erros.push({ campo: "reputacao.sentimento", mensagem: "campo obrigatorio" });
    }

    if (!dados.processos_judiciais) {
        erros.push({ campo: "processos_judiciais", mensagem: "campo obrigatorio" });
    } else {
        if (dados.processos_judiciais.total === undefined || dados.processos_judiciais.total === null) erros.push({ campo: "processos_judiciais.total", mensagem: "campo obrigatorio" });
        if (dados.processos_judiciais.ativos === undefined || dados.processos_judiciais.ativos === null) erros.push({ campo: "processos_judiciais.ativos", mensagem: "campo obrigatorio" });
    }

    if (!dados.protestos) {
        erros.push({ campo: "protestos", mensagem: "campo obrigatorio" });
    } else {
        if (dados.protestos.total === undefined || dados.protestos.total === null) erros.push({ campo: "protestos.total", mensagem: "campo obrigatorio" });
    }


const axios = require('axios');
const xml2js = require('xml2js');

async function buscarReclameAqui(nome) {
    if (!nome) return [];

    try {
        var url = 'https://www.reclameaqui.com.br/rss/' + encodeURIComponent(nome);
        var response = await axios.get(url, { timeout: 4000 });
        
        var parser = new xml2js.Parser();
        var result = await parser.parseStringPromise(response.data);
        
        var items = result.rss?.channel?.[0]?.item || [];
        
        return items.slice(0, 5).map(function(item) {
            return {
                titulo: item.title?.[0] || 'Sem título',
                descricao: item.description?.[0] || '',
                status: item['reclameaqui:status']?.[0] || 'desconhecido',
                data: item.pubDate?.[0] || new Date().toISOString(),
                source: 'reclame_aqui'
            };
        });
    } catch (err) {
        console.warn('Erro no Reclame Aqui:', err.message);
        return [];
    }
}

module.exports = { buscarReclameAqui };
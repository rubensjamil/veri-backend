const axios = require('axios');

async function googleSearch(query) {
    if (!query) return [];

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        const cx = process.env.GOOGLE_CSE_ID;

        if (!apiKey || !cx) {
            console.warn('Google Search API keys not configured');
            console.warn('GOOGLE_API_KEY:', apiKey ? 'Configurada' : 'NÃO CONFIGURADA');
            console.warn('GOOGLE_CSE_ID:', cx ? 'Configurado' : 'NÃO CONFIGURADO');
            return [];
        }

        const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: apiKey,
                cx: cx,
                q: query,
                num: 10
            },
            timeout: 4500
        });

        if (res.data && res.data.error) {
            console.warn('Google Search API error:', res.data.error.message);
            return [];
        }

        return (res.data.items || []).map(function(item) {
            return {
                title: item.title || '',
                snippet: item.snippet || '',
                link: item.link || '',
                source: 'google'
            };
        });
    } catch (err) {
        if (err.response && err.response.status === 429) {
            console.warn('Google Search quota exceeded (429)');
        } else {
            console.warn('Erro no Google Search:', err.message);
        }
        return [];
    }
}

module.exports = { googleSearch };
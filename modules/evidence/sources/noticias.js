const axios = require('axios');

async function buscarNoticias(query) {
    if (!query) return [];

    try {
        const apiKey = process.env.NEWS_API_KEY;

        if (apiKey) {
            try {
                const res = await axios.get('https://newsapi.org/v2/everything', {
                    params: {
                        q: query,
                        language: 'pt',
                        pageSize: 10,
                        apiKey: apiKey
                    },
                    timeout: 4000
                });
                return (res.data.articles || []).map(function(a) {
                    return {
                        titulo: a.title || '',
                        descricao: a.description || '',
                        url: a.url || '',
                        data: a.publishedAt || new Date().toISOString(),
                        source: 'news_api'
                    };
                });
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    console.warn('NewsAPI quota exceeded, falling back to RSS');
                } else {
                    console.warn('NewsAPI error:', err.message);
                }
            }
        }

        var rssUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=pt-BR&gl=BR&ceid=BR:pt-419';
        var res = await axios.get('https://api.rss2json.com/v1/api.json', {
            params: { rss_url: rssUrl },
            timeout: 4000
        });

        return (res.data.items || []).slice(0, 10).map(function(item) {
            return {
                titulo: item.title || '',
                descricao: item.description || '',
                url: item.link || '',
                data: item.pubDate || new Date().toISOString(),
                source: 'news_rss'
            };
        });
    } catch (err) {
        console.warn('Erro ao buscar notícias:', err.message);
        return [];
    }
}

module.exports = { buscarNoticias };
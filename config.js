// API Configuration for News API, Threat Data Sources, and AI Analysis Endpoints

const config = {
    newsAPI: {
        apiKey: 'YOUR_NEWS_API_KEY',
        baseUrl: 'https://newsapi.org/v2/',
        endpoints: {
            topHeadlines: 'top-headlines',
            everything: 'everything',
            sources: 'sources'
        }
    },
    threatData: {
        source1: 'https://threatsource1.com/api',
        source2: 'https://threatsource2.com/api'
    },
    aiAnalysis: {
        endpoint: 'https://ai-analysis.com/api/analyze',
        model: 'latest-model'
    }
};

module.exports = config;

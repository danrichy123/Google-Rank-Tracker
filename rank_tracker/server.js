const express = require('express');
const puppeteer = require('puppeteer');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

const proxyList = [
    '198.23.229.203:15673',
    '199.102.105.242:4145',
    '107.170.210.100:32542',
    '68.1.210.163:4145',
    '162.252.147.225:8282',
    '143.110.232.177:80',
    '207.138.39.145:999',
    '209.126.6.159:80',
    '162.240.75.37:80',
    '134.209.67.109:8085',
    '184.178.172.17:4145',
    '142.54.228.193:4145',
    '50.84.48.130:8080',
    '12.163.92.26:8080',
    '5.161.103.113:80',
    '23.94.123.243:8888',
    '167.99.124.118:80',
    '165.227.0.192:80',
    '199.102.104.70:4145',
    '162.144.236.128:80',
    '172.173.132.85:80',
    '142.54.237.34:4145',
    '147.124.212.31:36779',
    '107.148.201.157:80',
    '96.80.235.1:8080',
    '38.48.100.161:28080',
    '174.138.94.117:80',
    '50.235.247.114:8085',
    '20.118.1.112:8000',
    '24.233.2.14:80'
];

const scrapeGoogleSearchResults = async (businessName, keyword, proxyUrl) => {
    const browser = await puppeteer.launch({
        args: [`--proxy-server=${proxyUrl}`],
    });
    const page = await browser.newPage();
    try {
        await page.goto(`https://www.google.com/search?q=${businessName} ${keyword}`);

        const searchResults = await page.evaluate(() => {
            const results = [];
            document.querySelectorAll('.g').forEach((element) => {
                const title = element.querySelector('h3') ? element.querySelector('h3').innerText : null;
                const url = element.querySelector('a') ? element.querySelector('a').href : null;
                results.push({ title, url });
            });
            return results;
        });

        return searchResults;
    } catch (error) {
        throw new Error(`Error scraping with proxy ${proxyUrl}: ${error.message}`);
    } finally {
        await browser.close();
    }
};

const scrapeWithProxyRotation = async (businessName, keyword) => {
    for (const proxyUrl of proxyList) {
        try {
            const searchResults = await scrapeGoogleSearchResults(businessName, keyword, proxyUrl);
            return searchResults;
        } catch (error) {
            console.error(error.message);
        }
    }
    throw new Error('Failed to scrape with all proxies');
};

// Swagger UI setup
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post('/api/track', async (req, res) => {
    try {
        const { businessName, keyword } = req.body;
        if (!businessName || !keyword) {
            throw new Error('Both businessName and keyword parameters are required');
        }
        
        const searchResults = await scrapeWithProxyRotation(businessName, keyword);
        
        // Your search result processing logic goes here

        res.json({ searchResults });
    } catch (error) {
        console.error('Error tracking rankings:', error.message);
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

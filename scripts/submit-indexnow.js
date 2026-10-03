import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_PATH = path.join(__dirname, '../public/sitemap.xml');
// NEVER commit this key. Provide it via the environment:
//   INDEXNOW_KEY=… node scripts/submit-indexnow.js
// (CI/prod: GitHub Secret or Cloudflare env var. Rotate at Bing Webmaster
// Tools if it ever touches the repo or logs.)
const API_KEY = process.env.INDEXNOW_KEY;
const HOST = 'adopecanva.com';
const KEY_LOCATION = `https://${HOST}/${API_KEY}.txt`;

if (!API_KEY) {
    console.error('INDEXNOW_KEY is not set. Refusing to submit (and refusing to use a committed key).');
    process.exit(1);
}

async function submitIndexNow() {
    try {
        console.log('Reading sitemap.xml...');
        const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
        
        // Extract all <loc>URLs</loc> using regex
        const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
        const urls = [];
        let match;
        
        while ((match = urlRegex.exec(sitemapContent)) !== null) {
            urls.push(match[1]);
        }

        if (urls.length === 0) {
            console.error('No URLs found in sitemap.xml.');
            return;
        }

        console.log(`Found ${urls.length} URLs. Submitting to IndexNow...`);

        const payload = {
            host: HOST,
            key: API_KEY,
            keyLocation: KEY_LOCATION,
            urlList: urls
        };

        const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`Successfully submitted ${urls.length} URLs to IndexNow! (Status: ${response.status})`);
        } else {
            const errText = await response.text();
            console.error(`IndexNow submission failed: (Status: ${response.status})`, errText);
        }
    } catch (err) {
        console.error('Error submitting to IndexNow:', err);
    }
}

submitIndexNow();

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { llm } from '../../src/llm_client';
import { CONFIG } from '../../src/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. Load Environment Variables
// Adjusted path to point to defou-workflow-agent root
const projectRoot = path.resolve(__dirname, '../../');
const envPath = path.join(projectRoot, '.env');

console.log(`Loading .env from: ${envPath}`);
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
} else {
  console.error('❌ .env file NOT found');
}

dotenv.config({ path: envPath, override: true });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL;
const MOCK_MODE = process.env.MOCK_MODE === 'true';

// 2. Define Output Paths
const OUTPUT_DIR = path.join(projectRoot, 'outputs');
const TRENDS_DIR = path.join(OUTPUT_DIR, 'trends');

// Ensure directories exist
if (!fs.existsSync(TRENDS_DIR)) {
  fs.mkdirSync(TRENDS_DIR, { recursive: true });
}

interface HotItem {
  rank: string;
  title: string;
  link: string;
  hot: string;
  source: string;
}

const SOURCE_URLS: Record<string, string> = {
  hot: 'https://tophub.today/hot',
  twitter: 'https://tophub.today/n/KqndgxeLl9',
  douyin: 'https://tophub.today/n/Mk4Qbgm7Jk',
  weibo: 'https://tophub.today/n/KqndgxeLl9' // Fallback or specific node if known
};

// Default to hot
const DEFAULT_SOURCE = 'hot';

// 3. Initialize Anthropic Client
// Removed manual initialization, using shared llm client

/**
 * Fetch hot list from TopHub
 */
export async function fetchHotList(url: string): Promise<HotItem[]> {
  console.log(`Fetching ${url}...`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tophub: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const items: HotItem[] = [];

  // Strategy A: Main Hot Page (div.child-item)
  $('.child-item').each((_, element) => {
    const el = $(element);
    const rank = el.find('.left-item span').text().trim();
    const titleLink = el.find('.medium-txt a');
    const title = titleLink.text().trim();
    const link = titleLink.attr('href') || '';
    const fullLink = link.startsWith('http') ? link : `https://tophub.today${link}`;

    const smallTxt = el.find('.small-txt').text().trim();
    const parts = smallTxt.split('‧').map(s => s.trim());
    const source = parts[0] || '';
    const hot = parts[1] || '';

    if (title) {
      items.push({ rank, title, link: fullLink, source, hot });
    }
  });

  // Strategy B: Node Page (table tr) - Fallback if Strategy A yields nothing
  if (items.length === 0) {
    $('table.table tr').each((_, element) => {
      const el = $(element);
      const tds = el.find('td');
      if (tds.length >= 2) {
        const rank = $(tds[0]).text().trim().replace('.', '');
        const titleLink = $(tds[1]).find('a');
        const title = titleLink.text().trim();
        const link = titleLink.attr('href') || '';
        const fullLink = link.startsWith('http') ? link : `https://tophub.today${link}`; // Often relative on node pages
        const hot = $(tds[2]).text().trim();

        // For node pages, source is implied by the page (e.g. "Weibo"), but we can extract it from the page title or pass it in.
        // For simplicity, let's look for the node title in the header.
        // Or just use a generic 'Node' if not found, since the user knows what they queried.
        // Let's try to find it in the DOM: <div class="c-i-c"> ... <h3>微博 ‧ 热搜榜</h3>
        let source = $('.c-i-c .tt h3').text().trim().split('‧')[0]?.trim() || 'TopHub';

        if (title) {
          items.push({ rank, title, link: fullLink, source, hot });
        }
      }
    });
  }

  return items;
}

/**
 * Analyze the list using Claude
 */
export async function analyzeHotList(items: HotItem[]): Promise<string> {
  const topItems = items.slice(0, 30); // Analyze top 30 items
  const itemsText = topItems.map(item =>
    `${item.rank}. [${item.source}] ${item.title} (Hot: ${item.hot}) - Link: ${item.link}`
  ).join('\n');

  const prompt = `
You are a content strategy expert. Here is a list of current trending topics from TopHub (Hot List):

${itemsText}

Please perform the following tasks:
1. **Analyze Traffic Potential**: Identify which of these topics have the highest potential for viral traffic *right now*. Look for topics that arouse strong curiosity, controversy, or urgency.
2. **Topic Suggestions**: Based on the high-potential topics, suggest 5 specific content angles/titles that a creator could use.
3. **Format**: Output your response in Markdown.

For the suggestions, use this format:
- **Topic**: [Original Topic Title]
- **Angle**: [Proposed Content Angle]
- **Why it works**: [Brief explanation of traffic potential]
`;

  console.log('🤖 Analyzing hot list with Claude...');

  if (MOCK_MODE) {
    return `# Mock Analysis\n\n- Mock Suggestion 1\n- Mock Suggestion 2`;
  }

  const markdown = await llm.generateText({
    system: "You are an expert content strategist and trend analyst.",
    messages: [{ role: "user", content: prompt }],
    model: CONFIG.LLM_MODEL || "anthropic/claude-sonnet-4"
  });

  return markdown;
}

/**
 * Main execution function
 */
export async function run() {
  try {
    // 0. Parse Args for Source
    const args = process.argv.slice(2);
    let sourceKey = DEFAULT_SOURCE;

    // Simple arg parsing: looks for --source=xxx or just the source name
    args.forEach(arg => {
      if (arg.startsWith('--source=')) {
        sourceKey = arg.split('=')[1];
      } else if (SOURCE_URLS[arg]) {
        sourceKey = arg;
      }
    });

    const targetUrl = SOURCE_URLS[sourceKey] || SOURCE_URLS[DEFAULT_SOURCE];
    console.log(`🌍 Source: ${sourceKey} -> ${targetUrl}`);

    // 1. Fetch
    const items = await fetchHotList(targetUrl);
    console.log(`✅ Fetched ${items.length} items.`);

    // 2. Save Raw Data
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const rawFilename = `tophub_hot_${dateStr}.json`;
    const rawPath = path.join(TRENDS_DIR, rawFilename);

    fs.writeFileSync(rawPath, JSON.stringify(items, null, 2));
    console.log(`✅ Saved raw data to ${rawPath}`);

    // 3. Analyze
    const report = await analyzeHotList(items);

    // 4. Save Report
    const reportFilename = `tophub_analysis_${dateStr}.md`;
    const reportPath = path.join(TRENDS_DIR, reportFilename);

    const finalContent = `# TopHub Analysis (${sourceKey})\n> Generated at: ${new Date().toLocaleString()}\n> Source Data: [${rawFilename}](./${rawFilename})\n\n${report}`;

    fs.writeFileSync(reportPath, finalContent);
    console.log(`✅ Saved analysis report to ${reportPath}`);

    return reportPath;

  } catch (error) {
    console.error('❌ Error running TopHub skill:', error);
    process.exit(1);
  }
}

// Allow running directly
if (require.main === module) {
  run();
}

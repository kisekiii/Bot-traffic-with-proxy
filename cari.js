const fs = require('fs');
const puppeteer = require('puppeteer');
const readline = require('readline');

const readLines = (filePath) => {
  return new Promise((resolve, reject) => {
    const lines = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (line.trim()) {
        lines.push(line.trim());
      }
    });

    rl.on('close', () => {
      resolve(lines);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
};


const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const parseProxy = (proxy) => {
  let protocol = 'http://';
  if (proxy.startsWith('http://') || proxy.startsWith('https://')) {
    const protocolEnd = proxy.indexOf('://') + 3;
    protocol = proxy.substring(0, protocolEnd);
    proxy = proxy.substring(protocolEnd);
  }

  const authIndex = proxy.indexOf('@');
  if (authIndex !== -1) {
    const authPart = proxy.substring(0, authIndex);
    const [username, password] = authPart.split(':');
    const address = proxy.substring(authIndex + 1);
    return { protocol, address, username, password };
  } else {
    return { protocol, address: proxy };
  }
};

const searchAndOpenWebsite = async (page, keyword, targets) => {
  try {
    // Buka halaman Google
    await page.goto('https://www.google.co.id', { waitUntil: 'networkidle2' });
    await waitFor(1000); 
    await page.waitForSelector('textarea[name="q"]', { timeout: 60000 }); // Tunggu hingga 60 detik
    await page.type('textarea[name="q"]', keyword, { delay: 100 }); // Simulasi pengetikan
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Fungsi untuk mencari dan mengklik tautan target
    const clickTargetLink = async () => {
      const anchors = await page.$$('a[href]');
      for (const anchor of anchors) {
        const href = await page.evaluate(el => el.href, anchor);
        if (targets.some(target => href.includes(target))) {
          await Promise.all([
            anchor.click(), // Klik tautan
            page.waitForNavigation({ waitUntil: 'networkidle2' })
          ]);
          console.log(`Successfully clicked link: ${href} for keyword: ${keyword}`);
          await waitFor(5000); // Tunggu 5 detik sebelum melanjutkan
          return true; 
        }
      }
      return false; 
    };

    let targetFound = await clickTargetLink();

    const nextButtonSelector = 'a[aria-label="Next"]';
    while (!targetFound) {
      const nextButton = await page.$(nextButtonSelector);
      if (nextButton) {
        await Promise.all([
          nextButton.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
        console.log(`Navigating to the next page for keyword: ${keyword}`);
        targetFound = await clickTargetLink();
      } else {
        console.log(`No more pages to search for keyword: ${keyword}.`);
        break;
      }
    }

  } catch (error) {
    console.error(`Failed to search and open for keyword: ${keyword}, Error: ${error.message}`);
  }
};

(async () => {
  const keywordsFilePath = 'keywords.txt'; // Path ke file keywords
  const targetsFilePath = 'target.txt'; // Path ke file targets
  const proxiesFilePath = 'proxies.txt'; // Path ke file proxies

  try {
    const keywords = await readLines(keywordsFilePath);
    const targets = await readLines(targetsFilePath);
    const proxies = await readLines(proxiesFilePath);

    if (keywords.length === 0) {
      console.log('No keywords to search.');
      return;
    }

    if (targets.length === 0) {
      console.log('No targets to match.');
      return;
    }

    if (proxies.length === 0) {
      console.log('No proxies to use.');
      return;
    }

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      const proxy = proxies[i % proxies.length]; // Gunakan proxy secara bergiliran

      console.log(`Using proxy: ${proxy}`);

      const { protocol, address, username, password } = parseProxy(proxy);

      const browser = await puppeteer.launch({
        headless: false,
        args: [`--proxy-server=${protocol}${address}`]
      });

      const page = await browser.newPage();

      if (username && password) {
        await page.authenticate({ username, password });
      }

      await searchAndOpenWebsite(page, keyword, targets);
      await browser.close();
    }

    console.log('Finished searching for all keywords.');

  } catch (error) {
    console.error(`Error during script execution: ${error.message}`);
  }
})();

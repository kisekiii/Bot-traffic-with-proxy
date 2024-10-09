const puppeteer = require('puppeteer');

const scrapeProxyModalContent = async () => {
  const browser = await puppeteer.launch({ headless: false }); // Ubah ke false untuk melihat prosesnya

  try {
    const page = await browser.newPage();
    await page.goto('https://www.free-proxy-list.net/', { waitUntil: 'networkidle2' });

    // Klik elemen yang memicu modal dengan data-target="#raw"
    await page.click('[data-target="#raw"]');

    // Tunggu modal muncul
    await page.waitForSelector('.modal-dialog', { visible: true });

    // Tunggu textarea dalam modal-body
    await page.waitForSelector('.modal-body textarea.form-control', { visible: true });

    // Klik pada textarea untuk memilih isi (opsional, tetapi bisa membantu)
    await page.click('.modal-body textarea.form-control');

    // Ambil isi dari textarea
    const modalContent = await page.evaluate(() => {
      const textarea = document.querySelector('.modal-body textarea.form-control'); // Ambil elemen textarea
      return textarea ? textarea.value : ''; // Kembalikan nilai textarea jika ada
    });

    // Simpan isi modal ke dalam file proxies.txt, menimpa isi yang lama
    require('fs').writeFileSync('proxies.txt', modalContent, 'utf-8');
    console.log('Isi modal raw proxy data saved to proxies.txt');
  } catch (error) {
    console.error('Failed to scrape modal content:', error);
  } finally {
    await browser.close();
  }
};

scrapeProxyModalContent();

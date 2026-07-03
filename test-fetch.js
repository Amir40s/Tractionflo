const fs = require('fs');
const url = 'https://tractionflo.com';

fetch(url)
  .then(res => res.text())
  .then(html => {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    $('script, style, svg, noscript, iframe, nav, footer, header').remove();
    const markdown = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
    fs.writeFileSync('test-output.txt', markdown);
    console.log("Wrote extracted text to test-output.txt");
  })
  .catch(console.error);

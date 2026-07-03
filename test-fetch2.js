const fs = require('fs');
const url = 'https://tractionflo.com';

fetch(url)
  .then(res => res.text())
  .then(html => {
    fs.writeFileSync('test-html.txt', html);
    console.log("Wrote raw HTML to test-html.txt");
  })
  .catch(console.error);

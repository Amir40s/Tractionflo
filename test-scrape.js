const cheerio = require('cheerio');

const html = `
<html>
<body>
  <div class="hero">
    <h1>TractionFlo</h1>
    <p>Welcome to the system.</p>
  </div>
  <div class="faq" style="display: none;">
    <h2>Questions Before You Join</h2>
    <div>
      <h3>Is this just another chatbot?</h3>
      <p>No. TractionFlo is a full revenue system that captures intent, qualifies leads, takes action, and collects payment — not a single auto-reply bot.</p>
    </div>
    <div>
      <h3>Do I have to switch tools?</h3>
      <p>Nope! You can keep your existing stack.</p>
    </div>
  </div>
</body>
</html>
`;

const $ = cheerio.load(html);
$('script, style, svg, noscript, iframe, nav, footer, header').remove();
const rawText = $('body').text();
const markdown = rawText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
console.log("EXTRACTED TEXT:");
console.log(markdown);

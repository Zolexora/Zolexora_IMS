const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'client');
const indexHtml = fs.readFileSync(path.join(clientDir, 'Index.html'), 'utf8');
const stylesHtml = fs.readFileSync(path.join(clientDir, 'Styles.html'), 'utf8');
const jsHtml = fs.readFileSync(path.join(clientDir, 'JavaScript.html'), 'utf8');

let fullHtml = indexHtml
  .replace("<?!= include('client/Styles'); ?>", () => stylesHtml)
  .replace("<?!= include('client/JavaScript'); ?>", () => jsHtml);

const outContent = `export const APP_HTML = ${JSON.stringify(fullHtml)};\n`;
fs.writeFileSync(path.join(__dirname, 'ui.js'), outContent, 'utf8');
console.log(`Successfully bundled ui.js (${outContent.length} bytes)`);

const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'client/Index.html'), 'utf8');
const cssHtml = fs.readFileSync(path.join(__dirname, 'client/CSS.html'), 'utf8');
const jsHtml = fs.readFileSync(path.join(__dirname, 'client/JavaScript.html'), 'utf8');

// Inline CSS and JavaScript
let bundledHtml = indexHtml.replace('<?!= include(\'CSS\'); ?>', cssHtml);
bundledHtml = bundledHtml.replace('<?!= include(\'JavaScript\'); ?>', jsHtml);

const outputJs = `// Auto-generated Platform Admin UI Bundle
export const APP_HTML = ${JSON.stringify(bundledHtml)};
`;

fs.writeFileSync(path.join(__dirname, 'ui.js'), outputJs, 'utf8');
console.log('Successfully bundled admin/ui.js (' + outputJs.length + ' bytes)');

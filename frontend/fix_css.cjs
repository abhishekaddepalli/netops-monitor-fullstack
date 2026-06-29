const fs = require('fs');
let c = fs.readFileSync('src/styles/app.css', 'utf8');

c = c.replace(/@media \(max-width: 768px\) \{\s*\.topbar \{\s*flex-wrap: nowrap !important;[\s\S]*?\}\s*\}/g, `@media (max-width: 768px) {
  .topbar { flex-wrap: nowrap !important; gap: 8px !important; }
  .page-title { display: none !important; }
  .search-box { order: 0 !important; min-width: 0 !important; width: 100% !important; margin-top: 0 !important; flex: 1 !important; }
}`);

c = c.replace(/\}\s*\}\s*gap: 8px !important;[\s\S]*?\}/g, '}');
c = c.replace(/\.search-box \{\s*order: 0 !important;\s*min-width: 0 !important;\s*width: 100% !important;\s*margin-top: 0 !important;\s*flex: 1 !important;\s*\}/g, '.search-box { order: 0 !important; min-width: 0 !important; width: 100% !important; margin-top: 0 !important; flex: 1 !important; }');
c = c.replace(/\.empty-state/g, '}\n\n.empty-state');
c = c.replace(/\}\s*\}\s*\}\s*\.empty-state/g, '}\n\n.empty-state');

fs.writeFileSync('src/styles/app.css', c);
console.log('CSS fixed.');

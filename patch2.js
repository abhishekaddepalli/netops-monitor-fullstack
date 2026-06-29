const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AdminPlans.jsx', 'utf8');

// The pattern for the label
const regex = /<label key=\{([^\}]+)\} style=\{\{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: isSelected \? 'var\(--white-90\)' : 'var\(--white-60\)' \}\}>\s*\{isSelected \? <CheckSquare[^>]+> : <Square[^>]+>\}\s*<span[^>]+>\{([^\}]+)\}<\/span>\s*<input[^>]+onChange=\{([^}]+)\}[^>]+>\s*<\/label>/g;

code = code.replace(regex, (match, key, labelVal, onChangeBody) => {
  return `<label key={${key}} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={${onChangeBody}} 
                  style={{ width: 16, height: 16, accentColor: 'var(--primary-500)' }}
                />
                <span style={{ fontSize: 13 }}>{${labelVal}}</span>
              </label>`;
});

fs.writeFileSync('frontend/src/pages/AdminPlans.jsx', code);
console.log('patched');

const babel = require('@babel/core');
const fs = require('fs');

const code = fs.readFileSync('src/pages/MonitorDetail.jsx', 'utf8');

const transformed = babel.transformSync(code, {
  presets: ['@babel/preset-react'],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs']
  ],
  filename: 'MonitorDetail.jsx'
});

fs.writeFileSync('MonitorDetail-compiled.js', transformed.code);
console.log('Compiled!');

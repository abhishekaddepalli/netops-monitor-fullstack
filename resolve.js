const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const rawSourceMap = JSON.parse(fs.readFileSync('frontend/dist/assets/index-DFV9ENb-.js.map', 'utf8'));

SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 24454,
    column: 18
  });
  console.log(pos);
});

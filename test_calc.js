const timeDiffMs = 81000; // 81 seconds diff
const prevIn = 4244057331;
const currIn = 4258351933;

const bytesIn = Math.max(0, currIn - prevIn);
const seconds = timeDiffMs / 1000;
const mbpsIn = ((bytesIn * 8) / (seconds * 1000000)).toFixed(2);
console.log('mbpsIn:', mbpsIn);

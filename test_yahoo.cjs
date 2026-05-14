const https = require('https');

https.get('https://query2.finance.yahoo.com/v8/finance/chart/6016.TWO?interval=1m&range=1d', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Data:", data.substring(0, 500));
  });
}).on('error', err => {
  console.log("Error:", err.message);
});

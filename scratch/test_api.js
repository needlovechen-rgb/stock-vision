
async function test() {
  const stockId = '2330';
  const startDate = '2024-01-01';
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${startDate}`;
  
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      console.log('Fields:', Object.keys(json.data[0]));
      console.log('Sample Data (last 3):', json.data.slice(-3));
    } else {
      console.log('No data found:', json);
    }
  } catch (e) {
    console.error('Fetch Error:', e);
  }
}

test();

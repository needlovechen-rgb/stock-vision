

async function testFinMind(stockId) {
  try {
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=2024-11-01`;
    const res = await fetch(url);
    const json = await res.json();
    console.log("TaiwanStockPrice 2024-11-01:", json.data.slice(0, 2));
    
    const infoUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo`;
    const infoRes = await fetch(infoUrl);
    const infoJson = await infoRes.json();
    const stockInfo = infoJson.data.find(d => d.stock_id === stockId);
    console.log("TaiwanStockInfo:", stockInfo);
    
    // Check BVPS using FinancialStatements
    const bsUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockBalanceSheet&data_id=${stockId}&start_date=2024-01-01`;
    const bsRes = await fetch(bsUrl);
    const bsJson = await bsRes.json();
    const bsTypes = [...new Set(bsJson.data.map(d => d.type))];
    console.log("Balance Sheet Types:", bsTypes.slice(0, 50));
    
  } catch (e) {
    console.error(e);
  }
}

testFinMind('2330');

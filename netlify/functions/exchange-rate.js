require('dotenv').config();
const axios = require('axios');

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'your-api-key-here';
const API_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`;


let cachedRates = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 29 * 60 * 1000;

exports.handler = async (event, context) => {
  try {
    const now = Date.now();

 
    if (cachedRates && lastFetchTime && now - lastFetchTime < CACHE_DURATION_MS) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ rates: cachedRates })
      };
    }

   
    const response = await axios.get(API_URL);
    if (response.status !== 200 || !response.data || response.data.result !== 'success') {
      throw new Error('Failed to fetch exchange rates');
    }

    const rates = response.data.conversion_rates;

   
    const validRates = {};
    Object.keys(rates).forEach(code => {
      const rate = parseFloat(rates[code]);
      if (!isNaN(rate) && rate > 0) {
        validRates[code] = rate;
      }
    });

    cachedRates = validRates;
    lastFetchTime = now;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ rates: validRates })
    };
  } catch (err) {
    console.error('Error fetching exchange rates:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch exchange rates: ' + err.message })
    };
  }
};
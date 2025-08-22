require('dotenv').config();
const axios = require('axios');

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const API_URL = EXCHANGE_RATE_API_KEY
  ? `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`
  : null;

let cachedRates = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 29 * 60 * 1000; // 29 minutes

exports.handler = async (event, context) => {
  try {
    
    if (!EXCHANGE_RATE_API_KEY || EXCHANGE_RATE_API_KEY === 'your-api-key-here') {
      console.error('Environment variable EXCHANGE_RATE_API_KEY is not set or invalid');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Server configuration error: API key is missing' })
      };
    }

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

    const response = await axios.get(API_URL, {
      timeout: 5000
    });

    if (response.status !== 200 || !response.data || response.data.result !== 'success') {
      console.error('API response error:', response.data?.error || 'Unknown error');
      throw new Error(response.data?.error || 'Failed to fetch exchange rates');
    }

    const rates = response.data.conversion_rates;

    const validRates = {};
    Object.keys(rates).forEach(code => {
      const rate = parseFloat(rates[code]);
      if (!isNaN(rate) && rate > 0) {
        validRates[code] = rate;
      }
    });

    if (Object.keys(validRates).length === 0) {
      throw new Error('No valid rates received from API');
    }

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
    console.error('Error in exchange-rate function:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: `Failed to fetch exchange rates: ${err.message}` })
    };
  }
};
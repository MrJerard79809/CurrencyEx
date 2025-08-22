// netlify/functions/exchange-rate.js

const axios = require('axios');

// Get API key from environment variables
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;

// Constants for caching and API URL
const CACHE_DURATION_MS = 29 * 60 * 1000; // 29 minutes
const API_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`;

// In-memory cache variables
let cachedRates = null;
let lastFetchTime = null;

// CORS headers
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // Allows requests from any origin
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  // Handle pre-flight CORS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // 1. Validate API Key
    if (!EXCHANGE_RATE_API_KEY || EXCHANGE_RATE_API_KEY === 'your-api-key-here') {
      console.error('Environment variable EXCHANGE_RATE_API_KEY is not set or invalid.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: API key is missing.' })
      };
    }

    const now = Date.now();

    // 2. Check and serve from cache
    if (cachedRates && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION_MS) {
      console.log('Serving from cache.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ rates: cachedRates })
      };
    }

    // 3. Fetch from external API
    console.log('Fetching new rates from external API.');
    const response = await axios.get(API_URL, {
      timeout: 5000 // Set a reasonable timeout for the request
    });

    const apiData = response.data;

    // 4. Validate API response
    if (response.status !== 200 || !apiData || apiData.result !== 'success' || !apiData.conversion_rates) {
      const errorMessage = apiData?.['error-type'] || 'Unknown error';
      console.error('API response error:', errorMessage);
      return {
        statusCode: 502, // Bad Gateway status code for external API errors
        headers,
        body: JSON.stringify({ error: `Failed to fetch exchange rates: ${errorMessage}` })
      };
    }

    // 5. Sanitize and store rates
    const rawRates = apiData.conversion_rates;
    const validRates = Object.keys(rawRates).reduce((acc, code) => {
      const rate = parseFloat(rawRates[code]);
      // Use isFinite for more robust validation against NaN, Infinity, etc.
      if (Number.isFinite(rate) && rate > 0) {
        acc[code] = rate;
      }
      return acc;
    }, {});

    if (Object.keys(validRates).length === 0) {
      console.error('No valid rates received from API after sanitization.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to process rates from API.' })
      };
    }

    // Update in-memory cache
    cachedRates = validRates;
    lastFetchTime = now;

    // 6. Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ rates: validRates })
    };

  } catch (err) {
    // 7. Centralized error handling
    console.error('Caught error in exchange-rate function:', err.message);
    const statusCode = err.response?.status || 500;
    const errorBody = {
      error: err.response?.data?.error || `Server error: ${err.message}`
    };

    return {
      statusCode,
      headers,
      body: JSON.stringify(errorBody)
    };
  }
};
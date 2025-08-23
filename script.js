const API_BASE_URL = '/.netlify/functions/exchange-rate';
const DEBOUNCE_MS = 300;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;

const KEYS = {
  allRates: 'forex_cached_rates',
  lastUpdate: 'forex_last_update',
  nextRefresh: 'forex_next_refresh',
  serverOffset: 'forex_server_offset',
  dailyCount: 'forex_daily_count',
  lastResetDay: 'forex_last_reset_day',
  theme: 'forex_theme',
};

let allRates = {};
let countdownInterval = null;
let debounceTimeout = null;
let isSwapping = false;
let dailyCount = 0;
let serverOffsetMs = 0; 

const CURRENCY_NAMES = {
  AED: 'United Arab Emirates Dirham',
  AFN: 'Afghan Afghani',
  ALL: 'Albanian Lek',
  AMD: 'Armenian Dram',
  ANG: 'Netherlands Antillean Guilder',
  AOA: 'Angolan Kwanza',
  ARS: 'Argentine Peso',
  AUD: 'Australian Dollar',
  AWG: 'Aruban Florin',
  AZN: 'Azerbaijani Manat',
  BAM: 'Bosnia-Herzegovina Convertible Mark',
  BBD: 'Barbadian Dollar',
  BDT: 'Bangladeshi Taka',
  BGN: 'Bulgarian Lev',
  BHD: 'Bahraini Dinar',
  BIF: 'Burundian Franc',
  BMD: 'Bermudan Dollar',
  BND: 'Brunei Dollar',
  BOB: 'Bolivian Boliviano',
  BRL: 'Brazilian Real',
  BSD: 'Bahamian Dollar',
  BTN: 'Bhutanese Ngultrum',
  BWP: 'Botswanan Pula',
  BYN: 'Belarusian Ruble',
  BZD: 'Belize Dollar',
  CAD: 'Canadian Dollar',
  CDF: 'Congolese Franc',
  CHF: 'Swiss Franc',
  CLP: 'Chilean Peso',
  CNY: 'Chinese Yuan',
  COP: 'Colombian Peso',
  CRC: 'Costa Rican Colón',
  CUP: 'Cuban Peso',
  CVE: 'Cape Verdean Escudo',
  CZK: 'Czech Koruna',
  DJF: 'Djiboutian Franc',
  DKK: 'Danish Krone',
  DOP: 'Dominican Peso',
  DZD: 'Algerian Dinar',
  EGP: 'Egyptian Pound',
  ERN: 'Eritrean Nakfa',
  ETB: 'Ethiopian Birr',
  EUR: 'Euro',
  FJD: 'Fijian Dollar',
  FKP: 'Falkland Islands Pound',
  GBP: 'British Pound Sterling',
  GEL: 'Georgian Lari',
  GHS: 'Ghanaian Cedi',
  GIP: 'Gibraltar Pound',
  GMD: 'Gambian Dalasi',
  GNF: 'Guinean Franc',
  GTQ: 'Guatemalan Quetzal',
  GYD: 'Guyanese Dollar',
  HKD: 'Hong Kong Dollar',
  HNL: 'Honduran Lempira',
  HRK: 'Croatian Kuna',
  HTG: 'Haitian Gourde',
  HUF: 'Hungarian Forint',
  IDR: 'Indonesian Rupiah',
  ILS: 'Israeli Shekel',
  INR: 'Indian Rupee',
  IQD: 'Iraqi Dinar',
  IRR: 'Iranian Rial',
  ISK: 'Icelandic Króna',
  JMD: 'Jamaican Dollar',
  JOD: 'Jordanian Dinar',
  JPY: 'Japanese Yen',
  KES: 'Kenyan Shilling',
  KGS: 'Kyrgystani Som',
  KHR: 'Cambodian Riel',
  KMF: 'Comorian Franc',
  KPW: 'North Korean Won',
  KRW: 'South Korean Won',
  KWD: 'Kuwaiti Dinar',
  KYD: 'Cayman Islands Dollar',
  KZT: 'Kazakhstani Tenge',
  LAK: 'Laotian Kip',
  LBP: 'Lebanese Pound',
  LKR: 'Sri Lankan Rupee',
  LRD: 'Liberian Dollar',
  LSL: 'Lesotho Loti',
  LYD: 'Libyan Dinar',
  MAD: 'Moroccan Dirham',
  MDL: 'Moldovan Leu',
  MGA: 'Malagasy Ariary',
  MKD: 'Macedonian Denar',
  MMK: 'Myanmar Kyat',
  MNT: 'Mongolian Tugrik',
  MOP: 'Macanese Pataca',
  MRU: 'Mauritanian Ouguiya',
  MUR: 'Mauritian Rupee',
  MVR: 'Maldivian Rufiyaa',
  MWK: 'Malawian Kwacha',
  MXN: 'Mexican Peso',
  MYR: 'Malaysian Ringgit',
  MZN: 'Mozambican Metical',
  NAD: 'Namibian Dollar',
  NGN: 'Nigerian Naira',
  NIO: 'Nicaraguan Córdoba',
  NOK: 'Norwegian Krone',
  NPR: 'Nepalese Rupee',
  NZD: 'New Zealand Dollar',
  OMR: 'Omani Rial',
  PAB: 'Panamanian Balboa',
  PEN: 'Peruvian Sol',
  PGK: 'Papua New Guinean Kina',
  PHP: 'Philippine Peso',
  PKR: 'Pakistani Rupee',
  PLN: 'Polish Złoty',
  PYG: 'Paraguayan Guarani',
  QAR: 'Qatari Rial',
  RON: 'Romanian Leu',
  RSD: 'Serbian Dinar',
  RUB: 'Russian Ruble',
  RWF: 'Rwandan Franc',
  SAR: 'Saudi Riyal',
  SBD: 'Solomon Islands Dollar',
  SCR: 'Seychellois Rupee',
  SDG: 'Sudanese Pound',
  SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar',
  SHP: 'St. Helena Pound',
  SLL: 'Sierra Leonean Leone',
  SOS: 'Somali Shilling',
  SRD: 'Surinamese Dollar',
  SSP: 'South Sudanese Pound',
  STN: 'São Tomé & Príncipe Dobra',
  SVC: 'Salvadoran Colón',
  SYP: 'Syrian Pound',
  SZL: 'Eswatini Lilangeni',
  THB: 'Thai Baht',
  TJS: 'Tajikistani Somoni',
  TMT: 'Turkmenistani Manat',
  TND: 'Tunisian Dinar',
  TOP: 'Tongan Paʻanga',
  TRY: 'Turkish Lira',
  TTD: 'Trinidad & Tobago Dollar',
  TWD: 'New Taiwan Dollar',
  TZS: 'Tanzanian Shilling',
  UAH: 'Ukrainian Hryvnia',
  UGX: 'Ugandan Shilling',
  USD: 'US Dollar',
  UYU: 'Uruguayan Peso',
  UZS: 'Uzbekistani Som',
  VES: 'Venezuelan Bolívar',
  VND: 'Vietnamese Đồng',
  VUV: 'Vanuatu Vatu',
  WST: 'Samoan Tala',
  XAF: 'Central African CFA Franc',
  XCD: 'East Caribbean Dollar',
  XOF: 'West African CFA Franc',
  XPF: 'CFP Franc',
  YER: 'Yemeni Rial',
  ZAR: 'South African Rand',
  ZMW: 'Zambian Kwacha',
  ZWL: 'Zimbabwean Dollar',
};

const DOMElements = {
  amount: document.getElementById('amount'),
  fromCurrency: document.getElementById('fromCurrency'),
  toCurrency: document.getElementById('toCurrency'),
  fromCurrencySearch: document.getElementById('fromCurrencySearch'),
  toCurrencySearch: document.getElementById('toCurrencySearch'),
  convertResult: document.getElementById('convertResult'),
  ratesContainer: document.getElementById('ratesContainer'),
  lastUpdate: document.getElementById('lastUpdate'),
  loadingText: document.getElementById('loadingText'),
  countdown: document.getElementById('countdown'),
  swapBtn: document.getElementById('swapBtn'),
  themeToggle: document.getElementById('themeToggle'),
  year: document.getElementById('year'),
  errorToast: document.getElementById('errorToast'),
  errorToastMessage: document.getElementById('errorToastMessage'),
  dismissToast: document.getElementById('dismissToast'),
};

const Utils = {
  formatTime(timestamp) {
    const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    if (!ts || isNaN(ts) || ts <= 0) return 'Never';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Never';
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return 'Never';
    }
  },

  showError(message) {
    if (DOMElements.errorToast && DOMElements.errorToastMessage) {
      DOMElements.errorToastMessage.textContent = message;
      DOMElements.errorToast.classList.add('show');
      DOMElements.errorToast.setAttribute('aria-live', 'assertive');
      setTimeout(() => DOMElements.errorToast.classList.remove('show'), 5000);
    }
  },

  hideError() {
    if (DOMElements.errorToast) {
      DOMElements.errorToast.classList.remove('show');
    }
  },

  saveToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  },

  getFromLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
      return null;
    }
  },

  getServerTime() {
    return Date.now() + serverOffsetMs;
  },
};

function initApp() {
  const today = new Date().toISOString().split('T')[0];
  const lastResetDay = Utils.getFromLocalStorage(KEYS.lastResetDay);
  if (lastResetDay !== today) {
    dailyCount = 0;
    Utils.saveToLocalStorage(KEYS.dailyCount, '0');
    Utils.saveToLocalStorage(KEYS.lastResetDay, today);
  } else {
    dailyCount = parseInt(Utils.getFromLocalStorage(KEYS.dailyCount) || '0', 10);
  }

  const storedOffset = Utils.getFromLocalStorage(KEYS.serverOffset);
  if (storedOffset) {
    serverOffsetMs = parseInt(storedOffset, 10) || 0;
  }
}

function updateLastUpdated(timestamp) {
  const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
  if (isNaN(ts) || ts <= 0) return;
  Utils.saveToLocalStorage(KEYS.lastUpdate, ts.toString());
  if (DOMElements.lastUpdate) {
    DOMElements.lastUpdate.textContent = Utils.formatTime(ts);
  }
}

function updateThemeToggle(theme) {
  if (DOMElements.themeToggle) {
    DOMElements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    DOMElements.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }
}

function displayAllRates() {
  if (!DOMElements.ratesContainer) return;
  DOMElements.ratesContainer.innerHTML = '';
  if (Object.keys(allRates).length === 0) {
    DOMElements.ratesContainer.innerHTML = '<div class="no-rates" role="alert">No exchange rates available</div>';
    return;
  }

  const codes = Object.keys(allRates).sort();
  const fragment = document.createDocumentFragment();

  codes.forEach((code) => {
    if (code === 'USD') return; 
    const rate = allRates[code];
    if (!Number.isFinite(rate) || rate <= 0) return;

    const card = document.createElement('div');
    card.className = 'rate-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', `${CURRENCY_NAMES[code] || code}: 1 USD = ${rate.toFixed(4)} ${code}`);

    card.innerHTML = `
      <div class="rate-header">
        <span class="currency-code">${code}</span>
      </div>
      <div class="rate-value">${rate.toFixed(4)}</div>
      <div class="currency-name" title="${CURRENCY_NAMES[code] || 'Unknown'}">
        ${CURRENCY_NAMES[code] || 'Unknown'}
      </div>
      <div class="rate-base">per USD</div>
    `;
    fragment.appendChild(card);
  });

  DOMElements.ratesContainer.appendChild(fragment);
}

function populateCurrencies(selectedFrom, selectedTo) {
  const { fromCurrency, toCurrency } = DOMElements;
  if (!fromCurrency || !toCurrency) return;
  const codes = ['USD', ...Object.keys(allRates).filter((c) => c !== 'USD').sort()];
  function fillSelect(select, selected) {
    select.innerHTML = '';
    const frag = document.createDocumentFragment();
    codes.forEach((code) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${code} - ${CURRENCY_NAMES[code] || code}`;
      frag.appendChild(opt);
    });
    select.appendChild(frag);
    if (selected && codes.includes(selected)) select.value = selected;
  }
  fillSelect(fromCurrency, selectedFrom || 'USD');
  fillSelect(toCurrency, selectedTo || 'EUR');
  convertCurrency();
}

function startPreciseCountdown(nextRefreshTimestamp) {

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  let animationFrameId = null;
  let lastSecond = -1;

  const updateCountdown = () => {

    const currentServerTime = Utils.getServerTime();
    const remainingMs = nextRefreshTimestamp - currentServerTime;

    if (remainingMs <= 0) {

      if (DOMElements.countdown) {
        DOMElements.countdown.textContent = 'Refreshing...';
      }
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      fetchRates();
      return;
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (totalSeconds !== lastSecond) {
      lastSecond = totalSeconds;
      if (DOMElements.countdown) {
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        DOMElements.countdown.textContent = timeString;
      }
    }

    animationFrameId = requestAnimationFrame(updateCountdown);
  };

  updateCountdown();

  countdownInterval = {
    stop: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  };
}

async function fetchRates(retryCount = 0) {
  if (dailyCount >= 50) {
    Utils.showError(`Daily limit reached.`);
    return;
  }

  if (DOMElements.loadingText) DOMElements.loadingText.style.display = 'block';

  const clientRequestTime = Date.now();

  try {
    const res = await fetch(API_BASE_URL, { signal: AbortSignal.timeout(10000) });
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type');
    }
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (!data.rates || typeof data.rates !== 'object') throw new Error('Invalid data');

    const clientResponseTime = Date.now();
    const networkLatency = (clientResponseTime - clientRequestTime) / 2;
    const estimatedServerTime = data.server_timestamp + networkLatency;
    serverOffsetMs = estimatedServerTime - clientResponseTime;
    Utils.saveToLocalStorage(KEYS.serverOffset, serverOffsetMs.toString());

    allRates = {};
    Object.entries(data.rates).forEach(([code, rate]) => {
      const num = parseFloat(rate);
      if (Number.isFinite(num) && num > 0) allRates[code] = num;
    });

    if (Object.keys(allRates).length === 0) throw new Error('No valid rates');

    dailyCount++;
    Utils.saveToLocalStorage(KEYS.dailyCount, dailyCount.toString());
    Utils.saveToLocalStorage(KEYS.allRates, JSON.stringify(allRates));

    const { last_updated, next_refresh } = data;

    updateLastUpdated(last_updated);
    Utils.saveToLocalStorage(KEYS.nextRefresh, next_refresh.toString());

    displayAllRates();
    populateCurrencies();

    startPreciseCountdown(next_refresh);

    Utils.hideError();
  } catch (err) {
    if (retryCount < MAX_RETRIES && !err.message.includes('429')) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      setTimeout(() => fetchRates(retryCount + 1), delay);
      return;
    }

    Utils.showError('Using cached data...');
    loadFromLocalStorage();
  } finally {
    if (DOMElements.loadingText) DOMElements.loadingText.style.display = 'none';
  }
}

function loadFromLocalStorage() {
  const savedRates = Utils.getFromLocalStorage(KEYS.allRates);
  const nextRefreshStr = Utils.getFromLocalStorage(KEYS.nextRefresh);
  const lastUpdateStr = Utils.getFromLocalStorage(KEYS.lastUpdate);
  
  if (!savedRates || !nextRefreshStr || !lastUpdateStr) return false;

  try {
    const parsed = JSON.parse(savedRates);
    allRates = {};
    Object.keys(parsed).forEach((code) => {
      const rate = parseFloat(parsed[code]);
      if (Number.isFinite(rate) && rate > 0) allRates[code] = rate;
    });

    if (Object.keys(allRates).length === 0) return false;

    displayAllRates();
    populateCurrencies();

    // Update "Last Update" timestamp for valid cached data
    updateLastUpdated(lastUpdateStr);

    const nextRefresh = parseInt(nextRefreshStr, 10);
    if (!isNaN(nextRefresh)) {
      startPreciseCountdown(nextRefresh);
    }
    return true;
  } catch {
    return false;
  }
}

function convertCurrency() {
  const { amount, fromCurrency, toCurrency, convertResult } = DOMElements;
  if (!amount || !fromCurrency || !toCurrency || !convertResult) return;
  const val = parseFloat(amount.value);
  if (!Number.isFinite(val) || val <= 0) {
    convertResult.textContent = 'Enter amount';
    return;
  }
  const from = fromCurrency.value;
  const to = toCurrency.value;
  const fromRate = from === 'USD' ? 1 : allRates[from];
  const toRate = to === 'USD' ? 1 : allRates[to];
  if ((from !== 'USD' && !fromRate) || (to !== 'USD' && !toRate)) {
    convertResult.textContent = 'Rate not available';
    return;
  }
  const result = (val / fromRate) * toRate;
  convertResult.textContent = `= ${result.toFixed(4)} ${to}`;
}

function swapCurrencies() {
  if (isSwapping) return;
  isSwapping = true;
  if (DOMElements.swapBtn) DOMElements.swapBtn.disabled = true;

  const { fromCurrency, toCurrency } = DOMElements;
  const fromVal = fromCurrency.value;
  const toVal = toCurrency.value;

  fromCurrency.value = toVal;
  toCurrency.value = fromVal;

  convertCurrency();
  setTimeout(() => (isSwapping = false), 300);
  if (DOMElements.swapBtn) DOMElements.swapBtn.disabled = false;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  Utils.saveToLocalStorage(KEYS.theme, next);
  updateThemeToggle(next);
}

function setupEventListeners() {
  const { amount, fromCurrency, toCurrency, swapBtn, themeToggle, dismissToast } = DOMElements;

  if (amount) amount.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(convertCurrency, DEBOUNCE_MS);
  });
  if (fromCurrency) fromCurrency.addEventListener('change', convertCurrency);
  if (toCurrency) toCurrency.addEventListener('change', convertCurrency);
  if (swapBtn) swapBtn.addEventListener('click', swapCurrencies);
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  if (dismissToast) dismissToast.addEventListener('click', Utils.hideError);

  window.addEventListener('beforeunload', () => {
    if (countdownInterval && countdownInterval.stop) {
      countdownInterval.stop();
    }
  });
}

// NEW: Smart cache validation function
function isCacheExpired() {
  const nextRefreshStr = Utils.getFromLocalStorage(KEYS.nextRefresh);
  if (!nextRefreshStr) return true; // No cache = expired
  
  const nextRefresh = parseInt(nextRefreshStr, 10);
  if (isNaN(nextRefresh)) return true; // Invalid cache = expired
  
  const currentServerTime = Utils.getServerTime();
  return currentServerTime >= nextRefresh; // Expired if current time >= next refresh
}

// NEW: Initialize data on app startup
async function initializeData() {
  const savedRates = Utils.getFromLocalStorage(KEYS.allRates);
  const hasValidCache = savedRates && !isCacheExpired();
  
  if (hasValidCache) {
    // Cache is valid - load from localStorage and update UI
    console.log('Using valid cached data');
    const success = loadFromLocalStorage();
    if (!success) {
      // Cache corrupted, fetch fresh data
      console.log('Cache corrupted, fetching fresh data');
      await fetchRates();
    }
  } else {
    // Cache expired or doesn't exist - fetch fresh data
    console.log('Cache expired or missing, fetching fresh data');
    await fetchRates();
    
    // If fetch failed, fall back to cached data (graceful degradation)
    if (Object.keys(allRates).length === 0 && savedRates) {
      console.log('Fetch failed, falling back to cached data');
      Utils.showError('Using cached data due to network issues');
      loadFromLocalStorage();
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (DOMElements.year) DOMElements.year.textContent = new Date().getFullYear();

  initApp();
  setupEventListeners();

  // Initialize data with smart cache validation
  await initializeData();

  // Theme setup
  const savedTheme = Utils.getFromLocalStorage(KEYS.theme);
  if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggle(theme);
    Utils.saveToLocalStorage(KEYS.theme, theme);
  }
});
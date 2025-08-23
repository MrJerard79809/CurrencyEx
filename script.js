// === FULLY WORKING FRONTEND: Shows ALL Currencies ===
const API_BASE_URL = '/.netlify/functions/exchange-rate';
const DEBOUNCE_MS = 300;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;
const COLD_START_TIMEOUT_MS = 15000; // 15 seconds

// LocalStorage Keys
const KEYS = {
  allRates: 'forex_cached_rates',
  lastUpdate: 'forex_last_update',
  nextRefresh: 'forex_next_refresh',
  serverOffset: 'forex_server_offset',
  dailyCount: 'forex_daily_count',
  lastResetDay: 'forex_last_reset_day',
  theme: 'forex_theme',
};

// DOM Elements (ensure your HTML has these IDs)
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

// Safe Storage Wrapper (localStorage fallback)
const SafeStorage = {
  _isAvailable: null,
  _memoryStore: new Map(),

  _checkAvailability() {
    if (this._isAvailable !== null) return this._isAvailable;
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      this._isAvailable = true;
    } catch (e) {
      this._isAvailable = false;
    }
    return this._isAvailable;
  },

  setItem(key, value) {
    if (this._checkAvailability()) {
      try {
        localStorage.setItem(key, String(value));
      } catch (e) {
        this._memoryStore.set(key, String(value));
      }
    } else {
      this._memoryStore.set(key, String(value));
    }
  },

  getItem(key) {
    if (this._checkAvailability()) {
      return localStorage.getItem(key);
    }
    return this._memoryStore.get(key) || null;
  },
};

// Utility Functions
const Utils = {
  // Format timestamp safely (iOS-compatible)
  formatTime(timestamp) {
    const ts = parseInt(timestamp, 10);
    if (!ts || isNaN(ts) || ts <= 0) return 'Never';

    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Never';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
  },

  // Show error toast
  showError(message) {
    if (DOMElements.errorToastMessage) {
      DOMElements.errorToastMessage.textContent = message;
    }
    if (DOMElements.errorToast) {
      DOMElements.errorToast.classList.add('show');
      setTimeout(() => DOMElements.errorToast.classList.remove('show'), 5000);
    }
  },

  // Hide error toast
  hideError() {
    if (DOMElements.errorToast) {
      DOMElements.errorToast.classList.remove('show');
    }
  },

  // Save to persistent or memory storage
  saveToLocalStorage(key, value) {
    SafeStorage.setItem(key, value);
  },

  // Get from storage
  getFromLocalStorage(key) {
    return SafeStorage.getItem(key);
  },

  // Get estimated server time using offset
  getServerTime() {
    return Date.now() + (parseInt(SafeStorage.getItem(KEYS.serverOffset) || '0', 10));
  },
};

// Hybrid Countdown (for iOS Safari reliability)
const HybridCountdown = {
  rafId: null,
  intervalId: null,
  targetTime: null,

  start(nextRefresh) {
    this.stop();
    this.targetTime = nextRefresh;

    const update = () => {
      this.update();
      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);

    this.intervalId = setInterval(() => this.update(), 1000);
  },

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.intervalId) clearInterval(this.intervalId);
    this.rafId = null;
    this.intervalId = null;
  },

  update() {
    if (!this.targetTime) return;
    const remaining = Math.ceil((this.targetTime - Utils.getServerTime()) / 1000);
    if (remaining <= 0) {
      if (DOMElements.countdown) DOMElements.countdown.textContent = 'Refreshing...';
      this.stop();
      fetchRates();
      return;
    }
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    if (DOMElements.countdown) {
      DOMElements.countdown.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
  },
};

// Global State
let allRates = {};
let dailyCount = 0;

// Initialize app (daily counter reset)
function initApp() {
  const today = new Date().toISOString().split('T')[0];
  const lastReset = Utils.getFromLocalStorage(KEYS.lastResetDay);
  if (lastReset !== today) {
    dailyCount = 0;
    Utils.saveToLocalStorage(KEYS.dailyCount, '0');
    Utils.saveToLocalStorage(KEYS.lastResetDay, today);
  } else {
    dailyCount = parseInt(Utils.getFromLocalStorage(KEYS.dailyCount) || '0', 10);
  }
}

// Update "Last Updated" display
function updateLastUpdated(timestamp) {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || ts <= 0) return;
  Utils.saveToLocalStorage(KEYS.lastUpdate, ts.toString());
  if (DOMElements.lastUpdate) {
    DOMElements.lastUpdate.textContent = Utils.formatTime(ts);
  }
}

// Full list of currency names
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

// Display all exchange rates in a grid
function displayAllRates() {
  if (!DOMElements.ratesContainer) return;
  DOMElements.ratesContainer.innerHTML = '';
  const codes = Object.keys(allRates).sort();
  const fragment = document.createDocumentFragment();

  codes.forEach(code => {
    const rate = allRates[code];
    if (code === 'USD' || !rate || !Number.isFinite(rate) || rate <= 0) return;

    const card = document.createElement('div');
    card.className = 'rate-card';
    card.setAttribute('role', 'article');
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

// Populate currency dropdowns with search filtering
function populateCurrencies(selectedFrom = 'USD', selectedTo = 'EUR') {
  const fromSelect = DOMElements.fromCurrency;
  const toSelect = DOMElements.toCurrency;
  if (!fromSelect || !toSelect) return;

  const codes = ['USD', ...Object.keys(allRates).filter(c => c !== 'USD').sort()];
  const fillSelect = (select, selected) => {
    select.innerHTML = '';
    codes.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${code} - ${CURRENCY_NAMES[code] || code}`;
      select.appendChild(opt);
    });
    if (selected && codes.includes(selected)) select.value = selected;
  };

  fillSelect(fromSelect, selectedFrom);
  fillSelect(toSelect, selectedTo);

  // Trigger conversion
  convertCurrency();
}

// Filter dropdown options based on search input
function setupSearchFilter() {
  const fromSearch = DOMElements.fromCurrencySearch;
  const toSearch = DOMElements.toCurrencySearch;
  const fromSelect = DOMElements.fromCurrency;
  const toSelect = DOMElements.toCurrency;

  if (fromSearch && fromSelect) {
    fromSearch.addEventListener('input', () => filterOptions(fromSearch, fromSelect));
  }
  if (toSearch && toSelect) {
    toSearch.addEventListener('input', () => filterOptions(toSearch, toSelect));
  }
}

function filterOptions(searchInput, selectElement) {
  const filter = searchInput.value.toLowerCase();
  Array.from(selectElement.options).forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(filter) ? '' : 'none';
  });
  // Ensure at least one visible
  if (selectElement.options.length > 0) {
    selectElement.size = Math.min(8, [...selectElement.options].filter(o => o.style.display !== 'none').length);
  }
}

// Currency conversion logic
function convertCurrency() {
  const amountInput = DOMElements.amount;
  const fromSelect = DOMElements.fromCurrency;
  const toSelect = DOMElements.toCurrency;
  const resultEl = DOMElements.convertResult;

  if (!amountInput || !fromSelect || !toSelect || !resultEl) return;

  const amount = parseFloat(amountInput.value);
  const from = fromSelect.value;
  const to = toSelect.value;

  if (!amount || isNaN(amount) || amount <= 0) {
    resultEl.textContent = 'Enter amount';
    return;
  }
  if (!from || !to) return;

  const fromRate = from === 'USD' ? 1 : allRates[from];
  const toRate = to === 'USD' ? 1 : allRates[to];

  if ((from !== 'USD' && !fromRate) || (to !== 'USD' && !toRate)) {
    resultEl.textContent = 'Rate not available';
    return;
  }

  const result = (amount / fromRate) * toRate;
  resultEl.textContent = `= ${result.toFixed(4)} ${to}`;
}

// Swap currencies
function swapCurrencies() {
  const fromSelect = DOMElements.fromCurrency;
  const toSelect = DOMElements.toCurrency;
  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;
  convertCurrency();
}

// Toggle dark/light theme
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  Utils.saveToLocalStorage(KEYS.theme, next);
  if (DOMElements.themeToggle) {
    DOMElements.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    DOMElements.themeToggle.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
  }
}

// Fetch rates from Netlify function
async function fetchRates(retryCount = 0) {
  if (DOMElements.loadingText) {
    DOMElements.loadingText.style.display = 'block';
  }

  try {
    const res = await fetch(API_BASE_URL, { signal: AbortSignal.timeout(10000) });
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type');
    }
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (!data.rates || typeof data.rates !== 'object') throw new Error('Invalid data format');

    // Estimate server time for accurate countdown
    const clientRequestTime = Date.now();
    const networkLatency = (clientRequestTime - data.server_timestamp) / 2;
    const estimatedOffset = data.server_timestamp + networkLatency - clientRequestTime;
    Utils.saveToLocalStorage(KEYS.serverOffset, estimatedOffset);

    // Load rates
    allRates = {};
    Object.entries(data.rates).forEach(([code, rate]) => {
      const num = parseFloat(rate);
      if (Number.isFinite(num) && num > 0) {
        allRates[code] = num;
      }
    });

    if (Object.keys(allRates).length === 0) throw new Error('No valid rates');

    // Update counters
    dailyCount++;
    Utils.saveToLocalStorage(KEYS.dailyCount, dailyCount.toString());
    Utils.saveToLocalStorage(KEYS.allRates, JSON.stringify(allRates));

    // Update UI
    updateLastUpdated(data.last_updated);
    Utils.saveToLocalStorage(KEYS.nextRefresh, data.next_refresh);
    displayAllRates();
    populateCurrencies();
    HybridCountdown.start(data.next_refresh);
    Utils.hideError();
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      setTimeout(() => fetchRates(retryCount + 1), delay);
    } else {
      Utils.showError('Using cached data...');
      loadFromLocalStorage();
    }
  } finally {
    if (DOMElements.loadingText) {
      DOMElements.loadingText.style.display = 'none';
    }
  }
}

// Load cached data
function loadFromLocalStorage() {
  const saved = Utils.getFromLocalStorage(KEYS.allRates);
  if (!saved) return false;

  try {
    const parsed = JSON.parse(saved);
    allRates = {};
    Object.entries(parsed).forEach(([code, rate]) => {
      const num = parseFloat(rate);
      if (Number.isFinite(num) && num > 0) allRates[code] = num;
    });

    if (Object.keys(allRates).length === 0) return false;

    displayAllRates();
    populateCurrencies();

    const lastUpdate = Utils.getFromLocalStorage(KEYS.lastUpdate);
    if (lastUpdate) updateLastUpdated(lastUpdate);

    const nextRefresh = parseInt(Utils.getFromLocalStorage(KEYS.nextRefresh), 10);
    if (nextRefresh && !isNaN(nextRefresh)) {
      HybridCountdown.start(nextRefresh);
    }

    return true;
  } catch (e) {
    console.error('Cache parse error:', e);
    return false;
  }
}

// Check if cache is expired
function isCacheExpired() {
  const nextRefreshStr = Utils.getFromLocalStorage(KEYS.nextRefresh);
  if (!nextRefreshStr) return true;
  const nextRefresh = parseInt(nextRefreshStr, 10);
  return isNaN(nextRefresh) || Utils.getServerTime() >= nextRefresh;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  if (DOMElements.year) {
    DOMElements.year.textContent = new Date().getFullYear();
  }

  initApp();
  setupSearchFilter();

  // Event Listeners
  DOMElements.amount?.addEventListener('input', () => {
    clearTimeout(window.convertDebounce);
    window.convertDebounce = setTimeout(convertCurrency, DEBOUNCE_MS);
  });
  DOMElements.fromCurrency?.addEventListener('change', convertCurrency);
  DOMElements.toCurrency?.addEventListener('change', convertCurrency);
  DOMElements.swapBtn?.addEventListener('click', swapCurrencies);
  DOMElements.themeToggle?.addEventListener('click', toggleTheme);
  DOMElements.dismissToast?.addEventListener('click', Utils.hideError);

  // Theme
  const savedTheme = Utils.getFromLocalStorage(KEYS.theme) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (DOMElements.themeToggle) {
    DOMElements.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }

  // Load data
  const hasValidCache = loadFromLocalStorage() && !isCacheExpired();
  if (!hasValidCache) {
    fetchRates();
  }
});
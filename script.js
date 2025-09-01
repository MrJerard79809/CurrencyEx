/**
 * Forex Rate Dashboard - Fully Synchronized Client
 * Works with empty DB, self-initializing
 */

// ✅ API Base URL (Netlify function)
const API_BASE_URL = '/.netlify/functions/exchange-rate';

// Configuration
const DEBOUNCE_MS = 300;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// LocalStorage Keys
const KEYS = {
  allRates: 'forex_cached_rates',
  currencies: 'forex_cached_currencies',
  lastUpdate: 'forex_last_update',
  nextRefresh: 'forex_next_refresh',
  serverTimestamp: 'forex_server_timestamp',
  theme: 'forex_theme',
};

// DOM References
const DOMElements = {
  amount: document.getElementById('amount'),
  fromCurrency: document.getElementById('fromCurrency'),
  toCurrency: document.getElementById('toCurrency'),
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
  searchInput: document.getElementById('searchInput'),
  fromCurrencySearch: document.getElementById('fromCurrencySearch'),
  toCurrencySearch: document.getElementById('toCurrencySearch'),
};

// Safe localStorage wrapper
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

// Server Time Sync (corrects client clock drift)
const ServerTime = {
  _serverOffset: 0,

  synchronize(serverTimestamp) {
    const clientTime = Date.now();
    this._serverOffset = serverTimestamp - clientTime;

    Utils.saveToLocalStorage(KEYS.serverTimestamp, JSON.stringify({
      serverTimestamp,
      clientTime,
      offset: this._serverOffset,
    }));
  },

  loadFromStorage() {
    try {
      const stored = Utils.getFromLocalStorage(KEYS.serverTimestamp);
      if (stored) {
        const data = JSON.parse(stored);
        const age = Date.now() - data.clientTime;
        if (age < 10 * 60 * 1000) {
          this._serverOffset = data.offset;
        }
      }
    } catch (e) {
      console.warn('Failed to load server time:', e);
    }
  },

  now() {
    return Date.now() + this._serverOffset;
  },

  formatTime(timestamp) {
    const ts = parseInt(timestamp, 10);
    if (!ts || isNaN(ts)) return 'Never';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Never';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = (hours % 12) || 12;

    return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
  }
};

// Utility Functions
const Utils = {
  formatTime: ServerTime.formatTime.bind(ServerTime),
  getServerTime: ServerTime.now.bind(ServerTime),

  showError(msg) {
    if (DOMElements.errorToastMessage) DOMElements.errorToastMessage.textContent = msg;
    if (DOMElements.errorToast) {
      DOMElements.errorToast.classList.add('show');
      setTimeout(() => DOMElements.errorToast.classList.remove('show'), 5000);
    }
  },

  hideError() {
    if (DOMElements.errorToast) DOMElements.errorToast.classList.remove('show');
  },

  saveToLocalStorage(key, value) {
    SafeStorage.setItem(key, value);
  },

  getFromLocalStorage(key) {
    return SafeStorage.getItem(key);
  },

  filterCurrencies(currencies, term) {
    if (!term || !term.trim()) return currencies;
    const t = term.toLowerCase().trim();
    return currencies.filter(c =>
      c.code.toLowerCase().includes(t) ||
      c.name.toLowerCase().includes(t)
    ).sort((a, b) => {
      const aExact = a.code.toLowerCase() === t;
      const bExact = b.code.toLowerCase() === t;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      return a.code.localeCompare(b.code);
    });
  },

  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

// Countdown Timer
const HybridCountdown = {
  rafId: null,
  intervalId: null,
  targetTime: null,

  start(nextRefreshTime) {
    this.stop();
    const next = parseInt(nextRefreshTime, 10);
    if (!next || isNaN(next)) return;

    this.targetTime = next;

    const update = () => {
      const now = ServerTime.now();
      const remainingSec = Math.ceil((this.targetTime - now) / 1000);

      if (remainingSec <= 0) {
        DOMElements.countdown.textContent = 'Refreshing...';
        this.stop();
        fetchRates(0, true);
        return;
      }

      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      DOMElements.countdown.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    };

    update();
    this.intervalId = setInterval(update, 1000);
    const rafLoop = () => {
      update();
      this.rafId = requestAnimationFrame(rafLoop);
    };
    this.rafId = requestAnimationFrame(rafLoop);
  },

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.intervalId) clearInterval(this.intervalId);
    this.rafId = null;
    this.intervalId = null;
    this.targetTime = null;
  }
};

// App State
let allRates = {};
let allCurrencies = [];
let currentSearchTerm = '';
let isFetching = false;
let fetchAbortController = null;

// Full list of currency names
const CURRENCY_NAMES = {
  USD: 'United States Dollar', EUR: 'Euro', GBP: 'British Pound Sterling', JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Yuan',
  INR: 'Indian Rupee', KRW: 'South Korean Won', SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar',
  NOK: 'Norwegian Krone', SEK: 'Swedish Krona', DKK: 'Danish Krone', NZD: 'New Zealand Dollar',
  MXN: 'Mexican Peso', BRL: 'Brazilian Real', RUB: 'Russian Ruble', ZAR: 'South African Rand',
  TRY: 'Turkish Lira', PLN: 'Polish Zloty', THB: 'Thai Baht', MYR: 'Malaysian Ringgit',
  IDR: 'Indonesian Rupiah', VND: 'Vietnamese Dong', PHP: 'Philippine Peso', CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint', ILS: 'Israeli New Shekel', CLP: 'Chilean Peso', AED: 'United Arab Emirates Dirham',
  SAR: 'Saudi Arabian Riyal', EGP: 'Egyptian Pound', QAR: 'Qatari Riyal', KWD: 'Kuwaiti Dinar',
  BHD: 'Bahraini Dinar', OMR: 'Omani Rial', JOD: 'Jordanian Dinar', LBP: 'Lebanese Pound',
  TWD: 'New Taiwan Dollar', BGN: 'Bulgarian Lev', RON: 'Romanian Leu', HRK: 'Croatian Kuna',
  RSD: 'Serbian Dinar', ISK: 'Icelandic Króna', ALL: 'Albanian Lek', BAM: 'Bosnia and Herzegovina Convertible Mark',
  MKD: 'Macedonian Denar', GEL: 'Georgian Lari', AMD: 'Armenian Dram', AZN: 'Azerbaijani Manat',
  BYN: 'Belarusian Rubel', KZT: 'Kazakhstani Tenge', UZS: 'Uzbekistani Som', KGS: 'Kyrgyzstani Som',
  TJS: 'Tajikistani Somoni', TMT: 'Turkmenistani Manat', MDL: 'Moldovan Leu', UAH: 'Ukrainian Hryvnia',
  PKR: 'Pakistani Rupee', BDT: 'Bangladeshi Taka', LKR: 'Sri Lankan Rupee', NPR: 'Nepalese Rupee',
  BTN: 'Bhutanese Ngultrum', MVR: 'Maldivian Rufiyaa', AFN: 'Afghan Afghani', IRR: 'Iranian Rial',
  IQD: 'Iraqi Dinar', SYP: 'Syrian Pound', YER: 'Yemeni Rial', MAD: 'Moroccan Dirham',
  TND: 'Tunisian Dinar', DZD: 'Algerian Dinar', LYD: 'Libyan Dinar', SDG: 'Sudanese Pound',
  ETB: 'Ethiopian Birr', KES: 'Kenyan Shilling', UGX: 'Ugandan Shilling', TZS: 'Tanzanian Shilling',
  GHS: 'Ghanaian Cedi', NGN: 'Nigerian Naira', XOF: 'West African CFA Franc', XAF: 'Central African CFA Franc',
  CDF: 'Congolese Franc', AOA: 'Angolan Kwanza', MZN: 'Mozambican Metical', ZMW: 'Zambian Kwacha',
  BWP: 'Botswanan Pula', SZL: 'Swazi Lilangeni', LSL: 'Lesotho Loti', NAD: 'Namibian Dollar',
  MWK: 'Malawian Kwacha', RWF: 'Rwandan Franc', BIF: 'Burundian Franc', DJF: 'Djiboutian Franc',
  SOS: 'Somali Shilling', ERN: 'Eritrean Nakfa', MRU: 'Mauritanian Ouguiya', GMD: 'Gambian Dalasi',
  GNF: 'Guinean Franc', SLE: 'Sierra Leonean Leone', LRD: 'Liberian Dollar', CVE: 'Cape Verdean Escudo',
  STN: 'São Tomé and Príncipe Dobra', KMF: 'Comorian Franc', SCR: 'Seychellois Rupee',
  MUR: 'Mauritian Rupee', MGA: 'Malagasy Ariary'
};

// Update "Last Updated" display
function updateLastUpdated(timestamp) {
  const formatted = Utils.formatTime(timestamp);
  Utils.saveToLocalStorage(KEYS.lastUpdate, timestamp.toString());
  if (DOMElements.lastUpdate) DOMElements.lastUpdate.textContent = formatted;
}

// Display all rates
function displayAllRates(searchTerm = '') {
  if (!DOMElements.ratesContainer) return;
  currentSearchTerm = searchTerm;
  const filtered = Utils.filterCurrencies(allCurrencies, searchTerm);
  DOMElements.ratesContainer.innerHTML = '';

  if (filtered.length === 0) {
    DOMElements.ratesContainer.innerHTML = `<div class="no-results">No results for "${searchTerm}"</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(currency => {
    if (currency.code === 'USD') return;
    const card = document.createElement('div');
    card.className = 'rate-card';
    let code = currency.code;
    let name = currency.name;
    if (searchTerm) {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      code = code.replace(regex, '<mark>$1</mark>');
      name = name.replace(regex, '<mark>$1</mark>');
    }
    card.innerHTML = `
      <div class="rate-header">
        <span class="currency-code">${code}</span>
      </div>
      <div class="rate-value">${currency.rate.toFixed(4)}</div>
      <div class="currency-name">${name}</div>
      <div class="rate-base">per USD</div>
    `;
    card.addEventListener('click', () => selectCurrencyFromCard(currency.code));
    fragment.appendChild(card);
  });
  DOMElements.ratesContainer.appendChild(fragment);
}

// Populate dropdown
function populateSelect(select, currencies, value) {
  select.innerHTML = '';
  currencies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.code} - ${c.name}`;
    select.appendChild(opt);
  });
  select.value = currencies.some(c => c.code === value) ? value : currencies[0]?.code || '';
}

function populateFromSelect(term = '') {
  const val = DOMElements.fromCurrency?.value;
  populateSelect(DOMElements.fromCurrency, Utils.filterCurrencies(allCurrencies, term), val);
  convertCurrency();
}

function populateToSelect(term = '') {
  const val = DOMElements.toCurrency?.value;
  populateSelect(DOMElements.toCurrency, Utils.filterCurrencies(allCurrencies, term), val);
  convertCurrency();
}

// Convert currency
function convertCurrency() {
  const amt = parseFloat(DOMElements.amount?.value) || 0;
  const from = DOMElements.fromCurrency?.value;
  const to = DOMElements.toCurrency?.value;
  const el = DOMElements.convertResult;
  if (!el) return;

  if (!from || !to) return el.textContent = 'Select currencies';
  if (amt <= 0) return el.textContent = 'Enter amount';

  const fromRate = from === 'USD' ? 1 : allRates[from];
  const toRate = to === 'USD' ? 1 : allRates[to];
  if (!fromRate || !toRate) return el.textContent = 'Rate missing';

  const result = (amt / fromRate) * toRate;
  if (!isFinite(result)) return el.textContent = 'Error';

  el.textContent = `= ${result.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })} ${to}`;
}

// Helper functions
function swapCurrencies() {
  [DOMElements.fromCurrency.value, DOMElements.toCurrency.value] = [DOMElements.toCurrency.value, DOMElements.fromCurrency.value];
  convertCurrency();
}

function selectCurrencyFromCard(code) {
  if (DOMElements.toCurrency) DOMElements.toCurrency.value = code;
  convertCurrency();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  Utils.saveToLocalStorage(KEYS.theme, next);
  if (DOMElements.themeToggle) DOMElements.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
}

// Fetch rates
let lastFetchTimestamp = null;
async function fetchRates(retry = 0, isManualRefresh = false) {
  if (isFetching) return;
  isFetching = true;

  if (isManualRefresh && lastFetchTimestamp) {
    const timeSinceLast = Date.now() - lastFetchTimestamp;
    if (timeSinceLast < 2000) {
      isFetching = false;
      return;
    }
  }

  if (fetchAbortController) fetchAbortController.abort();
  fetchAbortController = new AbortController();

  if (DOMElements.loadingText) {
    DOMElements.loadingText.style.display = 'block';
    DOMElements.loadingText.textContent = retry > 0
      ? `Retrying... (${retry}/${MAX_RETRIES})`
      : 'Loading latest rates...';
  }

  try {
    const res = await fetch(API_BASE_URL, {
      signal: fetchAbortController.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (!data.rates || !data.meta) throw new Error('Invalid response structure');

    // Sync time
    ServerTime.synchronize(data.meta.server_timestamp);

    // Update state
    allRates = { USD: 1, ...data.rates };
    allCurrencies = Object.keys(allRates).map(code => ({
      code,
      name: CURRENCY_NAMES[code] || code,
      rate: allRates[code]
    })).sort((a, b) => a.code.localeCompare(b.code));

    // Save to localStorage
    Utils.saveToLocalStorage(KEYS.allRates, JSON.stringify(allRates));
    Utils.saveToLocalStorage(KEYS.currencies, JSON.stringify(allCurrencies));
    Utils.saveToLocalStorage(KEYS.lastUpdate, data.meta.last_updated);
    Utils.saveToLocalStorage(KEYS.nextRefresh, data.meta.next_refresh);

    // Update UI
    updateLastUpdated(data.meta.last_updated);
    HybridCountdown.stop();
    HybridCountdown.start(data.meta.next_refresh);
    displayAllRates(currentSearchTerm);
    populateFromSelect('');
    populateToSelect('');

    if (data.meta.warning) Utils.showError(data.meta.warning);
    else Utils.hideError();

    if (DOMElements.loadingText) DOMElements.loadingText.style.display = 'none';
    lastFetchTimestamp = Date.now();
  } catch (err) {
    if (err.name === 'AbortError') {
      isFetching = false;
      return;
    }

    if (retry < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retry);
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          fetchRates(retry + 1, isManualRefresh);
        }
      }, delay);
    } else {
      Utils.showError('Failed to load rates. Using cached data if available.');
      loadStaleFromCache();
    }
  } finally {
    isFetching = false;
    fetchAbortController = null;
  }
}

// Load stale cache
function loadStaleFromCache() {
  try {
    const ratesStr = Utils.getFromLocalStorage(KEYS.allRates);
    const currenciesStr = Utils.getFromLocalStorage(KEYS.currencies);
    const lastUpdateStr = Utils.getFromLocalStorage(KEYS.lastUpdate);
    const nextRefreshStr = Utils.getFromLocalStorage(KEYS.nextRefresh);

    if (!ratesStr || !currenciesStr) return;

    allRates = JSON.parse(ratesStr);
    allCurrencies = JSON.parse(currenciesStr);

    if (!allCurrencies.some(c => c.code === 'USD')) {
      allCurrencies.unshift({ code: 'USD', name: 'United States Dollar', rate: 1 });
      allCurrencies.sort((a, b) => a.code.localeCompare(b.code));
    }

    displayAllRates(currentSearchTerm);
    populateFromSelect('');
    populateToSelect('');

    if (lastUpdateStr) updateLastUpdated(parseInt(lastUpdateStr, 10));
    if (nextRefreshStr) HybridCountdown.start(parseInt(nextRefreshStr, 10));
  } catch (e) {
    console.error('Cache load failed:', e);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (DOMElements.year) DOMElements.year.textContent = new Date().getFullYear();

  const savedTheme = Utils.getFromLocalStorage(KEYS.theme) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (DOMElements.themeToggle) DOMElements.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  // Events
  DOMElements.amount?.addEventListener('input', Utils.debounce(convertCurrency, DEBOUNCE_MS));
  DOMElements.fromCurrency?.addEventListener('change', convertCurrency);
  DOMElements.toCurrency?.addEventListener('change', convertCurrency);
  DOMElements.swapBtn?.addEventListener('click', swapCurrencies);
  DOMElements.themeToggle?.addEventListener('click', toggleTheme);
  DOMElements.dismissToast?.addEventListener('click', Utils.hideError);

  DOMElements.searchInput?.addEventListener('input', Utils.debounce(e => displayAllRates(e.target.value), DEBOUNCE_MS));
  DOMElements.fromCurrencySearch?.addEventListener('input', Utils.debounce(e => populateFromSelect(e.target.value), DEBOUNCE_MS));
  DOMElements.toCurrencySearch?.addEventListener('input', Utils.debounce(e => populateToSelect(e.target.value), DEBOUNCE_MS));

  ['searchInput', 'fromCurrencySearch', 'toCurrencySearch'].forEach(id => {
    const el = DOMElements[id];
    el?.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.target.value = '';
        e.target.dispatchEvent(new Event('input'));
      }
    });
  });

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'r') { e.preventDefault(); if (!isFetching) fetchRates(0, true); }
    if (e.ctrlKey && e.key === '/') { e.preventDefault(); DOMElements.searchInput?.focus(); }
  });

  // Init
  ServerTime.loadFromStorage();
  loadStaleFromCache();
  fetchRates();
});

// Cleanup
window.addEventListener('beforeunload', () => {
  HybridCountdown.stop();
  if (fetchAbortController) fetchAbortController.abort();
});
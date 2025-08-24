// script.js
const API_BASE_URL = '/.netlify/functions/exchange-rate';
const DEBOUNCE_MS = 300;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;
const COLD_START_TIMEOUT_MS = 15000;
const KEYS = {
  allRates: 'forex_cached_rates',
  currencies: 'forex_cached_currencies',
  lastUpdate: 'forex_last_update',
  nextRefresh: 'forex_next_refresh',
  serverOffset: 'forex_server_offset',
  theme: 'forex_theme',
};
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
const ServerTime = {
  _serverTime: null,
  _clientTimeAtSync: null,
  synchronize(serverTimestamp) {
    this._serverTime = serverTimestamp;
    this._clientTimeAtSync = Date.now();
  },
  now() {
    if (!this._serverTime || !this._clientTimeAtSync) {
      return Date.now();
    }
    const clientElapsed = Date.now() - this._clientTimeAtSync;
    return this._serverTime + clientElapsed;
  },
  formatTime(timestamp) {
    const ts = parseInt(timestamp, 10);
    if (!ts || isNaN(ts)) return 'Never';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Never';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
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
const TabActivityManager = {
  isActive: true,
  wasInactive: false,
  inactiveStartTime: null,
  refreshTimeoutId: null,
  init() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isActive = false;
        this.wasInactive = true;
        this.inactiveStartTime = Date.now();
        if (this.refreshTimeoutId) {
          clearTimeout(this.refreshTimeoutId);
          this.refreshTimeoutId = null;
        }
      } else {
        const wasInactiveTime = this.inactiveStartTime ? Date.now() - this.inactiveStartTime : 0;
        this.isActive = true;
        if (wasInactiveTime > 30000) {
          this.checkIfRefreshNeeded();
        }
        this.inactiveStartTime = null;
      }
    });
    window.addEventListener('focus', () => {
      this.isActive = true;
    });
    window.addEventListener('blur', () => {
      this.isActive = false;
    });
    window.addEventListener('beforeunload', () => {
      if (this.refreshTimeoutId) {
        clearTimeout(this.refreshTimeoutId);
        this.refreshTimeoutId = null;
      }
    });
  },
  checkIfRefreshNeeded() {
    const nextRefresh = Utils.getFromLocalStorage(KEYS.nextRefresh);
    if (!nextRefresh) return;
    const nextRefreshTime = parseInt(nextRefresh, 10);
    const currentTime = ServerTime.now();
    if (currentTime >= nextRefreshTime) {
      fetchRates();
    }
  },
  shouldPreventRefresh() {
    return !this.isActive;
  },
  scheduleRefresh(delayMs) {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }
    // The change is here: schedule the refresh even if the tab is inactive
    // It will be executed when the tab becomes active again
    this.refreshTimeoutId = setTimeout(() => {
      if (this.isActive) {
        fetchRates();
      } else {
        // Set a flag or check if a refresh is needed later
        this.checkIfRefreshNeeded();
      }
      this.refreshTimeoutId = null;
    }, delayMs);
  }
};
const Utils = {
  formatTime(timestamp) {
    return ServerTime.formatTime(timestamp);
  },
  showError(message) {
    if (DOMElements.errorToastMessage) DOMElements.errorToastMessage.textContent = message;
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
  getServerTime() {
    return ServerTime.now();
  },
  filterCurrencies(currencies, searchTerm) {
    if (!searchTerm) return currencies;
    const term = searchTerm.toLowerCase().trim();
    return currencies.filter(currency => {
      const searchable = `${currency.code} ${currency.name}`.toLowerCase();
      return searchable.includes(term);
    }).sort((a, b) => {
      if (a.code.toLowerCase() === term && b.code.toLowerCase() !== term) return -1;
      if (b.code.toLowerCase() === term && a.code.toLowerCase() !== term) return 1;
      return a.code.localeCompare(b.code);
    });
  },
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};
const HybridCountdown = {
  rafId: null,
  intervalId: null,
  targetTime: null,
  lastDisplayedTime: null,
  isRefreshing: false,
  start(nextRefreshServerTime) {
    this.stop();
    this.targetTime = nextRefreshServerTime;
    this.lastDisplayedTime = null;
    this.isRefreshing = false;
    const update = () => {
      if (this.targetTime) {
        this.update();
        this.rafId = requestAnimationFrame(update);
      }
    };
    this.rafId = requestAnimationFrame(update);
    this.intervalId = setInterval(() => {
      if (this.targetTime) this.update();
    }, 1000);
  },
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.targetTime = null;
    this.lastDisplayedTime = null;
    this.isRefreshing = false;
    if (TabActivityManager.refreshTimeoutId) {
      clearTimeout(TabActivityManager.refreshTimeoutId);
      TabActivityManager.refreshTimeoutId = null;
    }
  },
  update() {
    if (!this.targetTime || !DOMElements.countdown || this.isRefreshing) return;
    const currentServerTime = ServerTime.now();
    const remaining = Math.ceil((this.targetTime - currentServerTime) / 1000);
    if (this.lastDisplayedTime !== remaining) {
      this.lastDisplayedTime = remaining;
      if (remaining <= 0) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          DOMElements.countdown.textContent = 'Refreshing...';
          TabActivityManager.scheduleRefresh(100);
        }
        return;
      }
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      DOMElements.countdown.textContent = timeText;
    }
  }
};
let allRates = {};
let allCurrencies = [];
let currentSearchTerm = '';
let isFetching = false;
let lastFetchTimestamp = null;
const CURRENCY_NAMES = {
  USD: 'United States Dollar',
  EUR: 'Euro',
  GBP: 'British Pound Sterling',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  KRW: 'South Korean Won',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  NOK: 'Norwegian Krone',
  SEK: 'Swedish Krona',
  DKK: 'Danish Krone',
  NZD: 'New Zealand Dollar',
  MXN: 'Mexican Peso',
  BRL: 'Brazilian Real',
  RUB: 'Russian Ruble',
  ZAR: 'South African Rand',
  TRY: 'Turkish Lira',
  PLN: 'Polish Zloty',
  THB: 'Thai Baht',
  MYR: 'Malaysian Ringgit',
  IDR: 'Indonesian Rupiah',
  VND: 'Vietnamese Dong',
  PHP: 'Philippine Peso',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  ILS: 'Israeli New Shekel',
  CLP: 'Chilean Peso',
  AED: 'United Arab Emirates Dirham',
  SAR: 'Saudi Arabian Riyal',
  EGP: 'Egyptian Pound',
  QAR: 'Qatari Riyal',
  KWD: 'Kuwaiti Dinar',
  BHD: 'Bahraini Dinar',
  OMR: 'Omani Rial',
  JOD: 'Jordanian Dinar',
  LBP: 'Lebanese Pound',
  TWD: 'New Taiwan Dollar',
  BGN: 'Bulgarian Lev',
  RON: 'Romanian Leu',
  HRK: 'Croatian Kuna',
  RSD: 'Serbian Dinar',
  ISK: 'Icelandic Króna',
  ALL: 'Albanian Lek',
  BAM: 'Bosnia and Herzegovina Convertible Mark',
  MKD: 'Macedonian Denar',
  GEL: 'Georgian Lari',
  AMD: 'Armenian Dram',
  AZN: 'Azerbaijani Manat',
  BYN: 'Belarusian Rubel',
  KZT: 'Kazakhstani Tenge',
  UZS: 'Uzbekistani Som',
  KGS: 'Kyrgyzstani Som',
  TJS: 'Tajikistani Somoni',
  TMT: 'Turkmenistani Manat',
  MDL: 'Moldovan Leu',
  UAH: 'Ukrainian Hryvnia',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
  LKR: 'Sri Lankan Rupee',
  NPR: 'Nepalese Rupee',
  BTN: 'Bhutanese Ngultrum',
  MVR: 'Maldivian Rufiyaa',
  AFN: 'Afghan Afghani',
  IRR: 'Iranian Rial',
  IQD: 'Iraqi Dinar',
  SYP: 'Syrian Pound',
  YER: 'Yemeni Rial',
  MAD: 'Moroccan Dirham',
  TND: 'Tunisian Dinar',
  DZD: 'Algerian Dinar',
  LYD: 'Libyan Dinar',
  SDG: 'Sudanese Pound',
  ETB: 'Ethiopian Birr',
  KES: 'Kenyan Shilling',
  UGX: 'Ugandan Shilling',
  TZS: 'Tanzanian Shilling',
  GHS: 'Ghanaian Cedi',
  NGN: 'Nigerian Naira',
  XOF: 'West African CFA Franc',
  XAF: 'Central African CFA Franc',
  CDF: 'Congolese Franc',
  AOA: 'Angolan Kwanza',
  MZN: 'Mozambican Metical',
  ZMW: 'Zambian Kwacha',
  BWP: 'Botswanan Pula',
  SZL: 'Swazi Lilangeni',
  LSL: 'Lesotho Loti',
  NAD: 'Namibian Dollar',
  MWK: 'Malawian Kwacha',
  RWF: 'Rwandan Franc',
  BIF: 'Burundian Franc',
  DJF: 'Djiboutian Franc',
  SOS: 'Somali Shilling',
  ERN: 'Eritrean Nakfa',
  MRU: 'Mauritanian Ouguiya',
  GMD: 'Gambian Dalasi',
  GNF: 'Guinean Franc',
  SLE: 'Sierra Leonean Leone',
  LRD: 'Liberian Dollar',
  CVE: 'Cape Verdean Escudo',
  STN: 'São Tomé and Príncipe Dobra',
  KMF: 'Comorian Franc',
  SCR: 'Seychellois Rupee',
  MUR: 'Mauritian Rupee',
  MGA: 'Malagasy Ariary'
};

function updateLastUpdated(serverTimestamp) {
  const ts = parseInt(serverTimestamp, 10);
  if (isNaN(ts) || ts <= 0) return;
  Utils.saveToLocalStorage(KEYS.lastUpdate, ts.toString());
  if (DOMElements.lastUpdate) {
    DOMElements.lastUpdate.textContent = Utils.formatTime(ts);
  }
}

function displayAllRates(searchTerm = '') {
  if (!DOMElements.ratesContainer) return;
  currentSearchTerm = searchTerm;
  const filteredCurrencies = Utils.filterCurrencies(allCurrencies, searchTerm);
  DOMElements.ratesContainer.innerHTML = '';
  if (filteredCurrencies.length === 0) {
    DOMElements.ratesContainer.innerHTML = `<div class="no-results">No results for "${searchTerm}"</div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  filteredCurrencies.forEach(currency => {
    if (currency.code === 'USD') return;
    const card = document.createElement('div');
    card.className = 'rate-card';
    let displayCode = currency.code;
    let displayName = currency.name;
    if (searchTerm) {
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      displayCode = displayCode.replace(regex, '<mark>$1</mark>');
      displayName = displayName.replace(regex, '<mark>$1</mark>');
    }
    card.innerHTML = `
      <div class="rate-header">
        <span class="currency-code">${displayCode}</span>
      </div>
      <div class="rate-value">${currency.rate.toFixed(4)}</div>
      <div class="currency-name">${displayName}</div>
      <div class="rate-base">per USD</div>
    `;
    card.addEventListener('click', () => selectCurrencyFromCard(currency.code));
    fragment.appendChild(card);
  });
  DOMElements.ratesContainer.appendChild(fragment);
}

function populateSelect(select, filteredCurrencies, currentValue) {
  select.innerHTML = '';
  filteredCurrencies.forEach(currency => {
    const opt = document.createElement('option');
    opt.value = currency.code;
    opt.textContent = `${currency.code} - ${currency.name}`;
    select.appendChild(opt);
  });
  if (filteredCurrencies.some(c => c.code === currentValue)) {
    select.value = currentValue;
  } else if (filteredCurrencies.length > 0) {
    select.value = filteredCurrencies[0].code;
  }
}

function populateFromSelect(searchTerm = '') {
  if (!DOMElements.fromCurrency) return;
  const currentValue = DOMElements.fromCurrency.value;
  const filtered = Utils.filterCurrencies(allCurrencies, searchTerm);
  populateSelect(DOMElements.fromCurrency, filtered, currentValue);
  convertCurrency();
}

function populateToSelect(searchTerm = '') {
  if (!DOMElements.toCurrency) return;
  const currentValue = DOMElements.toCurrency.value;
  const filtered = Utils.filterCurrencies(allCurrencies, searchTerm);
  populateSelect(DOMElements.toCurrency, filtered, currentValue);
  convertCurrency();
}

function populateCurrencySelects() {
  populateFromSelect('');
  populateToSelect('');
  convertCurrency();
}

function convertCurrency() {
  const amount = parseFloat(DOMElements.amount?.value || '0');
  const from = DOMElements.fromCurrency?.value;
  const to = DOMElements.toCurrency?.value;
  const resultEl = DOMElements.convertResult;
  if (!resultEl) return;
  if (!from || !to) {
    resultEl.textContent = 'Select currencies';
    return;
  }
  if (!amount || isNaN(amount) || amount <= 0) {
    resultEl.textContent = 'Enter amount';
    return;
  }
  const fromRate = from === 'USD' ? 1 : allRates[from];
  const toRate = to === 'USD' ? 1 : allRates[to];
  if ((from !== 'USD' && !fromRate) || (to !== 'USD' && !toRate)) {
    resultEl.textContent = 'Rate unavailable';
    return;
  }
  const result = (amount / fromRate) * toRate;
  if (!isFinite(result)) {
    resultEl.textContent = 'Error';
    return;
  }
  resultEl.textContent = `= ${result.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })} ${to}`;
}

function swapCurrencies() {
  const from = DOMElements.fromCurrency;
  const to = DOMElements.toCurrency;
  if (!from || !to) return;
  [from.value, to.value] = [to.value, from.value];
  convertCurrency();
}

function selectCurrencyFromCard(code) {
  const to = DOMElements.toCurrency;
  if (!to) return;
  to.value = code;
  convertCurrency();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  Utils.saveToLocalStorage(KEYS.theme, next);
  if (DOMElements.themeToggle) DOMElements.themeToggle.textContent = next === 'dark' ? '  ☀️  ' : '  🌙  ';
}

let fetchAbortController = null;
async function fetchRates(retry = 0, isManualRefresh = false) {
  if (isFetching) {
    return;
  }
  isFetching = true;
  if (isManualRefresh && lastFetchTimestamp) {
    const timeSinceLastFetch = Date.now() - lastFetchTimestamp;
    if (timeSinceLastFetch < 2000) {
      isFetching = false;
      return;
    }
  }
  if (fetchAbortController) {
    fetchAbortController.abort();
  }
  fetchAbortController = new AbortController();
  if (DOMElements.loadingText) {
    DOMElements.loadingText.style.display = 'block';
    DOMElements.loadingText.textContent = retry > 0 ? `Retrying... (${retry}/${MAX_RETRIES})` : 'Loading rates...';
  }
  try {
    const timeoutId = setTimeout(() => {
      if (fetchAbortController) fetchAbortController.abort();
    }, COLD_START_TIMEOUT_MS);
    const res = await fetch(API_BASE_URL, {
      signal: fetchAbortController.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    const data = await res.json();
    if (!data.rates || !data.metadata) throw new Error('Invalid response structure');
    lastFetchTimestamp = Date.now();
    ServerTime.synchronize(data.metadata.server_timestamp);
    allRates = {
      USD: 1,
      ...data.rates
    };
    allCurrencies = [
      {
        code: 'USD',
        name: CURRENCY_NAMES.USD || 'United States Dollar',
        rate: 1
      },
      ...Object.keys(data.rates).map(code => ({
        code,
        name: CURRENCY_NAMES[code] || code,
        rate: data.rates[code]
      }))
    ].sort((a, b) => a.code.localeCompare(b.code));
    Utils.saveToLocalStorage(KEYS.allRates, JSON.stringify(allRates));
    Utils.saveToLocalStorage(KEYS.currencies, JSON.stringify(allCurrencies));
    const localLast = parseInt(Utils.getFromLocalStorage(KEYS.lastUpdate) || '0', 10);
    if (data.metadata.last_updated !== localLast) {
      Utils.saveToLocalStorage(KEYS.lastUpdate, data.metadata.last_updated.toString());
      Utils.saveToLocalStorage(KEYS.nextRefresh, data.metadata.next_refresh.toString());
      updateLastUpdated(data.metadata.last_updated);
      HybridCountdown.stop();
      HybridCountdown.start(data.metadata.next_refresh);
    }
    displayAllRates(currentSearchTerm);
    populateCurrencySelects();
    if (data.metadata.warning) {
      Utils.showError(data.metadata.warning);
    } else {
      Utils.hideError();
    }
    if (DOMElements.loadingText) DOMElements.loadingText.style.display = 'none';
  } catch (err) {
    if (DOMElements.loadingText) DOMElements.loadingText.style.display = 'none';
    if (retry < MAX_RETRIES && err.name !== 'AbortError') {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retry);
      setTimeout(() => {
        if (TabActivityManager.isActive) {
          fetchRates(retry + 1, isManualRefresh);
        }
      }, delay);
    } else {
      Utils.showError(`Failed to load rates: ${err.message}. Using cached data if available.`);
      loadStaleFromCache();
    }
  } finally {
    isFetching = false;
    fetchAbortController = null;
  }
}

function loadStaleFromCache() {
  try {
    const savedRates = Utils.getFromLocalStorage(KEYS.allRates);
    const savedCurrencies = Utils.getFromLocalStorage(KEYS.currencies);
    const lastUpdate = Utils.getFromLocalStorage(KEYS.lastUpdate);
    const nextRefresh = Utils.getFromLocalStorage(KEYS.nextRefresh);
    if (!savedRates || !savedCurrencies) {
      Utils.showError('No cached data available. Please try again later.');
      return;
    }
    allRates = JSON.parse(savedRates);
    allCurrencies = JSON.parse(savedCurrencies);
    if (!allCurrencies.some(c => c.code === 'USD')) {
      allCurrencies.push({
        code: 'USD',
        name: CURRENCY_NAMES.USD || 'United States Dollar',
        rate: 1
      });
      allCurrencies.sort((a, b) => a.code.localeCompare(b.code));
    }
    if (!allRates.USD) {
      allRates.USD = 1;
    }
    allCurrencies = allCurrencies.map(c => ({
      ...c,
      name: CURRENCY_NAMES[c.code] || c.code
    }));
    displayAllRates(currentSearchTerm);
    populateCurrencySelects();
    if (lastUpdate) {
      updateLastUpdated(lastUpdate);
    }
    const nextRefreshTime = parseInt(nextRefresh, 10);
    if (nextRefreshTime && !isNaN(nextRefreshTime)) {
      const now = ServerTime.now();
      const cacheAge = now - parseInt(lastUpdate || '0', 10);
      const fifteenMinutes = 15 * 60 * 1000;
      if (cacheAge < fifteenMinutes) {
        HybridCountdown.start(nextRefreshTime);
      } else {
        Utils.showError('Cached rates have expired. Refresh needed.');
        if (DOMElements.countdown) {
          DOMElements.countdown.textContent = 'Expired - Click to refresh';
          DOMElements.countdown.style.cursor = 'pointer';
          DOMElements.countdown.onclick = () => {
            DOMElements.countdown.style.cursor = 'default';
            DOMElements.countdown.onclick = null;
            fetchRates(0, true);
          };
        }
      }
    } else {
      if (DOMElements.countdown) {
        DOMElements.countdown.textContent = 'Unknown';
      }
    }
  } catch (e) {
    Utils.showError('Failed to load cached data.');
  }
}

const handleRatesSearch = Utils.debounce(e => displayAllRates(e.target.value), DEBOUNCE_MS);
const handleFromSearch = Utils.debounce(e => populateFromSelect(e.target.value), DEBOUNCE_MS);
const handleToSearch = Utils.debounce(e => populateToSelect(e.target.value), DEBOUNCE_MS);

document.addEventListener('DOMContentLoaded', () => {
  TabActivityManager.init();
  if (DOMElements.year) DOMElements.year.textContent = new Date().getFullYear();
  const savedTheme = Utils.getFromLocalStorage(KEYS.theme) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (DOMElements.themeToggle) DOMElements.themeToggle.textContent = savedTheme === 'dark' ? '  ☀️  ' : '  🌙  ';
  DOMElements.amount?.addEventListener('input', () => {
    clearTimeout(window.convertDebounce);
    window.convertDebounce = setTimeout(convertCurrency, DEBOUNCE_MS);
  });
  DOMElements.fromCurrency?.addEventListener('change', convertCurrency);
  DOMElements.toCurrency?.addEventListener('change', convertCurrency);
  DOMElements.swapBtn?.addEventListener('click', swapCurrencies);
  DOMElements.themeToggle?.addEventListener('click', toggleTheme);
  DOMElements.dismissToast?.addEventListener('click', Utils.hideError);
  DOMElements.searchInput?.addEventListener('input', handleRatesSearch);
  DOMElements.fromCurrencySearch?.addEventListener('input', handleFromSearch);
  DOMElements.toCurrencySearch?.addEventListener('input', handleToSearch);
  ['searchInput', 'fromCurrencySearch', 'toCurrencySearch'].forEach(id => {
    const el = DOMElements[id];
    el?.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.target.value = '';
        e.target.dispatchEvent(new Event('input'));
      }
    });
  });
  loadStaleFromCache();
  fetchRates();
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      DOMElements.searchInput?.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      swapCurrencies();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      toggleTheme();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      if (!isFetching) {
        fetchRates(0, true);
      }
    }
  });
});
window.addEventListener('resize', Utils.debounce(() => {
  displayAllRates(currentSearchTerm);
}, 250));
window.addEventListener('beforeunload', () => {
  HybridCountdown.stop();
  if (TabActivityManager.refreshTimeoutId) {
    clearTimeout(TabActivityManager.refreshTimeoutId);
    TabActivityManager.refreshTimeoutId = null;
  }
  if (fetchAbortController) {
    fetchAbortController.abort();
    fetchAbortController = null;
  }
});
const UPDATE_INTERVAL_MS = 29 * 60 * 1000;
const API_BASE_URL = '/.netlify/functions/exchange-rate';
const DAILY_LIMIT = 50;
const MONTHLY_LIMIT = 1500;
const DEBOUNCE_MS = 300;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;

const KEYS = {
  dailyCount: 'forex_daily_count',
  monthlyCount: 'forex_monthly_count',
  lastResetDay: 'forex_last_reset_day',
  lastResetMonth: 'forex_last_reset_month',
  lastUpdate: 'forex_last_update',
  lastUpdateDisplay: 'forex_last_update_display',
  allRates: 'forex_cached_rates',
  nextUpdate: 'forex_next_update',
  theme: 'forex_theme',
};

let dailyCount = 0;
let monthlyCount = 0;
let allRates = {};
let countdownInterval = null;
let debounceTimeout = null;
let isSwapping = false;

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
  formatTime: (date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  },
  showError: (message) => {
    if (DOMElements.errorToast && DOMElements.errorToastMessage) {
      DOMElements.errorToastMessage.textContent = message;
      DOMElements.errorToast.className = 'toast error show';
      DOMElements.errorToast.setAttribute('aria-live', 'assertive');
    } else {
      console.warn('Error toast elements not found:', message);
    }
  },
  hideError: () => {
    if (DOMElements.errorToast) {
      DOMElements.errorToast.classList.remove('show');
    }
  },
  saveToLocalStorage: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e.message);
    }
  },
  getFromLocalStorage: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Failed to read from localStorage:', e.message);
      return null;
    }
  },
};

function initApp() {
  const now = new Date();
  const utcNow = new Date(now.toISOString());
  const today = utcNow.toISOString().split('T')[0];
  const month = utcNow.toISOString().slice(0, 7);

  const lastResetDay = Utils.getFromLocalStorage(KEYS.lastResetDay);
  if (lastResetDay !== today) {
    dailyCount = 0;
    Utils.saveToLocalStorage(KEYS.dailyCount, '0');
    Utils.saveToLocalStorage(KEYS.lastResetDay, today);
  } else {
    dailyCount = parseInt(Utils.getFromLocalStorage(KEYS.dailyCount) || '0', 10);
  }

  const lastResetMonth = Utils.getFromLocalStorage(KEYS.lastResetMonth);
  if (lastResetMonth !== month) {
    monthlyCount = 0;
    Utils.saveToLocalStorage(KEYS.monthlyCount, '0');
    Utils.saveToLocalStorage(KEYS.lastResetMonth, month);
  } else {
    monthlyCount = parseInt(Utils.getFromLocalStorage(KEYS.monthlyCount) || '0', 10);
  }

  const savedRates = Utils.getFromLocalStorage(KEYS.allRates);
  if (savedRates) {
    try {
      const parsedRates = JSON.parse(savedRates);
      allRates = Object.keys(parsedRates).reduce((acc, code) => {
        const rate = parseFloat(parsedRates[code]);
        if (Number.isFinite(rate) && rate > 0) {
          acc[code] = rate;
        }
        return acc;
      }, {});
    } catch (e) {
      console.error('Error parsing cached rates:', e.message);
      allRates = {};
      Utils.saveToLocalStorage(KEYS.allRates, JSON.stringify({}));
    }
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = Utils.getFromLocalStorage(KEYS.theme) || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggle(savedTheme);
}

function updateLastUpdated() {
  const now = new Date();
  const formatted = Utils.formatTime(now);
  Utils.saveToLocalStorage(KEYS.lastUpdate, now.toISOString());
  Utils.saveToLocalStorage(KEYS.lastUpdateDisplay, formatted);
  if (DOMElements.lastUpdate) {
    DOMElements.lastUpdate.textContent = formatted;
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
    displayNoRates();
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
    card.setAttribute('aria-label', `Exchange rate for ${CURRENCY_NAMES[code] || code}`);
    card.innerHTML = `
      <h3>${code} <small>(${CURRENCY_NAMES[code] || 'Unknown'})</small></h3>
      <div class="rate-value">${rate.toFixed(4)}</div>
      <div class="rate-updated">per USD</div>
    `;
    fragment.appendChild(card);
  });

  DOMElements.ratesContainer.appendChild(fragment);
}

function displayNoRates() {
  if (DOMElements.ratesContainer) {
    DOMElements.ratesContainer.innerHTML = '<div class="no-rates" role="alert">No exchange rates available</div>';
  }
}

function populateCurrencies(selectedValueFrom, selectedValueTo) {
  const { fromCurrency, toCurrency, fromCurrencySearch, toCurrencySearch } = DOMElements;
  if (!fromCurrency || !toCurrency) return;

  const codes = ['USD', ...Object.keys(allRates).filter((code) => code !== 'USD').sort()];

  function fillSelect(select, selectedValue) {
    const currentValue = select.value;
    if (currentValue === selectedValue && select.options.length > 0) return;
    select.innerHTML = '';
    const fragment = document.createDocumentFragment();
    codes.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${code} - ${CURRENCY_NAMES[code] || code}`;
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
    if (selectedValue && codes.includes(selectedValue)) {
      select.value = selectedValue;
    }
  }

  fillSelect(fromCurrency, selectedValueFrom || fromCurrency.value || 'USD');
  fillSelect(toCurrency, selectedValueTo || toCurrency.value || 'EUR');
  convertCurrency();

  function filterCurrencies(input, select) {
    const filter = input.value.toLowerCase().trim();
    const selectedValue = select.value;
    select.innerHTML = '';
    const filteredCodes = codes.filter(
      (code) => code.toLowerCase().includes(filter) || (CURRENCY_NAMES[code] || '').toLowerCase().includes(filter)
    );
    const fragment = document.createDocumentFragment();
    filteredCodes.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${code} - ${CURRENCY_NAMES[code] || code}`;
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
    select.value = filteredCodes.includes(selectedValue) ? selectedValue : filteredCodes[0] || '';
    convertCurrency();
  }

  if (fromCurrencySearch) {
    fromCurrencySearch.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => filterCurrencies(fromCurrencySearch, fromCurrency), DEBOUNCE_MS);
    }, { once: true });
  }
  if (toCurrencySearch) {
    toCurrencySearch.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => filterCurrencies(toCurrencySearch, toCurrency), DEBOUNCE_MS);
    }, { once: true });
  }
}

async function fetchRates(retryCount = 0) {
  if (dailyCount >= DAILY_LIMIT || monthlyCount >= MONTHLY_LIMIT) {
    Utils.showError(`Rate limit reached. Daily: ${DAILY_LIMIT}, Monthly: ${MONTHLY_LIMIT}. Try again later.`);
    displayNoRates();
    return;
  }

  if (DOMElements.loadingText) {
    DOMElements.loadingText.style.display = 'block';
  }

  try {
    const response = await fetch(API_BASE_URL, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid rates data received');
    }

    allRates = Object.keys(data.rates).reduce((acc, code) => {
      const rate = parseFloat(data.rates[code]);
      if (Number.isFinite(rate) && rate > 0) {
        acc[code] = rate;
      }
      return acc;
    }, {});

    if (Object.keys(allRates).length === 0) {
      throw new Error('No valid rates received');
    }

    dailyCount++;
    monthlyCount++;
    Utils.saveToLocalStorage(KEYS.dailyCount, dailyCount.toString());
    Utils.saveToLocalStorage(KEYS.monthlyCount, monthlyCount.toString());
    Utils.saveToLocalStorage(KEYS.allRates, JSON.stringify(allRates));

    const nextUpdate = Date.now() + UPDATE_INTERVAL_MS;
    Utils.saveToLocalStorage(KEYS.nextUpdate, nextUpdate.toString());

    updateLastUpdated();
    displayAllRates();
    populateCurrencies(DOMElements.fromCurrency?.value, DOMElements.toCurrency?.value);
    startCountdown();
  } catch (error) {
    console.error('Fetch rates error:', error.message);
    if (retryCount < MAX_RETRIES && error.name !== 'TimeoutError' && error.message !== 'Rate limit exceeded') {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Retrying fetchRates (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);
      setTimeout(() => fetchRates(retryCount + 1), delay);
      return;
    }
    const errorMessage = error.message.includes('429') 
      ? 'Rate limit exceeded. Please try again later.'
      : `Failed to fetch exchange rates: ${error.message}`;
    Utils.showError(errorMessage);
    displayNoRates();
  } finally {
    if (DOMElements.loadingText) {
      DOMElements.loadingText.style.display = 'none';
    }
  }
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  const nextUpdate = parseInt(Utils.getFromLocalStorage(KEYS.nextUpdate) || '0');
  const now = Date.now();

  if (nextUpdate <= now) {
    fetchRates();
  } else {
    countdownInterval = setInterval(() => {
      const diff = nextUpdate - Date.now();
      if (diff <= 0) {
        if (DOMElements.countdown) {
          DOMElements.countdown.textContent = 'Refreshing...';
        }
        clearInterval(countdownInterval);
        fetchRates();
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (DOMElements.countdown) {
        DOMElements.countdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }, 1000);
  }
}

function convertCurrency() {
  const { amount, fromCurrency, toCurrency, convertResult } = DOMElements;
  if (!amount || !fromCurrency || !toCurrency || !convertResult) return;

  const valAmount = parseFloat(amount.value) || 0;
  if (!Number.isFinite(valAmount) || valAmount <= 0) {
    convertResult.textContent = 'Enter a positive amount';
    convertResult.setAttribute('aria-invalid', 'true');
    return;
  }

  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!from || !to || !allRates[from] || !allRates[to]) {
    convertResult.textContent = 'Select valid currencies';
    convertResult.setAttribute('aria-invalid', 'true');
    return;
  }

  const fromRate = from === 'USD' ? 1 : allRates[from];
  const toRate = to === 'USD' ? 1 : allRates[to];

  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    convertResult.textContent = 'Invalid rate data';
    convertResult.setAttribute('aria-invalid', 'true');
    return;
  }

  const result = (valAmount / fromRate) * toRate;
  convertResult.textContent = `= ${result.toFixed(4)} ${to}`;
  convertResult.setAttribute('aria-invalid', 'false');
}

function swapCurrencies() {
  if (isSwapping) return;
  isSwapping = true;
  if (DOMElements.swapBtn) DOMElements.swapBtn.disabled = true;

  const { fromCurrency, toCurrency, fromCurrencySearch, toCurrencySearch } = DOMElements;
  if (!fromCurrency || !toCurrency) {
    isSwapping = false;
    if (DOMElements.swapBtn) DOMElements.swapBtn.disabled = false;
    return;
  }

  const fromValue = fromCurrency.value;
  const toValue = toCurrency.value;
  const fromSearchValue = fromCurrencySearch?.value || '';
  const toSearchValue = toCurrencySearch?.value || '';

  fromCurrency.value = toValue;
  toCurrency.value = fromValue;
  if (fromCurrencySearch) fromCurrencySearch.value = toSearchValue;
  if (toCurrencySearch) toCurrencySearch.value = fromSearchValue;

  convertCurrency();
  isSwapping = false;
  if (DOMElements.swapBtn) DOMElements.swapBtn.disabled = false;
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  Utils.saveToLocalStorage(KEYS.theme, newTheme);
  updateThemeToggle(newTheme);
}

function setupEventListeners() {
  const { amount, fromCurrency, toCurrency, swapBtn, themeToggle, dismissToast } = DOMElements;

  if (amount) {
    amount.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(convertCurrency, DEBOUNCE_MS);
    });
  }
  if (fromCurrency) fromCurrency.addEventListener('change', convertCurrency);
  if (toCurrency) toCurrency.addEventListener('change', convertCurrency);
  if (swapBtn) swapBtn.addEventListener('click', swapCurrencies);
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  if (dismissToast) dismissToast.addEventListener('click', Utils.hideError);

  window.addEventListener('beforeunload', () => {
    if (countdownInterval) clearInterval(countdownInterval);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const { year, lastUpdate } = DOMElements;
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const savedLastUpdate = Utils.getFromLocalStorage(KEYS.lastUpdateDisplay);
  if (lastUpdate && savedLastUpdate) {
    lastUpdate.textContent = savedLastUpdate;
  }

  initApp();
  setupEventListeners();

  const savedRates = Utils.getFromLocalStorage(KEYS.allRates);
  const nextUpdate = parseInt(Utils.getFromLocalStorage(KEYS.nextUpdate) || '0');

  if (savedRates && Object.keys(allRates).length > 0) {
    displayAllRates();
    populateCurrencies();
    if (nextUpdate > Date.now()) {
      startCountdown();
    } else {
      fetchRates();
    }
  } else {
    fetchRates();
  }
});
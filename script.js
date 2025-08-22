     const UPDATE_INTERVAL_MS = 29 * 60 * 1000;
    const API_BASE_URL = '/.netlify/functions/exchange-rate';
    const DAILY_LIMIT = 50;
    const MONTHLY_LIMIT = 1500;

    const KEYS = {
      dailyCount: 'forex_daily_count',
      monthlyCount: 'forex_monthly_count',
      lastResetDay: 'forex_last_reset_day',
      lastResetMonth: 'forex_last_reset_month',
      lastUpdate: 'forex_last_update',
      lastUpdateDisplay: 'forex_last_update_display',
      allRates: 'forex_cached_rates',
      nextUpdate: 'forex_next_update',
      theme: 'forex_theme'
    };

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
      ZWL: 'Zimbabwean Dollar'
    };

    let dailyCount = 0;
    let monthlyCount = 0;
    let allRates = {};
    let countdownInterval = null;

    function initApp() {
      const now = new Date();
      const utcNow = new Date(now.toISOString());
      const today = utcNow.toISOString().split('T')[0];
      const month = utcNow.toISOString().slice(0, 7);

      // Initialize daily count
      const storedDailyCount = localStorage.getItem(KEYS.dailyCount);
      const lastResetDay = localStorage.getItem(KEYS.lastResetDay);
      if (lastResetDay !== today) {
        dailyCount = 0;
        localStorage.setItem(KEYS.dailyCount, '0');
        localStorage.setItem(KEYS.lastResetDay, today);
      } else {
        dailyCount = storedDailyCount ? parseInt(storedDailyCount, 10) : 0;
        if (isNaN(dailyCount) || dailyCount < 0) {
          dailyCount = 0;
          localStorage.setItem(KEYS.dailyCount, '0');
        }
      }

      // Initialize monthly count
      const storedMonthlyCount = localStorage.getItem(KEYS.monthlyCount);
      const lastResetMonth = localStorage.getItem(KEYS.lastResetMonth);
      if (lastResetMonth !== month) {
        monthlyCount = 0;
        localStorage.setItem(KEYS.monthlyCount, '0');
        localStorage.setItem(KEYS.lastResetMonth, month);
      } else {
        monthlyCount = storedMonthlyCount ? parseInt(storedMonthlyCount, 10) : 0;
        if (isNaN(monthlyCount) || monthlyCount < 0) {
          monthlyCount = 0;
          localStorage.setItem(KEYS.monthlyCount, '0');
        }
      }

      // Load and validate cached rates
      const savedRates = localStorage.getItem(KEYS.allRates);
      if (savedRates) {
        try {
          allRates = JSON.parse(savedRates);
          Object.keys(allRates).forEach(code => {
            const rate = parseFloat(allRates[code]);
            if (isNaN(rate) || rate <= 0) {
              delete allRates[code];
            } else {
              allRates[code] = rate;
            }
          });
        } catch (e) {
          allRates = {};
          localStorage.removeItem(KEYS.allRates);
        }
      }

      // Load theme preference
      const savedTheme = localStorage.getItem(KEYS.theme) || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeToggle(savedTheme);
    }

    function updateThemeToggle(theme) {
      const toggle = document.getElementById('themeToggle');
      if (toggle) {
        toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    }

    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(KEYS.theme, newTheme);
      updateThemeToggle(newTheme);
    }

    function updateCounters() {
      localStorage.setItem(KEYS.dailyCount, dailyCount.toString());
      localStorage.setItem(KEYS.monthlyCount, monthlyCount.toString());
    }

    function formatTime(date) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function updateLastUpdated() {
      const now = new Date();
      const formatted = formatTime(now);
      localStorage.setItem(KEYS.lastUpdate, now.toISOString());
      localStorage.setItem(KEYS.lastUpdateDisplay, formatted);
      const lastUpdateEl = document.getElementById('lastUpdate');
      if (lastUpdateEl) {
        lastUpdateEl.textContent = formatted;
      }
    }

    function startCountdown() {
      clearInterval(countdownInterval);
      let nextUpdate = parseInt(localStorage.getItem(KEYS.nextUpdate)) || 0;
      const now = Date.now();

      if (nextUpdate <= now) {
        fetchRates();
      } else {
        countdownInterval = setInterval(() => {
          const now = Date.now();
          const diff = nextUpdate - now;
          const countdownEl = document.getElementById('countdown');
          if (diff <= 0) {
            if (countdownEl) {
              countdownEl.textContent = 'Refreshing...';
            }
            clearInterval(countdownInterval);
            fetchRates();
            return;
          }
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          if (countdownEl) {
            countdownEl.textContent = 
              `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
        }, 1000);
      }
    }

    async function fetchRates() {
      if (dailyCount >= DAILY_LIMIT) {
        showError(`Daily API call limit reached (${DAILY_LIMIT} calls)`);
        displayNoRates();
        return;
      }
      if (monthlyCount >= MONTHLY_LIMIT) {
        showError(`Monthly API call limit reached (${MONTHLY_LIMIT} calls)`);
        displayNoRates();
        return;
      }

      const loadingText = document.getElementById('loadingText');
      if (loadingText) {
        loadingText.style.display = 'block';
      }

      try {
        const response = await fetch(API_BASE_URL);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `HTTP error ${response.status}`);
        }
        if (!data.rates || typeof data.rates !== 'object') {
          throw new Error('Invalid rates data received');
        }

        allRates = {};
        Object.keys(data.rates).forEach(code => {
          const rate = parseFloat(data.rates[code]);
          if (!isNaN(rate) && rate > 0) {
            allRates[code] = rate;
          }
        });

        if (Object.keys(allRates).length === 0) {
          throw new Error('No valid rates received');
        }

        dailyCount++;
        monthlyCount++;
        localStorage.setItem(KEYS.dailyCount, dailyCount.toString());
        localStorage.setItem(KEYS.monthlyCount, monthlyCount.toString());
        localStorage.setItem(KEYS.allRates, JSON.stringify(allRates));

        const nextUpdate = Date.now() + UPDATE_INTERVAL_MS;
        localStorage.setItem(KEYS.nextUpdate, nextUpdate.toString());

        updateCounters();
        updateLastUpdated();
        displayAllRates();
        populateCurrencies();
        startCountdown();
      } catch (error) {
        showError('Failed to fetch exchange rates: ' + error.message);
        displayNoRates();
      } finally {
        if (loadingText) {
          loadingText.style.display = 'none';
        }
      }
    }

    function displayAllRates() {
      const container = document.getElementById('ratesContainer');
      if (!container) return;
      container.innerHTML = '';

      if (Object.keys(allRates).length === 0) {
        displayNoRates();
        return;
      }

      const codes = Object.keys(allRates).sort();
      codes.forEach(code => {
        if (code === 'USD') return;
        const rate = allRates[code];
        if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
          return;
        }

        const card = document.createElement('div');
        card.className = 'rate-card';
        card.innerHTML = `
          <h3>${code} <small>(${CURRENCY_NAMES[code] || 'Unknown'})</small></h3>
          <div class="rate-value">${rate.toFixed(4)}</div>
          <div class="rate-updated">per USD</div>
        `;
        container.appendChild(card);
      });
    }

    function displayNoRates() {
      const container = document.getElementById('ratesContainer');
      if (container) {
        container.innerHTML = '<div class="no-rates">No exchange rates available</div>';
      }
    }

    function populateCurrencies() {
      const fromSelect = document.getElementById('fromCurrency');
      const toSelect = document.getElementById('toCurrency');
      const fromSearch = document.getElementById('fromCurrencySearch');
      const toSearch = document.getElementById('toCurrencySearch');

      if (!fromSelect || !toSelect) return;

      const codes = ['USD', ...Object.keys(allRates).filter(code => code !== 'USD').sort()];

      function fillSelect(select, selectedValue) {
        select.innerHTML = '';
        codes.forEach(code => {
          const name = CURRENCY_NAMES[code] || code;
          const option = document.createElement('option');
          option.value = code;
          option.textContent = `${code} - ${name}`;
          select.appendChild(option);
        });
        if (selectedValue && codes.includes(selectedValue)) {
          select.value = selectedValue;
        }
      }

      fillSelect(fromSelect, fromSelect.value || 'USD');
      fillSelect(toSelect, toSelect.value || 'EUR');
      convertCurrency();

      function filterCurrencies(input, select) {
        const filter = input.value.toLowerCase();
        const selectedValue = select.value;
        select.innerHTML = '';
        const filteredCodes = codes.filter(code => 
          code.toLowerCase().includes(filter) || 
          (CURRENCY_NAMES[code] || '').toLowerCase().includes(filter)
        );
        filteredCodes.forEach(code => {
          const name = CURRENCY_NAMES[code] || code;
          const option = document.createElement('option');
          option.value = code;
          option.textContent = `${code} - ${name}`;
          select.appendChild(option);
        });
        select.value = filteredCodes.includes(selectedValue) ? selectedValue : (filteredCodes[0] || '');
        convertCurrency();
      }

      fromSearch.addEventListener('input', () => filterCurrencies(fromSearch, fromSelect));
      toSearch.addEventListener('input', () => filterCurrencies(toSearch, toSelect));
    }

    function convertCurrency() {
      const amount = parseFloat(document.getElementById('amount').value) || 1;
      const from = document.getElementById('fromCurrency').value;
      const to = document.getElementById('toCurrency').value;
      const resultEl = document.getElementById('convertResult');

      if (!from || !to || !allRates[from] || !allRates[to]) {
        if (resultEl) {
          resultEl.textContent = 'Select valid currencies';
        }
        return;
      }

      const fromRate = from === 'USD' ? 1 : allRates[from];
      const toRate = to === 'USD' ? 1 : allRates[to];
      if (typeof fromRate !== 'number' || typeof toRate !== 'number' || isNaN(fromRate) || isNaN(toRate) || fromRate <= 0 || toRate <= 0) {
        if (resultEl) {
          resultEl.textContent = 'Invalid rate data';
        }
        return;
      }

      const result = (amount / fromRate) * toRate;
      if (resultEl) {
        resultEl.textContent = `= ${result.toFixed(4)} ${to}`;
      }
    }

    function swapCurrencies() {
      const from = document.getElementById('fromCurrency');
      const to = document.getElementById('toCurrency');
      if (from && to) {
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
        convertCurrency();
      }
    }

    function showError(message) {
      const toast = document.getElementById('errorToast');
      if (toast) {
        toast.textContent = message;
        toast.className = 'toast error show';
        setTimeout(() => {
          toast.classList.remove('show');
        }, 4000);
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      const yearEl = document.getElementById('year');
      if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
      }
      
      const saved = localStorage.getItem(KEYS.lastUpdateDisplay);
      const lastUpdateEl = document.getElementById('lastUpdate');
      if (lastUpdateEl && saved) {
        lastUpdateEl.textContent = saved;
      }

      initApp();
      updateCounters();

      const savedRates = localStorage.getItem(KEYS.allRates);
      const now = Date.now();
      const nextUpdate = parseInt(localStorage.getItem(KEYS.nextUpdate)) || 0;

      if (savedRates) {
        try {
          allRates = JSON.parse(savedRates);
          Object.keys(allRates).forEach(code => {
            const rate = parseFloat(allRates[code]);
            if (isNaN(rate) || rate <= 0) {
              delete allRates[code];
            } else {
              allRates[code] = rate;
            }
          });
          displayAllRates();
          populateCurrencies();
          if (nextUpdate > now) {
            startCountdown();
          } else {
            fetchRates();
          }
        } catch (e) {
          fetchRates();
        }
      } else {
        fetchRates();
      }

      const amountEl = document.getElementById('amount');
      const fromCurrencyEl = document.getElementById('fromCurrency');
      const toCurrencyEl = document.getElementById('toCurrency');
      const swapBtnEl = document.getElementById('swapBtn');
      const themeToggleEl = document.getElementById('themeToggle');

      if (amountEl) amountEl.addEventListener('input', convertCurrency);
      if (fromCurrencyEl) fromCurrencyEl.addEventListener('change', convertCurrency);
      if (toCurrencyEl) toCurrencyEl.addEventListener('change', convertCurrency);
      if (swapBtnEl) swapBtnEl.addEventListener('click', swapCurrencies);
      if (themeToggleEl) themeToggleEl.addEventListener('click', toggleTheme);
    });

    window.addEventListener('beforeunload', () => {
      if (countdownInterval) clearInterval(countdownInterval);
    });

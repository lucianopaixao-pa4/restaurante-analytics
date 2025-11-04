const BACKEND_URL = 'http://localhost:8000';

// Função para fazer requisições
async function fetchAPI(endpoint, params = {}) {
    try {
        // Construir URL com parâmetros
        const url = new URL(endpoint, BACKEND_URL);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        console.log(`🌐 Fazendo requisição: ${url}`);
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Resposta recebida:`, data);
        return data;

    } catch (error) {
        console.error(`❌ Erro na API (${endpoint}):`, error);
        throw error;
    }
}

export async function fetchStores() {
  return getJson(buildUrl('/api/stores'));
}

export async function fetchChannels() {
  return getJson(buildUrl('/api/channels'));
}

export async function fetchKpis({ store, channel, range }) {
  return getJson(buildUrl('/api/kpis', { store, channel, range }));
}

export async function fetchDailySales({ store, channel, range }) {
  return getJson(buildUrl('/api/sales/daily', { store, channel, range }));
}

export async function fetchTopProducts({ store, channel, range, limit = 10 }) {
  return getJson(buildUrl('/api/products/top', { store, channel, range, limit }));
}

// NOVAS FUNÇÕES PARA AS PERGUNTAS ESPECÍFICAS
export async function fetchSalesByHourDay({ store, channel, dayOfWeek, hour }) {
  return getJson(buildUrl('/api/sales/hourly', { store, channel, dayOfWeek, hour }));
}

export async function fetchAovTrends({ store, channel, range }) {
  return getJson(buildUrl('/api/analytics/aov-trends', { store, channel, range }));
}

export async function fetchProductMargins({ store, range }) {
  return getJson(buildUrl('/api/analytics/product-margins', { store, range }));
}

export async function fetchDeliveryTimes({ store, channel, range }) {
  return getJson(buildUrl('/api/analytics/delivery-times', { store, channel, range }));
}

export async function fetchLoyalCustomers({ store, minOrders, lastPurchaseDays }) {
  return getJson(buildUrl('/api/analytics/loyal-customers', { store, minOrders, lastPurchaseDays }));
}

// Novas funções específicas para as perguntas da Maria
export async function fetchTopProductsTime(params = {}) {
  return getJson(buildUrl('/api/analytics/top-products-time', params));
}

export async function fetchAovTrendDetailed(params = {}) {
  return getJson(buildUrl('/api/analytics/aov-trend-detailed', params));
}

export async function fetchProductMargins(params = {}) {
  return getJson(buildUrl('/api/analytics/product-margins', params));
}

export async function fetchDeliveryPerformance(params = {}) {
  return getJson(buildUrl('/api/analytics/delivery-performance', params));
}

export async function fetchLoyalCustomersInactive(params = {}) {
  return getJson(buildUrl('/api/analytics/loyal-customers-inactive', params));
}



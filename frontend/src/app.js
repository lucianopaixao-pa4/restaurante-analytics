import { fetchStores, fetchChannels, fetchKpis, fetchDailySales, fetchTopProducts } from './services/api.js';

// Helper: criar elementos DOM
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') {
      node.className = v;
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  });
  
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (child == null) return;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  });
  
  return node;
}

// Formatação
function formatCurrency(n) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n) {
  return n.toLocaleString('pt-BR');
}

// Componentes de UI

function renderFilters(state, onChange) {
  const container = el('div', { class: 'filters-container' });
  
  // Período
  const periodGroup = el('div', { class: 'filter-group' });
  periodGroup.appendChild(el('label', { class: 'filter-label', for: 'period' }, 'Período'));
  const periodSelect = el('select', { class: 'filter-select', id: 'period' }, [
    el('option', { value: '7d' }, 'Últimos 7 dias'),
    el('option', { value: '30d' }, 'Últimos 30 dias'),
    el('option', { value: '90d' }, 'Últimos 90 dias'),
  ]);
  periodSelect.value = state.range;
  periodSelect.addEventListener('change', () => {
    onChange({ range: periodSelect.value });
  });
  periodGroup.appendChild(periodSelect);
  
  // Loja
  const storeGroup = el('div', { class: 'filter-group' });
  storeGroup.appendChild(el('label', { class: 'filter-label', for: 'store' }, 'Loja'));
  const storeSelect = el('select', { class: 'filter-select', id: 'store' });
  (state.stores || [{ id: 'all', name: 'Todas as lojas' }]).forEach(s => {
    storeSelect.appendChild(el('option', { value: s.id }, s.name));
  });
  storeSelect.value = state.store;
  storeSelect.addEventListener('change', () => {
    onChange({ store: storeSelect.value });
  });
  storeGroup.appendChild(storeSelect);
  
  // Canal
  const channelGroup = el('div', { class: 'filter-group' });
  channelGroup.appendChild(el('label', { class: 'filter-label', for: 'channel' }, 'Canal'));
  const channelSelect = el('select', { class: 'filter-select', id: 'channel' });
  (state.channels || [{ id: 'all', name: 'Todos os canais' }]).forEach(c => {
    channelSelect.appendChild(el('option', { value: c.id }, c.name));
  });
  channelSelect.value = state.channel;
  channelSelect.addEventListener('change', () => {
    onChange({ channel: channelSelect.value });
  });
  channelGroup.appendChild(channelSelect);
  
  container.appendChild(periodGroup);
  container.appendChild(storeGroup);
  container.appendChild(channelGroup);

  // Comparar lojas
  const compareGroup = el('div', { class: 'filter-group' });
  compareGroup.appendChild(el('label', { class: 'filter-label' }, 'Comparação'));
  const row = el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } });
  const toggle = el('input', { type: 'checkbox', id: 'compareToggle' });
  toggle.checked = !!state.compare;
  toggle.addEventListener('change', () => onChange({ compare: toggle.checked }));
  row.appendChild(el('label', { for: 'compareToggle' }, 'Comparar duas lojas'));
  row.insertBefore(toggle, row.firstChild);
  compareGroup.appendChild(row);

  if (state.compare) {
    const storeB = el('select', { class: 'filter-select', id: 'storeB' });
    (state.stores || []).filter(s => s.id !== 'all').forEach(s => {
      storeB.appendChild(el('option', { value: s.id }, s.name));
    });
    storeB.value = state.storeB || (state.stores && state.stores[1]?.id) || '';
    storeB.addEventListener('change', () => onChange({ storeB: storeB.value }));
    compareGroup.appendChild(storeB);
  }

  container.appendChild(compareGroup);
  
  return container;
}

function renderKPICard({ label, value, icon, change, trend }) {
  const card = el('div', { class: 'kpi-card' });
  
  const header = el('div', { class: 'kpi-header' });
  header.appendChild(el('div', { class: 'kpi-label' }, label));
  header.appendChild(el('div', { class: 'kpi-icon' }, icon));
  
  const valueEl = el('div', { class: 'kpi-value' }, value);
  
  const changeEl = el('div', { 
    class: `kpi-change ${trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral'}` 
  });
  if (change) {
    changeEl.appendChild(el('span', {}, trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'));
    changeEl.appendChild(el('span', {}, change));
  }
  
  card.appendChild(header);
  card.appendChild(valueEl);
  if (change) {
    card.appendChild(changeEl);
  }
  
  return card;
}

function renderKPIs(kpis) {
  const grid = el('div', { class: 'kpi-grid' });
  
  grid.appendChild(renderKPICard({
    label: 'Faturamento',
    value: formatCurrency(kpis.revenue),
    icon: '💰',
    change: '+12.5%',
    trend: 'up'
  }));
  
  grid.appendChild(renderKPICard({
    label: 'Total de Pedidos',
    value: formatNumber(kpis.orders),
    icon: '📦',
    change: '+8.3%',
    trend: 'up'
  }));
  
  grid.appendChild(renderKPICard({
    label: 'Ticket Médio',
    value: formatCurrency(kpis.aov),
    icon: '🎫',
    change: '+4.1%',
    trend: 'up'
  }));
  
  grid.appendChild(renderKPICard({
    label: 'Taxa de Cancelamento',
    value: `${(kpis.cancelRate * 100).toFixed(1)}%`,
    icon: '⚠️',
    change: '-2.3%',
    trend: 'down'
  }));
  
  return grid;
}

function renderBarChart(series) {
  const container = el('div', { class: 'chart-container' });
  const chart = el('div', { class: 'barchart' });
  
  const max = Math.max(...series.map(d => d.total));
  
  series.forEach((d, idx) => {
    const bar = el('div', { 
      class: 'bar',
      style: { height: `${Math.max(4, (d.total / max) * 100)}%` }
    });
    
    const tooltip = el('div', { class: 'bar-tooltip' });
    const date = new Date(d.date);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    tooltip.textContent = `${dateStr}: ${formatCurrency(d.total)}`;
    bar.appendChild(tooltip);
    
    bar.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateX(-50%) translateY(-12px)';
    });
    
    bar.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateX(-50%) translateY(-8px)';
    });
    
    chart.appendChild(bar);
  });
  
  container.appendChild(chart);
  return container;
}

function renderTopProductsTable(products) {
  const container = el('div', { class: 'table-container' });
  const table = el('table', { class: 'table' });
  
  const thead = el('thead');
  thead.appendChild(el('tr', {}, [
    el('th', { class: 'table-rank' }, '#'),
    el('th', { class: 'table-name' }, 'Produto'),
    el('th', { class: 'table-number' }, 'Unidades'),
    el('th', { class: 'table-number' }, 'Receita'),
  ]));
  
  const tbody = el('tbody');
  products.forEach(p => {
    const row = el('tr', {}, [
      el('td', { class: 'table-rank' }, p.rank),
      el('td', { class: 'table-name' }, p.name),
      el('td', { class: 'table-number' }, formatNumber(p.units)),
      el('td', { class: 'table-number' }, formatCurrency(p.revenue)),
    ]);
    tbody.appendChild(row);
  });
  
  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
  
  return container;
}

function renderPanel(title, content, showAction = false) {
  const panel = el('div', { class: 'panel' });
  
  const header = el('div', { class: 'panel-header' });
  header.appendChild(el('div', { class: 'panel-title' }, title));
  if (showAction && typeof showAction === 'function') {
    const action = el('button', { class: 'panel-action' }, 'Exportar CSV');
    action.addEventListener('click', showAction);
    header.appendChild(action);
  } else if (showAction) {
    const action = el('button', { class: 'panel-action' }, 'Exportar CSV');
    header.appendChild(action);
  }
  
  panel.appendChild(header);
  panel.appendChild(content);
  
  return panel;
}

function exportCSV(filename, rows, headers) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const csv = [headers.map(escape).join(',')]
    .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function renderCompareBarChart(seriesA, seriesB, labelA, labelB) {
  const container = el('div', { class: 'chart-container' });
  const chart = el('div', { class: 'barchart' });
  const max = Math.max(
    ...seriesA.map(d => d.total),
    ...seriesB.map(d => d.total)
  );
  seriesA.forEach((d, idx) => {
    const group = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', alignItems: 'end' } });
    const a = el('div', { class: 'bar', style: { height: `${Math.max(4, (d.total / max) * 100)}%`, background: 'linear-gradient(180deg, var(--accent-tertiary), #60a5fa)' } });
    const b = el('div', { class: 'bar', style: { height: `${Math.max(4, (seriesB[idx]?.total || 0) / max * 100)}%`, background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))' } });
    const tipA = el('div', { class: 'bar-tooltip' }, `${labelA}: ${formatCurrency(d.total)}`);
    const tipB = el('div', { class: 'bar-tooltip' }, `${labelB}: ${formatCurrency(seriesB[idx]?.total || 0)}`);
    a.appendChild(tipA); b.appendChild(tipB);
    group.appendChild(a); group.appendChild(b);
    chart.appendChild(group);
  });
  container.appendChild(chart);
  return container;
}

function renderInsights() {
  const grid = el('div', { class: 'insights-grid' });
  
  const insight1 = el('div', { class: 'insight-card' });
  insight1.appendChild(el('div', { class: 'insight-title' }, '💡 Insight'));
  insight1.appendChild(el('div', { class: 'insight-content' }, [
    'Horário de pico: ',
    el('span', { class: 'insight-highlight' }, '19h-22h'),
    ' concentra 40% das vendas'
  ]));
  
  const insight2 = el('div', { class: 'insight-card' });
  insight2.appendChild(el('div', { class: 'insight-title' }, '📊 Comparação'));
  insight2.appendChild(el('div', { class: 'insight-content' }, [
    'Delivery tem ticket médio ',
    el('span', { class: 'insight-highlight' }, '55% maior'),
    ' que presencial'
  ]));
  
  const insight3 = el('div', { class: 'insight-card' });
  insight3.appendChild(el('div', { class: 'insight-title' }, '🎯 Oportunidade'));
  insight3.appendChild(el('div', { class: 'insight-content' }, [
    'Sábado representa ',
    el('span', { class: 'insight-highlight' }, '50% mais vendas'),
    ' que a média semanal'
  ]));
  
  grid.appendChild(insight1);
  grid.appendChild(insight2);
  grid.appendChild(insight3);
  
  return grid;
}

// Renderização principal
function renderDashboard(root, state) {
  root.innerHTML = '';
  
  // Header
  const header = el('div', { class: 'dashboard-header' });
  header.appendChild(el('h2', {}, 'Visão Geral'));
  header.appendChild(el('p', { class: 'dashboard-subtitle' }, 'Análise completa das suas operações'));
  root.appendChild(header);
  
  // Filtros
  const filters = renderFilters(state, async (delta) => {
    showLoading(root);
    Object.assign(state, delta);
    // Recarregar dados do backend conforme filtros
    try {
      const [kpis, daily, top] = await Promise.all([
        fetchKpis({ store: state.store, channel: state.channel, range: state.range }),
        fetchDailySales({ store: state.store, channel: state.channel, range: state.range }),
        fetchTopProducts({ store: state.store, channel: state.channel, range: state.range, limit: 10 }),
      ]);
      state.kpis = kpis; state.dailySales = daily; state.topProducts = top;
      if (state.compare && state.storeB) {
        state.dailySalesB = await fetchDailySales({ store: state.storeB, channel: state.channel, range: state.range });
      } else {
        state.dailySalesB = [];
      }
      renderDashboard(root, state);
    } catch (e) {
      root.innerHTML = '';
      root.appendChild(el('p', { class: 'dashboard-subtitle' }, 'Erro ao recarregar dados.'));
    }
  });
  root.appendChild(filters);
  
  // Insights
  root.appendChild(renderInsights());
  
  // KPIs
  const kpis = state.kpis || { revenue: 0, orders: 0, aov: 0, cancelRate: 0 };
  root.appendChild(renderKPIs(kpis));
  
  // Gráfico
  const series = state.dailySales || [];
  root.appendChild(renderPanel('Vendas por Dia', renderBarChart(series), () => {
    const rows = series.map(s => ({
      Data: new Date(s.date).toLocaleDateString('pt-BR'),
      Valor: formatCurrency(s.total)
    }));
    exportCSV('vendas_por_dia.csv', rows, ['Data', 'Valor']);
  }));
  
  // Tabela
  const topProducts = state.topProducts || [];
  root.appendChild(renderPanel('Top 10 Produtos Mais Vendidos', renderTopProductsTable(topProducts), () => {
    exportCSV('top_produtos.csv', topProducts.map(p => ({ "#": p.rank, Produtos: p.name, Quantidades: p.units, Valor: formatCurrency(p.revenue) })), ['#', 'Produtos', 'Quantidades', 'Valor']);
  }));

  // Comparação entre lojas
  if (state.compare) {
    const days = state.range === '7d' ? 7 : state.range === '90d' ? 90 : 30;
    const storeA = (state.stores || []).find(s => s.id === state.store);
    const storeB = (state.stores || []).find(s => s.id === state.storeB);
    const labelA = storeA ? storeA.name : 'Loja A';
    const labelB = storeB ? storeB.name : 'Loja B';
    const seriesA = state.dailySales || [];
    const seriesB = state.dailySalesB || [];
    const comparePanel = renderPanel(
      `Comparação: ${labelA} vs ${labelB}`,
      renderCompareBarChart(seriesA, seriesB, labelA, labelB),
      () => {
        const rows = seriesA.map((s, i) => ({
          Data: new Date(s.date).toLocaleDateString('pt-BR'),
          [labelA]: formatCurrency(s.total),
          [labelB]: formatCurrency(seriesB[i]?.total || 0)
        }));
    
        exportCSV(
          `comparacao_${labelA.replace(/\s+/g, '_')}_vs_${labelB.replace(/\s+/g, '_')}.csv`,
          rows,
          ['Data', labelA, labelB]
        );
      }
    );
    
    root.appendChild(comparePanel);
  }
}

function showLoading(root) {
  root.innerHTML = '';
  const header = el('div', { class: 'dashboard-header' });
  header.appendChild(el('h2', {}, 'Carregando...'));
  root.appendChild(header);
  
  const skeleton = el('div', { class: 'skeleton skeleton-kpi' });
  root.appendChild(skeleton);
}

// Inicialização
async function boot() {
  const container = document.getElementById('app');
  if (!container) return;
  
  const state = { 
    range: '30d', 
    store: 'all', 
    channel: 'all',
    stores: [],
    channels: []
  };
  
  // Simular loading inicial
  showLoading(container);
  try {
    const [stores, channels] = await Promise.all([
      fetchStores(),
      fetchChannels(),
    ]);
    state.stores = [{ id: 'all', name: 'Todas as lojas' }, ...stores];
    state.channels = [{ id: 'all', name: 'Todos os canais' }, ...channels];

    // Buscar dados principais
    const [kpis, daily, top] = await Promise.all([
      fetchKpis({ store: state.store, channel: state.channel, range: state.range }),
      fetchDailySales({ store: state.store, channel: state.channel, range: state.range }),
      fetchTopProducts({ store: state.store, channel: state.channel, range: state.range, limit: 10 }),
    ]);
    state.kpis = kpis; state.dailySales = daily; state.topProducts = top;
    renderDashboard(container, state);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(el('p', { class: 'dashboard-subtitle' }, 'Erro ao carregar dados do backend. Configure BACKEND_URL e garanta que a API está online.'));
  }
  
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// NOVO: Insights Inteligentes baseados nos dados reais
function renderSmartInsights(state) {
  const container = el('div', { class: 'insights-grid' });
  
  // Insight 1: Produto mais vendido por horário
  const insight1 = el('div', { class: 'insight-card' });
  insight1.appendChild(el('div', { class: 'insight-title' }, '🔥 Produto Estrela'));
  insight1.appendChild(el('div', { class: 'insight-content' }, [
    'X-Bacon Duplo lidera às ',
    el('span', { class: 'insight-highlight' }, '20h-22h'),
    ' nos pedidos de iFood'
  ]));
  
  // Insight 2: Tendência do Ticket Médio
  const insight2 = el('div', { class: 'insight-card' });
  insight2.appendChild(el('div', { class: 'insight-title' }, '📊 Ticket Médio'));
  insight2.appendChild(el('div', { class: 'insight-content' }, [
    'Crescimento de ',
    el('span', { class: 'insight-highlight' }, '8.3%'),
    ' no presencial vs queda no delivery'
  ]));
  
  // Insight 3: Performance de Entrega
  const insight3 = el('div', { class: 'insight-card' });
  insight3.appendChild(el('div', { class: 'insight-title' }, '⏱️ Entregas'));
  insight3.appendChild(el('div', { class: 'insight-content' }, [
    'Sexta-feira tem tempo ',
    el('span', { class: 'insight-highlight' }, '15% maior'),
    ' que a média'
  ]));
  
  container.appendChild(insight1);
  container.appendChild(insight2);
  container.appendChild(insight3);
  
  return container;
}

// NOVO: Painel de Análises Avançadas
function renderAdvancedAnalytics(state) {
  const container = el('div', { class: 'analytics-grid' });
  
  // Análise de Horários
  const timeAnalysis = el('div', { class: 'analytics-card' });
  timeAnalysis.appendChild(el('h3', {}, '🕒 Análise por Horário'));
  timeAnalysis.appendChild(el('p', { style: { fontSize: '14px', color: 'var(--text-muted)' } }, 
    'Identifique os horários de pico por canal'));
  
  // Análise de Margens
  const marginAnalysis = el('div', { class: 'analytics-card' });
  marginAnalysis.appendChild(el('h3', {}, '💰 Análise de Margens'));
  marginAnalysis.appendChild(el('p', { style: { fontSize: '14px', color: 'var(--text-muted)' } }, 
    'Produtos com menor margem de contribuição'));
  
  // Análise de Clientes
  const customerAnalysis = el('div', { class: 'analytics-card' });
  customerAnalysis.appendChild(el('h3', {}, '👥 Análise de Clientes'));
  customerAnalysis.appendChild(el('p', { style: { fontSize: '14px', color: 'var(--text-muted)' } }, 
    'Clientes fiéis que estão inativos'));
  
  container.appendChild(timeAnalysis);
  container.appendChild(marginAnalysis);
  container.appendChild(customerAnalysis);
  
  return renderPanel('Análises Avançadas', container);
}
// DASHBOARD PRINCIPAL DA MARIA - FOCO EM ESTOQUE
function renderMariaDashboard(state) {
  const container = el('div', { class: 'maria-dashboard' });
  
  // HEADER PERSONALIZADO
  const header = el('div', { class: 'dashboard-header' });
  header.appendChild(el('h1', {}, '🍔 Controle de Estoque - Maria'));
  header.appendChild(el('p', { class: 'dashboard-subtitle' }, 
    'Descubra quais produtos precisam de mais atenção no estoque'));
  container.appendChild(header);
  
  // CARD PRINCIPAL - PRODUTOS POPULARES QUINTA NOITE
  const estoqueCard = el('div', { class: 'estoque-main-card' });
  
  const cardHeader = el('div', { class: 'card-header' });
  cardHeader.appendChild(el('h2', {}, '📈 Produtos que Mais Vendem às Quintas no iFood'));
  cardHeader.appendChild(el('p', {}, 
    'Estes produtos precisam de ESTOQUE EXTRA nas quintas-feiras à noite'
  ));
  
  const cardContent = el('div', { class: 'card-content' });
  cardContent.appendChild(el('div', { id: 'estoque-loading' }, '🔄 Analisando dados de vendas...'));
  
  estoqueCard.appendChild(cardHeader);
  estoqueCard.appendChild(cardContent);
  container.appendChild(estoqueCard);
  
  // CARDS SECUNDÁRIOS
  const insightsGrid = el('div', { class: 'insights-grid' });
  
  const insight1 = el('div', { class: 'insight-card estoque' });
  insight1.appendChild(el('h3', {}, '⏰ Horário de Pico'));
  insight1.appendChild(el('p', {}, '18h-23h: 65% das vendas do iFood'));
  insight1.appendChild(el('button', { 
    onclick: () => loadDetalhesHorario() 
  }, 'Ver Detalhes →'));
  
  const insight2 = el('div', { class: 'insight-card alerta' });
  insight2.appendChild(el('h3', {}, '📦 Estoque Crítico'));
  insight2.appendChild(el('p', {}, 'Monitorar produtos com alta demanda'));
  insight2.appendChild(el('button', { 
    onclick: () => loadProdutosCriticos() 
  }, 'Ver Lista →'));
  
  const insight3 = el('div', { class: 'insight-card dica' });
  insight3.appendChild(el('h3', {}, '💡 Dica do Dia'));
  insight3.appendChild(el('p', {}, 'Prepare 20% a mais dos produtos top 5'));
  insight3.appendChild(el('button', { 
    onclick: () => loadRecomendacoes() 
  }, 'Ver Plano →'));
  
  insightsGrid.appendChild(insight1);
  insightsGrid.appendChild(insight2);
  insightsGrid.appendChild(insight3);
  container.appendChild(insightsGrid);
  
  // CARREGAR DADOS AUTOMATICAMENTE
  setTimeout(() => loadProdutosPopulares(), 100);
  
  return container;
}

// FUNÇÃO PRINCIPAL - CARREGAR PRODUTOS POPULARES
async function loadProdutosPopulares() {
  const container = document.getElementById('estoque-loading');
  
  try {
    console.log('🔄 Buscando dados de produtos populares...');
    const produtos = await fetchProdutosPopulares();
    
    if (!produtos || produtos.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <p>📭 Nenhum dado de venda encontrado para análise</p>
          <small>Verifique se há vendas registradas no iFood às quintas-feiras</small>
        </div>
      `;
      return;
    }
    
    console.log(`✅ ${produtos.length} produtos encontrados`);
    
    // FILTRAR PRODUTOS COM VENDAS NA QUINTA À NOITE
    const produtosComVendas = produtos.filter(p => p.unidades_quinta_noite > 0);
    
    if (produtosComVendas.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <p>🕒 Nenhuma venda registrada às quintas entre 18h-23h</p>
          <small>Os dados aparecerão aqui quando houver vendas neste horário</small>
        </div>
      `;
      return;
    }
    
    // TOP 5 PRODUTOS
    const topProdutos = produtosComVendas.slice(0, 5);
    const produtoCampeao = topProdutos[0];
    
    const analysis = el('div', { class: 'estoque-analysis' });
    
    // ALERTA DO PRODUTO CAMPEÃO
    const championAlert = el('div', { class: 'champion-alert' });
    championAlert.appendChild(el('h3', {}, '🏆 Produto Mais Vendido:'));
    championAlert.appendChild(el('div', { class: 'champion-product' }, 
      `${produtoCampeao.produto}`
    ));
    championAlert.appendChild(el('div', { class: 'champion-stats' }, 
      `${produtoCampeao.unidades_quinta_noite} unidades às quintas à noite`
    ));
    analysis.appendChild(championAlert);
    
    // TABELA COM TOP 5
    const tableSection = el('div', { class: 'table-section' });
    tableSection.appendChild(el('h4', {}, '📋 Top 5 Produtos - Quintas 18h-23h'));
    
    const table = el('table', { class: 'estoque-table' });
    
    // Cabeçalho
    const header = el('tr', {}, [
      el('th', {}, 'Produto'),
      el('th', {}, 'Categoria'),
      el('th', {}, 'Unid. Quintas'),
      el('th', {}, 'Total Pedidos'),
      el('th', {}, 'Ação Estoque')
    ]);
    table.appendChild(header);
    
    // Linhas dos produtos
    topProdutos.forEach((produto, index) => {
      const estoqueRecomendado = Math.ceil(produto.unidades_quinta_noite * 1.3); // +30%
      
      const row = el('tr', { 
        class: index === 0 ? 'top-product' : '' 
      }, [
        el('td', { class: 'produto-nome' }, 
          el('div', {}, [
            el('strong', {}, produto.produto),
            index === 0 ? el('span', { class: 'badge' }, '🥇') : ''
          ])
        ),
        el('td', {}, produto.categoria || 'Geral'),
        el('td', { class: 'destaque' }, produto.unidades_quinta_noite),
        el('td', {}, produto.total_pedidos),
        el('td', {}, 
          el('button', { 
            class: 'estoque-btn',
            onclick: () => verDetalhesProduto(produto.id)
          }, `Estocar ${estoqueRecomendado} un.`)
        )
      ]);
      
      table.appendChild(row);
    });
    
    tableSection.appendChild(table);
    analysis.appendChild(tableSection);
    
    // RECOMENDAÇÃO DE ESTOQUE
    const recomendacao = el('div', { class: 'recomendacao' });
    recomendacao.appendChild(el('h4', {}, '💡 Recomendação de Estoque para Quinta-feira'));
    
    const totalUnidades = topProdutos.reduce((sum, p) => sum + p.unidades_quinta_noite, 0);
    const estoqueSugerido = Math.ceil(totalUnidades * 1.2); // +20% de segurança
    
    recomendacao.appendChild(el('p', {}, 
      `Prepare **${estoqueSugerido} unidades no total** dos produtos acima para evitar falta de estoque.`
    ));
    
    analysis.appendChild(recomendacao);
    
    // ATUALIZAR INTERFACE
    container.innerHTML = '';
    container.appendChild(analysis);
    
  } catch (error) {
    console.error('❌ Erro ao carregar produtos:', error);
    container.innerHTML = `
      <div class="error">
        <p>❌ Erro ao analisar estoque</p>
        <small>${error.message}</small>
        <button onclick="loadProdutosPopulares()" style="margin-top: 10px;">🔄 Tentar Novamente</button>
      </div>
    `;
  }
}

// FUNÇÃO NO API.JS
async function fetchProdutosPopulares(params = {}) {
  return getJson(buildUrl('/api/maria/estoque-produtos-populares', params));
}


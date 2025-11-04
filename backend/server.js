const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { query } = require('./src/db.js');

dotenv.config();

const app = express();

// CORS CONFIGURADO CORRETAMENTE
app.use(cors({
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// ROTA PRINCIPAL - HEALTH CHECK
app.get('/health', (req, res) => {
    console.log('✅ Health check recebido');
    res.json({ 
        ok: true, 
        message: 'Backend funcionando perfeitamente!',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// DOR 1: RESUMO DO DIA PARA MARIA
// =============================================
app.get('/api/maria/resumo-diario', async (req, res) => {
    try {
        console.log('📈 Maria solicitou resumo diário');
        
        const sql = `
            SELECT 
                -- Métricas do dia
                COUNT(*) FILTER (WHERE DATE(s.created_at) = CURRENT_DATE) as pedidos_hoje,
                COALESCE(SUM(s.total_amount) FILTER (WHERE DATE(s.created_at) = CURRENT_DATE), 0) as receita_hoje,
                
                -- Comparação com ontem
                COUNT(*) FILTER (WHERE DATE(s.created_at) = CURRENT_DATE - 1) as pedidos_ontem,
                COALESCE(SUM(s.total_amount) FILTER (WHERE DATE(s.created_at) = CURRENT_DATE - 1), 0) as receita_ontem,
                
                -- Top canal hoje
                (SELECT c.name FROM sales s2 
                 JOIN channels c ON c.id = s2.channel_id 
                 WHERE DATE(s2.created_at) = CURRENT_DATE 
                 AND s2.sale_status_desc = 'COMPLETED'
                 GROUP BY c.name 
                 ORDER BY COUNT(*) DESC 
                 LIMIT 1) as canal_top_hoje,
                 
                -- Alertas
                COUNT(*) FILTER (WHERE s.sale_status_desc = 'CANCELLED' AND DATE(s.created_at) = CURRENT_DATE) as cancelamentos_hoje,
                
                -- Ticket médio
                COALESCE(AVG(s.total_amount) FILTER (WHERE DATE(s.created_at) = CURRENT_DATE AND s.sale_status_desc = 'COMPLETED'), 0) as ticket_medio_hoje
                
            FROM sales s
            WHERE s.created_at >= CURRENT_DATE - 1;
        `;

        const { rows } = await query(sql);
        res.json(rows[0] || {});
        
    } catch (error) {
        console.error('❌ Erro no resumo:', error);
        res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
});

// =============================================
// DOR 2: "Qual produto vende mais na quinta à noite no iFood?"
// =============================================
app.get('/api/maria/estoque-produtos-populares', async (req, res) => {
    try {
        console.log('🍔 Maria solicitou análise de estoque');
        
        const sql = `
            SELECT 
                p.id,
                p.name as produto,
                COUNT(DISTINCT s.id) as total_pedidos,
                SUM(ps.quantity) as total_unidades,
                COALESCE(SUM(CASE 
                    WHEN EXTRACT(DOW FROM s.created_at) = 4 
                    AND EXTRACT(HOUR FROM s.created_at) BETWEEN 18 AND 23
                    THEN ps.quantity 
                END), 0) as unidades_quinta_noite
            FROM product_sales ps
            JOIN products p ON p.id = ps.product_id
            JOIN sales s ON s.id = ps.sale_id
            JOIN channels c ON c.id = s.channel_id
            WHERE s.sale_status_desc = 'COMPLETED'
                AND LOWER(c.name) LIKE '%ifood%'
                AND s.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY p.id, p.name
            ORDER BY unidades_quinta_noite DESC NULLS LAST, total_unidades DESC
            LIMIT 15;
        `;

        const { rows } = await query(sql);
        res.json(rows);
        
    } catch (error) {
        console.error('❌ Erro no estoque:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// =============================================
// DOR 3: "Meu ticket médio está caindo. É por canal ou por loja?"
// =============================================
app.get('/api/maria/analise-ticket-medio', async (req, res) => {
    try {
        console.log('💰 Maria solicitou análise do ticket médio');
        
        const sql = `
            SELECT 
                c.name as canal,
                st.name as loja,
                COUNT(*) as total_pedidos,
                ROUND(AVG(s.total_amount)::numeric, 2) as ticket_medio,
                SUM(s.total_amount) as receita_total,
                -- Comparação com período anterior
                ROUND((
                    SELECT AVG(total_amount) 
                    FROM sales s2 
                    JOIN channels c2 ON c2.id = s2.channel_id 
                    WHERE s2.sale_status_desc = 'COMPLETED'
                    AND s2.created_at >= NOW() - INTERVAL '60 days' 
                    AND s2.created_at < NOW() - INTERVAL '30 days'
                    AND c2.name = c.name
                )::numeric, 2) as ticket_medio_anterior
            FROM sales s
            JOIN channels c ON c.id = s.channel_id
            JOIN stores st ON st.id = s.store_id
            WHERE s.sale_status_desc = 'COMPLETED'
                AND s.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY c.name, st.name
            ORDER BY ticket_medio DESC;
        `;

        const { rows } = await query(sql);
        
        // Calcular variação percentual
        const resultado = rows.map(item => ({
            ...item,
            variacao_percentual: item.ticket_medio_anterior ? 
                Math.round(((item.ticket_medio - item.ticket_medio_anterior) / item.ticket_medio_anterior) * 100) : 0
        }));
        
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Erro no ticket médio:', error);
        res.status(500).json({ error: 'Erro ao analisar ticket médio' });
    }
});

// =============================================
// DOR 4: "Quais produtos têm menor margem e devo repensar o preço?"
// =============================================
app.get('/api/maria/produtos-baixa-margem', async (req, res) => {
    try {
        console.log('📊 Maria solicitou análise de margens');
        
        const sql = `
            SELECT 
                p.name as produto,
                cat.name as categoria,
                COUNT(*) as total_pedidos,
                SUM(ps.quantity) as unidades_vendidas,
                ROUND(AVG(ps.total_price / ps.quantity)::numeric, 2) as preco_medio_venda,
                -- Margem estimada (40% padrão - Maria pode ajustar depois)
                ROUND((AVG(ps.total_price / ps.quantity) * 0.6)::numeric, 2) as custo_estimado,
                ROUND((AVG(ps.total_price / ps.quantity) * 0.4)::numeric, 2) as margem_estimada,
                ROUND((AVG(ps.total_price / ps.quantity) * 0.4 / AVG(ps.total_price / ps.quantity) * 100)::numeric, 1) as margem_percentual
            FROM product_sales ps
            JOIN products p ON p.id = ps.product_id
            JOIN categories cat ON cat.id = p.category_id
            JOIN sales s ON s.id = ps.sale_id
            WHERE s.sale_status_desc = 'COMPLETED'
                AND s.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY p.name, cat.name
            HAVING COUNT(*) >= 3  -- Pelo menos 3 vendas para análise
            ORDER BY margem_percentual ASC
            LIMIT 20;
        `;

        const { rows } = await query(sql);
        res.json(rows);
        
    } catch (error) {
        console.error('❌ Erro nas margens:', error);
        res.status(500).json({ error: 'Erro ao analisar margens' });
    }
});

// =============================================
// DOR 5: "Meu tempo de entrega piorou. Em quais dias/horários?"
// =============================================
app.get('/api/maria/performance-entregas', async (req, res) => {
    try {
        console.log('⏱️ Maria solicitou análise de entregas');
        
        const sql = `
            SELECT 
                CASE EXTRACT(DOW FROM s.created_at)
                    WHEN 0 THEN 'Domingo'
                    WHEN 1 THEN 'Segunda'
                    WHEN 2 THEN 'Terça' 
                    WHEN 3 THEN 'Quarta'
                    WHEN 4 THEN 'Quinta'
                    WHEN 5 THEN 'Sexta'
                    WHEN 6 THEN 'Sábado'
                END as dia_semana,
                EXTRACT(DOW FROM s.created_at) as dia_numero,
                EXTRACT(HOUR FROM s.created_at) as hora,
                c.name as canal,
                ROUND(AVG(s.delivery_seconds) / 60.0, 1) as tempo_medio_minutos,
                COUNT(*) as total_entregas,
                ROUND(PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY s.delivery_seconds) / 60.0, 1) as p80_tempo_minutos
            FROM sales s
            JOIN channels c ON c.id = s.channel_id
            WHERE s.sale_status_desc = 'COMPLETED'
                AND s.delivery_seconds IS NOT NULL
                AND s.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY EXTRACT(DOW FROM s.created_at), EXTRACT(HOUR FROM s.created_at), c.name
            ORDER BY dia_numero, hora;
        `;

        const { rows } = await query(sql);
        res.json(rows);
        
    } catch (error) {
        console.error('❌ Erro nas entregas:', error);
        res.status(500).json({ error: 'Erro ao analisar entregas' });
    }
});

// =============================================
// DOR 6: "Quais clientes compraram 3+ vezes mas não voltam há 30 dias?"
// =============================================
app.get('/api/maria/clientes-inativos', async (req, res) => {
    try {
        console.log('👥 Maria solicitou análise de clientes');
        
        const sql = `
            WITH clientes_fieis AS (
                SELECT 
                    c.id,
                    c.customer_name as cliente,
                    c.phone_number as telefone,
                    c.email,
                    COUNT(DISTINCT s.id) as total_pedidos,
                    SUM(s.total_amount) as total_gasto,
                    MAX(s.created_at) as ultima_compra,
                    ROUND(AVG(s.total_amount)::numeric, 2) as ticket_medio
                FROM customers c
                JOIN sales s ON s.customer_id = c.id
                WHERE s.sale_status_desc = 'COMPLETED'
                GROUP BY c.id, c.customer_name, c.phone_number, c.email
                HAVING COUNT(DISTINCT s.id) >= 3
            )
            SELECT *,
                EXTRACT(DAYS FROM (NOW() - ultima_compra)) as dias_sem_comprar
            FROM clientes_fieis
            WHERE EXTRACT(DAYS FROM (NOW() - ultima_compra)) >= 30
            ORDER BY dias_sem_comprar DESC, total_pedidos DESC
            LIMIT 25;
        `;

        const { rows } = await query(sql);
        res.json(rows);
        
    } catch (error) {
        console.error('❌ Erro nos clientes:', error);
        res.status(500).json({ error: 'Erro ao analisar clientes' });
    }
});

// INICIAR SERVIDOR
const PORT = 8000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 SERVIDOR MARIA - TODAS AS ROTAS IMPLEMENTADAS');
    console.log('📍 URL: http://localhost:8000');
    console.log('📊 Endpoints disponíveis:');
    console.log('   ✅ Health:    http://localhost:8000/health');
    console.log('   📈 Resumo:    http://localhost:8000/api/maria/resumo-diario');
    console.log('   🍔 Estoque:   http://localhost:8000/api/maria/estoque-produtos-populares');
    console.log('   💰 Ticket:    http://localhost:8000/api/maria/analise-ticket-medio');
    console.log('   📊 Margens:   http://localhost:8000/api/maria/produtos-baixa-margem');
    console.log('   ⏱️ Entregas: http://localhost:8000/api/maria/performance-entregas');
    console.log('   👥 Clientes:  http://localhost:8000/api/maria/clientes-inativos');
    console.log('='.repeat(60));
});
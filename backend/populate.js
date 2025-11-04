#!/usr/bin/env node
/**
 * populate.js - VERSÃO CORRIGIDA
 */
import { faker } from '@faker-js/faker';
import pkg from 'pg';
import { config } from 'dotenv';
config();

const { Pool } = pkg;

// Configuração do pool corrigida
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'analytcs_final',
  password: process.env.PGPASSWORD || 'L29/8/2006',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ... (configurações mantidas)

// CORREÇÃO: Usar métodos corretos do Faker
async function generateStores(client, subBrandIds, numStores = 50) {
  console.log(`Generating ${numStores} stores...`);
  const storeIds = [];
  const cities = Array.from({ length: 20 }, () => faker.location.city());

  for (let i = 0; i < numStores; i++) {
    const subBrandId = faker.helpers.arrayElement(subBrandIds);
    const city = faker.helpers.arrayElement(cities);
    const baseLat = -23.5 + (Math.random() * 4 - 2);
    const baseLong = -46.6 + (Math.random() * 6 - 3);

    // CORREÇÃO: Métodos Faker atualizados
    const res = await client.query(
      `INSERT INTO stores (
        brand_id, sub_brand_id, name, city, state, district, address_street,
        address_number, zipcode, latitude, longitude, is_active, is_own, is_holding, creation_date, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        BRAND_ID,
        subBrandId,
        `${faker.company.name()} - ${city}`,
        city,
        faker.location.state(), // CORRIGIDO
        faker.location.county() || 'Centro', // CORRIGIDO - fallback
        faker.location.street(),
        faker.number.int({ min: 10, max: 9999 }),
        faker.location.zipCode('#####-###'),
        Number(baseLat.toFixed(6)),
        Number(baseLong.toFixed(6)),
        Math.random() > 0.1,
        Math.random() > 0.7,
        Math.random() > 0.8,
        faker.date.past({ years: 3 }).toISOString().split('T')[0],
        new Date()
      ]
    );
    storeIds.push(res.rows[0].id);
  }

  console.log(`✓ ${storeIds.length} stores created`);
  return storeIds;
}

// CORREÇÃO: Geração de customers otimizada
async function generateCustomers(client, numCustomers = 10000) {
  console.log(`Generating ${numCustomers} customers (batch insert)...`);
  const pageSize = 500; // Reduzido para evitar timeouts
  const createdIds = [];

  for (let offset = 0; offset < numCustomers; offset += pageSize) {
    const batch = [];
    const placeholders = [];
    const values = [];
    const limit = Math.min(pageSize, numCustomers - offset);

    for (let i = 0; i < limit; i++) {
      const placeholder = [];
      const startIndex = batch.length * 13;
      
      batch.push(
        faker.person.fullName(),
        faker.internet.email(),
        faker.phone.number(),
        faker.number.int({ min: 10000000000, max: 99999999999 }).toString(),
        faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
        faker.helpers.arrayElement(['M', 'F', 'NB']),
        null,
        null,
        faker.helpers.arrayElement(['qr_code', 'link', 'balcony', 'pos']),
        Math.random() > 0.5,
        Math.random() > 0.7,
        Math.random() > 0.9,
        faker.date.past({ years: 2 })
      );

      for (let j = 1; j <= 13; j++) {
        placeholder.push(`$${startIndex + j}`);
      }
      placeholders.push(`(${placeholder.join(',')})`);
    }

    // Achata o array batch
    values.push(...batch.flat());

    const sql = `
      INSERT INTO customers (
        customer_name, email, phone_number, cpf, birth_date, gender,
        store_id, sub_brand_id, registration_origin, agree_terms, 
        receive_promotions_email, receive_promotions_sms, created_at
      ) VALUES ${placeholders.join(', ')} RETURNING id
    `;
    
    try {
      const res = await client.query(sql, values);
      for (const r of res.rows) createdIds.push(r.id);
      console.log(`  Batch: ${offset + limit}/${numCustomers}`);
    } catch (error) {
      console.error('Error in customer batch:', error);
      throw error;
    }
  }

  console.log(`✓ ${createdIds.length} customers created`);
  return createdIds;
}

// CORREÇÃO: Lógica de sales melhorada
async function generateSales(client, stores, channels, products, items, optionGroups, customers, months = 6) {
  console.log(`Generating sales for ${months} months...`);
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const endDate = new Date();
  
  let totalSales = 0;
  const batchSize = 100; // Reduzido para melhor performance

  // ... (restante da função createSingleSale mantido)

  // CORREÇÃO: Lógica de batch e transação melhorada
  let current = new Date(startDate);
  while (current <= endDate) {
    const weekday = current.getDay();
    let dayMult = [0.8, 0.9, 0.95, 1.0, 1.3, 1.5, 1.4][weekday] || 1.0;
    const dailySales = Math.max(1, Math.floor((Math.random() * 50 + 20) * dayMult)); // Reduzido para teste

    let dailyBatch = [];
    
    for (let s = 0; s < dailySales; s++) {
      const hourWeights = Array.from({ length: 24 }, (_, h) => getHourWeight(h));
      const hour = randomChoiceWeighted([...Array(24).keys()], hourWeights);
      
      const saleTime = new Date(current);
      saleTime.setHours(hour, faker.number.int({ min: 0, max: 59 }), faker.number.int({ min: 0, max: 59 }), 0);

      const storeId = faker.helpers.arrayElement(stores);
      const channelObj = faker.helpers.arrayElement(channels);
      const customerId = Math.random() > 0.3 ? faker.helpers.arrayElement(customers) : null;

      const sale = createSingleSale(saleTime, storeId, channelObj, customerId);
      dailyBatch.push(sale);

      if (dailyBatch.length >= batchSize) {
        await processSalesBatch(client, dailyBatch);
        totalSales += dailyBatch.length;
        dailyBatch = [];
      }
    }

    // Processar batch restante do dia
    if (dailyBatch.length > 0) {
      await processSalesBatch(client, dailyBatch);
      totalSales += dailyBatch.length;
    }

    console.log(`  Date: ${current.toISOString().split('T')[0]} - ${dailySales} sales`);
    current.setDate(current.getDate() + 1);
  }

  console.log(`✓ ${totalSales} total sales generated`);
  return totalSales;
}

// NOVA FUNÇÃO: Processar batch de sales
async function processSalesBatch(client, salesBatch) {
  for (const sale of salesBatch) {
    try {
      await insertSaleWithDetails(client, sale);
    } catch (error) {
      console.error('Error inserting sale:', error);
      // Continua com as próximas vendas
    }
  }
}

// main corrigida
async function main() {
  console.log('='.repeat(70));
  console.log('God Level Coder Challenge - Data Generator (JS) - CORRECTED');
  console.log('='.repeat(70));

  const client = await pool.connect();
  
  try {
    // Fase 1: Dados base
    await client.query('BEGIN');
    const { subBrandIds, channelObjs, optionGroupIds } = await setupBaseData(client);
    const stores = await generateStores(client, subBrandIds, 10); // Reduzido para teste
    const { products, items, optionGroups } = await generateProductsAndItems(client, subBrandIds, 50, 20); // Reduzido
    await client.query('COMMIT');

    // Fase 2: Customers
    await client.query('BEGIN');
    const customerIds = await generateCustomers(client, 200); // Reduzido para teste
    await client.query('COMMIT');

    // Fase 3: Sales (em lotes menores)
    await client.query('BEGIN');
    const channels = channelObjs;
    const totalSales = await generateSales(client, stores, channels, products, items, optionGroups, customerIds, 1); // 1 mês para teste
    
    await createIndexes(client);
    await client.query('COMMIT');

    console.log('\n' + '='.repeat(70));
    console.log('✓ Data generation complete!');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('ERROR during generation:', err);
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
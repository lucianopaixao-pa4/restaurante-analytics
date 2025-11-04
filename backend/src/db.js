const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexão
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'analytcs_final',
  password: process.env.PGPASSWORD || 'L29/8/2006u',
  port: process.env.PGPORT || 5432,
});

// Função helper para executar queries
function query(text, params) {
  return pool.query(text, params);
}

// Testar conexão com o banco
pool.query('SELECT NOW()')
  .then((result) => {
    console.log('✅ Conectado ao PostgreSQL - Hora do servidor:', result.rows[0].now);
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar com PostgreSQL:', err.message);
    console.log('💡 Verifique se:');
    console.log('   1. PostgreSQL está rodando');
    console.log('   2. O database "analytcs_final" existe');
    console.log('   3. As credenciais estão corretas');
  });

// Exportar CommonJS
module.exports = {
  query,
  pool
};
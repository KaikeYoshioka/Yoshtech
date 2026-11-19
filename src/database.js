require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');
const sql = require('msnodesqlv8');

const DB_NAME = process.env.DB_NAME || 'LojaEletronicosDB';

const SERVIDORES = unicos([process.env.DB_SERVER, '.\\SQLEXPRESS', 'localhost', '(localdb)\\MSSQLLocalDB']);
const DRIVERS = unicos([process.env.DB_DRIVER, 'ODBC Driver 17 for SQL Server', 'ODBC Driver 18 for SQL Server']);

const conexao = { servidor: SERVIDORES[0], driver: DRIVERS[0], banco: DB_NAME };

function unicos(lista) {
  return [...new Set(lista.filter(Boolean))];
}

function connectionString(database, servidor = conexao.servidor, driver = conexao.driver) {
  return `Driver={${driver}};Server=${servidor};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`;
}

function testarConexao(connStr) {
  return new Promise((resolve, reject) => {
    sql.open({ conn_str: connStr, conn_timeout: 3 }, (err, conn) => {
      if (err) return reject(err);
      conn.close(() => resolve());
    });
  });
}

const sequelize = new Sequelize({
  dialect: 'mssql',
  dialectModule: require('msnodesqlv8/lib/sequelize'),
  dialectOptions: {
    options: { connectionString: connectionString(DB_NAME) },
  },
  logging: false,
});

async function descobrirConexao() {
  for (const servidor of SERVIDORES) {
    for (const driver of DRIVERS) {
      try {
        await testarConexao(connectionString('master', servidor, driver));
        conexao.servidor = servidor;
        conexao.driver = driver;
        const connStr = connectionString(DB_NAME);
        sequelize.config.dialectOptions.options.connectionString = connStr;
        sequelize.connectionManager.config.dialectOptions.options.connectionString = connStr;
        return conexao;
      } catch {
      }
    }
  }
  throw new Error(
    `Não foi possível conectar ao SQL Server (tentei ${SERVIDORES.join(', ')} com ${DRIVERS.join(' / ')}). ` +
    'Confira se o SQL Server está rodando e ajuste DB_SERVER e DB_DRIVER no arquivo .env.'
  );
}

function criarBancoSeNaoExistir() {
  return new Promise((resolve, reject) => {
    const comando = `IF DB_ID('${DB_NAME}') IS NULL CREATE DATABASE [${DB_NAME}]`;
    sql.query(connectionString('master'), comando, (err) => (err ? reject(err) : resolve()));
  });
}

async function prepararBanco() {
  await descobrirConexao();
  await criarBancoSeNaoExistir();
  await sequelize.authenticate();
  await sequelize.sync();
  return conexao;
}

module.exports = { sequelize, prepararBanco, conexao };

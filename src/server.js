const path = require('path');
const express = require('express');
const cors = require('cors');
const { prepararBanco } = require('./database');
const { cadastrarProdutosDeExemplo } = require('./seed');
const produtosRoutes = require('./routes/produtos');

const app = express();
const PORT = process.env.PORT || 3000;
const RAIZ = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function registrarChamada(req, res, next) {
  console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${req.method} ${req.originalUrl}`);
  next();
}
app.use('/produtos', registrarChamada, produtosRoutes);

app.use('/vendor/bootstrap', express.static(path.join(RAIZ, 'node_modules', 'bootstrap', 'dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(RAIZ, 'node_modules', 'bootstrap-icons')));
app.use(express.static(path.join(RAIZ, 'public')));

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'A requisição é grande demais. Envie uma foto menor.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

async function iniciar() {
  try {
    const conexao = await prepararBanco();
    console.log(`Conectado ao SQL Server (${conexao.servidor} / ${conexao.banco})`);

    const cadastrados = await cadastrarProdutosDeExemplo();
    if (cadastrados) console.log(`Banco vazio: ${cadastrados} produtos de exemplo cadastrados.`);

    app.listen(PORT, () => {
      const endereco = `http://localhost:${PORT}`;
      console.log(`API rodando em ${endereco}/produtos`);
      console.log(`Loja aberta em ${endereco}`);
    });
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
}

iniciar();

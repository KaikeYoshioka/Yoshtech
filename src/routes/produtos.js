const { Router } = require('express');
const { ValidationError, UniqueConstraintError } = require('sequelize');
const Produto = require('../models/Produto');
const { salvarImagem, apagarImagem, ImagemInvalidaError } = require('../imagens');

const router = Router();
const CAMPOS = ['nome', 'codigo', 'marca', 'preco', 'descricao', 'quantidadeEstoque', 'avaliacao', 'categoria', 'destaque'];
const OPCIONAIS = ['marca', 'descricao', 'avaliacao'];
const QTD_RECENTES = 12;

function campos(body) {
  const dados = {};
  for (const c of CAMPOS) {
    if (body[c] === undefined) continue;
    let valor = typeof body[c] === 'string' ? body[c].trim() : body[c];
    if (OPCIONAIS.includes(c) && valor === '') valor = null;
    dados[c] = valor;
  }
  return dados;
}

function codigoDuplicado(err) {
  return err instanceof UniqueConstraintError || [2627, 2601].includes(err.parent?.code);
}

function tratarErro(res, err) {
  if (codigoDuplicado(err)) {
    return res.status(409).json({ erro: 'Já existe um produto com este código.' });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes: err.errors.map((e) => e.message) });
  }
  if (err instanceof ImagemInvalidaError) {
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes: [err.message] });
  }
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

async function aplicarImagem(produto, body) {
  if (body.imagemBase64) {
    const nova = await salvarImagem(body.imagemBase64, produto.codigo);
    produto.imagem = nova;
    return nova;
  }
  if (body.removerImagem === true || body.removerImagem === 'true') {
    produto.imagem = null;
  }
  return null;
}

router.post('/', async (req, res) => {
  let fotoNova = null;
  try {
    const produto = Produto.build(campos(req.body));
    await produto.validate();
    fotoNova = await aplicarImagem(produto, req.body);
    await produto.save();
    res.status(201).json(produto);
  } catch (err) {
    await apagarImagem(fotoNova);
    tratarErro(res, err);
  }
});

router.get('/', async (req, res) => {
  try {
    const produtos = await Produto.findAll({ order: [['id', 'ASC']] });
    res.json(produtos);
  } catch (err) {
    tratarErro(res, err);
  }
});

router.get('/recentes', async (req, res) => {
  try {
    const produtos = await Produto.findAll({
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: QTD_RECENTES,
    });
    res.json(produtos);
  } catch (err) {
    tratarErro(res, err);
  }
});

router.get('/destaques', async (req, res) => {
  try {
    const produtos = await Produto.findAll({
      where: { destaque: true },
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
    });
    res.json(produtos);
  } catch (err) {
    tratarErro(res, err);
  }
});

router.get('/codigo/:codigo', async (req, res) => {
  try {
    const produto = await Produto.findOne({ where: { codigo: req.params.codigo } });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(produto);
  } catch (err) {
    tratarErro(res, err);
  }
});

router.get('/categoria/:categoria', async (req, res) => {
  try {
    const produtos = await Produto.findAll({
      where: { categoria: req.params.categoria },
      order: [['id', 'ASC']],
    });
    res.json(produtos);
  } catch (err) {
    tratarErro(res, err);
  }
});

router.put('/:codigo', async (req, res) => {
  let fotoNova = null;
  try {
    const produto = await Produto.findOne({ where: { codigo: req.params.codigo } });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

    const faltando = ['nome', 'codigo', 'preco', 'quantidadeEstoque', 'categoria']
      .filter((c) => req.body[c] === undefined);
    if (faltando.length) {
      return res.status(400).json({ erro: 'PUT exige todos os campos.', faltando });
    }

    const fotoAntiga = produto.imagem;
    produto.set({ marca: null, descricao: null, avaliacao: null, destaque: false, ...campos(req.body) });
    await produto.validate();
    fotoNova = await aplicarImagem(produto, req.body);
    await produto.save();
    if (produto.imagem !== fotoAntiga) await apagarImagem(fotoAntiga);
    res.json(produto);
  } catch (err) {
    await apagarImagem(fotoNova);
    tratarErro(res, err);
  }
});

router.patch('/:codigo', async (req, res) => {
  let fotoNova = null;
  try {
    const produto = await Produto.findOne({ where: { codigo: req.params.codigo } });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

    const fotoAntiga = produto.imagem;
    produto.set(campos(req.body));
    await produto.validate();
    fotoNova = await aplicarImagem(produto, req.body);
    await produto.save();
    if (produto.imagem !== fotoAntiga) await apagarImagem(fotoAntiga);
    res.json(produto);
  } catch (err) {
    await apagarImagem(fotoNova);
    tratarErro(res, err);
  }
});

router.delete('/:codigo', async (req, res) => {
  try {
    const produto = await Produto.findOne({ where: { codigo: req.params.codigo } });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

    await produto.destroy();
    await apagarImagem(produto.imagem);
    res.json({ mensagem: `Produto ${req.params.codigo} excluído com sucesso.` });
  } catch (err) {
    tratarErro(res, err);
  }
});

module.exports = router;

const { Router } = require('express');
const { ValidationError, UniqueConstraintError, Op, fn, col, literal } = require('sequelize');
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

const ORDENACOES = {
  recentes: [['createdAt', 'DESC'], ['id', 'DESC']],
  nome: [['nome', 'ASC']],
  'preco-asc': [['preco', 'ASC'], ['id', 'ASC']],
  'preco-desc': [['preco', 'DESC'], ['id', 'ASC']],
  estoque: [['quantidadeEstoque', 'ASC'], ['id', 'ASC']],
  avaliacao: [['avaliacao', 'DESC'], ['id', 'ASC']],
};
const ESTOQUE_BAIXO = 5;

function escaparLike(texto) {
  return texto.replace(/[\\%_[]/g, (c) => `[${c}]`);
}

function numero(valor) {
  if (valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Monta o WHERE a partir da query string:
 * busca (nome/código/marca), categoria, marca, precoMin, precoMax,
 * estoque (disponivel | baixo | esgotado) e destaque (true | false).
 */
function filtrosDaQuery(query) {
  const where = {};
  const e = [];
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');

  const busca = texto(query.busca);
  if (busca) {
    const like = `%${escaparLike(busca)}%`;
    e.push({ [Op.or]: [{ nome: { [Op.like]: like } }, { codigo: { [Op.like]: like } }, { marca: { [Op.like]: like } }] });
  }
  if (texto(query.categoria)) where.categoria = texto(query.categoria);
  if (texto(query.marca)) where.marca = { [Op.like]: escaparLike(texto(query.marca)) };

  const min = numero(query.precoMin);
  const max = numero(query.precoMax);
  if (Number.isNaN(min) || Number.isNaN(max)) return { erro: 'precoMin e precoMax devem ser números.' };
  if (min !== null && max !== null && min > max) return { erro: 'precoMin não pode ser maior que precoMax.' };
  if (min !== null || max !== null) {
    where.preco = {};
    if (min !== null) where.preco[Op.gte] = min;
    if (max !== null) where.preco[Op.lte] = max;
  }

  switch (texto(query.estoque)) {
    case '': break;
    case 'disponivel': where.quantidadeEstoque = { [Op.gt]: 0 }; break;
    case 'baixo': where.quantidadeEstoque = { [Op.between]: [1, ESTOQUE_BAIXO] }; break;
    case 'esgotado': where.quantidadeEstoque = 0; break;
    default: return { erro: 'estoque deve ser disponivel, baixo ou esgotado.' };
  }

  if (query.destaque === 'true' || query.destaque === 'false') where.destaque = query.destaque === 'true';

  if (e.length) where[Op.and] = e;
  return { where };
}

// GET /produtos?busca=&categoria=&marca=&precoMin=&precoMax=&estoque=&destaque=&ordenar=
router.get('/', async (req, res) => {
  try {
    const { where, erro } = filtrosDaQuery(req.query);
    if (erro) return res.status(400).json({ erro });
    const order = ORDENACOES[req.query.ordenar] || [['id', 'ASC']];
    const produtos = await Produto.findAll({ where, order });
    res.json(produtos);
  } catch (err) {
    tratarErro(res, err);
  }
});

// Consultas agregadas (painel do front-end)
router.get('/consultas/resumo', async (req, res) => {
  try {
    const [r] = await Produto.findAll({
      attributes: [
        [fn('COUNT', col('id')), 'totalProdutos'],
        [fn('COALESCE', fn('SUM', col('quantidadeEstoque')), 0), 'unidadesEmEstoque'],
        [fn('COALESCE', fn('SUM', literal('preco * quantidadeEstoque')), 0), 'valorEmEstoque'],
        [fn('AVG', col('preco')), 'precoMedio'],
        [fn('AVG', col('avaliacao')), 'avaliacaoMedia'],
        [fn('SUM', literal('CASE WHEN quantidadeEstoque = 0 THEN 1 ELSE 0 END')), 'esgotados'],
        [fn('SUM', literal('CASE WHEN destaque = 1 THEN 1 ELSE 0 END')), 'destaques'],
      ],
      raw: true,
    });
    res.json({
      totalProdutos: Number(r.totalProdutos),
      unidadesEmEstoque: Number(r.unidadesEmEstoque),
      valorEmEstoque: Number(r.valorEmEstoque),
      precoMedio: r.precoMedio === null ? null : Number(r.precoMedio),
      avaliacaoMedia: r.avaliacaoMedia === null ? null : Number(r.avaliacaoMedia),
      esgotados: Number(r.esgotados || 0),
      destaques: Number(r.destaques || 0),
    });
  } catch (err) {
    tratarErro(res, err);
  }
});

// SELECT categoria, COUNT(*), SUM(estoque), AVG(preco), MIN/MAX(preco) ... GROUP BY categoria
router.get('/consultas/por-categoria', async (req, res) => {
  try {
    const linhas = await Produto.findAll({
      attributes: [
        'categoria',
        [fn('COUNT', col('id')), 'produtos'],
        [fn('SUM', col('quantidadeEstoque')), 'unidades'],
        [fn('AVG', col('preco')), 'precoMedio'],
        [fn('MIN', col('preco')), 'precoMinimo'],
        [fn('MAX', col('preco')), 'precoMaximo'],
        [fn('SUM', literal('preco * quantidadeEstoque')), 'valorEmEstoque'],
      ],
      group: ['categoria'],
      order: [[literal('valorEmEstoque'), 'DESC']],
      raw: true,
    });
    res.json(linhas.map((l) => ({
      categoria: l.categoria,
      produtos: Number(l.produtos),
      unidades: Number(l.unidades),
      precoMedio: Number(l.precoMedio),
      precoMinimo: Number(l.precoMinimo),
      precoMaximo: Number(l.precoMaximo),
      valorEmEstoque: Number(l.valorEmEstoque),
    })));
  } catch (err) {
    tratarErro(res, err);
  }
});

// WHERE quantidadeEstoque <= :limite ORDER BY quantidadeEstoque
router.get('/consultas/estoque-baixo', async (req, res) => {
  try {
    const limite = numero(req.query.limite) ?? ESTOQUE_BAIXO;
    if (!Number.isInteger(limite) || limite < 0) return res.status(400).json({ erro: 'limite deve ser um inteiro maior ou igual a 0.' });
    const produtos = await Produto.findAll({
      where: { quantidadeEstoque: { [Op.lte]: limite } },
      order: [['quantidadeEstoque', 'ASC'], ['nome', 'ASC']],
    });
    res.json(produtos);
  } catch (err) {
    tratarErro(res, err);
  }
});

// SELECT marca, COUNT(*) ... GROUP BY marca (também alimenta o filtro de marca)
router.get('/consultas/marcas', async (req, res) => {
  try {
    const linhas = await Produto.findAll({
      attributes: ['marca', [fn('COUNT', col('id')), 'produtos'], [fn('AVG', col('preco')), 'precoMedio']],
      where: { marca: { [Op.ne]: null } },
      group: ['marca'],
      order: [['marca', 'ASC']],
      raw: true,
    });
    res.json(linhas.map((l) => ({ marca: l.marca, produtos: Number(l.produtos), precoMedio: Number(l.precoMedio) })));
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

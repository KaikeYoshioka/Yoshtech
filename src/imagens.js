const fs = require('fs/promises');
const path = require('path');

const PASTA_PRODUTOS = path.join(__dirname, '..', 'public', 'img', 'produtos');
const PREFIXO = 'img/produtos/';
const PREFIXO_EXEMPLO = 'exemplo-';
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

const EXTENSOES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const ASSINATURAS = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

class ImagemInvalidaError extends Error {}

function slug(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'produto';
}

function nomeArquivo(codigo, extensao) {
  return `${slug(codigo)}-${Date.now()}.${extensao}`;
}

async function salvarImagem(dataUrl, codigo) {
  const texto = String(dataUrl);
  const virgula = texto.indexOf(',');
  const cabecalho = /^data:(image\/[a-z]+);base64$/.exec(texto.slice(0, virgula));
  const tipo = cabecalho?.[1];
  if (virgula < 0 || !EXTENSOES[tipo]) {
    throw new ImagemInvalidaError('A foto deve ser JPG, PNG ou WEBP.');
  }

  const bytes = Buffer.from(texto.slice(virgula + 1), 'base64');
  if (bytes.length === 0) throw new ImagemInvalidaError('A foto enviada está vazia.');
  if (bytes.length > TAMANHO_MAXIMO) throw new ImagemInvalidaError('A foto deve ter no máximo 2 MB.');
  if (!ASSINATURAS[tipo](bytes)) throw new ImagemInvalidaError('O arquivo enviado não é uma imagem válida.');

  await fs.mkdir(PASTA_PRODUTOS, { recursive: true });
  const nome = nomeArquivo(codigo, EXTENSOES[tipo]);
  await fs.writeFile(path.join(PASTA_PRODUTOS, nome), bytes);
  return PREFIXO + nome;
}

async function apagarImagem(caminho) {
  if (typeof caminho !== 'string' || !caminho.startsWith(PREFIXO)) return;
  const nome = caminho.slice(PREFIXO.length);
  if (!nome || nome !== path.basename(nome) || nome.startsWith(PREFIXO_EXEMPLO)) return;
  try {
    await fs.unlink(path.join(PASTA_PRODUTOS, nome));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Não foi possível apagar a foto', caminho, err.message);
  }
}

module.exports = { salvarImagem, apagarImagem, ImagemInvalidaError, PREFIXO, PREFIXO_EXEMPLO };

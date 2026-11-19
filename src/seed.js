const { sequelize, prepararBanco } = require('./database');
const Produto = require('./models/Produto');
const { PREFIXO, PREFIXO_EXEMPLO } = require('./imagens');

const produtos = [
  {
    nome: 'Smartphone Google Nexus 4 16 GB', codigo: 'SMA-1001', marca: 'LG', categoria: 'Smartphones',
    preco: 899.0, quantidadeEstoque: 0, avaliacao: 4.1, destaque: false, foto: 'smartphone-nexus4.jpg',
    descricao: 'Tela de 4,7" HD, processador quad-core, 2 GB de RAM e 16 GB de armazenamento. Traseira em vidro com acabamento cintilante e carregamento sem fio.',
  },
  {
    nome: 'Roteador Wi-Fi TP-Link TL-WR740N 150 Mbps', codigo: 'RED-1001', marca: 'TP-Link', categoria: 'Redes',
    preco: 119.9, quantidadeEstoque: 34, avaliacao: 4.3, destaque: false, foto: 'roteador-tplink.jpg',
    descricao: 'Roteador wireless N de 150 Mbps com 4 portas LAN, botão WPS para conexão rápida e controle dos pais. Ideal para apartamentos e escritórios pequenos.',
  },
  {
    nome: 'Monitor EIZO Foris FG2421 24" 120 Hz', codigo: 'INF-1001', marca: 'EIZO', categoria: 'Informática',
    preco: 1899.0, quantidadeEstoque: 6, avaliacao: 4.6, destaque: false, foto: 'monitor-eizo.jpg',
    descricao: 'Monitor gamer de 23,5" com painel VA Full HD, 120 Hz com modo Turbo 240 para reduzir o borrão de movimento, alto contraste e ajuste de altura e inclinação.',
  },
  {
    nome: 'SSD Samsung 970 EVO Plus 1 TB NVMe M.2', codigo: 'ARM-1001', marca: 'Samsung', categoria: 'Armazenamento',
    preco: 599.9, quantidadeEstoque: 25, avaliacao: 4.9, destaque: false, foto: 'ssd-970-evo-plus.jpg',
    descricao: 'SSD NVMe PCIe 3.0 com leitura de até 3.500 MB/s e gravação de até 3.300 MB/s. Formato M.2 2280 e 5 anos de garantia.',
  },
  {
    nome: 'Mouse Sem Fio Ergonômico 1600 DPI', codigo: 'PER-1001', marca: 'YoshTech', categoria: 'Periféricos',
    preco: 79.9, quantidadeEstoque: 58, avaliacao: 4.2, destaque: false, foto: 'mouse-sem-fio.jpg',
    descricao: 'Mouse sem fio de 2,4 GHz com formato ergonômico para a mão direita, 6 botões, DPI ajustável até 1600 e pilha com duração de até 12 meses.',
  },
  {
    nome: 'Webcam Logitech Brio 301 Full HD', codigo: 'PER-1002', marca: 'Logitech', categoria: 'Periféricos',
    preco: 329.9, quantidadeEstoque: 15, avaliacao: 4.4, destaque: false, foto: 'webcam-brio301.jpg',
    descricao: 'Webcam 1080p com correção automática de luz, microfone com redução de ruído, tampa de privacidade e conexão USB-C. Ótima para aulas e reuniões.',
  },
  {
    nome: 'Notebook Lenovo G500s 15,6" Core i5', codigo: 'INF-1002', marca: 'Lenovo', categoria: 'Informática',
    preco: 2899.0, quantidadeEstoque: 4, avaliacao: 4.0, destaque: false, foto: 'notebook-lenovo-g500s.jpg',
    descricao: 'Notebook com processador Intel Core i5, 8 GB de RAM, SSD de 256 GB e tela de 15,6" HD. Teclado com teclado numérico e webcam integrada.',
  },
  {
    nome: 'Fone de Ouvido Philips A5-PRO DJ', codigo: 'AUD-1001', marca: 'Philips', categoria: 'Áudio',
    preco: 499.9, quantidadeEstoque: 12, avaliacao: 4.5, destaque: false, foto: 'fone-philips-a5pro.jpg',
    descricao: 'Fone over-ear profissional para DJ, com drivers de 50 mm, conchas giratórias, isolamento de ruído e cabo destacável.',
  },
  {
    nome: 'Teclado Mecânico Gamer RGB Lingbao', codigo: 'PER-1003', marca: 'Lingbao', categoria: 'Periféricos',
    preco: 289.9, quantidadeEstoque: 20, avaliacao: 4.6, destaque: false, foto: 'teclado-lingbao.jpg',
    descricao: 'Teclado mecânico com switches azuis, iluminação RGB com 18 efeitos, anti-ghosting em todas as teclas e estrutura em alumínio.',
  },
  {
    nome: 'Smartwatch Samsung Gear S3 Frontier', codigo: 'WEA-1001', marca: 'Samsung', categoria: 'Wearables',
    preco: 1199.0, quantidadeEstoque: 9, avaliacao: 4.5, destaque: true, foto: 'smartwatch-gear-s3.jpg',
    descricao: 'Relógio inteligente com tela circular Super AMOLED, GPS, monitor de frequência cardíaca, resistência à água e pagamento por aproximação.',
  },
  {
    nome: 'Microfone Blue Yeti Blackout USB', codigo: 'AUD-1002', marca: 'Blue', categoria: 'Áudio',
    preco: 999.9, quantidadeEstoque: 7, avaliacao: 4.8, destaque: true, foto: 'microfone-blue-yeti.jpg',
    descricao: 'Microfone condensador USB com 3 cápsulas e 4 padrões de captação, ideal para podcasts, streaming e gravações. Saída para fone com controle de volume.',
  },
  {
    nome: 'Controle Sem Fio Xbox One', codigo: 'GAM-1001', marca: 'Microsoft', categoria: 'Games',
    preco: 399.9, quantidadeEstoque: 18, avaliacao: 4.7, destaque: true, foto: 'controle-xbox-one.jpg',
    descricao: 'Controle sem fio com alcance de até 6 metros, gatilhos com vibração, conector P2 para fone e compatibilidade com Xbox One e PC com Windows.',
  },
  {
    nome: 'Caixa de Som JBL Flip 4 Bluetooth', codigo: 'AUD-1003', marca: 'JBL', categoria: 'Áudio',
    preco: 549.9, quantidadeEstoque: 22, avaliacao: 4.7, destaque: true, foto: 'caixa-jbl-flip4.jpg',
    descricao: 'Caixa de som portátil à prova d\'água (IPX7), som estéreo potente, até 12 horas de bateria e JBL Connect+ para ligar várias caixas juntas.',
  },
  {
    nome: 'iPad Pro 11" 256 GB Wi-Fi Prata', codigo: 'INF-1003', marca: 'Apple', categoria: 'Informática',
    preco: 8999.0, quantidadeEstoque: 3, avaliacao: 4.9, destaque: true, foto: 'ipad-pro-11.jpg',
    descricao: 'Tablet com tela Liquid Retina de 11", chip Apple de alto desempenho, Face ID, quatro alto-falantes e suporte ao Apple Pencil e ao Magic Keyboard.',
  },
];

async function cadastrarProdutosDeExemplo() {
  const total = await Produto.count();
  if (total > 0) return 0;

  for (const { foto, ...dados } of produtos) {
    await Produto.create({ ...dados, imagem: PREFIXO + PREFIXO_EXEMPLO + foto });
  }
  return produtos.length;
}

if (require.main === module) {
  prepararBanco()
    .then(cadastrarProdutosDeExemplo)
    .then((qtd) => console.log(qtd
      ? `${qtd} produtos de exemplo cadastrados.`
      : 'A tabela Produtos já tem produtos. Para recriar os exemplos, exclua todos e rode "npm run seed" de novo.'))
    .catch((err) => {
      console.error('Erro ao cadastrar os produtos de exemplo:', err.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { cadastrarProdutosDeExemplo };

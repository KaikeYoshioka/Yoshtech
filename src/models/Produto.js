const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Produto = sequelize.define('Produto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notNull: { msg: 'O nome do produto é obrigatório.' },
      notEmpty: { msg: 'O nome do produto é obrigatório.' },
    },
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notNull: { msg: 'O código do produto é obrigatório.' },
      notEmpty: { msg: 'O código do produto é obrigatório.' },
    },
  },
  marca: {
    type: DataTypes.STRING(50),
  },
  preco: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      notNull: { msg: 'O preço é obrigatório.' },
      min: { args: [0], msg: 'O preço não pode ser negativo.' },
    },
  },
  descricao: {
    type: DataTypes.STRING(500),
  },
  quantidadeEstoque: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: { args: [0], msg: 'A quantidade em estoque não pode ser negativa.' } },
  },
  avaliacao: {
    type: DataTypes.DECIMAL(2, 1),
    validate: {
      min: { args: [0], msg: 'A avaliação deve estar entre 0 e 5.' },
      max: { args: [5], msg: 'A avaliação deve estar entre 0 e 5.' },
    },
  },
  categoria: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notNull: { msg: 'A categoria é obrigatória.' },
      notEmpty: { msg: 'A categoria é obrigatória.' },
    },
  },
  destaque: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  imagem: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName: 'Produtos',
});

module.exports = Produto;

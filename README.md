# YoshTech — Loja de Eletrônicos

Espaço de vendas de eletrônicos com **API em Node.js** (Express + Sequelize + SQL Server Express) e
front-end em **HTML, CSS, Bootstrap e JavaScript**, integrado à API **somente com `fetch`**.

Aluno: **Kaike Yoshioka** · Curso: Análise e Desenvolvimento de Software · Turma: Noite

## Avaliação

| Critério | Onde |
|---|---|
| Página principal integrada com a API via fetch | `public/index.html` + `public/js/scripts.js` |
| Página de detalhes integrada com a API via fetch | `public/detalhes.html` + `public/js/scripts_detalhes.js` |
| Modal de edição de item | botão **Editar** na página de detalhes (`PUT`) |
| Botão de exclusão (com confirmação) | botão **Excluir** na página de detalhes (`DELETE`) |

**Home:** carrossel "Destaque" (produtos marcados como destaque), os **12 últimos produtos** cadastrados
com foto e preço, botão **Ver detalhes** em cada um e botão **+ Novo produto** (modal com `POST`).

**Detalhes:** todas as informações do produto, **Editar** (modal) e **Excluir** (modal de confirmação).

## Como executar

Pré-requisitos: **Node.js 22+** e **SQL Server Express** (com o *ODBC Driver 17 ou 18 for SQL Server*,
que já vem na instalação do SQL Server). A conexão usa **autenticação do Windows**: não há usuário nem senha.

1. Instale as dependências (lista abaixo):
   ```
   npm install
   ```
2. Inicie a API:
   ```
   npm start
   ```
3. Abra **http://localhost:3000** no navegador.

Na primeira execução, a API:
- **Procura o SQL Server:** tenta `.\SQLEXPRESS`, `localhost` e `(localdb)\MSSQLLocalDB`, com o
  ODBC Driver 17 ou 18, e mostra no terminal qual usou.
- **Cria o banco e a tabela:** `LojaEletronicosDB` e `Produtos`.
- **Cadastra 14 produtos de exemplo**, com as fotos que já vêm no projeto (`public/img/produtos/exemplo-*`).

A própria API serve o front-end (pasta `public/`) e o Bootstrap (de `node_modules`), então tudo funciona
sem internet. Abra sempre pelo endereço da API (`http://localhost:3000`).

### Configuração (opcional)

Para usar outra instância, outro banco ou outra porta, copie `.env.example` para `.env` e ajuste:

| Variável | Padrão | Para quê |
|---|---|---|
| `DB_SERVER` | tenta `.\SQLEXPRESS`, `localhost` e `(localdb)\MSSQLLocalDB` | instância do SQL Server |
| `DB_DRIVER` | `ODBC Driver 17 for SQL Server`, depois o 18 | driver ODBC usado na conexão |
| `DB_NAME` | `LojaEletronicosDB` | banco (criado automaticamente) |
| `PORT` | `3000` | porta da API |

Para recriar os exemplos depois de excluir todos os produtos, rode `npm run seed` ou reinicie a API.

### Dependências (o que o `npm install` baixa)

| Pacote | Para quê |
|---|---|
| `express` | servidor HTTP e rotas da API |
| `sequelize` | ORM: model `Produto` e consultas ao banco |
| `msnodesqlv8` | driver do SQL Server via ODBC, com autenticação do Windows. Já traz o binário pronto para Windows; se o npm avisar sobre o script de instalação dele, não é preciso aprovar |
| `dotenv` | lê o arquivo `.env`, se existir |
| `cors` | libera chamadas à API vindas de outras origens |
| `bootstrap` | CSS e JS do front-end, servidos localmente em `/vendor` |
| `bootstrap-icons` | ícones do front-end |

As versões exatas estão no `package-lock.json`.

## Rotas da API (`http://localhost:3000/produtos`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/produtos` | Lista todos os produtos |
| GET | `/produtos/recentes` | Os 12 produtos cadastrados mais recentemente (Home) |
| GET | `/produtos/destaques` | Produtos marcados como destaque (carrossel) |
| GET | `/produtos/codigo/:codigo` | Um produto pelo código (404 se não existir) |
| GET | `/produtos/categoria/:categoria` | Produtos de uma categoria |
| POST | `/produtos` | Cadastra um produto (400 dados inválidos, 409 código repetido) |
| PUT | `/produtos/:codigo` | Atualização completa |
| PATCH | `/produtos/:codigo` | Atualização parcial |
| DELETE | `/produtos/:codigo` | Exclui o produto e a foto dele |

Campos do produto: `nome`, `codigo` (único), `marca`, `categoria`, `preco`, `quantidadeEstoque`,
`avaliacao` (0 a 5), `destaque`, `descricao` e `imagem`.

### Fotos dos produtos

As fotos ficam **dentro do projeto**, em `public/img/produtos/`, e o banco guarda só o caminho
(ex.: `img/produtos/fone-001-1794077958091.jpg`).

- No `POST`/`PUT`, a foto vai no JSON como texto base64 (`imagemBase64: "data:image/jpeg;base64,..."`).
  O front reduz a foto para no máximo 1000 px antes de enviar.
- A API aceita JPG, PNG e WEBP de até 2 MB e confere se o arquivo é mesmo uma imagem.
- No `PUT`, sem `imagemBase64` a foto atual é mantida; `removerImagem: true` tira a foto.
- Trocar a foto apaga o arquivo antigo, e excluir o produto apaga a foto dele.
  As fotos dos produtos de exemplo (`exemplo-*`) nunca são apagadas, para os exemplos poderem ser recriados.

## Estrutura

```
src/
  server.js            inicialização do Express, CORS, arquivos estáticos e banco
  database.js          conexão Sequelize (msnodesqlv8, autenticação do Windows), descoberta do
                       servidor e criação do banco
  models/Produto.js    model (tabela Produtos)
  routes/produtos.js   rotas do CRUD
  imagens.js           salvar/apagar as fotos em public/img/produtos
  seed.js              produtos de exemplo (automático no npm start, ou npm run seed)
public/
  index.html           Tela 1 – Home
  detalhes.html        Tela 2 – Detalhes
  css/style.css
  js/comum.js          funções compartilhadas (URL da API, preço em R$, toasts, foto → base64)
  js/scripts.js        fetch da Home (GET recentes/destaques, POST)
  js/scripts_detalhes.js  fetch dos Detalhes (GET por código, PUT, DELETE)
  img/produtos/        fotos dos produtos (exemplo-* = fotos dos produtos de exemplo)
```


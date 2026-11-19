const url = urlBase + "/produtos";

const urlParams = new URLSearchParams(window.location.search);
const getCodigo = (urlParams.get("codigo") || "").trim();

let produtoAtual = null;

async function getUmProduto() {
  let box = document.querySelector(".box-detalhes");

  if (!getCodigo) {
    box.innerHTML = htmlNaoEncontrado("Nenhum código de produto foi informado no endereço da página.");
    box.setAttribute("aria-busy", "false");
    return;
  }

  box.setAttribute("aria-busy", "true");
  box.innerHTML = htmlDetalheCarregando();

  try {
    let data = await fetch(url + "/codigo/" + encodeURIComponent(getCodigo));

    if (data.status === 404) {
      box.innerHTML = htmlNaoEncontrado(`Não existe produto com o código "${getCodigo}". Ele pode ter sido excluído.`);
      return;
    }
    if (!data.ok) throw await erroDaResposta(data);

    let response = await data.json();
    produtoAtual = response;
    mostrarProduto(response);
  } catch (erro) {
    console.error("Erro ao carregar o produto:", erro);
    document.title = "Erro ao carregar · " + NOME_LOJA;
    box.innerHTML = htmlEstado({
      tipo: "erro",
      tag: "h1",
      icone: "bi-wifi-off",
      titulo: "Não foi possível carregar o produto",
      texto: mensagemDeErro(erro),
      acao: `<button type="button" class="btn btn-primary" onclick="getUmProduto()">
               <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Tentar novamente
             </button>`
    });
  } finally {
    box.setAttribute("aria-busy", "false");
  }
}

function mostrarProduto(produto) {
  let box = document.querySelector(".box-detalhes");

  let nome = produto.nome || "";
  let codigo = produto.codigo;
  let marca = produto.marca;
  let categoria = produto.categoria;
  let preco = Number(produto.preco);
  let estoque = Number(produto.quantidadeEstoque) || 0;
  let avaliacao = produto.avaliacao;
  let destaque = produto.destaque;
  let descricao = produto.descricao;

  document.title = nome + " · " + NOME_LOJA;

  box.innerHTML = `
    <div class="row g-4 g-xl-5">
      <div class="col-lg-5">
        <div class="detalhe-imagem">
          <img src="${escapeHTML(srcImagem(produto))}" alt="${escapeHTML(nome)}"
               class="img-produto ${classeFoto(produto)}" onerror="imagemQuebrada(this)">
        </div>
      </div>

      <div class="col-lg-7">
        <article class="detalhe-info" aria-labelledby="nome-produto">
          <p class="titulo-acento">Descrição</p>

          <div class="detalhe-etiquetas">
            ${badgeCategoria(categoria)}
            ${destaque ? `<span class="badge-destaque"><i class="bi bi-star-fill" aria-hidden="true"></i> Em destaque</span>` : ""}
            ${estoque === 0 ? `<span class="badge-esgotado">Esgotado</span>` : ""}
          </div>

          <h1 class="detalhe-nome" id="nome-produto">${escapeHTML(nome)}</h1>
          <p class="detalhe-sub">
            <span>Marca: <strong>${marca ? escapeHTML(marca) : "não informada"}</strong></span>
            <span>Código: <span class="codigo">${escapeHTML(codigo)}</span></span>
          </p>
          <div class="detalhe-avaliacao">${estrelas(avaliacao)}</div>

          <div class="bloco-preco">
            <p class="detalhe-preco">${formatarPreco(preco)}</p>
            ${htmlEstoque(estoque)}
            <div class="detalhe-acoes">
              <button type="button" class="btn btn-primary btn-lg" id="botao-editar"
                      data-bs-toggle="modal" data-bs-target="#modal-editar">
                <i class="bi bi-pencil-square" aria-hidden="true"></i> Editar
              </button>
              <button type="button" class="btn btn-outline-danger btn-lg" id="botao-excluir"
                      data-bs-toggle="modal" data-bs-target="#modal-excluir">
                <i class="bi bi-trash3" aria-hidden="true"></i> Excluir
              </button>
            </div>
          </div>

          <h2 class="detalhe-subtitulo">Sobre o produto</h2>
          <p class="detalhe-descricao">${descricao ? escapeHTML(descricao) : `<span class="text-body-secondary">Este produto ainda não tem descrição.</span>`}</p>

          <h2 class="detalhe-subtitulo">Ficha do produto</h2>
          <dl class="ficha">
            <div><dt>Código</dt><dd>${escapeHTML(codigo)}</dd></div>
            <div><dt>Marca</dt><dd>${marca ? escapeHTML(marca) : "—"}</dd></div>
            <div><dt>Categoria</dt><dd>${escapeHTML(categoria) || "—"}</dd></div>
            <div><dt>Estoque</dt><dd>${estoque} ${estoque === 1 ? "unidade" : "unidades"}</dd></div>
            <div><dt>Avaliação</dt><dd>${temAvaliacao(avaliacao) ? formatarNota(avaliacao) + " de 5" : "Sem avaliações"}</dd></div>
            <div><dt>Destaque</dt><dd>${destaque ? "Sim, aparece no carrossel" : "Não"}</dd></div>
            <div><dt>Cadastrado em</dt><dd>${formatarData(produto.createdAt)}</dd></div>
            <div><dt>Atualizado em</dt><dd>${formatarData(produto.updatedAt)}</dd></div>
          </dl>
        </article>
      </div>
    </div>`;
}

function htmlEstoque(estoque) {
  if (estoque === 0) {
    return `<p class="aviso-estoque estoque-esgotado"><i class="bi bi-x-circle-fill" aria-hidden="true"></i> Esgotado: sem unidades em estoque</p>`;
  }
  if (estoque === 1) {
    return `<p class="aviso-estoque estoque-baixo"><i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i> Última unidade em estoque</p>`;
  }
  if (estoque <= 5) {
    return `<p class="aviso-estoque estoque-baixo"><i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i> Últimas ${estoque} unidades em estoque</p>`;
  }
  return `<p class="aviso-estoque estoque-ok"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Em estoque: ${estoque} unidades</p>`;
}

function htmlNaoEncontrado(texto) {
  document.title = "Produto não encontrado · " + NOME_LOJA;
  return htmlEstado({
    tag: "h1",
    icone: "bi-search",
    titulo: "Produto não encontrado",
    texto: texto,
    acao: `<a href="index.html" class="btn btn-primary"><i class="bi bi-arrow-left" aria-hidden="true"></i> Voltar para a loja</a>`
  });
}

function htmlDetalheCarregando() {
  return `
    <span class="visually-hidden" role="status">Carregando produto…</span>
    <div class="row g-4 g-xl-5 esqueleto placeholder-glow" aria-hidden="true">
      <div class="col-lg-5">
        <div class="detalhe-imagem"><span class="placeholder w-100 h-100"></span></div>
      </div>
      <div class="col-lg-7">
        <div class="detalhe-info d-flex flex-column gap-3">
          <span class="placeholder col-3"></span>
          <span class="placeholder col-4 rounded-pill"></span>
          <span class="placeholder placeholder-lg col-10 placeholder-titulo"></span>
          <span class="placeholder col-6"></span>
          <span class="placeholder placeholder-lg col-4 mt-3 placeholder-preco-grande"></span>
          <span class="placeholder col-5"></span>
          <span class="placeholder col-12 mt-3"></span>
          <span class="placeholder col-11"></span>
          <span class="placeholder col-8"></span>
        </div>
      </div>
    </div>`;
}

async function atualizarProduto(evento) {
  evento.preventDefault();
  let form = evento.target;
  let botao = form.querySelector("#botao-salvar");

  limparErros(form);
  if (!validarFormularioProduto(form)) return;

  alternarCarregando(botao, true, "Salvando…");

  try {
    let produto = lerFormularioProduto(form);
    produto.codigo = produtoAtual.codigo;

    let foto = await obterFotoEscolhida();
    if (foto) {
      produto.imagemBase64 = foto;
    } else if (form.elements.removerImagem.checked) {
      produto.removerImagem = true;
    }

    let data = await fetch(url + "/" + encodeURIComponent(produtoAtual.codigo), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(produto)
    });
    if (!data.ok) throw await erroDaResposta(data);
    let response = await data.json();

    produtoAtual = response;
    bootstrap.Modal.getOrCreateInstance(modalEditar).hide();
    mostrarProduto(response);
    modalEditar.addEventListener("hidden.bs.modal", () => {
      let botaoEditar = document.querySelector("#botao-editar");
      if (botaoEditar) botaoEditar.focus();
    }, { once: true });
    mostrarToast("Alterações salvas", "sucesso");
  } catch (erro) {
    console.error("Erro ao salvar as alterações:", erro);
    mostrarErrosDaApi(form, erro);
  } finally {
    alternarCarregando(botao, false);
  }
}

async function excluirProduto() {
  let botao = document.querySelector("#botao-confirmar-exclusao");
  let caixaErro = modalExcluir.querySelector(".erros-api");

  esconderCaixaErro(caixaErro);
  alternarCarregando(botao, true, "Excluindo…");

  try {
    let data = await fetch(url + "/" + encodeURIComponent(produtoAtual.codigo), {
      method: "DELETE"
    });
    if (!data.ok) throw await erroDaResposta(data);

    guardarMensagem("Produto excluído");
    window.location.href = "index.html";
  } catch (erro) {
    console.error("Erro ao excluir o produto:", erro);
    mostrarCaixaErro(caixaErro, erro);
    alternarCarregando(botao, false);
  }
}

let formProduto = document.querySelector("#form-produto");
let modalEditar = document.querySelector("#modal-editar");
let modalExcluir = document.querySelector("#modal-excluir");

prepararFormularioProduto(formProduto);
formProduto.addEventListener("submit", atualizarProduto);

modalEditar.addEventListener("show.bs.modal", (evento) => {
  if (!produtoAtual) {
    evento.preventDefault();
    return;
  }
  preencherFormularioProduto(formProduto, produtoAtual);
});
modalEditar.addEventListener("shown.bs.modal", () => formProduto.elements.nome.focus());

modalExcluir.addEventListener("show.bs.modal", (evento) => {
  if (!produtoAtual) {
    evento.preventDefault();
    return;
  }
  document.querySelector("#nome-excluir").textContent = produtoAtual.nome;
  esconderCaixaErro(modalExcluir.querySelector(".erros-api"));
});
modalExcluir.addEventListener("shown.bs.modal", () => document.querySelector("#botao-cancelar-exclusao").focus());
document.querySelector("#botao-confirmar-exclusao").addEventListener("click", excluirProduto);

document.title = "Detalhes do produto · " + NOME_LOJA;
getUmProduto();

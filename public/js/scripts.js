const url = urlBase + "/produtos";

const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let carrosselRodando = !reduzirMovimento;

async function getProdutos() {
  let box = document.querySelector(".box-produtos");
  let resumo = document.querySelector("#resumo-produtos");

  box.setAttribute("aria-busy", "true");
  box.innerHTML = htmlCardsCarregando(8);

  try {
    let data = await fetch(url + "/recentes");
    if (!data.ok) throw await erroDaResposta(data);
    let response = await data.json();

    box.innerHTML = "";

    if (response.length === 0) {
      resumo.textContent = "A vitrine ainda está vazia.";
      box.innerHTML = `<div class="w-100">${htmlEstado({
        icone: "bi-box-seam",
        titulo: "Nenhum produto cadastrado ainda",
        texto: "Cadastre o primeiro produto e ele aparece aqui na vitrine.",
        acao: botaoNovoProduto()
      })}</div>`;
      return;
    }

    for (let i = 0; i < response.length; i++) {
      let codigo = response[i].codigo;
      let nome = response[i].nome || "";
      let marca = response[i].marca;
      let categoria = response[i].categoria;
      let preco = Number(response[i].preco);
      let estoque = Number(response[i].quantidadeEstoque);
      let avaliacao = response[i].avaliacao;
      let destaque = response[i].destaque;

      let nomeCurto = nome.length > 50 ? nome.substring(0, 50).trim() + "…" : nome;
      let link = "detalhes.html?codigo=" + encodeURIComponent(codigo);

      box.innerHTML += `
        <div class="col">
          <article class="card card-produto h-100">
            <div class="card-produto-imagem">
              <img src="${escapeHTML(srcImagem(response[i]))}" alt="${escapeHTML(nome)}" loading="lazy"
                   class="img-produto ${classeFoto(response[i])}" onerror="imagemQuebrada(this)">
              ${destaque ? `<span class="selo selo-destaque"><i class="bi bi-star-fill" aria-hidden="true"></i> Destaque</span>` : ""}
              ${estoque === 0 ? `<span class="selo selo-esgotado">Esgotado</span>` : ""}
            </div>
            <div class="card-body">
              ${badgeCategoria(categoria)}
              <h3 class="card-produto-nome" title="${escapeHTML(nome)}">${escapeHTML(nomeCurto)}</h3>
              <p class="card-produto-marca">${marca ? escapeHTML(marca) : "Marca não informada"}</p>
              <div class="card-produto-avaliacao">${estrelas(avaliacao)}</div>
              <p class="card-produto-preco">${formatarPreco(preco)}</p>
              <a href="${escapeHTML(link)}" class="btn btn-outline-primary btn-detalhes stretched-link">
                Ver detalhes<span class="visually-hidden"> de ${escapeHTML(nome)}</span>
              </a>
            </div>
          </article>
        </div>`;
    }

    resumo.textContent = response.length === 1
      ? "1 produto na vitrine."
      : response.length + " lançamentos, do mais novo para o mais antigo.";
  } catch (erro) {
    console.error("Erro ao carregar os produtos:", erro);
    resumo.textContent = "Não foi possível carregar a vitrine.";
    box.innerHTML = `<div class="w-100">${htmlEstado({
      tipo: "erro",
      icone: "bi-wifi-off",
      titulo: "Não foi possível carregar os produtos",
      texto: mensagemDeErro(erro),
      acao: botaoTentarNovamente()
    })}</div>`;
  } finally {
    box.setAttribute("aria-busy", "false");
  }
}

function htmlCardsCarregando(quantidade) {
  let html = `<div class="visually-hidden" role="status">Carregando produtos…</div>`;
  for (let i = 0; i < quantidade; i++) {
    html += `
      <div class="col" aria-hidden="true">
        <div class="card card-produto esqueleto placeholder-glow h-100">
          <div class="card-produto-imagem"><span class="placeholder w-100 h-100"></span></div>
          <div class="card-body">
            <span class="placeholder col-5 rounded-pill"></span>
            <span class="placeholder col-10 mt-2"></span>
            <span class="placeholder col-6"></span>
            <span class="placeholder col-4"></span>
            <span class="placeholder placeholder-lg col-6 placeholder-preco"></span>
            <span class="placeholder w-100 placeholder-botao"></span>
          </div>
        </div>
      </div>`;
  }
  return html;
}

async function getDestaques() {
  let slides = document.querySelector("#slides-destaque");
  let indicadores = document.querySelector("#indicadores-destaque");

  descartarCarrossel();
  mostrarControlesCarrossel(false);
  slides.innerHTML = htmlSlideCarregando();
  indicadores.innerHTML = "";

  try {
    let data = await fetch(url + "/destaques");
    if (!data.ok) throw await erroDaResposta(data);
    let response = await data.json();
    let selo = `<i class="bi bi-star-fill" aria-hidden="true"></i> Em destaque`;

    if (response.length === 0) {
      let dataRecentes = await fetch(url + "/recentes");
      if (!dataRecentes.ok) throw await erroDaResposta(dataRecentes);
      let recentes = await dataRecentes.json();
      response = recentes.slice(0, 3);
      selo = `<i class="bi bi-stars" aria-hidden="true"></i> Novidade`;
    }

    slides.innerHTML = "";

    if (response.length === 0) {
      slides.innerHTML = `<div class="carousel-item active">${htmlEstado({
        icone: "bi-stars",
        titulo: "Nenhum destaque por enquanto",
        texto: "Quando houver produtos cadastrados, eles aparecem aqui.",
        acao: botaoNovoProduto()
      })}</div>`;
      return;
    }

    for (let i = 0; i < response.length; i++) {
      let codigo = response[i].codigo;
      let nome = response[i].nome || "";
      let marca = response[i].marca;
      let categoria = response[i].categoria;
      let preco = Number(response[i].preco);
      let descricao = response[i].descricao;
      let link = "detalhes.html?codigo=" + encodeURIComponent(codigo);

      slides.innerHTML += `
        <div class="carousel-item ${i === 0 ? "active" : ""}" role="group" aria-roledescription="slide"
             aria-label="${i + 1} de ${response.length}">
          <article class="slide-destaque">
            <div class="slide-imagem">
              <img src="${escapeHTML(srcImagem(response[i]))}" alt="${escapeHTML(nome)}"
                   class="img-produto ${classeFoto(response[i])}" onerror="imagemQuebrada(this)">
            </div>
            <div class="slide-info">
              <div class="slide-etiquetas">
                <span class="slide-selo">${selo}</span>
                ${badgeCategoria(categoria)}
              </div>
              <h3 class="slide-nome">${escapeHTML(nome)}</h3>
              <p class="slide-marca">${marca ? escapeHTML(marca) : "Marca não informada"}</p>
              ${descricao ? `<p class="slide-descricao">${escapeHTML(cortarTexto(descricao, 160))}</p>` : ""}
              <p class="slide-preco">${formatarPreco(preco)}</p>
              <a href="${escapeHTML(link)}" class="btn btn-primary btn-lg">
                Ver detalhes<span class="visually-hidden"> de ${escapeHTML(nome)}</span>
              </a>
            </div>
          </article>
        </div>`;

      indicadores.innerHTML += `
        <button type="button" data-bs-target="#carrossel-destaques" data-bs-slide-to="${i}"
                ${i === 0 ? `class="active" aria-current="true"` : ""}
                aria-label="Slide ${i + 1}: ${escapeHTML(nome)}"></button>`;
    }

    mostrarControlesCarrossel(response.length > 1);
    configurarCarrossel();
  } catch (erro) {
    console.error("Erro ao carregar os destaques:", erro);
    slides.innerHTML = `<div class="carousel-item active">${htmlEstado({
      tipo: "erro",
      icone: "bi-wifi-off",
      titulo: "Não foi possível carregar os destaques",
      texto: mensagemDeErro(erro),
      acao: botaoTentarNovamente()
    })}</div>`;
  }
}

function htmlSlideCarregando() {
  return `
    <div class="carousel-item active">
      <div class="slide-destaque esqueleto placeholder-glow" aria-hidden="true">
        <div class="slide-imagem"><span class="placeholder w-100 h-100"></span></div>
        <div class="slide-info slide-info-esqueleto">
          <span class="placeholder col-4 rounded-pill"></span>
          <span class="placeholder placeholder-lg col-10"></span>
          <span class="placeholder col-5"></span>
          <span class="placeholder placeholder-lg col-4 mt-2"></span>
          <span class="placeholder col-5 placeholder-botao mt-2"></span>
        </div>
      </div>
      <span class="visually-hidden" role="status">Carregando destaques…</span>
    </div>`;
}

function configurarCarrossel() {
  let elemento = document.querySelector("#carrossel-destaques");
  descartarCarrossel();

  let total = elemento.querySelectorAll(".carousel-item").length;
  let rodar = carrosselRodando && total > 1;

  bootstrap.Carousel.getOrCreateInstance(elemento, {
    interval: rodar ? 6000 : false,
    ride: rodar ? "carousel" : false,
    pause: "hover",
    touch: true
  });
  atualizarBotaoPausar();
}

function descartarCarrossel() {
  let instancia = bootstrap.Carousel.getInstance("#carrossel-destaques");
  if (instancia) instancia.dispose();
}

function mostrarControlesCarrossel(visivel) {
  let controles = document.querySelectorAll(
    "#carrossel-destaques .carousel-control-prev, #carrossel-destaques .carousel-control-next, #indicadores-destaque, #botao-pausar"
  );
  for (let i = 0; i < controles.length; i++) {
    controles[i].classList.toggle("d-none", !visivel);
  }
}

function alternarCarrossel() {
  carrosselRodando = !carrosselRodando;
  configurarCarrossel();
}

function atualizarBotaoPausar() {
  let botao = document.querySelector("#botao-pausar");
  botao.innerHTML = carrosselRodando
    ? `<i class="bi bi-pause-fill" aria-hidden="true"></i><span class="visually-hidden">Pausar carrossel</span>`
    : `<i class="bi bi-play-fill" aria-hidden="true"></i><span class="visually-hidden">Reproduzir carrossel</span>`;
}

async function adicionarProduto(evento) {
  evento.preventDefault();
  let form = evento.target;
  let botao = form.querySelector("#botao-salvar");

  limparErros(form);
  if (!validarFormularioProduto(form)) return;

  alternarCarregando(botao, true, "Salvando…");

  try {
    let produto = lerFormularioProduto(form);
    let foto = await obterFotoEscolhida();
    if (foto) produto.imagemBase64 = foto;

    let data = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(produto)
    });
    if (!data.ok) throw await erroDaResposta(data);

    bootstrap.Modal.getOrCreateInstance("#modal-produto").hide();
    limparFormularioProduto(form);
    getProdutos();
    getDestaques();
    mostrarToast("Produto cadastrado", "sucesso");
  } catch (erro) {
    console.error("Erro ao cadastrar o produto:", erro);
    mostrarErrosDaApi(form, erro);
  } finally {
    alternarCarregando(botao, false);
  }
}

function botaoNovoProduto() {
  return `<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modal-produto">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> Novo produto
          </button>`;
}

function botaoTentarNovamente() {
  return `<button type="button" class="btn btn-primary" onclick="carregarVitrine()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Tentar novamente
          </button>`;
}

function carregarVitrine() {
  getDestaques();
  getProdutos();
}

function abrirCadastroPeloLink() {
  if (window.location.hash !== "#novo") return;
  history.replaceState(null, "", window.location.pathname + window.location.search);
  bootstrap.Modal.getOrCreateInstance("#modal-produto").show();
}

let formProduto = document.querySelector("#form-produto");
let modalProduto = document.querySelector("#modal-produto");

document.title = NOME_LOJA + " · Loja de eletrônicos";

prepararFormularioProduto(formProduto);
formProduto.addEventListener("submit", adicionarProduto);
modalProduto.addEventListener("show.bs.modal", () => limparErros(formProduto));
modalProduto.addEventListener("shown.bs.modal", () => formProduto.elements.nome.focus());
document.querySelector("#botao-pausar").addEventListener("click", alternarCarrossel);

carregarVitrine();
mostrarMensagemGuardada();
abrirCadastroPeloLink();

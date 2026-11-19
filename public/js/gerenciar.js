const url = urlBase + "/produtos";

const formFiltros = document.querySelector("#form-filtros");
const formProduto = document.querySelector("#form-produto");
const modalProdutoEl = document.querySelector("#modal-produto");
const modalExcluirEl = document.querySelector("#modal-excluir");

let editando = null;     // produto em edição (null = cadastro)
let paraExcluir = null;  // produto a excluir
let ultimaBusca = 0;     // descarta respostas antigas

function montarQuery() {
  let params = new URLSearchParams();
  let dados = new FormData(formFiltros);
  for (let [campo, valor] of dados.entries()) {
    valor = String(valor).trim();
    if (valor !== "") params.set(campo, valor);
  }
  return params.toString();
}

async function carregarProdutos() {
  let area = document.querySelector("#area-tabela");
  let corpo = document.querySelector("#corpo-tabela");
  let resumo = document.querySelector("#resumo-lista");
  let caixaErro = document.querySelector("#erro-filtros");
  let busca = ++ultimaBusca;

  caixaErro.classList.add("d-none");
  area.setAttribute("aria-busy", "true");

  try {
    let query = montarQuery();
    let data = await fetch(url + (query ? "?" + query : ""));
    if (!data.ok) throw await erroDaResposta(data);
    let produtos = await data.json();
    if (busca !== ultimaBusca) return;

    let filtrado = query !== "";
    resumo.textContent = produtos.length === 0
      ? "Nenhum produto encontrado."
      : produtos.length + (produtos.length === 1 ? " produto" : " produtos") + (filtrado ? " encontrados com os filtros aplicados." : " cadastrados.");

    if (produtos.length === 0) {
      corpo.innerHTML = `<tr><td colspan="6">${htmlEstado({
        icone: "bi-search",
        titulo: filtrado ? "Nada encontrado" : "Nenhum produto cadastrado",
        texto: filtrado ? "Tente alterar ou limpar os filtros." : "Cadastre o primeiro produto.",
        tag: "p"
      })}</td></tr>`;
      return;
    }

    corpo.innerHTML = produtos.map(linhaProduto).join("");
  } catch (erro) {
    if (busca !== ultimaBusca) return;
    console.error("Erro ao listar os produtos:", erro);
    resumo.textContent = "Não foi possível carregar os produtos.";
    if (erro.status === 400) {
      caixaErro.textContent = mensagemDeErro(erro);
      caixaErro.classList.remove("d-none");
    }
    corpo.innerHTML = `<tr><td colspan="6">${htmlEstado({
      tipo: "erro", tag: "p", icone: "bi-wifi-off",
      titulo: "Não foi possível carregar", texto: mensagemDeErro(erro)
    })}</td></tr>`;
  } finally {
    if (busca === ultimaBusca) area.setAttribute("aria-busy", "false");
  }
}

function linhaProduto(p) {
  let estoque = Number(p.quantidadeEstoque) || 0;
  let classe = estoque === 0 ? "estoque-zero" : estoque <= 5 ? "estoque-baixo" : "estoque-ok";
  let codigo = escapeHTML(p.codigo);
  return `
    <tr>
      <td>
        <div class="linha-produto-info">
          <img src="${escapeHTML(srcImagem(p))}" alt="" loading="lazy" onerror="imagemQuebrada(this)">
          <div>
            <div class="linha-produto-nome">${escapeHTML(p.nome)}${p.destaque ? ` <i class="bi bi-star-fill text-warning" title="Em destaque"></i>` : ""}</div>
            <div class="linha-produto-codigo">${codigo}</div>
          </div>
        </div>
      </td>
      <td>${badgeCategoria(p.categoria)}</td>
      <td>${p.marca ? escapeHTML(p.marca) : "—"}</td>
      <td class="text-end">${formatarPreco(p.preco)}</td>
      <td class="text-end"><span class="${classe}">${estoque}</span></td>
      <td class="text-end tabela-acoes">
        <a class="btn btn-sm btn-outline-secondary" href="detalhes.html?codigo=${encodeURIComponent(p.codigo)}" aria-label="Ver detalhes de ${escapeHTML(p.nome)}"><i class="bi bi-eye" aria-hidden="true"></i></a>
        <button type="button" class="btn btn-sm btn-outline-primary" data-acao="editar" data-codigo="${codigo}" aria-label="Editar ${escapeHTML(p.nome)}"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-codigo="${codigo}" aria-label="Excluir ${escapeHTML(p.nome)}"><i class="bi bi-trash3" aria-hidden="true"></i></button>
      </td>
    </tr>`;
}

async function carregarOpcoesDeFiltro() {
  let selCategoria = document.querySelector("#filtro-categoria");
  for (let c of CATEGORIAS) selCategoria.add(new Option(c, c));
  await carregarOpcoesMarcas(document.querySelector("#filtro-marca"));
}

async function recarregarMarcas() {
  let selMarca = document.querySelector("#filtro-marca");
  let atual = selMarca.value;
  selMarca.length = 1;
  await carregarOpcoesMarcas(selMarca);
  selMarca.value = [...selMarca.options].some((o) => o.value === atual) ? atual : "";
}

async function carregarOpcoesMarcas(selMarca) {
  try {
    let data = await fetch(url + "/consultas/marcas");
    if (!data.ok) return;
    for (let m of await data.json()) selMarca.add(new Option(m.marca + " (" + m.produtos + ")", m.marca));
  } catch (e) {
    console.error(e);
  }
}

// ---------- Cadastro / edição ----------

function abrirCadastro() {
  editando = null;
  limparFormularioProduto(formProduto);
  preencherCategorias(formProduto.elements.categoria, "");
  formProduto.elements.codigo.readOnly = false;
  formProduto.querySelector(".grupo-remover-foto").classList.add("d-none");
  document.querySelector("#titulo-modal-produto").textContent = "Novo produto";
  document.querySelector("#subtitulo-modal-produto").textContent = "Preencha os dados para colocar o produto na vitrine.";
  bootstrap.Modal.getOrCreateInstance(modalProdutoEl).show();
}

async function abrirEdicao(codigo) {
  try {
    let data = await fetch(url + "/codigo/" + encodeURIComponent(codigo));
    if (!data.ok) throw await erroDaResposta(data);
    editando = await data.json();
  } catch (erro) {
    mostrarToast(mensagemDeErro(erro), "erro");
    carregarProdutos();
    return;
  }
  preencherFormularioProduto(formProduto, editando);
  formProduto.elements.codigo.readOnly = true;
  document.querySelector("#titulo-modal-produto").textContent = "Editar produto";
  document.querySelector("#subtitulo-modal-produto").textContent = "Altere os dados e salve. O código não pode ser alterado.";
  bootstrap.Modal.getOrCreateInstance(modalProdutoEl).show();
}

async function salvarProduto(evento) {
  evento.preventDefault();
  let botao = formProduto.querySelector("#botao-salvar");

  limparErros(formProduto);
  if (!validarFormularioProduto(formProduto)) return;
  alternarCarregando(botao, true, "Salvando…");

  try {
    let produto = lerFormularioProduto(formProduto);
    let foto = await obterFotoEscolhida();
    if (foto) produto.imagemBase64 = foto;

    let resposta;
    if (editando) {
      if (formProduto.elements.removerImagem.checked && !foto) produto.removerImagem = true;
      resposta = await fetch(url + "/" + encodeURIComponent(editando.codigo), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produto)
      });
    } else {
      resposta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produto)
      });
    }
    if (!resposta.ok) throw await erroDaResposta(resposta);

    let eraEdicao = Boolean(editando);
    bootstrap.Modal.getOrCreateInstance(modalProdutoEl).hide();
    mostrarToast(eraEdicao ? "Produto atualizado" : "Produto cadastrado", "sucesso");
    carregarProdutos();
    recarregarMarcas();
  } catch (erro) {
    console.error("Erro ao salvar o produto:", erro);
    mostrarErrosDaApi(formProduto, erro);
  } finally {
    alternarCarregando(botao, false);
  }
}

// ---------- Exclusão ----------

async function abrirExclusao(codigo) {
  try {
    let data = await fetch(url + "/codigo/" + encodeURIComponent(codigo));
    if (!data.ok) throw await erroDaResposta(data);
    paraExcluir = await data.json();
  } catch (erro) {
    mostrarToast(mensagemDeErro(erro), "erro");
    carregarProdutos();
    return;
  }
  document.querySelector("#nome-exclusao").textContent = paraExcluir.nome + " (" + paraExcluir.codigo + ")";
  esconderCaixaErro(document.querySelector("#erro-exclusao"));
  bootstrap.Modal.getOrCreateInstance(modalExcluirEl).show();
}

async function confirmarExclusao() {
  if (!paraExcluir) return;
  let botao = document.querySelector("#botao-confirmar-exclusao");
  alternarCarregando(botao, true, "Excluindo…");
  try {
    let data = await fetch(url + "/" + encodeURIComponent(paraExcluir.codigo), { method: "DELETE" });
    if (!data.ok && data.status !== 404) throw await erroDaResposta(data);
    bootstrap.Modal.getOrCreateInstance(modalExcluirEl).hide();
    mostrarToast("Produto excluído", "sucesso");
    paraExcluir = null;
    carregarProdutos();
    recarregarMarcas();
  } catch (erro) {
    console.error("Erro ao excluir o produto:", erro);
    mostrarCaixaErro(document.querySelector("#erro-exclusao"), erro);
  } finally {
    alternarCarregando(botao, false);
  }
}

// ---------- Eventos ----------

let temporizador = null;
function filtrarComAtraso() {
  clearTimeout(temporizador);
  temporizador = setTimeout(carregarProdutos, 300);
}

formFiltros.addEventListener("submit", (e) => { e.preventDefault(); carregarProdutos(); });
formFiltros.addEventListener("change", carregarProdutos);
document.querySelector("#filtro-busca").addEventListener("input", filtrarComAtraso);
formFiltros.querySelectorAll("input[type=number]").forEach((i) => i.addEventListener("input", filtrarComAtraso));
document.querySelector("#botao-limpar").addEventListener("click", () => { formFiltros.reset(); carregarProdutos(); });

document.querySelector("#corpo-tabela").addEventListener("click", (e) => {
  let botao = e.target.closest("button[data-acao]");
  if (!botao) return;
  if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.codigo);
  else abrirExclusao(botao.dataset.codigo);
});

document.querySelector("#botao-novo-topo").addEventListener("click", abrirCadastro);
formProduto.addEventListener("submit", salvarProduto);
modalProdutoEl.addEventListener("shown.bs.modal", () => formProduto.elements.nome.focus());
document.querySelector("#botao-confirmar-exclusao").addEventListener("click", confirmarExclusao);

document.title = "Gerenciar produtos · " + NOME_LOJA;
prepararFormularioProduto(formProduto);
carregarOpcoesDeFiltro();
carregarProdutos();

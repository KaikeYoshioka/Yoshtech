const url = urlBase + "/produtos/consultas";

async function buscar(caminho) {
  let data = await fetch(url + caminho);
  if (!data.ok) throw await erroDaResposta(data);
  return data.json();
}

function linhaErro(colunas, erro) {
  return `<tr><td colspan="${colunas}" class="text-danger">${escapeHTML(mensagemDeErro(erro))}</td></tr>`;
}

function cartao(rotulo, valor, icone) {
  return `
    <div class="col-6 col-lg-3">
      <div class="cartao-indicador">
        <div class="rotulo"><i class="bi ${icone}" aria-hidden="true"></i> ${escapeHTML(rotulo)}</div>
        <div class="valor">${valor}</div>
      </div>
    </div>`;
}

async function carregarResumo() {
  let area = document.querySelector("#cartoes-resumo");
  try {
    let r = await buscar("/resumo");
    area.innerHTML =
      cartao("Produtos", r.totalProdutos, "bi-box-seam") +
      cartao("Unidades em estoque", r.unidadesEmEstoque, "bi-boxes") +
      cartao("Valor em estoque", formatarPreco(r.valorEmEstoque), "bi-cash-stack") +
      cartao("Preço médio", r.precoMedio === null ? "—" : formatarPreco(r.precoMedio), "bi-tag") +
      cartao("Avaliação média", r.avaliacaoMedia === null ? "—" : formatarNota(r.avaliacaoMedia) + " / 5", "bi-star") +
      cartao("Esgotados", r.esgotados, "bi-exclamation-octagon") +
      cartao("Em destaque", r.destaques, "bi-stars");
  } catch (erro) {
    area.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">${escapeHTML(mensagemDeErro(erro))}</div></div>`;
  } finally {
    area.setAttribute("aria-busy", "false");
  }
}

async function carregarPorCategoria() {
  let corpo = document.querySelector("#corpo-categoria");
  try {
    let linhas = await buscar("/por-categoria");
    let maior = Math.max(1, ...linhas.map((l) => l.valorEmEstoque));
    corpo.innerHTML = linhas.map((l) => `
      <tr>
        <td>${badgeCategoria(l.categoria)}</td>
        <td class="text-end">${l.produtos}</td>
        <td class="text-end">${l.unidades}</td>
        <td class="text-end">${formatarPreco(l.precoMedio)}</td>
        <td class="text-end text-nowrap">${formatarPreco(l.precoMinimo)} – ${formatarPreco(l.precoMaximo)}</td>
        <td class="text-end">${formatarPreco(l.valorEmEstoque)}</td>
        <td><div class="barra-categoria" role="img" aria-label="${Math.round(l.valorEmEstoque / maior * 100)}% da maior categoria"><span style="width:${(l.valorEmEstoque / maior * 100).toFixed(1)}%"></span></div></td>
      </tr>`).join("") || `<tr><td colspan="7" class="text-body-secondary">Sem dados.</td></tr>`;
  } catch (erro) {
    corpo.innerHTML = linhaErro(7, erro);
  } finally {
    document.querySelector("#area-categoria").setAttribute("aria-busy", "false");
  }
}

async function carregarEstoqueBaixo() {
  let corpo = document.querySelector("#corpo-baixo");
  let campo = document.querySelector("#campo-limite");
  let limite = campo.value === "" ? 5 : Number(campo.value);
  document.querySelector("#limite-atual").textContent = limite;

  if (!Number.isInteger(limite) || limite < 0) {
    corpo.innerHTML = `<tr><td colspan="2" class="text-danger">Informe um inteiro maior ou igual a 0.</td></tr>`;
    return;
  }

  try {
    let produtos = await buscar("/estoque-baixo?limite=" + limite);
    corpo.innerHTML = produtos.map((p) => {
      let q = Number(p.quantidadeEstoque);
      return `
        <tr>
          <td><a href="detalhes.html?codigo=${encodeURIComponent(p.codigo)}">${escapeHTML(p.nome)}</a>
              <div class="linha-produto-codigo">${escapeHTML(p.codigo)}</div></td>
          <td class="text-end"><span class="${q === 0 ? "estoque-zero" : "estoque-baixo"}">${q === 0 ? "Esgotado" : q}</span></td>
        </tr>`;
    }).join("") || `<tr><td colspan="2" class="text-body-secondary">Nenhum produto com até ${limite} unidades.</td></tr>`;
  } catch (erro) {
    corpo.innerHTML = linhaErro(2, erro);
  } finally {
    document.querySelector("#area-baixo").setAttribute("aria-busy", "false");
  }
}

async function carregarMarcas() {
  let corpo = document.querySelector("#corpo-marcas");
  try {
    let marcas = await buscar("/marcas");
    corpo.innerHTML = marcas.map((m) => `
      <tr><td>${escapeHTML(m.marca)}</td><td class="text-end">${m.produtos}</td><td class="text-end">${formatarPreco(m.precoMedio)}</td></tr>`
    ).join("") || `<tr><td colspan="3" class="text-body-secondary">Sem dados.</td></tr>`;
  } catch (erro) {
    corpo.innerHTML = linhaErro(3, erro);
  } finally {
    document.querySelector("#area-marcas").setAttribute("aria-busy", "false");
  }
}

let temporizador = null;
document.querySelector("#form-limite").addEventListener("submit", (e) => { e.preventDefault(); carregarEstoqueBaixo(); });
document.querySelector("#campo-limite").addEventListener("input", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(carregarEstoqueBaixo, 300);
});

document.title = "Consultas · " + NOME_LOJA;
carregarResumo();
carregarPorCategoria();
carregarEstoqueBaixo();
carregarMarcas();

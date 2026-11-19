const NOME_LOJA = "YoshTech";

const urlBase = "http://localhost:3000";

const IMAGEM_PADRAO = "img/sem-imagem.svg";

const CATEGORIAS = ["Informática", "Periféricos", "Áudio", "Smartphones", "Wearables", "Games", "Armazenamento", "Redes"];

const ICONES_CATEGORIA = {
  "Informática": "bi-laptop",
  "Periféricos": "bi-mouse",
  "Áudio": "bi-headphones",
  "Smartphones": "bi-phone",
  "Wearables": "bi-smartwatch",
  "Games": "bi-controller",
  "Armazenamento": "bi-device-hdd",
  "Redes": "bi-router"
};

const MSG_API_FORA = "Não foi possível conectar à API. Ela está rodando em " + urlBase + "?";

const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"];
const FOTO_TAMANHO_MAX = 8 * 1024 * 1024;
const FOTO_LADO_MAX = 1000;

const CHAVE_MENSAGEM = "yoshtech-mensagem";

function escapeHTML(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cortarTexto(texto, limite) {
  texto = texto ? String(texto) : "";
  return texto.length > limite ? texto.substring(0, limite).trim() + "…" : texto;
}

const formatadorPreco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarPreco(valor) {
  let numero = Number(valor);
  return formatadorPreco.format(Number.isFinite(numero) ? numero : 0);
}

function formatarData(iso) {
  if (!iso) return "—";
  let data = new Date(iso);
  if (isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

function temAvaliacao(avaliacao) {
  return avaliacao !== null && avaliacao !== undefined && avaliacao !== "" && Number.isFinite(Number(avaliacao));
}

function formatarNota(avaliacao) {
  return Number(avaliacao).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function estrelas(avaliacao) {
  if (!temAvaliacao(avaliacao)) {
    return `<span class="avaliacao avaliacao-vazia">Sem avaliações</span>`;
  }

  let nota = Math.min(5, Math.max(0, Number(avaliacao)));
  let arredondada = Math.round(nota * 2) / 2;
  let icones = "";

  for (let i = 1; i <= 5; i++) {
    if (arredondada >= i) {
      icones += `<i class="bi bi-star-fill" aria-hidden="true"></i>`;
    } else if (arredondada >= i - 0.5) {
      icones += `<i class="bi bi-star-half" aria-hidden="true"></i>`;
    } else {
      icones += `<i class="bi bi-star" aria-hidden="true"></i>`;
    }
  }

  return `<span class="avaliacao" role="img" aria-label="Avaliação ${formatarNota(nota)} de 5">` +
         `<span class="estrelas">${icones}</span><span class="nota">${formatarNota(nota)}</span></span>`;
}

function badgeCategoria(categoria) {
  let icone = ICONES_CATEGORIA[categoria] || "bi-tag";
  return `<span class="badge-categoria"><i class="bi ${icone}" aria-hidden="true"></i>${escapeHTML(categoria || "Sem categoria")}</span>`;
}

function srcImagem(produto) {
  let imagem = produto ? produto.imagem : null;
  if (!imagem) return IMAGEM_PADRAO;
  if (/^(https?:|data:)/i.test(imagem)) return imagem;
  return urlBase + "/" + String(imagem).replace(/^\/+/, "");
}

function classeFoto(produto) {
  return produto && produto.imagem ? "" : "sem-foto";
}

function imagemQuebrada(img) {
  img.onerror = null;
  img.src = IMAGEM_PADRAO;
  img.classList.add("sem-foto");
}

function lerFotoComoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    if (!FOTO_TIPOS.includes(arquivo.type)) {
      reject(new Error("Formato não aceito. Escolha uma imagem JPG, PNG ou WEBP."));
      return;
    }
    if (arquivo.size > FOTO_TAMANHO_MAX) {
      reject(new Error("A imagem tem mais de 8 MB. Escolha um arquivo menor."));
      return;
    }

    let endereco = URL.createObjectURL(arquivo);
    let img = new Image();

    img.onload = () => {
      let escala = Math.min(1, FOTO_LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      let largura = Math.round(img.naturalWidth * escala);
      let altura = Math.round(img.naturalHeight * escala);

      let canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;

      let ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, largura, altura);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, largura, altura);

      URL.revokeObjectURL(endereco);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };

    img.onerror = () => {
      URL.revokeObjectURL(endereco);
      reject(new Error("Não foi possível ler essa imagem. Tente outro arquivo."));
    };

    img.src = endereco;
  });
}

async function erroDaResposta(data) {
  let corpo = null;
  try {
    corpo = await data.json();
  } catch (e) {
  }

  let mensagem = corpo && corpo.erro ? corpo.erro : "A API respondeu com erro (HTTP " + data.status + ").";
  if (data.status === 413 && !(corpo && corpo.erro)) {
    mensagem = "A foto ficou grande demais para a API aceitar (HTTP 413).";
  }

  let erro = new Error(mensagem);
  erro.status = data.status;
  erro.detalhes = [];
  if (corpo && Array.isArray(corpo.detalhes)) {
    erro.detalhes = corpo.detalhes;
  } else if (corpo && Array.isArray(corpo.faltando)) {
    erro.detalhes = corpo.faltando.map((campo) => "Campo obrigatório não enviado: " + campo);
  }
  return erro;
}

function mensagemDeErro(erro) {
  if (erro instanceof TypeError) return MSG_API_FORA;
  return erro && erro.message ? erro.message : "Algo deu errado. Tente novamente.";
}

function htmlEstado(opcoes) {
  let tag = opcoes.tag || "h3";
  let tipo = opcoes.tipo === "erro" ? "estado-erro" : "";
  return `
    <div class="estado ${tipo}">
      <span class="estado-icone" aria-hidden="true"><i class="bi ${opcoes.icone}"></i></span>
      <${tag} class="estado-titulo">${escapeHTML(opcoes.titulo)}</${tag}>
      <p class="estado-texto">${escapeHTML(opcoes.texto)}</p>
      ${opcoes.acao || ""}
    </div>`;
}

function mostrarToast(mensagem, tipo = "sucesso") {
  let area = document.querySelector("#area-toasts");
  if (!area) {
    area = document.createElement("div");
    area.id = "area-toasts";
    area.className = "toast-container position-fixed bottom-0 end-0 p-3";
    area.setAttribute("aria-live", "polite");
    document.body.appendChild(area);
  }

  let erro = tipo === "erro";
  let toast = document.createElement("div");
  toast.className = "toast toast-vt " + (erro ? "toast-erro" : "toast-sucesso");
  toast.setAttribute("role", erro ? "alert" : "status");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="toast-body">
        <i class="bi ${erro ? "bi-x-circle-fill" : "bi-check-circle-fill"} toast-icone" aria-hidden="true"></i>
        <span>${escapeHTML(mensagem)}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar aviso"></button>
    </div>`;

  area.appendChild(toast);
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  bootstrap.Toast.getOrCreateInstance(toast, { delay: erro ? 7000 : 4500 }).show();
}

function guardarMensagem(mensagem) {
  try {
    sessionStorage.setItem(CHAVE_MENSAGEM, mensagem);
  } catch (e) {
  }
}

function mostrarMensagemGuardada() {
  try {
    let mensagem = sessionStorage.getItem(CHAVE_MENSAGEM);
    if (mensagem) {
      sessionStorage.removeItem(CHAVE_MENSAGEM);
      mostrarToast(mensagem, "sucesso");
    }
  } catch (e) {
  }
}

function alternarCarregando(botao, carregando, textoCarregando = "Salvando…") {
  let spinner = botao.querySelector(".spinner-border");
  let texto = botao.querySelector(".texto-botao");

  if (carregando) {
    botao.dataset.textoOriginal = texto.textContent;
    texto.textContent = textoCarregando;
  } else if (botao.dataset.textoOriginal) {
    texto.textContent = botao.dataset.textoOriginal;
  }

  botao.disabled = carregando;
  botao.setAttribute("aria-busy", carregando ? "true" : "false");
  spinner.classList.toggle("d-none", !carregando);
}

let fotoEscolhida = null;
let fotoProcessando = null;

function prepararFormularioProduto(form) {
  let campos = form.elements;
  preencherCategorias(campos.categoria, "");

  form.addEventListener("input", (evento) => desmarcarInvalido(evento.target));
  form.addEventListener("change", (evento) => {
    if (evento.target.type !== "file") desmarcarInvalido(evento.target);
  });

  campos.descricao.addEventListener("input", () => atualizarContador(form));
  campos.foto.addEventListener("change", () => escolherFoto(form));
  form.querySelector(".descartar-foto").addEventListener("click", () => descartarFoto(form));

  if (campos.removerImagem) {
    campos.removerImagem.addEventListener("change", () => {
      if (campos.removerImagem.checked) {
        descartarFoto(form);
      } else {
        mostrarPreview(form, previewOriginal(form));
      }
    });
  }
}

function preencherCategorias(select, categoriaAtual) {
  let opcoes = CATEGORIAS.slice();
  if (categoriaAtual && !opcoes.includes(categoriaAtual)) opcoes.push(categoriaAtual);

  select.innerHTML = `<option value="">Selecione uma categoria</option>`;
  for (let i = 0; i < opcoes.length; i++) {
    select.innerHTML += `<option value="${escapeHTML(opcoes[i])}">${escapeHTML(opcoes[i])}</option>`;
  }
  select.value = categoriaAtual || "";
}

function atualizarContador(form) {
  let campo = form.elements.descricao;
  let contador = form.querySelector(".contador");
  let limite = Number(campo.getAttribute("maxlength")) || 500;
  contador.textContent = campo.value.length + "/" + limite;
  contador.classList.toggle("quase-cheio", campo.value.length >= limite * 0.9);
}

function mostrarPreview(form, src) {
  let img = form.querySelector(".foto-preview img");
  img.onerror = () => imagemQuebrada(img);
  img.src = src;
  img.classList.toggle("sem-foto", src === IMAGEM_PADRAO);
}

function previewOriginal(form) {
  return form.querySelector(".foto-preview img").dataset.original || IMAGEM_PADRAO;
}

async function escolherFoto(form) {
  let campo = form.elements.foto;
  let arquivo = campo.files[0];
  fotoEscolhida = null;

  if (!arquivo) {
    descartarFoto(form);
    return;
  }

  fotoProcessando = lerFotoComoBase64(arquivo);
  try {
    fotoEscolhida = await fotoProcessando;
    desmarcarInvalido(campo);
    mostrarPreview(form, fotoEscolhida);
    form.querySelector(".descartar-foto").classList.remove("d-none");
    if (form.elements.removerImagem) form.elements.removerImagem.checked = false;
  } catch (erro) {
    descartarFoto(form);
    marcarInvalido(campo, erro.message);
  } finally {
    fotoProcessando = null;
  }
}

function descartarFoto(form) {
  form.elements.foto.value = "";
  fotoEscolhida = null;
  desmarcarInvalido(form.elements.foto);
  form.querySelector(".descartar-foto").classList.add("d-none");

  let remover = form.elements.removerImagem;
  mostrarPreview(form, remover && remover.checked ? IMAGEM_PADRAO : previewOriginal(form));
}

async function obterFotoEscolhida() {
  if (fotoProcessando) {
    try {
      await fotoProcessando;
    } catch (e) {
    }
  }
  return fotoEscolhida;
}

function limparFormularioProduto(form) {
  form.reset();
  fotoEscolhida = null;
  form.querySelector(".foto-preview img").dataset.original = IMAGEM_PADRAO;
  mostrarPreview(form, IMAGEM_PADRAO);
  form.querySelector(".descartar-foto").classList.add("d-none");
  atualizarContador(form);
  limparErros(form);
}

function preencherFormularioProduto(form, produto) {
  limparFormularioProduto(form);
  let campos = form.elements;

  campos.nome.value = produto.nome || "";
  campos.codigo.value = produto.codigo || "";
  campos.marca.value = produto.marca || "";
  preencherCategorias(campos.categoria, produto.categoria);
  campos.preco.value = Number.isFinite(Number(produto.preco)) ? Number(produto.preco).toFixed(2) : "";
  campos.quantidadeEstoque.value = Number(produto.quantidadeEstoque) || 0;
  campos.avaliacao.value = temAvaliacao(produto.avaliacao) ? Number(produto.avaliacao) : "";
  campos.destaque.checked = Boolean(produto.destaque);
  campos.descricao.value = produto.descricao || "";

  let preview = form.querySelector(".foto-preview img");
  preview.dataset.original = srcImagem(produto);
  mostrarPreview(form, preview.dataset.original);

  let grupoRemover = form.querySelector(".grupo-remover-foto");
  if (grupoRemover) grupoRemover.classList.toggle("d-none", !produto.imagem);

  atualizarContador(form);
}

function validarFormularioProduto(form) {
  let campos = form.elements;
  let erros = [];

  if (!campos.nome.value.trim()) {
    erros.push([campos.nome, "Informe o nome do produto."]);
  }
  if (!campos.codigo.value.trim()) {
    erros.push([campos.codigo, "Informe o código do produto."]);
  }
  if (!campos.categoria.value) {
    erros.push([campos.categoria, "Escolha uma categoria."]);
  }

  let preco = campos.preco.value;
  if (preco === "" || campos.preco.validity.badInput || Number(preco) < 0) {
    erros.push([campos.preco, "Informe um preço igual ou maior que R$ 0,00."]);
  } else if (Number(preco) > 99999999.99) {
    erros.push([campos.preco, "O preço máximo é R$ 99.999.999,99."]);
  }

  let estoque = campos.quantidadeEstoque.value;
  if (estoque === "" || campos.quantidadeEstoque.validity.badInput || !Number.isInteger(Number(estoque)) || Number(estoque) < 0) {
    erros.push([campos.quantidadeEstoque, "Informe um número inteiro igual ou maior que zero."]);
  }

  let avaliacao = campos.avaliacao.value;
  if (campos.avaliacao.validity.badInput || (avaliacao !== "" && (Number(avaliacao) < 0 || Number(avaliacao) > 5))) {
    erros.push([campos.avaliacao, "A avaliação deve estar entre 0 e 5."]);
  }

  if (campos.descricao.value.length > 500) {
    erros.push([campos.descricao, "A descrição pode ter no máximo 500 caracteres."]);
  }

  for (let i = 0; i < erros.length; i++) {
    marcarInvalido(erros[i][0], erros[i][1]);
  }
  if (erros.length > 0) erros[0][0].focus();

  return erros.length === 0;
}

function lerFormularioProduto(form) {
  let campos = form.elements;
  let avaliacao = campos.avaliacao.value.trim();

  return {
    nome: campos.nome.value.trim(),
    codigo: campos.codigo.value.trim(),
    marca: campos.marca.value.trim() || null,
    categoria: campos.categoria.value,
    preco: Math.round(Number(campos.preco.value) * 100) / 100,
    quantidadeEstoque: Number(campos.quantidadeEstoque.value),
    avaliacao: avaliacao === "" ? null : Math.round(Number(avaliacao) * 10) / 10,
    destaque: campos.destaque.checked,
    descricao: campos.descricao.value.trim() || null
  };
}

function marcarInvalido(campo, mensagem) {
  campo.classList.add("is-invalid");
  campo.setAttribute("aria-invalid", "true");
  let feedback = document.getElementById("erro-" + campo.id);
  if (feedback) feedback.textContent = mensagem;
}

function desmarcarInvalido(campo) {
  if (!campo || !campo.classList || !campo.classList.contains("is-invalid")) return;
  campo.classList.remove("is-invalid");
  campo.removeAttribute("aria-invalid");
  let feedback = document.getElementById("erro-" + campo.id);
  if (feedback) feedback.textContent = "";
}

function limparErros(form) {
  let invalidos = form.querySelectorAll(".is-invalid");
  for (let i = 0; i < invalidos.length; i++) {
    desmarcarInvalido(invalidos[i]);
  }
  esconderCaixaErro(form.querySelector(".erros-api"));
}

function mostrarCaixaErro(caixa, erro) {
  let lista = "";
  if (erro.detalhes && erro.detalhes.length > 0) {
    lista = "<ul>";
    for (let i = 0; i < erro.detalhes.length; i++) {
      lista += `<li>${escapeHTML(erro.detalhes[i])}</li>`;
    }
    lista += "</ul>";
  }

  caixa.innerHTML = `
    <div class="d-flex gap-2">
      <i class="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true"></i>
      <div><strong>${escapeHTML(mensagemDeErro(erro))}</strong>${lista}</div>
    </div>`;
  caixa.classList.remove("d-none");
  caixa.scrollIntoView({ block: "nearest" });
}

function esconderCaixaErro(caixa) {
  if (!caixa) return;
  caixa.classList.add("d-none");
  caixa.innerHTML = "";
}

function mostrarErrosDaApi(form, erro) {
  mostrarCaixaErro(form.querySelector(".erros-api"), erro);
  if (erro.status === 409) {
    marcarInvalido(form.elements.codigo, "Já existe um produto com este código.");
    if (!form.elements.codigo.readOnly) form.elements.codigo.focus();
  }
}

function iniciarPaginaComum() {
  document.querySelectorAll("[data-nome-loja]").forEach((el) => { el.textContent = NOME_LOJA; });
  document.querySelectorAll("[data-ano]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  let menu = document.querySelector("#menu-principal");
  if (menu) {
    menu.querySelectorAll("a, button").forEach((item) => {
      item.addEventListener("click", () => {
        let colapso = bootstrap.Collapse.getInstance(menu);
        if (colapso) colapso.hide();
      });
    });
  }
}

iniciarPaginaComum();

// ============================================================
// CONEXÃO COM O BACKEND (FastAPI + RabbitMQ + Celery)
// ============================================================
const API_URL = "http://127.0.0.1:8000";

const NOMES_STATUS = { PENDING: "Pendente", STARTED: "Processando", SUCCESS: "Concluída", FAILURE: "Falhou" };
const NOMES_TIPO = { pedido: "Pedido", relatorio: "Relatório", notificacao: "Notificação", lembrete: "Lembrete" };
const ICONES = { pedido: "🛒", relatorio: "📊", notificacao: "🔔", lembrete: "⏰" };

let tarefas = [];

// NOVIDADE: Memória blindada! Guarda o estado das tarefas no navegador.
// Assim, mesmo que alguém aperte F5 (recarregue), a notificação não falha!
let memoriaStatus = JSON.parse(localStorage.getItem("memoriaStatus")) || {};

// ------------------------------------------------------------
// PASSO 1: Enviar tarefa
// ------------------------------------------------------------
async function adicionarTarefa(event) {
  // ISTO É A CURA DO "PISCAR": Impede o navegador de recarregar a página!
  if (event) event.preventDefault(); 
  
  const input = document.getElementById("taskName");
  const name = input.value.trim();
  const type = document.getElementById("taskType").value;
  const campoQuando = document.getElementById("taskWhen");
  const when = type === "lembrete" && campoQuando.value ? new Date(campoQuando.value).toISOString() : null;

  if (!name) { alert("Digite o nome da tarefa."); return; }
  if (type === "lembrete" && !when) { alert("Escolha quando o lembrete deve avisar."); return; }

  const btnAdd = document.getElementById("btnAdd");
  btnAdd.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A aguardar...';
  btnAdd.disabled = true;

  try {
    const novoId = await enviarParaApi(name, type, when);
    
    // Salva na memória imediatamente como PENDENTE
    memoriaStatus[novoId] = "PENDING";
    localStorage.setItem("memoriaStatus", JSON.stringify(memoriaStatus));
    
    input.value = "";
    campoQuando.value = "";
    await atualizarStatus(); 
  } catch (erro) {
    console.error(erro);
    alert("Erro ao conectar com a API. O FastAPI está a correr?");
  } finally {
    btnAdd.textContent = "▶ Adicionar à fila";
    btnAdd.disabled = false;
  }
}

async function enviarParaApi(name, type, when) {
  const resposta = await fetch(`${API_URL}/enviar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descricao: name, tipo: NOMES_TIPO[type], quando: when }),
  });
  const dados = await resposta.json();
  return dados.id;
}

// ------------------------------------------------------------
// PASSO 2: Consultar o status repetidamente
// ------------------------------------------------------------
async function atualizarStatus() {
  try {
    const resposta = await fetch(`${API_URL}/tarefas`);
    const dados_banco = await resposta.json();
    
    dados_banco.forEach(novaTarefa => {
      const statusAntigo = memoriaStatus[novaTarefa.id];
      
      // A MÁGICA DA NOTIFICAÇÃO: Se virou SUCCESS e antes não era, dispara o aviso!
      if (novaTarefa.status === "SUCCESS" && statusAntigo && statusAntigo !== "SUCCESS") {
        mostrarAviso(novaTarefa.descricao);
      }
      
      // Atualiza a memória de longo prazo
      memoriaStatus[novaTarefa.id] = novaTarefa.status;
    });
    
    // Guarda a memória no navegador
    localStorage.setItem("memoriaStatus", JSON.stringify(memoriaStatus));

    tarefas = dados_banco.map(t => {
      const tipoChave = Object.keys(NOMES_TIPO).find(k => NOMES_TIPO[k] === t.tipo) || "relatorio";
      return { id: t.id, name: t.descricao, type: tipoChave, status: t.status, when: t.data_hora };
    });
    
    desenhar();
  } catch (erro) {
    console.error("Erro ao atualizar fila. O servidor caiu?", erro);
  }
}

// ------------------------------------------------------------
// PASSO 3: Atualizar o HTML
// ------------------------------------------------------------
function desenhar() {
  const lista = document.getElementById("taskList");
  lista.innerHTML = "";

  for (const t of tarefas) {
    const li = document.createElement("li");
    const horario = t.when || "";
    
    li.innerHTML = `
      <div class="icone">${ICONES[t.type] || "🔹"}</div>
      <div class="info"><strong></strong><small>Tipo: ${NOMES_TIPO[t.type]}${horario ? " • " + horario : ""}</small></div>
      <span class="badge ${t.status}">${NOMES_STATUS[t.status] || t.status}</span>`;
    li.querySelector("strong").textContent = t.name; 
    lista.appendChild(li);
  }

  const conta = (s) => tarefas.filter((t) => t.status === s).length;
  document.getElementById("contPendentes").textContent = conta("PENDING");
  document.getElementById("contProcessando").textContent = conta("STARTED");
  document.getElementById("contConcluidas").textContent = conta("SUCCESS");
  
  const vazio = document.getElementById("vazio");
  if (vazio) vazio.style.display = tarefas.length ? "none" : "block";
}

function mostrarAviso(texto) {
  const aviso = document.getElementById("aviso");
  aviso.innerHTML = `
    <div style="font-size: 28px; margin-right: 14px;">🔔</div>
    <div>
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 2px;">Tarefa Concluída</div>
      <div style="font-size: 15px; font-weight: bold;">${texto}</div>
    </div>
  `;
  aviso.classList.add("mostrar");
  setTimeout(() => { aviso.classList.remove("mostrar"); }, 8000);
}

// ------------------------------------------------------------
// INÍCIO
// ------------------------------------------------------------
document.getElementById("taskType").addEventListener("change", (e) => {
  document.getElementById("campoQuando").hidden = e.target.value !== "lembrete";
});

// Vincula os cliques passando o evento (e) para bloquear o "piscar"
document.getElementById("btnAdd").addEventListener("click", (e) => adicionarTarefa(e));
document.getElementById("btnAtualizar").addEventListener("click", atualizarStatus);
document.getElementById("taskName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") adicionarTarefa(e);
});

// Muda a indicação visual de conexão no topo
document.querySelector(".pill").innerHTML = `<i style="background: #3b82f6;"></i> Sistema Ativo (Nuvem)`;

// Arranca o ciclo de perguntas à API
atualizarStatus();
setInterval(atualizarStatus, 2000);
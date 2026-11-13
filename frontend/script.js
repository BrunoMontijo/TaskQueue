// ============================================================
// CONFIGURAÇÃO
// true  = modo demonstração (funciona SEM backend, só para testar a tela)
// false = usa a API FastAPI de verdade
// ============================================================
const USAR_SIMULACAO = false; 
const API_URL = "http://127.0.0.1:8000";

// Nomes bonitos para os status do Celery
const NOMES_STATUS = {
  PENDING: "Pendente",
  STARTED: "Processando",
  SUCCESS: "Concluída",
  FAILURE: "Falhou",
};
const NOMES_TIPO = {
  pedido: "Pedido",
  relatorio: "Relatório",
  notificacao: "Notificação",
  lembrete: "Lembrete",
};
const ICONES = { pedido: "🛒", relatorio: "📊", notificacao: "🔔", lembrete: "⏰" };

let tarefas = [];

// ------------------------------------------------------------
// PASSO 1: enviar tarefa
// ------------------------------------------------------------
async function adicionarTarefa() {
  const input = document.getElementById("taskName");
  const name = input.value.trim();
  const type = document.getElementById("taskType").value;
  const campoQuando = document.getElementById("taskWhen");
  const when = type === "lembrete" && campoQuando.value ? new Date(campoQuando.value).toISOString() : null;

  if (!name) {
    alert("Digite o nome da tarefa.");
    return;
  }
  if (type === "lembrete" && !when) {
    alert("Escolha quando o lembrete deve avisar.");
    return;
  }

  const btnAdd = document.getElementById("btnAdd");
  btnAdd.textContent = "A aguardar...";
  btnAdd.disabled = true;

  try {
    if (USAR_SIMULACAO) {
      await simularEnvio(name, type, when);
    } else {
      await enviarParaApi(name, type, when);
    }
    
    input.value = "";
    campoQuando.value = "";
    await atualizarStatus(); 
  } catch (erro) {
    alert("Não consegui falar com a API. Ela está a correr? (uvicorn main:app --reload)");
    console.error(erro);
  } finally {
    btnAdd.textContent = "▶ Adicionar à fila";
    btnAdd.disabled = false;
  }
}

async function enviarParaApi(name, type, when) {
  const resposta = await fetch(`${API_URL}/enviar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      descricao: name, 
      tipo: NOMES_TIPO[type],
      quando: when // Agora envia o horário do lembrete!
    }),
  });
  const dados = await resposta.json();
  return dados.id;
}

// ------------------------------------------------------------
// PASSO 2: perguntar o status de tempos em tempos
// ------------------------------------------------------------
async function atualizarStatus() {
  try {
    if (USAR_SIMULACAO) {
      for (const t of tarefas) {
        if (t.status === "SUCCESS" || t.status === "FAILURE") continue;
        const novo = simularStatus(t.id);
        if (novo === "SUCCESS" && t.status !== "SUCCESS" && t.type === "lembrete") {
          mostrarAviso("⏰ Lembrete: " + t.name);
        }
        t.status = novo;
      }
    } else {
      const resposta = await fetch(`${API_URL}/tarefas`);
      const dados_banco = await resposta.json();
      
      tarefas = dados_banco.map(t => {
        const tipoChave = Object.keys(NOMES_TIPO).find(k => NOMES_TIPO[k] === t.tipo) || "relatorio";
        return {
          id: t.id,
          name: t.descricao,
          type: tipoChave,
          status: t.status,
          when: t.data_hora 
        };
      });
    }
    desenhar();
  } catch (erro) {
    console.error("Erro ao atualizar fila", erro);
  }
}

// ------------------------------------------------------------
// PASSO 3: desenhar a tela
// ------------------------------------------------------------
function desenhar() {
  const lista = document.getElementById("taskList");
  lista.innerHTML = "";

  for (const t of tarefas) {
    const li = document.createElement("li");
    const horario = USAR_SIMULACAO && t.when ? formatarQuando(t.when) : (t.when || "");
    
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
  document.getElementById("vazio").style.display = tarefas.length ? "none" : "block";
}

// ------------------------------------------------------------
// SIMULAÇÃO (mantida do código original)
// ------------------------------------------------------------
const DURACAO = { pedido: 3000, relatorio: 8000, notificacao: 2000, lembrete: 2000 };
const simulacao = {}; 
let filaSimulada = [];
let workerOcupado = false;

async function simularEnvio(name, type, when) {
  const id = "demo-" + Math.random().toString(36).slice(2, 8);
  simulacao[id] = { type, status: "PENDING" };
  const atraso = when ? Math.max(0, new Date(when) - Date.now()) : 0;
  
  tarefas.unshift({ id, name, type, status: "PENDING", when });
  
  setTimeout(() => {
    filaSimulada.push(id);
    rodarWorkerSimulado();
  }, atraso);
  return id;
}

function simularStatus(id) {
  return simulacao[id].status;
}

function rodarWorkerSimulado() {
  if (workerOcupado || filaSimulada.length === 0) return;
  workerOcupado = true;
  const id = filaSimulada.shift();
  simulacao[id].status = "STARTED";
  setTimeout(() => {
    simulacao[id].status = "SUCCESS";
    workerOcupado = false;
    rodarWorkerSimulado(); 
  }, DURACAO[simulacao[id].type]);
}

// ------------------------------------------------------------
// INÍCIO
// ------------------------------------------------------------
function formatarQuando(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function mostrarAviso(texto) {
  const aviso = document.getElementById("aviso");
  aviso.textContent = texto;
  aviso.style.display = "block";
  setTimeout(() => (aviso.style.display = "none"), 6000);
}

document.getElementById("taskType").addEventListener("change", (e) => {
  document.getElementById("campoQuando").hidden = e.target.value !== "lembrete";
});

document.getElementById("btnAdd").addEventListener("click", adicionarTarefa);
document.getElementById("btnAtualizar").addEventListener("click", atualizarStatus);
document.getElementById("taskName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") adicionarTarefa();
});

const modoPill = document.querySelector(".pill");
if (USAR_SIMULACAO) {
  document.getElementById("modo").textContent = "Modo demonstração (sem backend)";
  modoPill.innerHTML = `<i></i> Sistema de demonstração`;
} else {
  document.getElementById("modo").textContent = "Conectado ao Celery/RabbitMQ";
  modoPill.innerHTML = `<i style="background: #3b82f6;"></i> Servidor Ativo`;
}

atualizarStatus();
setInterval(atualizarStatus, 2000);
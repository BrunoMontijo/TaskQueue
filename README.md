# 🚀 TaskQueue - Sistema Distribuído de Filas de Mensagens

Este projeto é uma implementação prática dos conceitos de **Sistemas Distribuídos** (Comunicação Indireta e Filas de Mensagens). Ele demonstra o processamento assíncrono de tarefas, garantindo o desacoplamento espacial e temporal entre produtores e consumidores de mensagens.

## 🧠 Sobre o Projeto e Arquitetura

O sistema possui uma arquitetura **híbrida (Local + Nuvem)** dividida em 4 blocos fundamentais:

1. **Frontend (Interface):** Painel reativo em Vanilla JS/HTML/CSS que consome a API para enviar tarefas e receber notificações visuais suaves de conclusão em tempo real.

2. **API Produtora (FastAPI):** Recebe as requisições, registra o estado inicial no banco de dados local e publica a mensagem na fila assíncrona, liberando o usuário imediatamente.

3. **Message Broker (CloudAMQP / RabbitMQ):** O "coração" distribuído. Hospedado na nuvem, armazena as mensagens com segurança até que o consumidor esteja pronto para processá-las.

4. **Worker Consumidor (Celery):** Processo em segundo plano que "escuta" a fila na nuvem, puxa as tarefas, executa o trabalho pesado e atualiza os status no banco de dados (`Pendente` ➔ `Processando` ➔ `Concluída`).

## ⚙️ Como Instalar e Rodar o Projeto

Siga o passo a passo abaixo para rodar a aplicação na sua máquina local.

### 1. Clonar o Repositório e Configurar o Ambiente

Abra o terminal e rode os comandos abaixo para baixar o código e criar o ambiente virtual isolado:

```
# Clone o repositório oficial
git clone https://github.com/BrunoMontijo/TaskQueue.git
cd TaskQueue

# Crie o ambiente virtual
python -m venv venv

# Ative o ambiente virtual (Windows)
venv\Scripts\activate

```

*(Nota: Se o Windows bloquear a ativação, rode `Set-ExecutionPolicy Unrestricted -Scope CurrentUser` como administrador e tente novamente).*

### 2. Instalar Dependências e Configurar a Nuvem

Com o ambiente ativado, instale as bibliotecas necessárias:

```
pip install -r requirements.txt

```

Crie um arquivo chamado `.env` na raiz do projeto e configure a sua URL de conexão com o RabbitMQ na nuvem:

```
CLOUDAMQP_URL="amqps://seu_usuario:sua_senha@servidor.rmq.cloudamqp.com/seu_vhost"

```

### 3. Iniciar os Serviços (A Mágica Acontece Aqui)

Para que o fluxo completo funcione, você precisará abrir **dois terminais** (lembre-se de ativar o `venv` em ambos).

**Terminal 1 - O Trabalhador (Celery Worker):**
Ficará escutando a fila na nuvem e processando as demandas.

```
cd worker
celery -A tasks worker --loglevel=info --pool=solo

```

**Terminal 2 - A API (FastAPI Produtor):**
Receberá os pedidos do painel. *(O arquivo `resultados.sqlite` será criado automaticamente ao rodar este comando).*

```
cd backend
uvicorn main:app --reload

```

### 4. Acessar o Painel de Controle

O frontend foi construído de forma nativa e não requer servidores pesados.
Vá até a pasta `frontend` pelo seu explorador de arquivos e dê um **duplo clique** no arquivo `index.html` para abri-lo diretamente no navegador.
*(⚠️ Dica: Não utilize extensões como Live Server para testar, pois elas recarregam a página automaticamente e interrompem o fluxo das notificações assíncronas).*

## 🧪 Como Testar a Resiliência (Teste de Queda)

Quer comprovar o poder de uma arquitetura distribuída?

1. Desligue o **Terminal 1** (Worker) pressionando `Ctrl + C`.

2. Vá ao painel no navegador e cadastre 3 novas tarefas (como *Lembretes* ou *Relatórios*).

3. Observe que o sistema **não trava** e não dá erro. As tarefas ficam seguras na nuvem com o status de `Pendente`.

4. Religue o Worker no Terminal 1. Ele puxará as mensagens da nuvem imediatamente e a interface do usuário será atualizada com notificações elegantes à medida que forem sendo concluídas.

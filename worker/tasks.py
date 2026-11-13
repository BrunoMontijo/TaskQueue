import os
import time
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

# Define a pasta raiz e carrega o .env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Cria o banco SQLite na raiz do projeto para o Celery salvar os resultados
db_path = f"db+sqlite:///{BASE_DIR}/resultados.sqlite"

# Adiciona o backend na inicialização
app = Celery("tasks", broker=os.environ["CLOUDAMQP_URL"], backend=db_path)

# LIGA O RASTREAMENTO DO STATUS "STARTED" (Processando)
app.conf.task_track_started = True

# Configurações de otimização do Worker
app.conf.broker_pool_limit = 1
app.conf.broker_connection_retry_on_startup = True
app.conf.worker_prefetch_multiplier = 1

@app.task(name="processar_tarefa")
def processar_tarefa(descricao):
    print(f"⏳ Processando: {descricao}")
    time.sleep(5)  # Simula um trabalho demorado de 5 segundos
    print(f"✅ Concluído: {descricao}")
    # O Celery vai salvar este retorno no banco SQLite
    return f"Tarefa '{descricao}' processada com sucesso!"
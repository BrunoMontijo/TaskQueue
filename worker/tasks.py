import os
import time
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

# Define a pasta raiz e carrega o .env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Cria o banco SQLite na raiz do projeto
db_path = f"db+sqlite:///{BASE_DIR}/resultados.sqlite"

# Adiciona o backend na inicialização
app = Celery("tasks", broker=os.environ["CLOUDAMQP_URL"], backend=db_path)

app.conf.broker_pool_limit = 1
app.conf.broker_connection_retry_on_startup = True
app.conf.worker_prefetch_multiplier = 1

@app.task(name="processar_tarefa")
def processar_tarefa(nome):
    print(f"⏳ Processando: {nome}")
    time.sleep(5)
    print(f"✅ Concluído: {nome}")
    # O Celery vai salvar este retorno no banco SQLite
    return f"Tarefa '{nome}' processada com sucesso!"
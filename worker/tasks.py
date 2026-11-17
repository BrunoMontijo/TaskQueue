import os
import time
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

db_path = f"db+sqlite:///{BASE_DIR}/resultados.sqlite"

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
    time.sleep(5) 
    print(f"✅ Concluído: {descricao}")
    return f"Tarefa '{descricao}' processada com sucesso!"
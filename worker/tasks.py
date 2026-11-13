import os
import time
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = Celery("tasks", broker=os.environ["CLOUDAMQP_URL"])

# Ajustes recomendados pro plano free (poucas conexões)
app.conf.broker_pool_limit = 1
app.conf.broker_connection_retry_on_startup = True
app.conf.worker_prefetch_multiplier = 1


@app.task(name="processar_tarefa")
def processar_tarefa(nome):
    print(f"⏳ Processando: {nome}")
    time.sleep(5)
    print(f"✅ Concluído: {nome}")
    return True
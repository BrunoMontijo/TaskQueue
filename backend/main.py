import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="TaskQueue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

celery_app = Celery("tasks", broker=os.environ["CLOUDAMQP_URL"])
celery_app.conf.broker_pool_limit = 1


class Tarefa(BaseModel):
    nome: str


@app.get("/")
def raiz():
    return {"status": "API no ar"}


@app.post("/enviar")
def enviar_tarefa(tarefa: Tarefa):
    resultado = celery_app.send_task("processar_tarefa", args=[tarefa.nome])
    return {"status": "Enviado para a fila", "id": resultado.id}
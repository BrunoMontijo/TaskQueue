import os
import sqlite3
from datetime import datetime
from typing import Optional
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="TaskQueue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db_path = f"db+sqlite:///{BASE_DIR}/resultados.sqlite"
celery_app = Celery("tasks", broker=os.environ["CLOUDAMQP_URL"], backend=db_path)
celery_app.conf.broker_pool_limit = 1

# Configura o banco de dados nativo para salvar o histórico do painel
conn = sqlite3.connect(BASE_DIR / "resultados.sqlite", check_same_thread=False)
conn.execute('''
    CREATE TABLE IF NOT EXISTS historico_tarefas (
        id TEXT PRIMARY KEY, 
        descricao TEXT, 
        tipo TEXT, 
        data_hora TEXT, 
        status TEXT
    )
''')
conn.commit()

class Tarefa(BaseModel):
    descricao: str
    tipo: str
    quando: Optional[str] = None  # Opcional, pois relatórios e pedidos vêm sem data

@app.post("/enviar")
def enviar_tarefa(tarefa: Tarefa):
    opcoes_celery = {}
    
    # Se a tarefa tiver uma data agendada, configuramos o ETA no Celery
    if tarefa.quando:
        data_agendada = datetime.fromisoformat(tarefa.quando.replace("Z", "+00:00"))
        opcoes_celery["eta"] = data_agendada
        
    resultado = celery_app.send_task("processar_tarefa", args=[tarefa.descricao], **opcoes_celery)
    
    data_hora_criacao = datetime.now().strftime("%d/%m/%Y • %H:%M")
    
    # Salva no banco de dados SQLite
    conn.execute(
        "INSERT INTO historico_tarefas (id, descricao, tipo, data_hora, status) VALUES (?, ?, ?, ?, ?)",
        (resultado.id, tarefa.descricao, tarefa.tipo, data_hora_criacao, "PENDING")
    )
    conn.commit()
    
    return {"status": "Enviado", "id": resultado.id}

@app.get("/tarefas")
def listar_tarefas():
    cursor = conn.execute("SELECT id, descricao, tipo, data_hora, status FROM historico_tarefas ORDER BY rowid DESC")
    tarefas_db = cursor.fetchall()
    
    lista_final = []
    for t in tarefas_db:
        task_id, desc, tipo, dh, status = t
        
        # Se a tarefa ainda não terminou, verifica com o Celery se o status mudou
        if status not in ["SUCCESS", "FAILURE"]:
            status_atual_celery = celery_app.AsyncResult(task_id).state
            
            if status_atual_celery != status:
                conn.execute("UPDATE historico_tarefas SET status = ? WHERE id = ?", (status_atual_celery, task_id))
                conn.commit()
                status = status_atual_celery
                
        lista_final.append({
            "id": task_id,
            "descricao": desc,
            "tipo": tipo,
            "data_hora": dh,
            "status": status
        })
        
    return lista_final
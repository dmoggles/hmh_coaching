import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from .config import settings
from .database import engine, Base
from .routers import periods, assessments

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bob-Tails Assessment API", root_path="/assessment-api")

origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(periods.router)
app.include_router(assessments.router)

SKILL_MATRIX_PATH = Path(__file__).parent.parent / "bobtails_skill_matrix.json"


@app.get("/skill-matrix")
def get_skill_matrix():
    with open(SKILL_MATRIX_PATH) as f:
        return json.load(f)


@app.get("/health")
def health():
    return {"status": "ok"}

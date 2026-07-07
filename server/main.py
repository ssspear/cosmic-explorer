from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.routers import celestial_bodies

app = FastAPI(title="Cosmic Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(celestial_bodies.router, prefix="/api")

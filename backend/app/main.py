from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.base import Base
from app.db.session import engine
from app.db import Organisation, InfraNode, Payment, PaymentEvent  # noqa: F401
from app.db.migrations import upgrade_database
from app.apis.routes import router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    upgrade_database()
    yield


app = FastAPI(title="MONEQRA", lifespan=lifespan)
app.include_router(router)
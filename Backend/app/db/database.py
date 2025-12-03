from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import get_settings

settings = get_settings()

SQLALCHEMY_DATABASE_URL = settings.database_url

connect_args = {}
# SQLite needs this for multithreading with FastAPI
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency to get a DB session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

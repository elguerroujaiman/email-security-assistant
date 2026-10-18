from datetime import datetime, timezone
import os
from pathlib import Path

from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    String,
    create_engine,
    func,
    inspect,
    select,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


DATABASE_PATH = Path(
    os.getenv(
        "EMAIL_LOGS_DB_PATH",
        str(Path(__file__).resolve().parent.parent / "email_logs.db"),
    )
)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


class EmailLog(Base):
    __tablename__ = "email_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    classification: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(String, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    action: Mapped[str | None] = mapped_column(String, nullable=True)
    override_classification: Mapped[str | None] = mapped_column(String, nullable=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    columns = {
        column["name"]
        for column in inspector.get_columns(EmailLog.__tablename__)
    }

    if "summary" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE email_logs "
                    "ADD COLUMN summary VARCHAR NOT NULL DEFAULT ''"
                )
            )

    if "action" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE email_logs "
                    "ADD COLUMN action VARCHAR"
                )
            )

    if "override_classification" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE email_logs "
                    "ADD COLUMN override_classification VARCHAR"
                )
            )


def save_email_log(
    sender: str,
    subject: str,
    classification: str,
    confidence: float,
    risk_level: str,
    summary: str,
) -> None:
    with SessionLocal() as session:
        session.add(
            EmailLog(
                sender=sender,
                subject=subject,
                classification=classification,
                confidence=confidence,
                risk_level=risk_level,
                summary=summary,
            )
        )
        session.commit()


def update_email_log_action(
    log_id: int,
    action: str,
    override_classification: str | None = None,
) -> EmailLog | None:
    with SessionLocal() as session:
        log = session.get(EmailLog, log_id)
        if log:
            log.action = action
            if override_classification is not None:
                log.override_classification = override_classification
            session.commit()
            session.refresh(log)
            return log
        return None


def get_email_stats() -> dict:
    stats = {
        "total": 0,
        "safe": 0,
        "suspicious": 0,
        "phishing": 0,
    }

    with SessionLocal() as session:
        rows = session.execute(
            select(
                func.coalesce(EmailLog.override_classification, EmailLog.classification),
                func.count()
            )
            .group_by(func.coalesce(EmailLog.override_classification, EmailLog.classification))
        )

        for classification, count in rows:
            normalized_classification = classification.lower()
            if normalized_classification in stats:
                stats[normalized_classification] = count
            stats["total"] += count

    return stats


def get_recent_email_logs(limit: int = 50) -> list[EmailLog]:
    with SessionLocal() as session:
        return list(
            session.scalars(
                select(EmailLog)
                .order_by(EmailLog.created_at.desc(), EmailLog.id.desc())
                .limit(limit)
            )
        )

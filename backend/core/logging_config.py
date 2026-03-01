"""
Structured logging configuration.
JSON format in production, colored console in development.
"""
import logging
import sys
import json
from datetime import datetime, timezone

from backend.core.config import settings


class JSONFormatter(logging.Formatter):
    """JSON log formatter for production."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_data["exception"] = self.formatException(record.exc_info)
        # Add extra fields
        for key in ("request_id", "user_id", "endpoint", "method", "status_code", "duration_ms"):
            if hasattr(record, key):
                log_data[key] = getattr(record, key)
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging() -> None:
    """Configure logging based on environment."""
    root = logging.getLogger()
    root.setLevel(logging.INFO if not settings.DEBUG else logging.DEBUG)

    # Remove existing handlers
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if settings.ENVIRONMENT == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
            datefmt="%H:%M:%S",
        ))

    root.addHandler(handler)

    # Reduce noise from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

"""
WebSocket endpoint for real-time analysis progress.
"""
import asyncio
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalysisProgressManager:
    """Manages WebSocket connections for analysis progress updates."""

    def __init__(self):
        # project_id -> set of connected websockets
        self._connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, project_id: int, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self._connections:
            self._connections[project_id] = set()
        self._connections[project_id].add(websocket)
        logger.info(f"WebSocket connected for project {project_id}")

    def disconnect(self, project_id: int, websocket: WebSocket):
        if project_id in self._connections:
            self._connections[project_id].discard(websocket)
            if not self._connections[project_id]:
                del self._connections[project_id]

    async def send_progress(self, project_id: int, data: dict):
        """Broadcast progress to all connected clients for a project."""
        if project_id not in self._connections:
            return
        disconnected = set()
        for ws in self._connections[project_id]:
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            self._connections[project_id].discard(ws)


# Global instance
progress_manager = AnalysisProgressManager()


@router.websocket("/ws/analysis/{project_id}")
async def analysis_progress_ws(websocket: WebSocket, project_id: int):
    """WebSocket for receiving analysis progress updates."""
    await progress_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep connection alive, receive pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        progress_manager.disconnect(project_id, websocket)
    except Exception:
        progress_manager.disconnect(project_id, websocket)

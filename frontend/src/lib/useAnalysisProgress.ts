import { useState, useEffect, useCallback, useRef } from 'react';

export interface AnalysisProgress {
  type: string;
  image_id?: number;
  image_name?: string;
  step?: string;
  current?: number;
  total?: number;
  status: string;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useAnalysisProgress(projectId: number | null) {
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!projectId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/analysis/${projectId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Start ping interval
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
      ws.addEventListener('close', () => clearInterval(pingInterval));
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      try {
        const data = JSON.parse(event.data);
        setProgress(data);
      } catch { /* ignore non-json */ }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return { progress, connected };
}

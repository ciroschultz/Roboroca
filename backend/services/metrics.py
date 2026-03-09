"""
Roboroça - Prometheus Metrics
Coleta e expoe metricas para monitoramento.
"""

import time
import logging
from collections import defaultdict
from typing import Dict

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Coletor de metricas in-memory com export Prometheus text format."""

    def __init__(self):
        self._counters: Dict[str, float] = defaultdict(float)
        self._histograms: Dict[str, list] = defaultdict(list)
        self._gauges: Dict[str, float] = defaultdict(float)
        self._start_time = time.time()

    def inc(self, name: str, value: float = 1.0, labels: dict = None):
        """Incrementa um counter."""
        key = self._key(name, labels)
        self._counters[key] += value

    def set_gauge(self, name: str, value: float, labels: dict = None):
        """Define o valor de um gauge."""
        key = self._key(name, labels)
        self._gauges[key] = value

    def observe(self, name: str, value: float, labels: dict = None):
        """Registra uma observacao em histograma."""
        key = self._key(name, labels)
        self._histograms[key].append(value)
        # Manter apenas as ultimas 1000 observacoes
        if len(self._histograms[key]) > 1000:
            self._histograms[key] = self._histograms[key][-1000:]

    def _key(self, name: str, labels: dict = None) -> str:
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def export_prometheus(self) -> str:
        """Exporta metricas no formato Prometheus text."""
        lines = []
        lines.append(f"# Roboroca Metrics")
        lines.append(f"# Uptime: {time.time() - self._start_time:.0f}s")
        lines.append("")

        # Uptime gauge
        lines.append("# HELP roboroca_uptime_seconds Time since application start")
        lines.append("# TYPE roboroca_uptime_seconds gauge")
        lines.append(f"roboroca_uptime_seconds {time.time() - self._start_time:.1f}")
        lines.append("")

        # Counters
        if self._counters:
            seen_names = set()
            for key, value in sorted(self._counters.items()):
                name = key.split("{")[0] if "{" in key else key
                if name not in seen_names:
                    lines.append(f"# HELP {name} Counter metric")
                    lines.append(f"# TYPE {name} counter")
                    seen_names.add(name)
                lines.append(f"{key} {value}")
            lines.append("")

        # Gauges
        if self._gauges:
            seen_names = set()
            for key, value in sorted(self._gauges.items()):
                name = key.split("{")[0] if "{" in key else key
                if name not in seen_names:
                    lines.append(f"# HELP {name} Gauge metric")
                    lines.append(f"# TYPE {name} gauge")
                    seen_names.add(name)
                lines.append(f"{key} {value}")
            lines.append("")

        # Histogram summaries
        if self._histograms:
            seen_names = set()
            for key, values in sorted(self._histograms.items()):
                name = key.split("{")[0] if "{" in key else key
                if name not in seen_names:
                    lines.append(f"# HELP {name} Histogram metric")
                    lines.append(f"# TYPE {name} summary")
                    seen_names.add(name)
                if values:
                    sorted_vals = sorted(values)
                    count = len(sorted_vals)
                    total = sum(sorted_vals)
                    p50 = sorted_vals[int(count * 0.5)] if count > 0 else 0
                    p95 = sorted_vals[int(count * 0.95)] if count > 0 else 0
                    p99 = sorted_vals[int(count * 0.99)] if count > 0 else 0
                    base = key.split("{")[0] if "{" in key else key
                    labels = key[len(base):] if "{" in key else ""
                    q_labels = lambda q: f'{{{q},{labels[1:]}' if labels else f'{{{q}}}'
                    lines.append(f'{base}{q_labels("quantile=\"0.5\"")} {p50:.4f}')
                    lines.append(f'{base}{q_labels("quantile=\"0.95\"")} {p95:.4f}')
                    lines.append(f'{base}{q_labels("quantile=\"0.99\"")} {p99:.4f}')
                    lines.append(f"{base}_count{labels} {count}")
                    lines.append(f"{base}_sum{labels} {total:.4f}")
            lines.append("")

        return "\n".join(lines) + "\n"


# Instancia global
metrics = MetricsCollector()

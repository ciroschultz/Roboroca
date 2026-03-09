"""
Spectrum Processor - Python port of spectralEngine.ts AUC and calibration logic.
"""

from typing import Optional


# Peak regions by technique
REGIONS = {
    "raman": {
        "lignin": {"start": 1500, "end": 1684},
        "cellulose": {"start": 980, "end": 1194},
    },
    "ftir": {
        "lignin": {"start": 1500, "end": 1650},
        "cellulose": {"start": 1000, "end": 1200},
    },
}

# Default calibration curves
DEFAULT_CALIBRATION = {
    "raman": {"slope": 11.27, "intercept": -1.48},
    "ftir": {"slope": 10.5, "intercept": -0.8},
}


def calculate_area(spectrum: list[dict], start: float, end: float) -> float:
    """Calculate area under curve (trapezoidal integration) for a wavenumber region."""
    filtered = sorted(
        [p for p in spectrum if start <= p["wavenumber"] <= end],
        key=lambda p: p["wavenumber"],
    )
    if len(filtered) < 2:
        return 0.0

    area = 0.0
    for i in range(1, len(filtered)):
        dx = filtered[i]["wavenumber"] - filtered[i - 1]["wavenumber"]
        avg_y = (filtered[i]["intensity"] + filtered[i - 1]["intensity"]) / 2
        area += dx * avg_y
    return area


def analyze_spectrum(
    spectrum: list[dict],
    technique: str = "raman",
    calibration: Optional[dict] = None,
) -> dict:
    """
    Analyze a spectrum: compute AUC for lignin/cellulose regions, ratio, and percentages.

    Args:
        spectrum: list of {wavenumber: float, intensity: float}
        technique: 'raman' or 'ftir'
        calibration: optional {slope, intercept} override

    Returns:
        {ratio, lignin_percent, cellulose_percent, lignin_area, cellulose_area}
    """
    regions = REGIONS.get(technique, REGIONS["raman"])
    cal = calibration or DEFAULT_CALIBRATION.get(technique, DEFAULT_CALIBRATION["raman"])

    lignin_area = calculate_area(spectrum, regions["lignin"]["start"], regions["lignin"]["end"])
    cellulose_area = calculate_area(spectrum, regions["cellulose"]["start"], regions["cellulose"]["end"])

    if cellulose_area == 0:
        ratio = 0.0
    else:
        ratio = lignin_area / cellulose_area

    # Apply calibration
    lignin_percent = cal["slope"] * ratio + cal["intercept"]
    lignin_percent = max(0, min(50, lignin_percent))
    cellulose_percent = max(0, min(60, 100 - lignin_percent - 55))

    return {
        "ratio": round(ratio, 4),
        "lignin_percent": round(lignin_percent, 2),
        "cellulose_percent": round(cellulose_percent, 2),
        "lignin_area": round(lignin_area, 2),
        "cellulose_area": round(cellulose_area, 2),
    }


def linear_regression(points: list[dict]) -> dict:
    """
    Linear regression on points [{x, y}].
    Returns {slope, intercept, r_squared}.
    """
    n = len(points)
    if n < 2:
        return {"slope": 0, "intercept": 0, "r_squared": 0}

    sum_x = sum(p["x"] for p in points)
    sum_y = sum(p["y"] for p in points)
    sum_xy = sum(p["x"] * p["y"] for p in points)
    sum_x2 = sum(p["x"] ** 2 for p in points)

    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        return {"slope": 0, "intercept": 0, "r_squared": 0}

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    mean_y = sum_y / n
    ss_res = sum((p["y"] - (slope * p["x"] + intercept)) ** 2 for p in points)
    ss_tot = sum((p["y"] - mean_y) ** 2 for p in points)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 1

    return {
        "slope": round(slope, 4),
        "intercept": round(intercept, 4),
        "r_squared": round(r_squared, 4),
    }


def parse_csv_spectrum(csv_content: str) -> list[dict]:
    """Parse CSV spectrum file (wavenumber,intensity per line)."""
    spectrum = []
    for line in csv_content.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("wavenumber"):
            continue
        parts = line.split(",")
        if len(parts) >= 2:
            try:
                wn = float(parts[0].strip())
                intensity = float(parts[1].strip())
                spectrum.append({"wavenumber": wn, "intensity": intensity})
            except ValueError:
                continue
    return spectrum

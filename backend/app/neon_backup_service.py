"""
Serviços de snapshot/saúde de backup para projetos hospedados no Neon.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from typing import Any, Dict, List
from urllib import error, parse, request

from app.config import (
    NEON_API_BASE_URL,
    NEON_API_KEY,
    NEON_BACKUP_MAX_AGE_HOURS,
    NEON_BACKUP_RETENTION_DAYS,
    NEON_BRANCH_ID,
    NEON_PROJECT_ID,
)


class NeonBackupError(RuntimeError):
    """Erro de integração com a API do Neon."""


def is_neon_backup_configured() -> bool:
    return all([NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH_ID])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso_z(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _request_neon(method: str, path: str, query: Dict[str, str] | None = None) -> Dict[str, Any]:
    if not is_neon_backup_configured():
        raise NeonBackupError("Integração com Neon não configurada.")

    url = f"{NEON_API_BASE_URL}{path}"
    if query:
        url = f"{url}?{parse.urlencode(query)}"

    req = request.Request(
        url=url,
        method=method,
        headers={
            "Authorization": f"Bearer {NEON_API_KEY}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )

    try:
        with request.urlopen(req, timeout=20) as response:
            payload = response.read().decode("utf-8")
            if not payload:
                return {}
            return json.loads(payload)
    except error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="replace")
        raise NeonBackupError(
            f"Neon respondeu com erro {exc.code}: {raw_body or exc.reason}"
        ) from exc
    except error.URLError as exc:
        raise NeonBackupError(f"Falha de conexão com Neon: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise NeonBackupError("Neon retornou uma resposta inválida.") from exc


def _extract_list(payload: Dict[str, Any] | List[Any]) -> List[Dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []

    for key in ("snapshots", "items", "data"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]

    return []


def _normalize_snapshot(snapshot_payload: Dict[str, Any]) -> Dict[str, Any]:
    snapshot = snapshot_payload.get("snapshot", snapshot_payload)
    if not isinstance(snapshot, dict):
        snapshot = {}

    return {
        "id": snapshot.get("id") or snapshot.get("snapshot_id"),
        "name": snapshot.get("name"),
        "created_at": snapshot.get("created_at") or snapshot.get("createdAt"),
        "expires_at": snapshot.get("expires_at") or snapshot.get("expiresAt"),
        "source_branch_id": snapshot.get("source_branch_id") or snapshot.get("branch_id"),
    }


def _load_recent_snapshots() -> List[Dict[str, Any]]:
    payload = _request_neon("GET", f"/projects/{NEON_PROJECT_ID}/snapshots")
    snapshots = [_normalize_snapshot(snapshot) for snapshot in _extract_list(payload)]

    branch_snapshots = [
        snapshot
        for snapshot in snapshots
        if not snapshot["source_branch_id"] or snapshot["source_branch_id"] == NEON_BRANCH_ID
    ]

    branch_snapshots.sort(
        key=lambda item: _parse_datetime(item["created_at"]) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return branch_snapshots


def get_neon_backup_status() -> Dict[str, Any]:
    checked_at = _to_iso_z(_utc_now())
    status: Dict[str, Any] = {
        "configured": is_neon_backup_configured(),
        "healthy": False,
        "checked_at": checked_at,
        "project_id": NEON_PROJECT_ID or None,
        "branch_id": NEON_BRANCH_ID or None,
        "retention_days": NEON_BACKUP_RETENTION_DAYS,
        "max_age_hours": NEON_BACKUP_MAX_AGE_HOURS,
        "latest_snapshot": None,
        "recent_snapshots": [],
        "issues": [],
    }

    if not status["configured"]:
        status["issues"].append(
            "Configure NEON_API_KEY, NEON_PROJECT_ID e NEON_BRANCH_ID para ativar os snapshots."
        )
        return status

    recent_snapshots = _load_recent_snapshots()
    status["recent_snapshots"] = recent_snapshots[:10]

    if not recent_snapshots:
        status["issues"].append("Nenhum snapshot encontrado para a branch configurada.")
        return status

    latest_snapshot = recent_snapshots[0]
    latest_created_at = _parse_datetime(latest_snapshot["created_at"])
    latest_expires_at = _parse_datetime(latest_snapshot["expires_at"])
    status["latest_snapshot"] = latest_snapshot

    if latest_created_at is None:
        status["issues"].append("O último snapshot não possui data de criação válida.")
        return status

    latest_age_hours = (_utc_now() - latest_created_at).total_seconds() / 3600
    status["latest_snapshot_age_hours"] = round(latest_age_hours, 2)

    if latest_age_hours > NEON_BACKUP_MAX_AGE_HOURS:
        status["issues"].append(
            f"O último snapshot tem {latest_age_hours:.1f}h, acima do limite de {NEON_BACKUP_MAX_AGE_HOURS}h."
        )

    if latest_expires_at is None:
        status["issues"].append("O último snapshot não informa data de expiração.")
    elif latest_expires_at <= _utc_now():
        status["issues"].append("O último snapshot já expirou.")

    status["healthy"] = len(status["issues"]) == 0
    return status


def create_neon_snapshot() -> Dict[str, Any]:
    snapshot_name = f"gestao-pacientes-{_utc_now().strftime('%Y-%m-%d-%H%M%S')}"
    expires_at = _to_iso_z(_utc_now() + timedelta(days=NEON_BACKUP_RETENTION_DAYS))

    payload = _request_neon(
        "POST",
        f"/projects/{NEON_PROJECT_ID}/branches/{NEON_BRANCH_ID}/snapshot",
        query={
            "name": snapshot_name,
            "expires_at": expires_at,
        },
    )

    snapshot = _normalize_snapshot(payload)
    status = get_neon_backup_status()
    status["created_snapshot"] = snapshot
    return status

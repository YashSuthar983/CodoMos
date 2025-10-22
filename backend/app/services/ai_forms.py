import json
from typing import Any, Dict, List, Optional

from app.core.config import settings

try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover - optional import
    genai = None


ALLOWED_FIELD_TYPES = [
    "text", "textarea", "select", "checkbox", "rating", "date", "file"
]


def _fallback_schema(description: str, include: Optional[List[str]] = None, exclude: Optional[List[str]] = None) -> Dict[str, Any]:
    include = include or []
    exclude = exclude or []
    fields = [
        {"type": "text", "label": "Full Name", "name": "full_name", "required": True},
        {"type": "text", "label": "Email", "name": "email", "required": True},
        {"type": "textarea", "label": "About", "name": "about", "required": False},
    ]
    # simple include/exclude handling
    for f in include:
        fields.append({"type": "text", "label": f.title(), "name": f.lower().replace(" ", "_"), "required": False})
    fields = [f for f in fields if f["name"] not in set(exclude)]
    return {"fields": fields}


def _fallback_triggers(use_case: str) -> List[Dict[str, Any]]:
    return [
        {"type": "create_task", "params": {"title": f"Review submission - {use_case[:40]}"}},
        {"type": "send_webhook", "params": {"url": "https://webhook.site/example", "payload": {"event": "form_submitted", "form_id": "{{form_id}}"}}},
    ]


def _make_model():
    if not settings.GEMINI_API_KEY or genai is None:
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(settings.GEMINI_MODEL)


def generate_form_schema(
    description: str,
    industry: Optional[str] = None,
    audience: Optional[str] = None,
    include_fields: Optional[List[str]] = None,
    exclude_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Return a schema dict: {"fields": [...]} with allowed types only.
    Falls back to a deterministic schema if Gemini is unavailable.
    """
    model = _make_model()
    if model is None:
        return _fallback_schema(description, include_fields, exclude_fields)

    sys = (
        "You are an assistant that designs JSON form schemas. "
        "Output ONLY valid JSON with the structure {\"fields\": [...]} where each field has: "
        "type (one of: text, textarea, select, checkbox, rating, date, file), label, name, required (bool). "
        "If type=select, include options: [string]. No comments."
    )
    user = {
        "task": "Generate form schema",
        "description": description,
        "industry": industry,
        "audience": audience,
        "include_fields": include_fields,
        "exclude_fields": exclude_fields,
    }

    try:
        resp = model.generate_content([sys, json.dumps(user)])
        text = resp.text or "{}"
        # Some models wrap JSON in code fences
        text = text.strip().strip('`')
        start = text.find('{')
        end = text.rfind('}')
        parsed = json.loads(text[start:end+1])
        fields = []
        for f in parsed.get("fields", []):
            t = (f.get("type") or "").lower()
            if t not in ALLOWED_FIELD_TYPES:
                continue
            field = {
                "type": t,
                "label": f.get("label") or f.get("name", "").replace("_", " ").title(),
                "name": f.get("name") or (f.get("label", "").lower().replace(" ", "_")),
                "required": bool(f.get("required", False)),
            }
            if t == "select":
                opts = f.get("options") or []
                if isinstance(opts, list):
                    field["options"] = [str(o) for o in opts if str(o).strip()]
            fields.append(field)
        # include/exclude pass-through safety
        if include_fields:
            for inc in include_fields:
                nm = inc.lower().replace(" ", "_")
                if nm not in {f["name"] for f in fields}:
                    fields.append({"type": "text", "label": inc.title(), "name": nm, "required": False})
        if exclude_fields:
            fields = [f for f in fields if f["name"] not in set(exclude_fields)]
        return {"fields": fields[:50]}
    except Exception:
        return _fallback_schema(description, include_fields, exclude_fields)


def generate_triggers(
    use_case: str,
    form_schema: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    model = _make_model()
    if model is None:
        return _fallback_triggers(use_case)

    sys = (
        "Design automation triggers for a form system. Allowed trigger types: "
        "create_task(params: {title}), update_candidate_stage(params: {stage, candidate_id?}), "
        "send_webhook(params: {url, payload}). Output ONLY valid JSON as an array of trigger objects."
    )
    user = {
        "task": "Suggest automation triggers",
        "use_case": use_case,
        "form_schema": form_schema,
    }
    try:
        resp = model.generate_content([sys, json.dumps(user)])
        text = resp.text or "[]"
        text = text.strip().strip('`')
        start = text.find('[')
        end = text.rfind(']')
        triggers = json.loads(text[start:end+1])
        cleaned: List[Dict[str, Any]] = []
        for t in triggers:
            ttype = t.get("type")
            params = t.get("params", {}) or {}
            if ttype not in {"create_task", "update_candidate_stage", "send_webhook"}:
                continue
            if ttype == "send_webhook":
                if not isinstance(params.get("url"), str):
                    continue
                payload = params.get("payload") or {}
                if not isinstance(payload, dict):
                    payload = {}
                params = {"url": params["url"], "payload": payload}
            cleaned.append({"type": ttype, "params": params})
        return cleaned[:10]
    except Exception:
        return _fallback_triggers(use_case)

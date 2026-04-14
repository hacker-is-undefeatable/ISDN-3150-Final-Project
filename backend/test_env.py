"""
Environment and API test helper.

Usage:
  python test_env.py              # auto-detect mode
  python test_env.py --live       # force live server at http://localhost:8000
  python test_env.py --in-process # force in-process ASGI test client
"""

import asyncio
import os
import sys
from typing import Dict, Optional, Tuple

import httpx
from dotenv import load_dotenv

load_dotenv()

REQUIRED_GROUPS = {
    "ENDPOINT": ["HKUST_AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_ENDPOINT", "VITE_AZURE_OPENAI_ENDPOINT"],
    "API_KEY": ["HKUST_AZURE_OPENAI_API_KEY", "AZURE_OPENAI_KEY", "VITE_AZURE_OPENAI_KEY"],
    "DEPLOYMENT": ["HKUST_AZURE_OPENAI_DEPLOYMENT", "AZURE_OPENAI_DEPLOYMENT", "AZURE_OPENAI_MODEL"],
    "API_VERSION": ["HKUST_AZURE_OPENAI_API_VERSION", "AZURE_OPENAI_API_VERSION"],
    "CHAT_URL": ["HKUST_AZURE_OPENAI_CHAT_COMPLETIONS_URL", "AZURE_OPENAI_CHAT_COMPLETIONS_URL"],
}


def pick_env_value(candidates) -> Tuple[Optional[str], Optional[str]]:
    for var in candidates:
        value = os.getenv(var)
        if value:
            return value, var
    return None, None


def mask(label: str, value: str) -> str:
    if "KEY" in label or "ENDPOINT" in label or "URL" in label:
        return value[:10] + "***" + value[-5:] if len(value) > 15 else "***"
    return value


def print_env_report() -> None:
    print("=" * 68)
    print("Environment Variables Test")
    print("=" * 68)

    missing = []
    for label, candidates in REQUIRED_GROUPS.items():
        value, source = pick_env_value(candidates)

        if label == "DEPLOYMENT" and not value:
            value, source = "gpt-4o-mini", "default"
        if label == "API_VERSION" and not value:
            value, source = "2024-10-21", "default"

        if value:
            print(f"[OK] {label:<10} ({source}): {mask(label, value)}")
        else:
            missing.append(label)
            print(f"[MISS] {label:<10}: NOT SET")

    if missing:
        print("\nMissing groups:", ", ".join(missing))
    else:
        print("\nAll required environment groups are configured.")

    print("=" * 68)


async def verify_direct_hkust_call() -> bool:
    print("\n[VERIFY] Direct HKUST chat completions call")
    print("-" * 68)

    chat_url, _ = pick_env_value(REQUIRED_GROUPS["CHAT_URL"])
    endpoint, _ = pick_env_value(REQUIRED_GROUPS["ENDPOINT"])
    deployment, _ = pick_env_value(REQUIRED_GROUPS["DEPLOYMENT"])
    api_version, _ = pick_env_value(REQUIRED_GROUPS["API_VERSION"])
    api_key, _ = pick_env_value(REQUIRED_GROUPS["API_KEY"])

    deployment = deployment or "gpt-4o-mini"
    api_version = api_version or "2024-10-21"

    if not chat_url:
        if not endpoint:
            print("[FAIL] No endpoint configured")
            return False
        chat_url = (
            endpoint.rstrip("/")
            + f"/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
        )

    if not api_key:
        print("[FAIL] No API key configured")
        return False

    payload = {
        "messages": [
            {"role": "system", "content": "You are concise."},
            {"role": "user", "content": "Reply with exactly: ok"},
        ],
        "temperature": 0,
    }

    endpoint = endpoint.rstrip("/") if endpoint else ""
    candidates = []

    if chat_url:
        explicit = chat_url.strip()
        use_model = "/deployments/" not in explicit
        candidates.append(
            {
                "url": explicit,
                "headers": {"api-key": api_key, "Content-Type": "application/json"},
                "payload": {**payload, "model": deployment} if use_model else payload,
            }
        )

    if endpoint:
        candidates.extend(
            [
                {
                    "url": f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}",
                    "headers": {"api-key": api_key, "Content-Type": "application/json"},
                    "payload": payload,
                },
                {
                    "url": f"{endpoint}/openai/chat/completions?api-version={api_version}",
                    "headers": {"api-key": api_key, "Content-Type": "application/json"},
                    "payload": {**payload, "model": deployment},
                },
                {
                    "url": f"{endpoint}/openai/v1/chat/completions",
                    "headers": {"api-key": api_key, "Content-Type": "application/json"},
                    "payload": {**payload, "model": deployment},
                },
            ]
        )

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            errors = []
            for candidate in candidates:
                try:
                    response = await client.post(
                        candidate["url"],
                        headers=candidate["headers"],
                        json=candidate["payload"],
                    )
                    response.raise_for_status()
                    print(f"[OK] status={response.status_code} via {candidate['url']}")
                    return True
                except Exception as e:
                    errors.append(f"{candidate['url']} -> {type(e).__name__}: {e}")

            print("[FAIL] All direct call variants failed")
            for error in errors:
                print(f"  - {error}")
            return False
    except Exception as e:
        print(f"[FAIL] {type(e).__name__}: {e}")
        return False


async def get_live_client(base_url: str) -> Optional[httpx.AsyncClient]:
    try:
        client = httpx.AsyncClient(base_url=base_url, timeout=90)
        await client.post("/reset_game")
        return client
    except Exception:
        await client.aclose()
        return None


def get_in_process_client() -> httpx.AsyncClient:
    from main import app

    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=90)


async def safe_post(client: httpx.AsyncClient, path: str, json_body=None):
    try:
        if json_body is None:
            return await client.post(path)
        return await client.post(path, json=json_body)
    except Exception as e:
        print(f"[FAIL] {path} request error: {type(e).__name__}: {e}")
        return None


async def run_api_flow(client: httpx.AsyncClient, mode: str) -> bool:
    print(f"\n[RUN] API flow ({mode})")
    print("-" * 68)

    ok = True

    response = await safe_post(client, "/generate_all_puzzles")
    if response is None:
        return False
    if response.status_code != 200:
        print(f"[FAIL] /generate_all_puzzles -> {response.status_code}")
        print(response.text)
        return False

    all_puzzles: Dict[str, Dict[str, str]] = response.json().get("puzzles", {})
    for obj in ["door", "safe", "painting"]:
        puzzle = all_puzzles.get(obj)
        if not puzzle:
            print(f"[FAIL] missing puzzle: {obj}")
            ok = False
            continue
        print(f"[OK] {obj} question: {puzzle.get('question', '')}")

    # Always generate per-object puzzles explicitly before check_answer,
    # so state is definitely populated even if server handles requests statelessly.
    door_answer = None
    safe_answer = None

    response = await safe_post(client, "/generate_puzzle", {"object_type": "door", "hint_only": False})
    if response is not None and response.status_code == 200:
        door_answer = response.json().get("answer")
        print("[OK] /generate_puzzle door")
    else:
        if response is not None:
            print(f"[FAIL] /generate_puzzle door -> {response.status_code} {response.text}")
        ok = False

    response = await safe_post(client, "/generate_puzzle", {"object_type": "safe", "hint_only": False})
    if response is not None and response.status_code == 200:
        safe_answer = response.json().get("answer")
        print("[OK] /generate_puzzle safe")
    else:
        if response is not None:
            print(f"[FAIL] /generate_puzzle safe -> {response.status_code} {response.text}")
        ok = False

    response = await safe_post(client, "/generate_puzzle", {"object_type": "painting", "hint_only": True})
    if response is not None and response.status_code == 200 and response.json().get("hint"):
        print("[OK] /generate_puzzle hint_only")
    else:
        if response is not None:
            print(f"[FAIL] /generate_puzzle hint_only -> {response.status_code} {response.text}")
        ok = False

    if door_answer:
        response = await safe_post(client, "/check_answer", {"object_type": "door", "answer": door_answer})
        if response is not None and response.status_code == 200 and response.json().get("correct") is True:
            print("[OK] /check_answer correct path")
        else:
            if response is not None:
                print(f"[FAIL] /check_answer correct -> {response.status_code} {response.text}")
            ok = False
    else:
        print("[FAIL] missing door answer from generated puzzles")
        ok = False

    if safe_answer:
        wrong = safe_answer + "x"
        response = await safe_post(client, "/check_answer", {"object_type": "safe", "answer": wrong})
        if response is not None and response.status_code == 200 and response.json().get("correct") is False:
            print("[OK] /check_answer incorrect path")
        else:
            if response is not None:
                print(f"[FAIL] /check_answer incorrect -> {response.status_code} {response.text}")
            ok = False
    else:
        print("[FAIL] missing safe answer from generated puzzles")
        ok = False

    response = await safe_post(client, "/reset_game")
    if response is not None and response.status_code == 200:
        print("[OK] /reset_game")
    else:
        if response is not None:
            print(f"[FAIL] /reset_game -> {response.status_code} {response.text}")
        ok = False

    return ok


async def main() -> None:
    print_env_report()
    direct_ok = await verify_direct_hkust_call()

    mode = "auto"
    if "--live" in sys.argv:
        mode = "live"
    elif "--in-process" in sys.argv:
        mode = "in-process"

    client = None
    chosen_mode = None
    if mode in {"auto", "live"}:
        client = await get_live_client("http://localhost:8000")
        if client is not None:
            chosen_mode = "live"
        elif mode == "live":
            print("\n[FAIL] live mode requested but server is not reachable at http://localhost:8000")
            return

    if client is None:
        client = get_in_process_client()
        chosen_mode = "in-process"

    try:
        flow_ok = await run_api_flow(client, chosen_mode)
    finally:
        await client.aclose()

    if mode == "auto" and not flow_ok and chosen_mode == "live":
        print("\n[INFO] live flow failed, retrying in-process mode")
        fallback_client = get_in_process_client()
        try:
            flow_ok = await run_api_flow(fallback_client, "in-process")
        finally:
            await fallback_client.aclose()

    print("\n" + "=" * 68)
    if direct_ok and flow_ok:
        print("RESULT: PASS")
    elif flow_ok:
        print("RESULT: PARTIAL PASS (backend flow works, direct gateway check failed)")
    else:
        print("RESULT: FAIL")
    print("=" * 68)


if __name__ == "__main__":
    asyncio.run(main())

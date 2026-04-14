import json
import os
import re
from uuid import uuid4
from dataclasses import dataclass, field
from typing import Dict

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="AI 3D Escape Room API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GeneratePuzzleRequest(BaseModel):
    object_type: str = Field(..., pattern="^(door|safe|painting)$")
    hint_only: bool = False


class CheckAnswerRequest(BaseModel):
    object_type: str = Field(..., pattern="^(door|safe|painting)$")
    answer: str


class PuzzleResponse(BaseModel):
    question: str
    answer: str
    hint: str


@dataclass
class GameState:
    door_unlocked: bool = False
    safe_opened: bool = False
    current_puzzle: Dict[str, PuzzleResponse] = field(default_factory=dict)


GAME_STATE = GameState()
RECENT_QUESTIONS: Dict[str, list[str]] = {
    "door": [],
    "safe": [],
    "painting": [],
}

FURNITURE_FOCUS = {
    "door": "string manipulation, control flow, and basic Python syntax",
    "safe": "numbers, operators, and short Python expression evaluation",
    "painting": "lists, dictionaries, and built-in Python functions",
}


def normalize(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


async def generate_puzzle_with_hkust_azure(
    object_type: str,
    excluded_questions: list[str] | None = None,
) -> PuzzleResponse:
    endpoint = (
        os.getenv("HKUST_AZURE_OPENAI_ENDPOINT")
        or os.getenv("AZURE_OPENAI_ENDPOINT")
        or os.getenv("VITE_AZURE_OPENAI_ENDPOINT")
    )
    api_key = (
        os.getenv("HKUST_AZURE_OPENAI_API_KEY")
        or os.getenv("AZURE_OPENAI_KEY")
        or os.getenv("VITE_AZURE_OPENAI_KEY")
    )
    deployment = (
        os.getenv("HKUST_AZURE_OPENAI_DEPLOYMENT")
        or os.getenv("AZURE_OPENAI_DEPLOYMENT")
        or os.getenv("AZURE_OPENAI_MODEL")
        or "gpt-4o-mini"
    )
    api_version = (
        os.getenv("HKUST_AZURE_OPENAI_API_VERSION")
        or os.getenv("AZURE_OPENAI_API_VERSION")
        or "2024-06-01"
    )
    explicit_chat_url = (
        os.getenv("HKUST_AZURE_OPENAI_CHAT_COMPLETIONS_URL")
        or os.getenv("AZURE_OPENAI_CHAT_COMPLETIONS_URL")
    )

    if not api_key or not deployment:
        raise ValueError(
            "Missing Azure OpenAI API key. Set HKUST_AZURE_OPENAI_API_KEY, "
            "AZURE_OPENAI_KEY, or VITE_AZURE_OPENAI_KEY in your .env file."
        )

    if not explicit_chat_url and not endpoint:
        raise ValueError(
            "Missing endpoint configuration. Set HKUST_AZURE_OPENAI_ENDPOINT, "
            "AZURE_OPENAI_ENDPOINT, VITE_AZURE_OPENAI_ENDPOINT, or an explicit "
            "*CHAT_COMPLETIONS_URL in your .env file."
        )

    endpoint = endpoint.rstrip("/") if endpoint else ""

    topic = FURNITURE_FOCUS[object_type]
    excluded_questions = excluded_questions or []
    avoid_clause = ""
    if excluded_questions:
        blocked = "\n".join([f"- {question}" for question in excluded_questions])
        avoid_clause = (
            " Do NOT repeat any of these previous questions:\n"
            f"{blocked}\n"
        )

    generation_id = str(uuid4())
    prompt = (
        "Create ONE unique escape-room puzzle about Python coding for the object type "
        f"'{object_type}'. Topic focus: {topic}. "
        "Return strict JSON with keys question, answer, hint. "
        "Constraints: question must require Python reasoning, answer must be a single token "
        "(single word, number, or short symbol), hint must not reveal the exact answer, "
        "family-friendly, and different from common generic riddles."
        f"{avoid_clause}"
        f"Generation nonce: {generation_id}"
    )

    base_payload = {
        "messages": [
            {"role": "system", "content": "You output strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 1.0,
        "response_format": {"type": "json_object"},
    }

    candidates = []

    if explicit_chat_url:
        explicit_url = explicit_chat_url.strip()
        use_model_payload = "/deployments/" not in explicit_url
        candidates.append(
            {
                "url": explicit_url,
                "headers": {
                    "api-key": api_key,
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                "payload": {**base_payload, "model": deployment} if use_model_payload else base_payload,
            }
        )

    if endpoint:
        candidates.extend(
            [
                {
                    "url": f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}",
                    "headers": {"api-key": api_key, "Content-Type": "application/json"},
                    "payload": base_payload,
                },
                {
                    "url": f"{endpoint}/openai/chat/completions?api-version={api_version}",
                    "headers": {"api-key": api_key, "Content-Type": "application/json"},
                    "payload": {**base_payload, "model": deployment},
                },
                {
                    "url": f"{endpoint}/openai/v1/chat/completions",
                    "headers": {"api-key": api_key, "Content-Type": "application/json"},
                    "payload": {**base_payload, "model": deployment},
                },
                {
                    "url": f"{endpoint}/chat/completions",
                    "headers": {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    "payload": {**base_payload, "model": deployment},
                },
            ]
        )

    errors = []
    data = None
    async with httpx.AsyncClient(timeout=15) as client:
        for candidate in candidates:
            for attempt in range(1, 4):
                try:
                    response = await client.post(
                        candidate["url"],
                        headers=candidate["headers"],
                        json=candidate["payload"],
                    )
                    response.raise_for_status()
                    data = response.json()
                    break
                except Exception as e:
                    errors.append(
                        f"{candidate['url']} (attempt {attempt}/3) -> {type(e).__name__}: {e}"
                    )
            if data is not None:
                break

    if data is None:
        details = " | ".join(errors)
        raise ValueError(f"Unable to reach AI chat completion endpoint. Tried: {details}")

    try:
        content = data["choices"][0]["message"]["content"]
    except Exception as e:
        raise ValueError(f"AI response missing expected fields: {e}")

    cleaned = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise ValueError("AI returned non-JSON puzzle response.")
        parsed = json.loads(match.group(0))

    for key in ["question", "answer", "hint"]:
        if key not in parsed:
            raise ValueError(f"AI JSON response missing '{key}' key.")

    question = str(parsed["question"]).strip()
    answer = str(parsed["answer"]).strip()
    hint = str(parsed["hint"]).strip()

    if not question or not answer or not hint:
        raise ValueError("AI JSON response included empty question/answer/hint value.")

    return PuzzleResponse(question=question, answer=answer, hint=hint)


async def get_or_create_puzzle(object_type: str) -> PuzzleResponse:
    if object_type in GAME_STATE.current_puzzle:
        return GAME_STATE.current_puzzle[object_type]

    recent = RECENT_QUESTIONS[object_type][-8:]
    normalized_recent = {normalize(item) for item in recent}

    puzzle = None
    for _ in range(4):
        candidate = await generate_puzzle_with_hkust_azure(object_type, excluded_questions=recent)
        if normalize(candidate.question) not in normalized_recent:
            puzzle = candidate
            break
        puzzle = candidate

    if puzzle is None:
        raise ValueError("Failed to generate puzzle.")

    RECENT_QUESTIONS[object_type].append(puzzle.question)
    RECENT_QUESTIONS[object_type] = RECENT_QUESTIONS[object_type][-12:]
    GAME_STATE.current_puzzle[object_type] = puzzle
    return puzzle


@app.post("/generate_puzzle", response_model=PuzzleResponse)
async def generate_puzzle(payload: GeneratePuzzleRequest):
    try:
        puzzle = await get_or_create_puzzle(payload.object_type)

        if payload.hint_only:
            return PuzzleResponse(question="", answer="", hint=puzzle.hint)

        return puzzle
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating puzzle: {str(e)}")


@app.post("/check_answer")
async def check_answer(payload: CheckAnswerRequest):
    if payload.object_type not in GAME_STATE.current_puzzle:
        raise HTTPException(status_code=400, detail="Puzzle has not been generated yet.")

    puzzle = GAME_STATE.current_puzzle[payload.object_type]

    correct = normalize(payload.answer) == normalize(puzzle.answer)
    if not correct:
        return {
            "correct": False,
            "message": "Incorrect answer. Try again.",
            "state": {
                "door_unlocked": GAME_STATE.door_unlocked,
                "safe_opened": GAME_STATE.safe_opened,
                "current_puzzle": payload.object_type,
            },
        }

    if payload.object_type == "painting":
        GAME_STATE.safe_opened = True
    if payload.object_type in {"safe", "door"}:
        GAME_STATE.door_unlocked = True

    return {
        "correct": True,
        "message": "Correct! Progress updated.",
        "state": {
            "door_unlocked": GAME_STATE.door_unlocked,
            "safe_opened": GAME_STATE.safe_opened,
            "current_puzzle": payload.object_type,
        },
    }


@app.post("/reset_game")
async def reset_game():
    """Reset the game state to start a new game with fresh puzzles."""
    global GAME_STATE
    GAME_STATE = GameState()
    return {
        "message": "Game reset successfully! New puzzles will be generated for the next game.",
        "state": {
            "door_unlocked": GAME_STATE.door_unlocked,
            "safe_opened": GAME_STATE.safe_opened,
        },
    }


@app.post("/generate_all_puzzles")
async def generate_all_puzzles():
    """Generate AI puzzles for all furniture/object types in one call."""
    generated: Dict[str, PuzzleResponse] = {}
    try:
        for object_type in ["door", "safe", "painting"]:
            # Force new puzzle generation for each object and store in state.
            if object_type in GAME_STATE.current_puzzle:
                del GAME_STATE.current_puzzle[object_type]
            generated[object_type] = await get_or_create_puzzle(object_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed while generating '{object_type}' puzzle: {e}")

    GAME_STATE.current_puzzle.update(generated)
    return {
        "message": "AI puzzles generated for all furniture.",
        "puzzles": {k: v.model_dump() for k, v in generated.items()},
    }

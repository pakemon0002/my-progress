import os, json, hmac, hashlib, time
from urllib.parse import parse_qsl
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiosqlite
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
DB_PATH = os.getenv("DB_PATH", "my_progress.db")
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
BASE = Path(__file__).parent
app = FastAPI(title="MY PROGRESS API")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")

def validate_init_data(init_data: str):
    if not BOT_TOKEN:
        return {"id": 0, "first_name": "Demo"}
    if not init_data:
        raise HTTPException(401, "Telegram initData required")
    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise HTTPException(401, "Invalid Telegram data")
    check_string = "\n".join(f"{k}={v}" for k,v in sorted(data.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise HTTPException(401, "Invalid Telegram signature")
    auth_date = int(data.get("auth_date", "0"))
    if time.time() - auth_date > 86400:
        raise HTTPException(401, "Telegram data expired")
    return json.loads(data.get("user", "{}"))

async def user_id(request: Request):
    raw = request.headers.get("X-Telegram-Init-Data", "")
    user = validate_init_data(raw)
    return int(user.get("id", 0))

@app.on_event("startup")
async def startup():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
        CREATE TABLE IF NOT EXISTS app_data (
          user_id INTEGER NOT NULL, section TEXT NOT NULL, payload TEXT NOT NULL,
          updated_at TEXT NOT NULL, PRIMARY KEY(user_id, section)
        );
        """)
        await db.commit()

@app.get("/")
async def index():
    return FileResponse(BASE / "static" / "index.html")

class DataPayload(BaseModel):
    data: dict

@app.get("/api/data")
async def get_data(request: Request):
    uid = await user_id(request)
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT section,payload FROM app_data WHERE user_id=?", (uid,))
        rows = await cur.fetchall()
    result = {k: json.loads(v) for k,v in rows}
    return {"data": result}

@app.put("/api/data/{section}")
async def put_data(section: str, payload: DataPayload, request: Request):
    if section not in {"goals","tasks","reports","transactions"}:
        raise HTTPException(400, "Unknown section")
    uid = await user_id(request)
    encoded = json.dumps(payload.data, ensure_ascii=False)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
          INSERT INTO app_data(user_id,section,payload,updated_at) VALUES(?,?,?,?)
          ON CONFLICT(user_id,section) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at
        """, (uid, section, encoded, datetime.utcnow().isoformat()))
        await db.commit()
    return {"ok": True}

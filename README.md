# MY PROGRESS — Telegram Mini App

Dark premium personal dashboard for goals, daily reports, tasks, analytics and finances.

## What's included
- Mobile-first Telegram Mini App interface
- Dark graphite / deep navy visual system with cyan accents
- Home dashboard, goals, tasks, statistics, finance and daily reports
- Add/edit/delete goals and tasks, update goal progress
- Daily income/leads/team/creative/study tracking
- Income and expense entries
- SQLite backend API with Telegram `initData` signature validation
- Telegram bot with a Mini App launch button
- Local browser storage fallback for preview/testing

## Run locally (preview)
Requires Python 3.10+.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux/Termux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 0.0.0.0 --port 8000
```
Open `http://127.0.0.1:8000` in a browser. In local preview, the app uses browser localStorage. To test Telegram authentication and cloud persistence, deploy with HTTPS and set a real `BOT_TOKEN`.

## Connect Telegram
1. Create a bot with `@BotFather` using `/newbot`.
2. Put the bot token into `.env` as `BOT_TOKEN=...`.
3. Deploy this project to a host with HTTPS.
4. Set `WEBAPP_URL=https://your-domain/`.
5. Start the bot process: `python bot.py`.
6. Open your bot in Telegram and send `/start`.

## Production note
The UI saves locally for immediate responsiveness and synchronizes the goals, tasks, reports and transactions collections with the FastAPI SQLite API when served over HTTP(S). Telegram `initData` is validated by the API when `BOT_TOKEN` is configured. Use HTTPS in production, keep the bot token secret, and add automated database backups before storing important records.

## Files
- `static/index.html` — app layout
- `static/style.css` — responsive visual design
- `static/app.js` — interactions and local persistence
- `server.py` — FastAPI API and Telegram auth validation
- `bot.py` — Telegram launcher bot

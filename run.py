"""Run the FastAPI app and Telegram polling bot in one Railway service."""
import asyncio
import os
import uvicorn
from bot import run_bot

async def main():
    port = int(os.getenv("PORT", "8000"))
    config = uvicorn.Config("server:app", host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)
    web_task = asyncio.create_task(server.serve(), name="web")
    bot_task = asyncio.create_task(run_bot(), name="telegram-bot")
    tasks = {web_task, bot_task}
    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            exc = task.exception()
            if exc:
                raise exc
        if not server.should_exit:
            raise RuntimeError("Один из процессов завершился неожиданно")
    finally:
        server.should_exit = True
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == "__main__":
    asyncio.run(main())

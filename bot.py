import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

load_dotenv()
TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
dp = Dispatcher()

@dp.message(CommandStart())
async def start(message: Message):
    if not WEBAPP_URL.startswith("https://"):
        await message.answer("MY PROGRESS готовится. HTTPS-ссылка ещё не настроена.")
        return
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть MY PROGRESS", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await message.answer(
        "⚡ <b>MY PROGRESS</b>\n\nТвоя личная система целей, задач, финансов и аналитики.\n\nНажми кнопку ниже, чтобы открыть приложение.",
        reply_markup=keyboard,
        parse_mode="HTML",
    )

async def run_bot():
    if not TOKEN:
        raise RuntimeError("Не задана переменная BOT_TOKEN")
    async with Bot(TOKEN) as bot:
        await dp.start_polling(bot)

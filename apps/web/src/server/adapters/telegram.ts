// Spec 024: cliente HTTP de la API de bots de Telegram. El token solo vive en las variables del servidor.
import type { TelegramClient, TelegramUpdate } from "@/server/ports/telegram";

const API = "https://api.telegram.org";

export class HttpTelegram implements TelegramClient {
  constructor(
    private readonly token: string,
    readonly botUsername: string,
  ) {}

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${API}/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
    if (!res.ok || !json?.ok) throw new Error(`Telegram ${method}: ${json?.description ?? res.status}`);
    return json.result as T;
  }

  async sendMessage(chatId: string, text: string) {
    await this.call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
  }

  async getUpdates(): Promise<TelegramUpdate[]> {
    const raw = await this.call<{ update_id: number; message?: { chat?: { id: number }; text?: string } }[]>("getUpdates", {
      allowed_updates: ["message"],
      timeout: 0,
    });
    return raw.flatMap((u) => (u.message?.chat && u.message.text ? [{ updateId: u.update_id, chatId: String(u.message.chat.id), text: u.message.text }] : []));
  }
}

let instance: TelegramClient | null | undefined;
/** El bot configurado (TELEGRAM_BOT_TOKEN y TELEGRAM_BOT_USERNAME), o `null` si falta. */
export function getTelegram(): TelegramClient | null {
  if (instance !== undefined) return instance;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  instance = token && username ? new HttpTelegram(token, username) : null;
  return instance;
}

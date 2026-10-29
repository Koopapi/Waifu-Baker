// Spec 024: el bot de Telegram (códigos de acceso, vinculación y avisos).
export interface TelegramUpdate {
  updateId: number;
  chatId: string;
  text: string;
}

export interface TelegramClient {
  /** @usuario del bot, para el enlace de vinculación. */
  readonly botUsername: string;
  sendMessage(chatId: string, text: string): Promise<void>;
  /** Mensajes recibidos por el bot (consulta puntual, sin webhook). */
  getUpdates(): Promise<TelegramUpdate[]>;
}

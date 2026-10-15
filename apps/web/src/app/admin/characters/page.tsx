import { db } from "@/db/client";
import { listCharacters } from "@/server/services/characters";
import { CharacterRow, CreateCharacterForm } from "./forms";

export default async function CharactersPage() {
  const rows = await listCharacters(db);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Personajes</h1>
      <CreateCharacterForm />
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-white/50">Aún no hay personajes.</p>}
        {rows.map((c) => (
          <CharacterRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

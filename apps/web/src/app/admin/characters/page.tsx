import { db } from "@/db/client";
import { listCharacters } from "@/server/services/characters";
import { getDict } from "@/i18n/server";
import { CharacterRow, CreateCharacterForm } from "./forms";

export default async function CharactersPage() {
  const rows = await listCharacters(db);
  const t = (await getDict()).admin.characters;
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <CreateCharacterForm />
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-ui-text-3">{t.empty}</p>}
        {rows.map((c) => (
          <CharacterRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

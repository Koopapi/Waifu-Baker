// Spec 014, RF-19: singular o plural según la cantidad (en inglés y en español basta con «uno» y «otros»).
export const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

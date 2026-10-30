/** Code de verrouillage facultatif : seule son empreinte est gardée, jamais le code lui-même. */
export async function empreinte(code: string): Promise<string> {
  const octets = new TextEncoder().encode(`outil-orga:${code}`);
  const h = await crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

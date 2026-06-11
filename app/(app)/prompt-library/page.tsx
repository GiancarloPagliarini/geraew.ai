import type { ApiPromptSection } from '@/lib/api';
import { PromptLibrary } from '@/components/prompt-library/PromptLibrary';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const revalidate = 300;

async function getSections(): Promise<ApiPromptSection[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/prompts`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: { sections: ApiPromptSection[] } = await res.json();
    return data.sections ?? [];
  } catch {
    return [];
  }
}

export default async function BibliotecaDePromptsPage() {
  const sections = await getSections();
  return <PromptLibrary sections={sections} />;
}

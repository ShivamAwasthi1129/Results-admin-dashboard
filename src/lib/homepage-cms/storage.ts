import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { DEFAULT_HOME_V1 } from './default-home-v1';
import type { HomePageDocument, HomePageStoredState } from './types';

const DIR_NAME = '.homepage-cms';
const FILE_NAME = 'state.json';

function storagePath(): string {
  return path.join(process.cwd(), DIR_NAME, FILE_NAME);
}

function initialState(): HomePageStoredState {
  const draft = JSON.parse(JSON.stringify(DEFAULT_HOME_V1)) as HomePageDocument;
  return {
    draft,
    published: null,
    publishedVersion: 0,
    publishedAt: null,
    versions: [],
  };
}

export async function loadHomePageState(): Promise<HomePageStoredState> {
  const file = storagePath();
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<HomePageStoredState>;
    if (!parsed.draft || typeof parsed.draft !== 'object') {
      return initialState();
    }
    return {
      draft: parsed.draft as HomePageDocument,
      published: (parsed.published as HomePageDocument | null) ?? null,
      publishedVersion: typeof parsed.publishedVersion === 'number' ? parsed.publishedVersion : 0,
      publishedAt: typeof parsed.publishedAt === 'string' ? parsed.publishedAt : null,
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
    };
  } catch {
    return initialState();
  }
}

export async function saveHomePageState(state: HomePageStoredState): Promise<void> {
  const file = storagePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(state, null, 2), 'utf8');
}

export { initialState };

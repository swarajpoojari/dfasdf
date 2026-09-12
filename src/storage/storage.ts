import * as FileSystem from 'expo-file-system';

import { AppError } from '@/utils/errors';

/**
 * A tiny JSON document store on the device filesystem.
 *
 * Posters, drafts and the synced asset manifest all live here, which is what
 * makes the app usable with no connection: everything needed to create and
 * export a poster is on the device already.
 */
const ROOT = 'poster-studio';

function directoryFor(collection: string): FileSystem.Directory {
  return new FileSystem.Directory(FileSystem.Paths.document, ROOT, collection);
}

function fileFor(collection: string, id: string): FileSystem.File {
  return new FileSystem.File(directoryFor(collection), `${id}.json`);
}

async function ensureDirectory(collection: string): Promise<void> {
  const directory = directoryFor(collection);
  if (!directory.exists) directory.create({ intermediates: true });
}

export async function writeDocument<T>(collection: string, id: string, value: T): Promise<void> {
  try {
    await ensureDirectory(collection);
    fileFor(collection, id).write(JSON.stringify(value));
  } catch (cause) {
    throw new AppError('STORAGE_FAILED', 'Your poster could not be saved on this device.', {
      remedy: 'Check that there is free storage space, then try again.',
      cause,
    });
  }
}

export async function readDocument<T>(collection: string, id: string): Promise<T | undefined> {
  try {
    const file = fileFor(collection, id);
    if (!file.exists) return undefined;
    return JSON.parse(file.textSync()) as T;
  } catch {
    // A corrupt file must not take the whole library down with it.
    return undefined;
  }
}

export async function listDocuments<T>(collection: string): Promise<readonly T[]> {
  try {
    const directory = directoryFor(collection);
    if (!directory.exists) return [];

    const results: T[] = [];
    for (const entry of directory.list()) {
      if (!(entry instanceof FileSystem.File) || !entry.name.endsWith('.json')) continue;
      try {
        results.push(JSON.parse(entry.textSync()) as T);
      } catch {
        // Skip the unreadable one and keep the rest of the library working.
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  try {
    const file = fileFor(collection, id);
    if (file.exists) file.delete();
  } catch (cause) {
    throw new AppError('STORAGE_FAILED', 'That poster could not be deleted.', { cause });
  }
}

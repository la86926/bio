import { openDB } from 'idb'
import type { BioLogState } from '../models'

const DB_NAME = 'biolog-db'
const STORE = 'state'
const KEY = 'current'

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE)
    }
  })
}

export async function loadLocalState(): Promise<BioLogState | undefined> {
  return (await db()).get(STORE, KEY)
}

export async function saveLocalState(state: BioLogState): Promise<void> {
  await (await db()).put(STORE, state, KEY)
}

export async function clearLocalState(): Promise<void> {
  await (await db()).delete(STORE, KEY)
}

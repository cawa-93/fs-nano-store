import {readFile, writeFile} from "node:fs/promises";
import {unwatchFile, watchFile} from 'node:fs'
import {EventEmitter} from "node:events";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type TNanoStore = Record<string, Json>

function loadFromFs<TStore extends TNanoStore>(filePath: string): Promise<TStore> {
    return readFile(filePath, {encoding: 'utf8'})
        .then((c: string) => c.trim() ? JSON.parse(c) : ({}))
        .catch((e: unknown) => {
            if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
                return {}
            }

            throw e
        })
}


export async function defineStore<TStore extends TNanoStore>(filePath: string) {
    let _cachedStore: TStore = await loadFromFs<TStore>(filePath)
    const changesEventEmitter = new EventEmitter()

    function reloadStore() {
        return loadFromFs<TStore>(filePath).then(s => {
            _cachedStore = s;
            changesEventEmitter.emit('changed')
        })
    }

    watchFile(filePath, reloadStore)

    function getValue<TKey extends keyof TStore>(key: TKey): TStore[TKey] {
        return _cachedStore[key]
    }

    function setValue<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]) {
        _cachedStore[key] = value
        unwatchFile(filePath, reloadStore)
        return writeFile(filePath, JSON.stringify(_cachedStore), {encoding: 'utf8'})
            .then(() => {
                watchFile(filePath, reloadStore)
            })
    }

    return {
        get: getValue,
        set: setValue,
        changes: changesEventEmitter,
    }
}

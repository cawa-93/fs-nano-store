import {readFile, writeFile} from "node:fs/promises";
import {unwatchFile, watchFile} from 'node:fs'
import {EventEmitter} from "node:events";

function loadFromFs<TStore extends Record<any, any>>(filePath: string): Promise<TStore> {
    return readFile(filePath, {encoding: 'utf8'})
        .then((c: string) => c.trim() ? JSON.parse(c) : ({}))
        .catch((e: unknown) => {
            if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
                return {}
            }

            throw e
        })
}


export async function defineStore<TStore extends Record<any, any>>(filePath: string) {
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

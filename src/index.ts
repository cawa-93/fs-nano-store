import {readFile, writeFile} from "node:fs/promises";

function loadFromFs<TStore>(filePath: string): Promise<TStore> {
    return readFile(filePath, {encoding: 'utf8'})
        .then((c: string) => c.trim() ? JSON.parse(c) : ({}))
        .catch((e: unknown) => {
            if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
                return {}
            }

            throw e
        })
}

function writeToFs<TStore>(filePath: string, data: TStore): Promise<void> {
    return writeFile(filePath, JSON.stringify(data), {encoding: 'utf8'})
}

export function defineStore<TStore extends Record<any, any>>(filePath: string) {
    function getValue<TKey extends keyof TStore>(key: TKey): Promise<TStore[TKey]> {
        return loadFromFs<TStore>(filePath).then(s => s[key])
    }

    function setValue<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]) {
        loadFromFs<TStore>(filePath).then(s => {
            s[key] = value
            return writeToFs<TStore>(filePath, s)
        })
    }

    return {
        get: getValue,
        set: setValue,
    }
}

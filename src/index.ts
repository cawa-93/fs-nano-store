import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { unwatchFile, watchFile, type Stats } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dirname } from 'node:path';

export type TNanoStoreData = Record<string, unknown>;
export type TNanoStore<TStore extends TNanoStoreData> = {
	/** Return value from store by key */
	get<TKey extends keyof TStore>(key: TKey): TStore[TKey];
	/**
	 * Save `value` to store for `key`.
	 * Synchronously stores data to local in-memory storage.
	 * Asynchronously updates storage on the file system.
	 * @param key
	 * @param value
	 * @return Promise that resolves when filesystem changes was successfully applied.
	 */
	set<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]): Promise<void>;
	/**
	 * Emit event `changed` when file in filesystem was changed outside current store instance.
	 */
	changes: EventEmitter;
};

type NanoStoreSerializer = {
	stringify: (data: any) => string;
	parse: (string: string) => any;
};

/**
 * Create persistent in-filesystem storage.
 * @param filePath path to file where all data saved
 * @param serializer custom serializer. Default is global `JSON` object
 */
export async function defineStore<TStore extends TNanoStoreData>(
	filePath: string,
	{
		serializer = JSON,
	}: {
		serializer?: NanoStoreSerializer;
	} = {}
): Promise<TNanoStore<TStore>> {
	function loadFromFs(): Promise<TStore> {
		return readFile(filePath, { encoding: 'utf8' })
			.catch((e: unknown) => {
				if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
					return '';
				}

				throw e;
			})
			.then((c) => (c.trim() ? serializer.parse(c) : {}));
	}

	/** @private */
	let inMemoryCachedStore: TStore = await loadFromFs();

	/** @public */
	const changesEventEmitter = new EventEmitter();

	async function fileChangeHandler(stat: Stats) {
		if (!stat.isFile()) {
			return;
		}

		inMemoryCachedStore = await loadFromFs();
		changesEventEmitter.emit('changed');
	}

	watchFile(filePath, fileChangeHandler);
	function getValue<TKey extends keyof TStore>(key: TKey): TStore[TKey] {
		return inMemoryCachedStore[key];
	}

	/**
	 * Used `structuredClone` for deep cloning
	 * or fallback to `JSON.parse(JSON.stringify)`
	 */
	const deepCopy: <T>(value: T) => T =
		typeof structuredClone === 'function'
			? structuredClone
			: <T>(value: T): T => serializer.parse(serializer.stringify(value));

	async function setValue<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]) {
		// Prohibition of changing potentially unsafe keys
		if (key in Object.prototype) {
			return;
		}

		inMemoryCachedStore[key] = deepCopy(value);
		unwatchFile(filePath, fileChangeHandler);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, serializer.stringify(inMemoryCachedStore), { encoding: 'utf8' });
		watchFile(filePath, fileChangeHandler);
	}

	return {
		get: getValue,
		set: setValue,
		changes: changesEventEmitter,
	};
}

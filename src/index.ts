import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { type Stats, unwatchFile, watchFile } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dirname } from 'node:path';
import { watch } from 'fs';

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

const EVENTS = {
	changed: 'changed',
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
		storeName = '', // TODO: REMOVE THIS
	}: {
		serializer?: NanoStoreSerializer;
		storeName?: string; // TODO: REMOVE THIS
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
		console.log(`[${storeName}] [fileChangeHandler]`, `${filePath} CHANGED`);
		if (!stat.isFile()) {
			return;
		}

		inMemoryCachedStore = await loadFromFs();
		changesEventEmitter.emit(EVENTS.changed);
	}

	changesEventEmitter.addListener('newListener', (eventName: string) => {
		console.log(`[${storeName}] newListener`, { eventName });
		if (eventName === EVENTS.changed && changesEventEmitter.listenerCount(EVENTS.changed) === 0) {
			console.log(`[${storeName}] START WATCH FILE`, filePath);
			watchFile(filePath, { interval: 100 }, fileChangeHandler);
		}
	});

	changesEventEmitter.addListener('removeListener', (eventName: string) => {
		if (eventName === EVENTS.changed && changesEventEmitter.listenerCount(EVENTS.changed) === 0) {
			console.log(`[${storeName}] STOP WATCH FILE`, filePath);
			unwatchFile(filePath, fileChangeHandler);
		}
	});

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

		if (changesEventEmitter.listenerCount(EVENTS.changed) > 0) {
			console.log(`[${storeName}] PAUSE WATCH FILE`, filePath);
			unwatchFile(filePath, fileChangeHandler);
		}

		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, serializer.stringify(inMemoryCachedStore), { encoding: 'utf8' });
		if (changesEventEmitter.listenerCount(EVENTS.changed) > 0) {
			console.log(`[${storeName}] AWAITING BEFORE RESUME`, filePath);
			await new Promise((r) => setTimeout(r, 200));
			console.log(`[${storeName}] RESUME WATCH FILE`, filePath);
			watchFile(filePath, { interval: 100 }, fileChangeHandler);
		}
	}

	return {
		get: getValue,
		set: setValue,
		changes: changesEventEmitter,
	};
}

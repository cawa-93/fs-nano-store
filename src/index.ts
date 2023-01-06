import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { type FSWatcher, watch } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dirname, resolve } from 'node:path';

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

// noinspection JSUnusedGlobalSymbols
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
	let watcher: FSWatcher | null = null;

	// Ensure that the destination directory for the file exists
	// Otherwise, the watcher will fail to start if the `filePath` file does not exist
	await mkdir(dirname(filePath), { recursive: true });

	function startWatcher() {
		if (watcher !== null) {
			return;
		}

		try {
			watcher = watch(filePath, { encoding: 'utf8' }, () => fileChangeHandler());
		} catch (e) {
			if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
				// Fallback to directory watching
				const dir = dirname(filePath);

				watcher = watch(dir, (event, filename) => {
					if (resolve(dir, filename) === filePath) {
						fileChangeHandler();
					}
				});
			} else {
				throw e;
			}
		}
	}

	function stopWatcher() {
		if (watcher === null) {
			return;
		}

		watcher.close();
		watcher = null;
	}

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

	async function fileChangeHandler() {
		// HOTFIX:
		// On Windows watcher may emit multiple events `changed` for single real change
		// To fix it I immediately stop watcher on first event and start it after if some listeners still exist
		stopWatcher();
		inMemoryCachedStore = await loadFromFs();
		changesEventEmitter.emit(EVENTS.changed);
		if (changesEventEmitter.listenerCount(EVENTS.changed) > 0) {
			startWatcher();
		}
	}

	changesEventEmitter.addListener('newListener', (eventName: string) => {
		if (eventName === EVENTS.changed && changesEventEmitter.listenerCount(EVENTS.changed) === 0) {
			startWatcher();
		}
	});

	changesEventEmitter.addListener('removeListener', (eventName: string) => {
		if (eventName === EVENTS.changed && changesEventEmitter.listenerCount(EVENTS.changed) === 0) {
			stopWatcher();
		}
	});

	/**
	 * Used `structuredClone` for deep cloning
	 * or fallback to `JSON.parse(JSON.stringify)`
	 */
	const deepCopy: <T>(value: T) => T =
		typeof structuredClone === 'function'
			? structuredClone
			: <T>(value: T): T => serializer.parse(serializer.stringify(value));

	function getValue<TKey extends keyof TStore>(key: TKey): TStore[TKey] {
		if (!Object.prototype.hasOwnProperty.call(inMemoryCachedStore, key)) return undefined as any;
		const value = inMemoryCachedStore[key];
		return typeof value === 'object' ? deepCopy(value) : value;
	}

	async function setValue<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]) {
		// Prohibition of changing potentially unsafe keys
		if (key in Object.prototype) {
			return;
		}

		inMemoryCachedStore[key] = typeof value === 'object' ? (Object.freeze(deepCopy(value)) as TStore[TKey]) : value;

		if (changesEventEmitter.listenerCount(EVENTS.changed) > 0) {
			stopWatcher();
		}
		await writeFile(filePath, serializer.stringify(inMemoryCachedStore), { encoding: 'utf8' });
		if (changesEventEmitter.listenerCount(EVENTS.changed) > 0) {
			startWatcher();
		}
	}

	return {
		get: getValue,
		set: setValue,
		changes: changesEventEmitter,
	};
}

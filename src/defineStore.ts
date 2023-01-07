import type { NanoStoreData } from './NanoStoreData';
import type { NanoStoreSerializer } from './nanoStoreSerializer';
import type { NanoStore } from './NanoStore';
import { readFile, writeFile } from 'node:fs/promises';
import { createWatcher } from './createWatcher';

/**
 * Create persistent in-filesystem storage.
 * @param filePath path to file where all data saved
 * @param serializer custom serializer. Default is global `JSON` object
 */
export async function defineStore<TStore extends NanoStoreData>(
	filePath: string,
	{
		serializer = JSON,
	}: {
		serializer?: NanoStoreSerializer;
	} = {}
): Promise<NanoStore<TStore>> {
	const {
		start: startWatcher,
		stop: stopWatcher,
		emitter,
	} = await createWatcher(filePath, () => loadFromFs().then((d) => (inMemoryCachedStore = d)));

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

	/**
	 * Used `structuredClone` for deep cloning
	 * or fallback to `JSON.parse(JSON.stringify)`
	 */
	const deepCopy: <T>(value: T) => T =
		typeof structuredClone === 'function'
			? structuredClone
			: <T>(value: T): T => serializer.parse(serializer.stringify(value));

	const deepCopyIfObject = <T>(value: T): T => (typeof value === 'object' ? deepCopy(value) : value);

	function getValue<TKey extends keyof TStore>(key: TKey): TStore[TKey] {
		return Object.prototype.hasOwnProperty.call(inMemoryCachedStore, key)
			? deepCopyIfObject(inMemoryCachedStore[key])
			: (undefined as never);
	}

	async function setValue<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]) {
		// Prohibition of changing potentially unsafe keys
		if (key in Object.prototype) {
			return;
		}

		inMemoryCachedStore[key] = deepCopyIfObject(value);

		stopWatcher();
		await writeFile(filePath, serializer.stringify(inMemoryCachedStore), { encoding: 'utf8' });
		startWatcher();
	}

	return {
		get: getValue,
		set: setValue,
		changes: emitter,
	};
}

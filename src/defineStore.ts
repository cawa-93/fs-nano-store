import type { NanoStoreData } from './NanoStoreData';
import type { NanoStoreSerializer } from './NanoStoreSerializer';
import type { NanoStore } from './NanoStore';
import { readFile, writeFile } from 'node:fs/promises';
import { createWatcher } from './createWatcher';

interface TypedMap<T extends NanoStoreData> extends Map<keyof T, T[keyof T]> {
	set<K extends keyof T, V extends T[K]>(key: K, value: V): this;

	get<K extends keyof T>(key: K): T[K];

	delete<K extends keyof T>(key: K): boolean;

	has<K extends keyof T>(key: K): boolean;
}

/**
 * @private
 */
function _storeParse<T extends NanoStoreData>(str: string, parseValue: NanoStoreSerializer['parse']) {
	return new Map((JSON.parse(str) as [string, string][]).map(([k, v]) => [k, parseValue(v)])) as TypedMap<T>;
}

/**
 * @private
 */
function _storeStringify(store: Map<any, any>, stringifyValue: NanoStoreSerializer['stringify']) {
	return JSON.stringify(Array.from(store.entries()).map(([k, v]) => [k, stringifyValue(v)]));
}

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

	function loadFromFs(): Promise<TypedMap<TStore>> {
		return readFile(filePath, { encoding: 'utf8' })
			.catch((e: unknown) => {
				if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
					return '';
				}

				throw e;
			})
			.then((c) => {
				if (!c.trim()) {
					return new Map() as TypedMap<TStore>;
				}

				/**
				 * Migration for v0.2 data to v0.3 data structure
				 */
				c = c.trim().startsWith('{')
					? JSON.stringify(
							Object.entries(serializer.parse(c.trim())).map(([k, v]) => [k, serializer.stringify(v)])
					  )
					: c.trim();

				return _storeParse(c, serializer.parse);
			});
	}

	/** @private */
	let inMemoryCachedStore = await loadFromFs();

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
		return deepCopyIfObject(inMemoryCachedStore.get(key));
	}

	async function setValue<TKey extends keyof TStore>(key: TKey, value: TStore[TKey]) {
		inMemoryCachedStore.set(key, deepCopyIfObject(value));

		stopWatcher();
		await writeFile(filePath, _storeStringify(inMemoryCachedStore, serializer.stringify), { encoding: 'utf8' });
		startWatcher();
	}

	return {
		get: getValue,
		set: setValue,
		changes: emitter,
	};
}

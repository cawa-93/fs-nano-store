import { NanoStoreData } from './NanoStoreData';
import { EventEmitter } from 'node:events';

export type NanoStore<TStore extends NanoStoreData> = {
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

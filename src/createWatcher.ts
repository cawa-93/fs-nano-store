import { FSWatcher, watch } from 'node:fs';
import { EventEmitter } from 'node:events';
import { EVENTS } from './events';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

/** @private */
export async function createWatcher(filePath: string, handler: () => Promise<any> | any) {
	let watcher: FSWatcher | null = null;

	/** @public */
	const emitter = new EventEmitter();

	const hasListeners = () => emitter.listenerCount(EVENTS.changed) > 0;

	async function fileChangeListener() {
		// HOTFIX:
		// On Windows watcher may emit multiple events `changed` for single real change
		// To fix it I immediately stop watcher on first event and start it after if some listeners still exist
		stop();
		await handler();
		emitter.emit(EVENTS.changed);
		startIfHasListeners();
	}

	/** @private */
	function start() {
		// Prevents the watcher from accidentally being left before create new one
		if (watcher !== null) {
			watcher.close();
		}

		try {
			watcher = watch(filePath, { encoding: 'utf8' }, fileChangeListener);
		} catch (e) {
			if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
				// Fallback to directory watching
				const dir = dirname(filePath);

				watcher = watch(dir, (event, filename) => {
					if (resolve(dir, filename) === filePath) {
						fileChangeListener();
					}
				});
			} else {
				throw e;
			}
		}
	}

	function startIfHasListeners() {
		// If watcher already started
		if (watcher !== null) {
			return;
		}

		// If no listeners for file changes
		if (!hasListeners()) {
			return;
		}

		start();
	}

	function stop() {
		if (watcher === null) {
			return;
		}

		watcher.close();
		watcher = null;
	}

	// Ensure that the destination directory for the file exists
	// Otherwise, the watcher will fail to start if the `filePath` file does not exist
	await mkdir(dirname(filePath), { recursive: true });

	emitter.addListener('removeListener', (eventName: string) => {
		if (eventName === EVENTS.changed && !hasListeners()) {
			stop();
		}
	});

	emitter.addListener('newListener', (eventName: string) => {
		// `newListener` event emits BEFORE listener will be added.
		// So at this point you will not have listeners if it was first one, but still should start watcher
		if (eventName === EVENTS.changed && !hasListeners()) {
			start();
		}
	});

	return {
		start: startIfHasListeners,
		stop,
		emitter,
	};
}

import tap from 'tap';
import * as fs from 'fs';
import * as os from 'os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { defineStore } from '../dist/index.cjs';

const storePath = path.resolve(os.tmpdir(), 'fs-nano-store', `index.spec.${Date.now()}.json`);
tap.afterEach(() => {
	try {
		fs.unlinkSync(storePath);
	} catch (e) {
		if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
			return;
		}

		throw e;
	}
});

await tap.test('Should fail if no path', (t) =>
	t.rejects(
		() => defineStore(),
		{
			name: 'TypeError',
			code: 'ERR_INVALID_ARG_TYPE',
		},
		{ todo: false }
	)
);

await tap.test('Should return correct signature', async (t) => {
	const store = await defineStore(storePath);

	t.hasOwnProp(store, 'get');
	t.type(store.get, 'function');

	t.hasOwnProp(store, 'set');
	t.type(store.set, 'function');

	t.hasOwnProp(store, 'changes');
	t.type(store.changes, EventEmitter);
});

await tap.test('Should save value', async (t) => {
	const store = await defineStore(storePath);

	t.equal(undefined, store.get('val'));

	const randomStr = Date.now().toString(10);
	await t.resolves(store.set('val', randomStr));
	t.equal(randomStr, store.get('val'));
});

await tap.test('Should emit `changed` event', async (t) => {
	const store1 = await defineStore(storePath, { storeName: 'store1' });
	const store2 = await defineStore(storePath, { storeName: 'store2' });

	let store1Calls = 0;
	let store2Calls = 0;
	store1.changes.addListener('changed', () => store1Calls++);
	store2.changes.addListener('changed', () => store2Calls++);

	await store1.set('foo', `in-store-${Date.now()}`);
	await new Promise((r) => setTimeout(r, 4000));
	t.equal(store1Calls, 0);
	t.equal(store2Calls, 1);

	await store1.set('foo', `in-store-${Date.now()}`);
	await new Promise((r) => setTimeout(r, 4000));
	t.equal(store1Calls, 0);
	t.equal(store2Calls, 2);

	await store2.set('foo', `in-store-${Date.now()}`);
	await new Promise((r) => setTimeout(r, 4000));
	t.equal(store1Calls, 1);
	t.equal(store2Calls, 2);

	await store2.set('foo', `in-store-${Date.now()}`);
	await new Promise((r) => setTimeout(r, 4000));
	t.equal(store1Calls, 2);
	t.equal(store2Calls, 2);

	store1.changes.removeAllListeners('changed');
	store2.changes.removeAllListeners('changed');
});

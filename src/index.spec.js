import tap from 'tap';
import * as fs from 'fs';
import * as os from 'os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { defineStore } from '../dist/index.cjs';
import { readFileSync } from 'fs';

const getRandomString = () => btoa(Math.random().toString()).substring(10, 15);

const storePath = path.resolve(os.tmpdir(), 'fs-nano-store', `index.spec.${Date.now()}-${getRandomString()}.json`);
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

	const key = getRandomString();
	const value = getRandomString();

	t.equal(store.get(key), undefined);
	await t.resolves(store.set(key, value));
	t.equal(store.get(key), value);
});

await tap.test('Should save state to the file system', async (t) => {
	const store = await defineStore(storePath);

	const key = getRandomString();
	const value = getRandomString();

	await t.resolves(store.set(key, value));

	const content = readFileSync(storePath, { encoding: 'utf8' });
	t.strictSame(JSON.parse(content), { [key]: value });
});

await tap.test('Should NOT save value', async (t) => {
	const store = await defineStore(storePath);

	async function checkProp(prop) {
		t.equal(store.get(prop), undefined, `${prop} initially should be undefined`);
		await t.resolves(store.set(prop, Date.now()));
		t.equal(store.get(prop), undefined, `${prop} should stay be undefined`);
	}

	const blacklist = [
		'__proto__',
		'constructor',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'toLocaleString',
		'toString',
		'valueOf',
	];

	for (const prototypeKey of blacklist) {
		await checkProp(prototypeKey);
	}
});

await tap.test('Should emit `changed` event', async (t) => {
	const store1 = await defineStore(storePath, { storeName: 'store1' });
	const store2 = await defineStore(storePath, { storeName: 'store2' });

	let store1Calls = 0;
	let store2Calls = 0;
	store1.changes.addListener('changed', () => store1Calls++);
	store2.changes.addListener('changed', () => store2Calls++);

	function nextTick() {
		return new Promise((r) => setTimeout(r, 500));
	}

	const key = getRandomString();

	await store1.set(key, `store1-${getRandomString()}`);
	await nextTick();
	t.equal(store1Calls, 0);
	t.equal(store2Calls, 1);

	await store1.set(key, `store1-${getRandomString()}`);
	await nextTick();
	t.equal(store1Calls, 0);
	t.equal(store2Calls, 2);

	await store2.set(key, `store2-${getRandomString()}`);
	await nextTick();
	t.equal(store1Calls, 1);
	t.equal(store2Calls, 2);

	await store2.set(key, `store2-${getRandomString()}`);
	await nextTick();
	t.equal(store1Calls, 2);
	t.equal(store2Calls, 2);

	store1.changes.removeAllListeners('changed');
	store2.changes.removeAllListeners('changed');
});

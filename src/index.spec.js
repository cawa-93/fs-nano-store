import tap from 'tap';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { defineStore } from '../dist/index.cjs'; // Must import CJS module since node-tap doesn't track changes in ESM module in --watch mode
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const randomString = () => randomBytes(4).toString('hex');

const testsTmpDir = resolve(tmpdir(), 'fs-nano-store');
const storePath = () => resolve(testsTmpDir, 'tests', 'index', `${Date.now()}-${randomString()}.json`);
tap.afterEach(() => {
	try {
		rmSync(testsTmpDir, { recursive: true, force: true });
	} catch (e) {
		if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
			return;
		}

		throw e;
	}
});

await tap.test('Should fail if no path', (t) =>
	t.rejects(() => defineStore(), {
		name: 'TypeError',
		code: 'ERR_INVALID_ARG_TYPE',
	})
);

await tap.test('Should fail if invalid path', (t) =>
	t.rejects(() => defineStore(resolve(testsTmpDir, '\0>|[]')), {
		name: 'TypeError',
		code: 'ERR_INVALID_ARG_VALUE',
	})
);

await tap.test('Should return correct signature', async (t) => {
	const store = await defineStore(storePath());

	t.hasOwnProp(store, 'get');
	t.type(store.get, 'function');

	t.hasOwnProp(store, 'set');
	t.type(store.set, 'function');

	t.hasOwnProp(store, 'changes');
	t.type(store.changes, EventEmitter);
});

await tap.only('Should pick up initial value from v0.2', async (t) => {
	const data = {
		[randomString()]: randomString(),
		[randomString()]: [randomString(), randomString()],
		[randomString()]: { [randomString()]: randomString() },
	};

	const s = storePath();

	mkdirSync(dirname(s), { recursive: true });
	writeFileSync(s, JSON.stringify(data), { encoding: 'utf8' });

	const store = await defineStore(s);
	for (const key in data) {
		t.strictSame(store.get(key), data[key]);
	}

	const newVal = randomString();
	const key = Object.keys(data)[0];
	console.log(data[key], newVal);
	await t.resolves(store.set(key, newVal));
	t.strictSame(store.get(key), newVal);

	const content = readFileSync(s, { encoding: 'utf8' });
	t.strictSame(
		JSON.parse(content),
		Object.entries(data).map(([k, v]) => [k, JSON.stringify(key === k ? newVal : v)])
	);
});

await tap.only('Should pick up initial value', async (t) => {
	const data = new Map([
		[randomString(), randomString()],
		[randomString(), { [randomString()]: randomString() }],
		[randomString(), [randomString(), randomString()]],
	]);

	const s = storePath();

	mkdirSync(dirname(s), { recursive: true });
	writeFileSync(s, JSON.stringify(Array.from(data).map(([k, v]) => [k, JSON.stringify(v)])), { encoding: 'utf8' });

	const store = await defineStore(s);
	for (const [key, value] of data) {
		t.strictSame(store.get(key), value);
	}
});

await tap.test('Should save value', async (t) => {
	const store = await defineStore(storePath());

	const key = randomString();
	const value = randomString();

	t.equal(store.get(key), undefined);
	await t.resolves(store.set(key, value));
	t.equal(store.get(key), value);
});

await tap.test('Value in store should be immutable', async (t) => {
	const store = await defineStore(storePath());

	const storeKey = randomString();
	const objKey = randomString();
	const objInitialValue = randomString();
	const obj = { [objKey]: objInitialValue };

	await store.set(storeKey, obj);

	t.not(store.get(storeKey), obj, 'Object in store should not be === with initial object');
	obj[objKey] = randomString();
	t.equal(
		store.get(storeKey)[objKey],
		objInitialValue,
		'Value in store should not be changed if original object was changed'
	);

	const loadedObj = store.get(storeKey);
	t.not(store.get(storeKey), loadedObj, 'Object in store should not be === with loaded from store object');
	loadedObj[objKey] = randomString();
	t.equal(
		store.get(storeKey)[objKey],
		objInitialValue,
		'Value in store should not be changed if loaded object was changed'
	);
});

await tap.test('Should save state to the file system', async (t) => {
	const s = storePath();
	const store = await defineStore(s);

	const data = new Map([
		[randomString(), randomString()],
		[randomString(), { [randomString()]: randomString() }],
		[randomString(), [randomString(), randomString()]],
	]);

	for (const [key, value] of data) {
		await t.resolves(store.set(key, value));
	}

	const content = readFileSync(s, { encoding: 'utf8' });
	t.strictSame(
		JSON.parse(content),
		Array.from(data).map(([k, v]) => [k, JSON.stringify(v)])
	);
});

await tap.test('Should share state across stores', async (t) => {
	const s = storePath();
	const store1 = await defineStore(s);
	const store2 = await defineStore(s);

	async function testStore(storeToChange, storeToListen) {
		const key = randomString();
		const value = randomString();

		// Need to add event listener before make changes to fs
		// noinspection JSVoidFunctionReturnValueUsed
		const promise = t.emits(storeToListen.changes, 'changed');
		storeToChange.set(key, value);

		await promise;
		t.equal(storeToListen.get(key), value);
	}

	await testStore(store1, store2);
	await testStore(store2, store1);
});

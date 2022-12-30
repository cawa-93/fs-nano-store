import tap from 'tap';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { defineStore } from '../dist/index.js'; // Must import CJS module since node-tap doesn't track changes in ESM module in --watch mode
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const randomString = () => randomBytes(4).toString('hex');

const storePath = resolve(tmpdir(), 'fs-nano-store', `index.spec.${Date.now()}-${randomString()}.json`);
tap.afterEach(() => {
	try {
		unlinkSync(storePath);
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
	t.rejects(() => defineStore(resolve(tmpdir(), 'fs-nano-store', '\0>|[]')), {
		name: 'TypeError',
		code: 'ERR_INVALID_ARG_VALUE',
	})
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

await tap.test('Should pick up initial value', async (t) => {
	const key = randomString();
	const value = randomString();

	writeFileSync(storePath, JSON.stringify({ [key]: value }), { encoding: 'utf8' });

	const store = await defineStore(storePath);
	t.equal(store.get(key), value);
});

await tap.test('Should save value', async (t) => {
	const store = await defineStore(storePath);

	const key = randomString();
	const value = randomString();

	t.equal(store.get(key), undefined);
	await t.resolves(store.set(key, value));
	t.equal(store.get(key), value);
});

await tap.test('Should save state to the file system', async (t) => {
	const store = await defineStore(storePath);

	const key = randomString();
	const value = randomString();

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

await tap.test('Should share state across stores', async (t) => {
	const store1 = await defineStore(storePath);
	const store2 = await defineStore(storePath);

	async function testStore(storeToChange, storeToListen) {
		const key = randomString();
		const value = randomString();
		storeToChange.set(key, value);
		await t.emits(storeToListen.changes, 'changed');
		t.equal(storeToListen.get(key), value);
	}

	await testStore(store1, store2);
	await testStore(store2, store1);
});

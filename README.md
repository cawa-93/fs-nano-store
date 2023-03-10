[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner-direct-single.svg)](https://stand-with-ukraine.pp.ua)

---

# Nano filesystem storage

<a href="https://www.buymeacoffee.com/kozack" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" height="60" alt="Buy Me A Coffee"></a>

A minimalistic, secure, type-safe, zero-dependencies, persistent data store.

> **Note**
> If you want safely use it in electron app look at **[electron-nano-store](https://github.com/cawa-93/electron-nano-store)**

## Usage

```ts
import { defineStore } from "fs-nano-store";

/**
 * Declare types for you storage
 */
type Store = {
	name: string,
	role: 'admin' | 'user'
}

const { get, set, changes } = await defineStore<Store>('/path/to/storage-file.json')

get('name') // undefined
set('name', 'Alex')
get('name') // Alex

// Store is Type-safe
// TS Error: Argument of type '"wrong-role"' is not assignable to parameter of type '"admin" | "user"'.
set('role', 'wrong-role')

// fs-nano-store automatically tracks any storage-file.json changes.
// Additionally, you can addListener on the `changed` event that emits
// if the store file has been modified somehow outside defined store methods.
changes.addListener('changed', () => {
})
```

> **Note**
> 
> Objects in store are immutable and will be deeply cloned on each `get`/`set`. 
> ```ts
> const obj = {}
> store.set('obj', obj)
> store.get('obj') === obj // false
> store.get('obj') === store.get('obj') // false
> store.get('obj').bar = 'baz' // will no have effect
> obj.bar = 'baz' // will not affected to stored data


### Custom serializer

By default, all data is serialized in JSON using global `JSON`.
So if you want to store more complex data types like `Date` or `Map`, or want to have custom `stringify`/`parse` logic,
you need to use your own serializer that supports those data types. Example with [superjson](https://github.com/blitz-js/superjson):

```ts
import { defineStore } from 'fs-nano-store'
import superjson from 'superjson';

type Store = {
	date: Date,
}

const store = defineStore<Store>('store-file.json', {
	serializer: superjson
})

store.set('date', new Date)
store.get('date') // Date object
```

## Migrating from v0.2.x to v0.3.x
In https://github.com/cawa-93/fs-nano-store/commit/bd2dfb50c92eadae68f6a12e406acf6daacd05f7 Was changed how exactly data saving to filesystem. Old store files are incompatible.
You may need manually convert old data to new format by command:
```js
const newDataStr = JSON.stringify(
  Object.entries(serializer.parse(oldDataStr))
  .map(([k,v]) => [k,serializer.stringify(v)])  
) 
```

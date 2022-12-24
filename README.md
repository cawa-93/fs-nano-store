[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner-direct-single.svg)](https://stand-with-ukraine.pp.ua)

---

# Nano filesystem storage
<a href="https://www.buymeacoffee.com/kozack" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" height="60" alt="Buy Me A Coffee"></a>

A minimalistic, secure, type-safe, zero-dependencies, persistent data store.

## Usage

```ts
import {defineStore} from "fs-nano-store";

/**
 * Declare types for you storage
 */
type Store = {
    name: string,
    role: 'admin' | 'user'
}

/**
 * Create storage
 */
const {get, set, changes} = await defineStore<Store>('/path/to/storage-file.json')

get('name') // undefined
set('name', 'Alex')
get('name') // Alex


// TS Error: Argument of type '"wrong-role"' is not assignable to parameter of type '"admin" | "user"'.
set('role', 'wrong-role')


// fs-nano-store automatically tracks any storage-file.json changes.
// Additionally, you can addListener on the `changed` event that emits
// if the store file has been modified somehow outside defined store methods.
changes.addListener('changed', () => {})
```

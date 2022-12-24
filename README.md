[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner-direct-single.svg)](https://stand-with-ukraine.pp.ua)

---

# Nano filesystem storage
<a href="https://www.buymeacoffee.com/kozack" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" style="height: 60px !important;" ></a>

A simple, super minimalistic data store on a file system with zero dependencies and TypeScript support.

## Usage

```ts
import {defineStore} from "fs-nano-store";

/**
 * Declare types for you storage
 */
interface Store {
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

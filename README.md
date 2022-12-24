# Nano filesystem storage
A simple, super minimalistic data store on a file system with zero dependencies and TypeScript support.

## Usage

```ts
import {defineStore} from "fs-nano-store";

/**
 * Declar types for you storage
 */
interface Store {
    name: string,
    role: 'admin' | 'user'
}

/**
 * Create storage
 */
const {get, set} = defineStore<Store>('/path/to/storage-file.json')

await get('name')
await set('role', 'wrong-role') // Error: Argument of type '"wrong-role"' is not assignable to parameter of type '"admin" | "user"'.
```

export type NanoStoreSerializer = {
	stringify: (data: any) => string;
	parse: (string: string) => any;
};

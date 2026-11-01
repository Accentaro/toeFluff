// Compact shapes passed to the keys page client. Short field names keep the inlined payload small.

/** One screenshot: image, screen label, focus box [x, y, w, h] when it covers under half the image, description, caption note. */
export type Shot = { i: string; s: string; f?: [number, number, number, number]; d?: string; n?: string }

export type SemanticItem = {
	k: string
	a?: string
	d?: string
	/** Defaults on Ash, Dark, Light, Onyx. */
	v: string[]
	/** Raw key per base, same order. */
	r: string[]
	sh?: Shot[]
}

export type RawItem = {
	k: string
	d?: string
	v: string
	/** Semantic keys that point at it (first few) and how many there are. */
	u: string[]
	un: number
	sh?: Shot[]
}

export const BASE_NAMES = ['Ash', 'Dark', 'Light', 'Onyx']

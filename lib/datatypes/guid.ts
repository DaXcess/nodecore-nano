// Very shitty implementation of a Guid but it works ¯\_(ツ)_/¯

export class Guid {
    public static EMPTY: Guid = new Guid(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    private _a: number;
    private _b: number;
    private _c: number;
    private _d: number;
    private _e: number;
    private _f: number;
    private _g: number;
    private _h: number;
    private _i: number;
    private _j: number;
    private _k: number;
    private _l: number;
    private _m: number;
    private _n: number;
    private _o: number;
    private _p: number;

    constructor(a?: number, b?: number, c?: number, d?: number, e?: number, f?: number, g?: number, h?: number, i?: number, j?: number, k?: number, l?: number, m?: number, n?: number, o?: number, p?: number) {
        this._a = d ?? 0;
        this._b = c ?? 0;
        this._c = b ?? 0;
        this._d = a ?? 0;
        this._e = f ?? 0;
        this._f = e ?? 0;
        this._g = h ?? 0;
        this._h = g ?? 0;
        this._i = i ?? 0;
        this._j = j ?? 0;
        this._k = k ?? 0;
        this._l = l ?? 0;
        this._m = m ?? 0;
        this._n = n ?? 0;
        this._o = o ?? 0;
        this._p = p ?? 0;
    }
    
    public static from(guid: string): Guid {
        const formatted = guid.replace(/[^A-Fa-f0-9]/g, '');

        if (formatted.length !== 32) {
            throw new Error("Malformed GUID");
        }

        const arr = hexToBytes(formatted);
        
        return new Guid(arr[3], arr[2], arr[1], arr[0], arr[5], arr[4], arr[7], arr[6], arr[8], arr[9], arr[10], arr[11], arr[12], arr[13], arr[14], arr[15]);
    }

    public toBuffer(): Buffer {
        return Buffer.from([this._d, this._c, this._b, this._a, this._f, this._e, this._h, this._g, this._i, this._j, this._k, this._l, this._m, this._n, this._o, this._p]);
    }

    public toString(): string {
        return `${h2s(this._a)}${h2s(this._b)}${h2s(this._c)}${h2s(this._d)}-${h2s(this._e)}${h2s(this._f)}-${h2s(this._g)}${h2s(this._h)}-${h2s(this._i)}${h2s(this._j)}-${h2s(this._k)}${h2s(this._l)}${h2s(this._m)}${h2s(this._n)}${h2s(this._o)}${h2s(this._p)}`;
    }
}

function h2s(num: number): string {
    return ('00' + num.toString(16)).substr(-2);
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}
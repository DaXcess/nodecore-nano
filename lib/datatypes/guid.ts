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
        this._a = a ?? 0;
        this._b = b ?? 0;
        this._c = c ?? 0;
        this._d = d ?? 0;
        this._e = e ?? 0;
        this._f = f ?? 0;
        this._g = g ?? 0;
        this._h = h ?? 0;
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
        return Buffer.from([this._a, this._b, this._c, this._d, this._e, this._f, this._g, this._h, this._i, this._j, this._k, this._l, this._m, this._n, this._o, this._p]);
    }

    public toString(): string {
        return `${this._a.toString(16)}${this._b.toString(16)}${this._c.toString(16)}${this._d.toString(16)}-${this._e.toString(16)}${this._f.toString(16)}-${this._g.toString(16)}${this._h.toString(16)}-${this._i.toString(16)}${this._j.toString(16)}-${this._k.toString(16)}${this._l.toString(16)}${this._m.toString(16)}${this._n.toString(16)}${this._o.toString(16)}${this._p.toString(16)}`;
    }
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}
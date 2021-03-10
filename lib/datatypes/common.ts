import Guid from "./guid";

export class Payload {
    public type: string;
    public value: any;

    constructor(type: string, value: any) {
        this.type = type;
        this.value = value;
    }
}

export class byte extends Payload {
    constructor(value: number) {
        super('byte', value);
    }
}

export class char extends Payload {
    constructor(value: number | string) {
        if (typeof value === 'number') {
            super('char', value);
        } else {
            super('char', value[0].charCodeAt(0));
        }
    }
}

export class decimal extends Payload {
    constructor(value: number) {
        super('decimal', value);
    }
}

export class double extends Payload {
    constructor(value: number) {
        super('double', value);
    }
}

export class int32 extends Payload {
    constructor(value: number) {
        super('int', value);
    }
}

export class int64 extends Payload {
    constructor(value: number) {
        super('long', value);
    }
}

export class sbyte extends Payload {
    constructor(value: number) {
        super('sbyte', value);
    }
}

export class int16 extends Payload {
    constructor(value: number) {
        super('short', value);
    }
}

export class float extends Payload {
    constructor(value: number) {
        super('decimal', value);
    }
}

export class uint32 extends Payload {
    constructor(value: number) {
        super('uint', value);
    }
}

export class uint64 extends Payload {
    constructor(value: number) {
        super('ulong', value);
    }
}

export class uint16 extends Payload {
    constructor(value: number) {
        super('ushort', value);
    }
}

export class PGuid extends Payload {
    constructor(value: Guid) {
        super('Guid', value);
    }
}

export class PDateTime extends Payload {
    constructor(value: Date) {
        super('DateTime', value);
    }
}

export type EPayloadLike = Payload | Payload[] | string | string[] | boolean;
export type DPayloadLike = string | string[] | boolean | number | Uint8Array | BigInt | Date | Guid;
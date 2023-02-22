import { Guid } from "./guid";

export class Payload<T> {
  public value: T;

  constructor(value: T) {
    this.value = value;
  }
}

export class byte extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class char extends Payload<number> {
  constructor(value: number | string) {
    if (typeof value === "number") {
      super(value);
    } else {
      super(value[0].charCodeAt(0));
    }
  }
}

export class decimal extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class double extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class int32 extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class int64 extends Payload<number | BigInt> {
  constructor(value: number | BigInt) {
    super(value);
  }
}

export class sbyte extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class int16 extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class float extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class uint32 extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class uint64 extends Payload<number | BigInt> {
  constructor(value: number | BigInt) {
    super(value);
  }
}

export class uint16 extends Payload<number> {
  constructor(value: number) {
    super(value);
  }
}

export class PGuid extends Payload<Guid> {
  constructor(value: Guid) {
    super(value);
  }
}

export class PDateTime extends Payload<Date> {
  constructor(value: Date) {
    super(value);
  }
}

export type PayloadLike = Payload<any> | Payload<any>[] | string | string[] | boolean;

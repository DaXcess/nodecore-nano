import crypto from "crypto";
import zlib from "zlib";

import { BinaryWriter, BinaryReader } from "../binary";
import {
  byte,
  char,
  PayloadLike,
  double,
  int32,
  int64,
  sbyte,
  int16,
  float,
  uint32,
  uint64,
  uint16,
  PDateTime,
  PGuid,
} from "../datatypes/common";
import { Guid } from "../datatypes";

const TYPES: { [key: string]: number } = {
  byte: 1,
  "byte[]": 2,
  char: 3,
  "char[]": 4,
  decimal: 5,
  double: 6,
  int: 7,
  int32: 7,
  long: 8,
  int64: 8,
  sbyte: 9,
  short: 10,
  int16: 10,
  float: 11,
  uint: 13,
  uint32: 13,
  ulong: 14,
  uint64: 14,
  ushort: 15,
  uint16: 15,
  DateTime: 16,
  PDateTime: 16,
  "string[]": 17,
  Guid: 18,
  PGuid: 18,
  Size: 19,
  Rectangle: 20,
  Version: 21,
};

export function encrypt(
  compress: boolean,
  command: number,
  byte: number,
  guid: Guid,
  payload: PayloadLike[] | undefined,
  passphrase: Buffer
): Buffer {
  const writer = new BinaryWriter();

  writer.writeBoolean(compress);
  writer.writeByte(command);
  writer.writeByte(byte);

  if (guid == Guid.EMPTY) {
    writer.writeBoolean(false);
  } else {
    writer.writeBoolean(true);
    writer.writeBytes(guid.toBuffer());
  }

  if (payload) {
    for (const _data of payload) {
      if (Array.isArray(_data) && _data.length < 1) continue;

      let dataType: number;
      let dataValue: any;

      if (_data instanceof Uint8Array) {
        dataType = TYPES["byte[]"];
        dataValue = _data;
      } else if (Array.isArray(_data)) {
        dataType = typeof _data[0] === "string" ? 17 : TYPES[`${_data[0].constructor.name}[]`];
        dataValue = _data;
      } else {
        dataType = typeof _data === "string" ? 12 : typeof _data === "boolean" ? 0 : TYPES[_data.constructor.name];
        dataValue = typeof _data === "string" || typeof _data === "boolean" ? _data : _data.value;
      }

      if (dataType === undefined) {
        throw new TypeError("Unknown dataType inside payload");
      }

      writer.writeByte(dataType);

      switch (dataType) {
        case 0:
          writer.writeBoolean(dataValue);
          break;

        case 2:
          {
            const data: Uint8Array = dataValue as Uint8Array;
            writer.writeInt32(data.length);
            writer.writeBytes(Buffer.from(data));
          }
          break;

        case 3:
          {
            const data: number = dataValue;
            writer.writeStringUnicode(String.fromCharCode(data));
          }
          break;

        case 4:
          {
            const data: char[] = dataValue as char[];
            writer.writeStringPrefixedUtf8(data.map((v) => String.fromCharCode(v.value)).join(""));
          }
          break;

        case 5:
          {
            // Not implemented
          }
          break;

        case 6:
          {
            const data: number = dataValue;
            writer.writeDouble(data);
          }
          break;

        case 13:
        case 7:
          {
            const data: number = dataValue;
            writer.writeInt32(data);
          }
          break;

        // Int64
        case 8:
          {
            const data: bigint = dataValue;
            writer.writeInt64(data);
          }
          break;

        case 1:
        case 9:
          {
            const data: number = dataValue;
            writer.writeByte(data);
          }
          break;

        case 15:
        case 10:
          {
            const data: number = dataValue;
            writer.writeInt16(data);
          }
          break;

        case 11:
          {
            const data: number = dataValue;
            writer.writeFloat(data);
          }
          break;

        case 12:
          {
            const data: string = dataValue as string;
            writer.writeStringPrefixedUtf8(data);
          }
          break;

        case 16:
          {
            // A very hacky way to convert ms to ticks

            // Allocate 8 byte buffer
            const dateBuffer: Buffer = Buffer.alloc(8);
            const data: Date = dataValue as Date;

            // Get ms and convert to Ticks
            const ticks: bigint = BigInt(data.getTime()) * 10000n + 621355968000000000n;

            // Write 8 byte-long tick value to buffer
            dateBuffer.writeBigInt64LE(ticks);

            // Calculate and write DateKind (first 2 bits in 64bit number)
            // Calculate last byte missing bits (there must be 8)
            let missingBits = 6 - dateBuffer[7].toString(2).length;

            // Bits should start with 10xxxxxx, fill the rest with zeroes
            const appendBits = "10" + new Array(missingBits).fill("0").join("");

            // Write new byte back to buffer
            dateBuffer[7] = parseInt(appendBits + dateBuffer[7].toString(2), 2);

            writer.writeBytes(dateBuffer);
          }
          break;

        case 17:
          {
            const data: string[] = dataValue as string[];
            writer.writeInt32(data.length);
            for (const str of data) {
              writer.writeStringPrefixedUtf8(str);
            }
          }
          break;

        case 18:
          {
            const data: Guid = dataValue as Guid;
            writer.writeBytes(data.toBuffer());
          }
          break;
      }
    }
  }

  let byteArray = writer.toBuffer();
  writer.reset();

  if (compress && byteArray.length >= 860) {
    writer.writeBoolean(true);
    writer.writeInt32(byteArray.length - 1);

    const deflatingBuffer = Buffer.alloc(byteArray.length - 1);
    byteArray.copy(deflatingBuffer, 0, 1, byteArray.length);

    byteArray = zlib.deflateRawSync(deflatingBuffer);

    writer.writeBytes(byteArray);
    byteArray = writer.toBuffer();

    writer.reset();
  } else {
    byteArray[0] = 0;
  }

  const cipher = crypto.createCipheriv("des-cbc", passphrase, passphrase);

  let encrypted = Buffer.concat([cipher.update(byteArray), cipher.final()]);
  writer.writeBytes(encrypted);

  return writer.toBuffer();
}

export interface NodeCorePacket {
  LowerCommand: number;
  UpperCommand: number;
  Guid: Guid;
  Payload: PayloadLike[];
}

export function decrypt(byteArray: Buffer, passphrase: Buffer): NodeCorePacket {
  const cipher = crypto.createDecipheriv("des-cbc", passphrase, passphrase);

  let buffer = cipher.update(byteArray);
  buffer = Buffer.concat([buffer, cipher.final()]);

  let reader = new BinaryReader(buffer);

  if (reader.readBoolean()) {
    reader.readInt32();

    // Copy compressed data (begins at offset 5)
    let _tmpBuf = Buffer.alloc(buffer.length - 5);
    buffer.copy(_tmpBuf, 0, 5);
    buffer = zlib.inflateRawSync(_tmpBuf);

    reader = new BinaryReader(buffer);
  }

  // Initialize packet object
  const packet: NodeCorePacket = {
    LowerCommand: reader.readByte(),
    UpperCommand: reader.readByte(),
    Guid: Guid.EMPTY,
    Payload: [],
  };

  if (reader.readBoolean()) {
    packet.Guid = new Guid(...reader.readBytes(16));
  }

  const objectList: PayloadLike[] = [];

  // Read and parse the supported datatypes
  while (reader.getOffset() != buffer.length) {
    switch (reader.readByte()) {
      case 0:
        {
          // Boolean
          const val = reader.readBoolean();
          objectList.push(val);
        }
        break;

      case 1:
        {
          // Byte
          const val = reader.readByte();
          objectList.push(new byte(val));
        }
        break;

      case 2:
        {
          // Byte[]
          const val = reader.readBytes(reader.readInt32());
          objectList.push(val);
        }
        break;

      case 3:
        {
          // Char
          const val = String.fromCharCode(reader.readByte());
          objectList.push(new char(val));
        }
        break;

      case 4:
        {
          // Char[]
          const val = reader.readStringUtf8().split("");
          objectList.push(val.map((v) => new char(v)));
        }
        break;

      case 5: // Decimal
        // Not implemented
        reader.readInt64();
        objectList.push(null);
        break;

      case 6:
        {
          // Double
          const val = reader.readDouble();
          objectList.push(new double(val));
        }
        break;

      case 7:
        {
          // Int32
          const val = reader.readInt32();
          objectList.push(new int32(val));
        }
        break;

      case 8:
        {
          // Int64
          const val = reader.readInt64();
          objectList.push(new int64(val));
        }
        break;

      case 9:
        {
          // SByte
          const val = reader.readSByte();
          objectList.push(new sbyte(val));
        }
        break;

      case 10:
        {
          // Int16
          const val = reader.readInt16();
          objectList.push(new int16(val));
        }
        break;

      case 11:
        {
          // Float
          const val = reader.readFloat();
          objectList.push(new float(val));
        }
        break;

      case 12:
        {
          // String
          const val = reader.readStringUtf8();
          objectList.push(val);
        }
        break;

      case 13:
        {
          // UInt32
          const val = reader.readUInt32();
          objectList.push(new uint32(val));
        }
        break;

      case 14:
        {
          // UInt64
          const val = reader.readUInt64();
          objectList.push(new uint64(val));
        }
        break;

      case 15:
        {
          // UInt16
          const val = reader.readUInt16();
          objectList.push(new uint16(val));
        }
        break;

      case 16: // DateTime
        try {
          const dateBytes = reader.readBytes(8);
          dateBytes[7] = parseInt(dateBytes[7].toString(2).substr(2), 2);
          const tmpBuf = Buffer.from(dateBytes);

          const ms: bigint = (tmpBuf.readBigInt64LE() - 621355968000000000n) / 10000n;

          const val = new Date(parseInt(ms.toString()));
          objectList.push(new PDateTime(val));
        } catch (ex) {
          objectList.push(new PDateTime(new Date(NaN)));
        }
        break;

      case 17: // String[]
        const strArray: string[] = new Array(reader.readInt32());
        for (var i = 0; i < strArray.length; i++) {
          strArray[i] = reader.readStringUtf8();
        }

        objectList.push(strArray);
        break;

      case 18:
        {
          // Guid
          const val = new Guid(...reader.readBytes(16));
          objectList.push(new PGuid(val));
        }
        break;

      case 19: // Size
        // Not implemented
        reader.readInt64();
        objectList.push(null);
        break;

      case 20: // Rectangle
        // Not implemented
        reader.readBytes(16);
        objectList.push(null);
        break;

      case 21: // Version
        // Not implemented
        reader.readStringUtf8();
        objectList.push(null);
        break;
    }
  }

  packet.Payload = objectList;

  return packet;
}

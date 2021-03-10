import crypto from 'crypto';
import zlib from 'zlib';

import { BinaryWriter, BinaryReader } from "../binary";
import { byte, char, EPayloadLike, DPayloadLike } from "../datatypes/common";
import Guid from "../datatypes/guid";

// boolean = 0
// string = 12

const TYPES = {
    'byte': 1,
    'byte[]': 2,
    'char': 3,
    'char[]': 4,
    'decimal': 5,
    'double': 6,
    'int': 7,
    'long': 8,
    'sbyte': 9,
    'short': 10,
    'float': 11,
    'uint': 13,
    'ulong': 14,
    'ushort': 15,
    'DateTime': 16,
    'string[]': 17,
    'Guid': 18,
    'Size': 19,
    'Rectangle': 20,
    'Version': 21
}

export function encrypt(compress: boolean, command: number, byte: number, guid: Guid, payload?: EPayloadLike[]): Buffer {
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

            if (Array.isArray(_data)) {
                dataType = typeof _data[0] === 'string' ? 17 : TYPES[`${_data[0].type}[]`];
                dataValue = _data;
            } else {
                dataType = typeof _data === 'string' ? 12 : typeof _data === 'boolean' ? 0 : TYPES[_data.type];
                dataValue = (typeof _data === 'string' || typeof _data === 'boolean') ? _data : _data.value;
            }

            writer.writeByte(dataType);

            switch (dataType) {
                case 0:
                    writer.writeBoolean(dataValue);
                    break;

                case 2: 
                    {
                    const data: byte[] = dataValue as byte[];
                    writer.writeInt32(data.length);
                    writer.writeBytes(Buffer.from(data.map((v) => v.value as number)));
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
                        writer.writeStringPrefixedUtf8(data.map((v) => String.fromCharCode(v.value)).join(''));
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

                case 8:
                    {
                        // Not implemented
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
                        const appendBits = "10" + new Array(missingBits).fill('0').join('');

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

        byteArray = zlib.deflateRawSync(byteArray);
    } else {
        byteArray[0] = 0;
    }

    const key = Buffer.from([114, 32, 24, 120, 140, 41, 72, 151]);
    const iv = Buffer.from([114, 32, 24, 120, 140, 41, 72, 151]);
    const cipher = crypto.createCipheriv('des-cbc', key, iv);

    let encrypted = cipher.update(byteArray);
    return Buffer.concat([encrypted, cipher.final()]);
}

export interface NodeCorePacket {
    LowerCommand: number,
    UpperCommand: number,
    Guid: Guid,
    Payload: DPayloadLike[]
}

export function decrypt(byteArray: Buffer): NodeCorePacket {
    const key = Buffer.from([114, 32, 24, 120, 140, 41, 72, 151]);
    const iv = Buffer.from([114, 32, 24, 120, 140, 41, 72, 151]);
    const cipher = crypto.createDecipheriv('des-cbc', key, iv);

    let buffer = cipher.update(byteArray);
    buffer = Buffer.concat([buffer, cipher.final()]);

    let reader = new BinaryReader(buffer);

    if (reader.readBoolean()) {
        const length = reader.readInt32();

        const _tmpBuf = Buffer.alloc(buffer.length - 5);
        buffer.copy(_tmpBuf, 0, 5);

        buffer = zlib.inflateRawSync(_tmpBuf);
        
        reader = new BinaryReader(buffer);
    }

    const packet: NodeCorePacket = {
        LowerCommand: reader.readByte(),
        UpperCommand: reader.readByte(),
        Guid: Guid.EMPTY,
        Payload: []
    }

    if (reader.readBoolean()) {
        packet.Guid = new Guid(...reader.readBytes(16));
    }

    const objectList: DPayloadLike[] = [];

    while (reader.getOffset() != buffer.length) {
        switch (reader.readByte()) {
            case 0:
                objectList.push(reader.readBoolean());
                break;

            case 1:
                objectList.push(reader.readByte());
                break;

            case 2:
                objectList.push(reader.readBytes(reader.readInt32()));
                break;

            case 3:
                objectList.push(String.fromCharCode(reader.readByte()));
                break;

            case 4:
                objectList.push(reader.readStringUtf8().split(''));
                break;

            case 5:
                // Not implemented
                reader.readInt64();
                objectList.push(null);
                break;

            case 6:
                objectList.push(reader.readDouble());
                break;
                
            case 7:
                objectList.push(reader.readInt32());
                break;
                
            case 8:
                objectList.push(reader.readInt64());
                break;
                
            case 9:
                objectList.push(reader.readSByte());
                break;
                
            case 10:
                objectList.push(reader.readInt16());
                break;
                
            case 11:
                objectList.push(reader.readFloat());
                break;
                
            case 12:
                objectList.push(reader.readStringUtf8());
                break;
                
            case 13:
                objectList.push(reader.readUInt32());
                break;
                
            case 14:
                objectList.push(reader.readUInt64());
                break;
                
            case 15:
                objectList.push(reader.readUInt16());
                break;
                
            case 16:
                try {
                    const dateBytes = reader.readBytes(8);
                    dateBytes[7] = parseInt(dateBytes[7].toString(2).substr(2), 2);
                    const tmpBuf = Buffer.from(dateBytes);

                    const ms: bigint = (tmpBuf.readBigInt64LE() - 621355968000000000n) / 10000n;

                    objectList.push(new Date(parseInt(ms.toString())));
                } catch (ex) {
                    objectList.push(new Date(NaN));
                }
                break;
                
            case 17:
                const strArray: string[] = new Array(reader.readInt32());
                for (var i = 0; i < strArray.length; i++) {
                    strArray[i] = reader.readStringUtf8();
                }

                objectList.push(strArray);
                break;
                
            case 18:
                objectList.push(new Guid(...reader.readBytes(16)));
                break;
                
            case 19:
                // Not implemented
                reader.readInt64();
                objectList.push(null);
                break;
                
            case 20:
                // Not implemented
                reader.readBytes(16);
                objectList.push(null);
                break;
                
            case 21:
                // Not implemented
                reader.readStringUtf8();
                objectList.push(null);
                break;
        }
    }

    packet.Payload = objectList;

    return packet;
}
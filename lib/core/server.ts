import { Socket, createServer, Server } from 'net';
import EventEmitter from 'events';
import * as crypto from '../crypto';
import { PayloadLike, Guid } from '../datatypes';

// 'on' typings
export declare interface NodeCoreServer {
    // Main events
    on(event: 'listening', listener: (eventArgs: {}) => void): this;
    on(event: 'client_connect', listener: (eventArgs: {client: NodeCoreServerClient, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'client_closed', listener: (eventArgs: {client: NodeCoreServerClient}) => void): this;
    on(event: 'packet', listener: (eventArgs: {client: NodeCoreServerClient, packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    
    // Other unknown / undocumented events
    on(event: string | symbol, listener: Function): this;
}

// 'once' typings
export declare interface NodeCoreServer {
    // Main events
    once(event: 'listening', listener: (eventArgs: {}) => void): this;
    once(event: 'client_connect', listener: (eventArgs: {client: NodeCoreServerClient, cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'client_closed', listener: (eventArgs: {client: NodeCoreServerClient}) => void): this;
    once(event: 'packet', listener: (eventArgs: {client: NodeCoreServerClient, packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    
    // Other unknown / undocumented events
    once(event: string | symbol, listener: Function): this;
}

// 'off' typings
export declare interface NodeCoreServer {
    // Main events
    off(event: 'listening', listener: (eventArgs: {}) => void): this;
    off(event: 'client_connect', listener: (eventArgs: {client: NodeCoreServerClient, cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'client_closed', listener: (eventArgs: {client: NodeCoreServerClient}) => void): this;
    off(event: 'packet', listener: (eventArgs: {client: NodeCoreServerClient, packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    
    // Other unknown / undocumented events
    off(event: string | symbol, listener?: Function): this;
}

interface NodeCoreServerContructorProps {
    passphrase?: Buffer;
}

/**
 * Core Server class of this library
 */
export class NodeCoreServer extends EventEmitter {
    protected server: Server;

    protected clientList: NodeCoreServerClient[] = [];

    protected isConnected = false;
    protected maxClientCount = 10000;
    protected maxPacketSize = 10485760;

    protected passphrase: Buffer;

    constructor(props?: NodeCoreServerContructorProps) {
        super();

        this.passphrase = props?.passphrase || Buffer.from([114, 32, 24, 120, 140, 41, 72, 151]);
    }

    /**
     * Initiate the server
     */
    public listen(port: number, hostname?: string): void {
        if (this.isConnected) return;

        this.isConnected = true;

        this.server = createServer((socket) => {
            if (this.clientList.length < this.maxClientCount) {
                const client = new NodeCoreServerClient(socket, this.maxPacketSize, this.passphrase);

                if (this.emit('client_connect', {client})) {
                    socket.destroy();
                    return;
                }

                this.clientList.push(client);

                client.on('close', (error: Error) => this.onClientClosed(client, error));
            }
        });

        this.server.listen(port, hostname || '127.0.0.1', 2, () => {
            this.emit('listening', {}, false);
        });
    }

    protected onClientClosed(client: NodeCoreServerClient, error: Error) {
        this.emit('client_closed', { client, error }, false);
        this.clientList.splice(this.clientList.indexOf(client), 1);
    }

    public emit(event: string | symbol, arg: object, cancellable: boolean = true): boolean {
        var cancelled = false;
        
        if (cancellable) {
            if (arg) {
                super.emit(event, {
                    ...arg,
                    cancel: () => {
                        cancelled = true
                    },
                    isCancelled: () => cancelled
                });
            } else {
                super.emit(event, {
                    cancel: () => {
                        cancelled = true
                    },
                    isCancelled: () => cancelled
                });
            }
        } else {
            if (arg) super.emit(event, arg);
            else super.emit(event);
        }

        return cancellable && cancelled;
    }

    public off(event: string | symbol, listener?: (...args: any[]) => void): this {
        if (event === '*') event = undefined;

        if (listener) return super.off(event, listener);
        else return super.removeAllListeners(event);
    }
}

class NodeCoreServerClient extends EventEmitter {
    protected bufferState: {buffer: Buffer, bufferWritten: number} = {buffer: null, bufferWritten: 0};

    public storage: Map<string, any> = new Map<string, any>();

    constructor(public socket: Socket, protected maxPacketSize: number, protected passphrase: Buffer) {
        super();

        this.onDataReceived = this.onDataReceived.bind(this);
        this.onSocketError = this.onSocketError.bind(this);
        this.onBufferComplete = this.onBufferComplete.bind(this);

        this.socket.on('data', this.onDataReceived);
        this.socket.on('error', this.onSocketError)
    }

    protected onDataReceived(data: Buffer) {
        if (!this.bufferState.buffer) {
            const size = data.readInt32LE();

            if (size < 0) return this.shutdown(new Error('Size is less than 0'));
            if (size > this.maxPacketSize) return this.shutdown(new Error('Maximum packet size exceeded'));

            this.bufferState.buffer = Buffer.alloc(size);
            data.copy(this.bufferState.buffer, 0, 4);
            this.bufferState.bufferWritten = data.length - 4;
        } else {
            data.copy(this.bufferState.buffer, this.bufferState.bufferWritten);
            this.bufferState.bufferWritten += data.length;
        }

        if (this.bufferState.bufferWritten < this.bufferState.buffer.length) return;

        this.onBufferComplete(this.bufferState.buffer);

        this.bufferState.buffer = null;
    }

    protected onSocketClose(error?: Error) {
        this.emit('close', error);
    }

    protected onSocketError(error: Error) {
        this.shutdown(error);
    }

    protected onBufferComplete(data: Buffer) {
        const packet = crypto.decrypt(data, this.passphrase);

        if (this.cemit('packet', { packet })) return;

        this.onPacket(packet);
    }

    public shutdown(error?: Error) {
        this.emit('shutdown', { error });
        
        this.socket.destroy();
    }

    /**
     * Send a payload to the client
     * 
     * @param command Byte containing the main command
     * @param byte Byte containing the subcommand
     * @param guid The targetted plugin GUID
     * @param payload The payload to send
     */
    public sendCommand(command: number, byte: number, guid: Guid, payload: PayloadLike[]) {
        const buffer = crypto.encrypt(true, command, byte, guid, payload, this.passphrase);

        const arr = Buffer.from([
            (buffer.length & 0x000000ff),
            (buffer.length & 0x0000ff00) >> 8,
            (buffer.length & 0x00ff0000) >> 16,
            (buffer.length & 0xff000000) >> 24
        ]);

        this.socket.write(arr);
        this.socket.write(buffer);
    }

    public onPacket(packet: crypto.NodeCorePacket) {
    
        // WIP: Handle packet
    }

    public cemit(event: string | symbol, arg: any, cancellable: boolean = true): boolean {
        var cancelled = false;
        
        if (cancellable) {
            if (arg) {
                super.emit(event, {
                    ...arg,
                    cancel: () => {
                        cancelled = true
                    },
                    isCancelled: () => cancelled
                });
            } else {
                super.emit(event, {
                    cancel: () => {
                        cancelled = true
                    },
                    isCancelled: () => cancelled
                });
            }
        } else {
            if (arg) super.emit(event, arg);
            else super.emit(event);
        }

        return cancellable && cancelled;
    }

    public off(event: string | symbol, listener?: (...args: any[]) => void): this {
        if (event === '*') event = undefined;

        if (listener) return super.off(event, listener);
        else return super.removeAllListeners(event);
    }
}
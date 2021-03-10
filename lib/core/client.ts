import { Socket } from 'net';
import EventEmitter from 'events';
import * as crypto from '../crypto';
import { EPayloadLike, PGuid } from '../datatypes/common';
import { Guid } from '../datatypes';
import { randomBytes } from 'crypto';
import { PLUGINS } from '../plugins';

// Typing is nice :>
export declare interface NodeCoreClient {
    // Main events
    on(event: 'connect', listener: (eventArgs: {hostname: string, port: number}) => void): this;
    on(event: 'shutdown', listener: (eventArgs: {error: boolean, restart: boolean, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'packet', listener: (eventArgs: {packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'plugins', listener: (eventArgs: {plugins: {name: string, size: number, guid: Guid, buildTime: Date}[]}) => void): this
    on(event: 'pipe.pre', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'pipe.post', listener: () => void): this;

    // Core Plugin events
    on(event: 'core.update', listener: (eventArgs: {values: {cpu: number, ram: number, idle: number, active: string}, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.restart', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.shutdown', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.uninstall', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.sysreboot', listener: () => void): this;
    on(event: 'core.sysshutdown', listener: () => void): this;

    // Other unknown / undocumented events
    on(event: string | symbol, listener: Function): this;
}

interface NanoCoreClientConstructorOptions {
    hostname: string;
    port: number;
    username?: string;
    deviceName?: string;
    deviceGuid?: Guid;
    groupName?: string;
    osName?: string;
    filename?: string;
    activeAppName?: string;
    activeWindow?: string;
}

interface NanoCoreClientOptions {
    username: string;
    deviceName: string;
    deviceGuid: Guid;
    groupName: string;
    osName: string;
    filename: string;
    activeAppName: string;
    activeWindow: string;
}

/**
 * Core class of this library
 */
export class NodeCoreClient extends EventEmitter {
    private hostname: string;
    private port: number;

    private socket: Socket;
    private bufferState: {buffer: Buffer, bufferWritten: number} = {buffer: null, bufferWritten: 0};

    private isConnected = false;
    
    public clientOptions: NanoCoreClientOptions;

    /**
     * @param opts
     */
    constructor(opts: NanoCoreClientConstructorOptions) {
        super();

        this.hostname = opts.hostname;
        this.port = opts.port;

        this.clientOptions = {
            username: opts.username ?? "John",
            deviceName: opts.deviceName ?? "JOHN-PC",
            groupName: opts.groupName ?? "Default",
            deviceGuid: opts.deviceGuid ?? new Guid(...randomBytes(16)),
            osName: opts.osName ?? "Windows 10 Home",
            filename: opts.filename ?? "RegAsm.exe",
            
            // Might remove these in a future commit
            activeAppName: opts.activeAppName ?? 'chrome',
            activeWindow: opts.activeWindow ?? 'YouTube'
        };

        this.connect = this.connect.bind(this);
        this.shutdown = this.shutdown.bind(this);
        this.restart = this.restart.bind(this);

        this.onSocketConnect = this.onSocketConnect.bind(this);
        this.onDataReceived = this.onDataReceived.bind(this);
        this.onSocketError = this.onSocketError.bind(this);
        this.onBufferComplete = this.onBufferComplete.bind(this);
        this.onServerCommand = this.onServerCommand.bind(this);
        this.onPluginCommand = this.onPluginCommand.bind(this);
        this.sendCommand = this.sendCommand.bind(this);
    }

    /**
     * Initiate a connection with the server
     */
    public connect(): void {
        if (this.isConnected) return;

        this.isConnected = true; // Not exactly true but this prevents some race-conditions

        this.socket = new Socket();
        this.socket.on('data', this.onDataReceived);
        this.socket.on('error', this.onSocketError);
        this.socket.connect(this.port, this.hostname, this.onSocketConnect);
    }
    
    /**
     * Close the connection
     * 
     * @param error Whether the shutdown was caused by an error
     * @param restart Whether the shutdown was caused by a restart
     */
    public shutdown(error: boolean = false, restart: boolean = false): boolean | void {
        if (!this.isConnected) throw new Error('Cannot shutdown an unopened connection');

        this.socket.destroy();
        this.isConnected = false;

        const ret = this.emit('shutdown', { error, restart });
        if (restart) return !ret; // Tell the restart() function to NOT restart if cancelled
        
        if (ret) {
            setTimeout(this.connect, 1000); // Shutdown event got cancelled, so restart the connection
        }
    }

    /**
     * Restart the connection
     */
    public restart(): void {
        if (!this.shutdown(false, true)) return;

        setTimeout(this.connect, 1000);
    }

    public sendCommand(command: number, byte: number, guid: Guid, payload: EPayloadLike[]) {
        const buffer = crypto.encrypt(true, command, byte, guid, payload);

        const arr = Buffer.from([
            (buffer.length & 0x000000ff),
            (buffer.length & 0x0000ff00) >> 8,
            (buffer.length & 0x00ff0000) >> 16,
            (buffer.length & 0xff000000) >> 24
        ]);

        this.socket.write(arr);
        this.socket.write(buffer);
    }

    private onSocketConnect() {
        this.emit('connect', {
            hostname: this.hostname, 
            port: this.port
        }, false);

        this.sendCommand(0, 0, Guid.EMPTY, [
            new PGuid(this.clientOptions.deviceGuid),
            `${this.clientOptions.deviceName}\\${this.clientOptions.username}`,
            this.clientOptions.groupName,
            '1.2.2.0'
        ]);
    }

    private onDataReceived(data: Buffer) {
        if (!this.bufferState.buffer) {
            this.bufferState.buffer = Buffer.alloc(data.readInt32LE());
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

    private onSocketError() {
        this.shutdown(true);
    }

    private onBufferComplete(data: Buffer) {
        const packet = crypto.decrypt(data);

        if (this.emit('packet', { packet })) return;

        switch (packet.LowerCommand) {
            case 0:
                this.onServerCommand(packet);
                break;

            case 1:
                this.onPluginCommand(packet);
                break;

            case 2:
                // Don't know what this means / how to implement
                break;
        }
    }

    private onServerCommand(packet: crypto.NodeCorePacket) {
        switch (packet.UpperCommand) {
            case 2:
                // Create pipe
                if (this.emit('pipe.pre', {})) return;
                break;

            case 4:
                const plugin = PLUGINS[packet.Guid.toString()];
                if (!plugin) break;

                plugin.onPacket(new NodeCorePluginClient(plugin.name, packet.Guid, this), null, packet.Payload);
                break;

            case 6:
                this.sendCommand(0, 6, Guid.EMPTY, []);
        }
    }

    private onPluginCommand(packet: crypto.NodeCorePacket) {
        switch (packet.UpperCommand) {
            case 0:
                this.sendCommand(1, 0, Guid.EMPTY, [true]);
                break;
            case 1:
                this.sendCommand(1, 1, Guid.EMPTY, []);
                break;
            case 2:
                const guids: PGuid[] = [];

                for (var i = 0; i < packet.Payload.length; i+=3) {
                    guids.push(new PGuid(<Guid>packet.Payload[i]));
                }

                this.sendCommand(1, 2, Guid.EMPTY, guids);

                break;
            case 3:
                const plugins: {name: string, size: number, guid: Guid, buildTime: Date}[] = [];

                for (var i = 0; i < packet.Payload.length; i+=5) {
                    plugins.push({
                        guid: <Guid>packet.Payload[i],
                        buildTime: <Date>packet.Payload[i + 1],
                        size: (<Uint8Array>packet.Payload[i + 4]).length,
                        name: <string>packet.Payload[i + 2]
                    });
                }

                this.emit('plugins', {plugins}, false);
                this.sendCommand(1, 3, Guid.EMPTY, []);
                break;
        }
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
}

/**
 * Wrapper classed used for passing the client to plugin handlers
 */
export class NodeCorePluginClient {
    constructor(public name: string, public guid: Guid, public client: NodeCoreClient) {
        this.sendCommand = this.sendCommand.bind(this);
        this.emit = this.emit.bind(this);
    }

    public sendCommand(payload: EPayloadLike[]) {
        this.client.sendCommand(0, 4, this.guid, payload);
    }

    public emit(event: string, arg: object, cancellable: boolean = true): boolean {
        return this.client.emit(`${this.name}.${event}`, arg, cancellable);
    }
}

// PLEASE STOP I DONT WANT TO SEE LEGO PIECE 26047
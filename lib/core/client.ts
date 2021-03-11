import { Socket } from 'net';
import EventEmitter from 'events';
import * as crypto from '../crypto';
import { EPayloadLike, PGuid } from '../datatypes/common';
import { Guid } from '../datatypes';
import { randomBytes } from 'crypto';
import { PLUGINS } from '../plugins';

// Typing is nice :>
export declare interface NodeCoreBase {
    // Main events
    on(event: 'connect', listener: (eventArgs: {hostname: string, port: number}) => void): this;
    on(event: 'shutdown', listener: (eventArgs: {error: boolean, restart: boolean, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'packet', listener: (eventArgs: {packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'packet.unhandled', listener: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket}) => void): this;
    on(event: 'plugins', listener: (eventArgs: {plugins: NodeCorePlugin[]}) => void): this
    on(event: 'pipe.pre', listener: (eventArgs: {name: string, guid: Guid, plugin: Guid, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'pipe.post', listener: (eventArgs: {pipe: NodeCorePipe}) => void): this;
    on(event: 'pipe.dead', listener: (eventArgs: {name: string, guid: Guid, plugin: Guid, error: boolean}) => void): this;

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

interface NodeCoreClientConstructorOptions {
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

interface NodeCorePipeConstructorOptions {
    hostname: string;
    port: number;
    
    guid: Guid;
    name: string;
    plugin: Guid;
    parent: NodeCoreClient;
}

interface NodeCoreClientOptions {
    username: string;
    deviceName: string;
    deviceGuid: Guid;
    groupName: string;
    osName: string;
    filename: string;
    activeAppName: string;
    activeWindow: string;
}

interface NodeCorePlugin {
    name: string;
    guid: Guid;
    buildTime: Date;
    size: number;
}

/**
 * Core class of this library
 */
export class NodeCoreBase extends EventEmitter {
    protected socket: Socket;
    protected bufferState: {buffer: Buffer, bufferWritten: number} = {buffer: null, bufferWritten: 0};

    protected isConnected = false;

    constructor(protected hostname: string, protected port: number) {
        super();

        this.connect = this.connect.bind(this);
        this.shutdown = this.shutdown.bind(this);
        this.restart = this.restart.bind(this);
        this.sendCommand = this.sendCommand.bind(this);

        this.onDataReceived = this.onDataReceived.bind(this);
        this.onSocketError = this.onSocketError.bind(this);
        this.onSocketConnect = this.onSocketConnect.bind(this);
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
     * 
     * @returns Void or a boolean value indicating the shutdown is being cancelled
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

    /**
     * Send a payload to the server
     * 
     * @param command Byte containing the main command
     * @param byte Byte containing the subcommand
     * @param guid The targetted plugin GUID
     * @param payload The payload to send
     */
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

    protected onSocketConnect() {
        this.emit('connect', {
            hostname: this.hostname, 
            port: this.port
        }, false);
    }
    
    protected onSocketError() {
        this.shutdown(true);
    }

    protected onDataReceived(data: Buffer) {
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

    protected onBufferComplete(data: Buffer) {
        const packet = crypto.decrypt(data);

        if (this.emit('packet', { packet })) return;

        this.onPacket(packet);
    }

    protected onPacket(packet: crypto.NodeCorePacket) {}

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

export class NodeCoreClient extends NodeCoreBase {
    private pluginCache: {[key: string]: NodeCorePlugin};
    private pipes: {[key: string]: NodeCorePipe} = {};
    
    public clientOptions: NodeCoreClientOptions;

    /**
     * @param opts
     */
    constructor(opts: NodeCoreClientConstructorOptions) {
        super(opts.hostname, opts.port);

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

        this.onPacket = this.onPacket.bind(this);
        this.onSocketConnect = this.onSocketConnect.bind(this);
        this.onServerCommand = this.onServerCommand.bind(this);
        this.onPluginCommand = this.onPluginCommand.bind(this);
    }

    /**
     * Initiate a connection with the server
     */
    public connect(): void {
        super.connect();
        this.pluginCache = {};
    }
    
    /**
     * Close the connection
     * 
     * @param error Whether the shutdown was caused by an error
     * @param restart Whether the shutdown was caused by a restart
     * 
     * @returns Void or a boolean value indicating the shutdown is being cancelled
     */
    public shutdown(error: boolean = false, restart: boolean = false): boolean | void {
        const ret = super.shutdown(error, restart);

        this.pluginCache = {};

        return ret;
    }

    protected onSocketConnect() {
        super.onSocketConnect();

        this.sendCommand(0, 0, Guid.EMPTY, [
            new PGuid(this.clientOptions.deviceGuid),
            `${this.clientOptions.deviceName}\\${this.clientOptions.username}`,
            this.clientOptions.groupName,
            '1.2.2.0'
        ]);
    }

    protected onPacket(packet: crypto.NodeCorePacket) {
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

                const pipeInfo = {
                    name: <string>packet.Payload[0],
                    guid: <Guid>packet.Payload[1],
                    plugin: <Guid>packet.Payload[2]
                }

                if (Object.keys(this.pipes).includes(pipeInfo.name))
                    return;

                if (!Object.keys(this.pluginCache).includes(pipeInfo.plugin.toString()))
                    return;

                if (this.emit('pipe.pre', pipeInfo)) return;

                const client = new NodeCorePipe({
                    hostname: this.hostname,
                    port: this.port,
                    guid: pipeInfo.guid,
                    name: pipeInfo.name,
                    plugin: pipeInfo.plugin,
                    parent: this
                });

                client.on('shutdown', e => {
                    delete this.pipes[pipeInfo.name];

                    this.emit('pipe.dead', {...pipeInfo, error: e.error}, false);
                });

                client.connect();

                this.pipes[pipeInfo.name] = client;

                break;

            case 4:
                const plugin = PLUGINS[packet.Guid.toString()];
                if (!plugin) {
                    this.emit('packet.unhandled', {client: this, packet}, false);
                    break;
                }

                plugin.onPacket(new NodeCorePluginClient<NodeCoreClient>(plugin.name, packet.Guid, this), null, packet.Payload);
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
                for (var i = 0; i < packet.Payload.length; i+=5) {
                    this.pluginCache[(<Guid>packet.Payload[i]).toString()] = {
                        guid: <Guid>packet.Payload[i],
                        buildTime: <Date>packet.Payload[i + 1],
                        size: (<Uint8Array>packet.Payload[i + 4]).length,
                        name: <string>packet.Payload[i + 2]
                    };
                }

                this.emit('plugins', {plugins: Object.values(this.pluginCache)}, false);
                this.sendCommand(1, 3, Guid.EMPTY, []);
                break;
        }
    }
}

export class NodeCorePipe extends NodeCoreBase {
    public guid: Guid;
    public name: string;
    public plugin: Guid;
    public parent: NodeCoreClient;
    
    constructor(opts: NodeCorePipeConstructorOptions) {
        super(opts.hostname, opts.port);

        this.guid = opts.guid;
        this.name = opts.name;
        this.plugin = opts.plugin;
        this.parent = opts.parent;

        this.restart = this.restart.bind(this);
        this.emit = this.emit.bind(this);

        this.onSocketConnect = this.onSocketConnect.bind(this);
        this.onPacket = this.onPacket.bind(this);
    }

    /**
     * Shutdown the pipe.
     * 
     * This won't restart the connection because pipes don't support it
     */
    public restart() {
        this.shutdown(false, false);
    }

    protected onSocketConnect() {
        super.onSocketConnect();

        this.sendCommand(0, 2, Guid.EMPTY, [
            this.name,
            new PGuid(this.guid)
        ]);

        this.parent.emit('pipe.post', {pipe: this}, false);
    }

    protected onPacket(packet: crypto.NodeCorePacket) {
        const plugin = PLUGINS[this.plugin.toString()];
        if (!plugin) {
            this.parent.emit('packet.unhandled', {client: this, packet}, false);
            return;
        }

        plugin.onPacket(new NodeCorePluginClient<NodeCorePipe>(plugin.name, this.plugin, this), this.name, packet.Payload);
    }

    public emit(event: string | symbol, arg: object, cancellable: boolean = true): boolean {
        if (event === 'shutdown') return super.emit(event, arg, cancellable);
        else return this.parent.emit(event, arg, cancellable);
    }
}

/**
 * Wrapper classed used for passing the client to plugin handlers
 */
export class NodeCorePluginClient<T extends NodeCoreBase = NodeCoreClient> {
    constructor(public name: string, public guid: Guid, public client: T) {
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
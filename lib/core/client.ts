import { Socket } from 'net';
import EventEmitter from 'events';
import * as crypto from '../crypto';
import { byte, PayloadLike, PDateTime, PGuid } from '../datatypes/common';
import { Guid } from '../datatypes';
import { randomBytes } from 'crypto';
import { PLUGINS } from '../plugins';

// 'on' typings
export declare interface NodeCoreBase {
    // Main events
    on(event: 'connect', listener: (eventArgs: {hostname: string, port: number}) => void): this;
    on(event: 'shutdown', listener: (eventArgs: {error: Error, restart: boolean, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'packet', listener: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'packet.unhandled', listener: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket}) => void): this;
    on(event: 'client-init', listener: (eventArgs: {payload: PayloadLike[], cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'plugins', listener: (eventArgs: {plugins: NodeCorePlugin[]}) => void): this
    on(event: 'pipe.pre', listener: (eventArgs: {name: string, guid: Guid, plugin: Guid, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'pipe.post', listener: (eventArgs: {pipe: NodeCorePipe}) => void): this;
    on(event: 'pipe.dead', listener: (eventArgs: {name: string, guid: Guid, plugin: Guid, error: boolean}) => void): this;

    // Core Plugin events
    on(event: 'core.initialize', listener: (eventArgs: {values: {osName: string, filename: string, isAdmin: boolean}, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.update', listener: (eventArgs: {values: {cpu: number, ram: number, idle: number, active: string}, cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.restart', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.shutdown', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.uninstall', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    on(event: 'core.sysreboot', listener: () => void): this;
    on(event: 'core.sysshutdown', listener: () => void): this;

    // Management Plugin events
    on(event: 'management.registry.getkeys', listener: (eventArgs: {
        hive: string,
        subkey: string,
        addSubKey(name: string, hasChildren?: boolean): void,
        removeSubKey(name: string): void,
        getSubKeys(): {[key: string]: boolean}
    }) => void): this;
    on(event: 'management.registry.getvalues', listener: (eventArgs: {
        hive: string,
        subkey: string,
        addValue(name: string, value: string): void,
        removeValue(name: string): void,
        getValues(): {[key: string]: string}
    }) => void): this;
    on(event: 'management.registry.createkey', listener: (eventArgs: {hive: string, subkey: string, name: string}) => void): this;
    on(event: 'management.registry.deletekey', listener: (eventArgs: {hive: string, subkey: string}) => void): this;
    on(event: 'management.registry.renamekey', listener: (eventArgs: {hive: string, subkey: string, fromkey: string, tokey: string}) => void): this;
    on(event: 'management.registry.deletevalue', listener: (eventArgs: {hive: string, subkey: string, value: string}) => void): this;
    on(event: 'management.registry.changevalue', listener: (eventArgs: {hive: string, subkey: string, value: {name: string, value: string}}) => void): this;
    on(event: 'management.registry.renamevalue', listener: (eventArgs: {hive: string, subkey: string, fromvalue: string, tovalue: string}) => void): this;

    // Other unknown / undocumented events
    on(event: string | symbol, listener: Function): this;
}

// 'once' typings
export declare interface NodeCoreBase {
    // Main events
    once(event: 'connect', listener: (eventArgs: {hostname: string, port: number}) => void): this;
    once(event: 'shutdown', listener: (eventArgs: {error: Error, restart: boolean, cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'packet', listener: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'packet.unhandled', listener: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket}) => void): this;
    once(event: 'client-init', listener: (eventArgs: {payload: PayloadLike[], cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'plugins', listener: (eventArgs: {plugins: NodeCorePlugin[]}) => void): this
    once(event: 'pipe.pre', listener: (eventArgs: {name: string, guid: Guid, plugin: Guid, cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'pipe.post', listener: (eventArgs: {pipe: NodeCorePipe}) => void): this;
    once(event: 'pipe.dead', listener: (eventArgs: {name: string, guid: Guid, plugin: Guid, error: boolean}) => void): this;

    // Core Plugin events
    once(event: 'core.initialize', listener: (eventArgs: {values: {osName: string, filename: string}, cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'core.update', listener: (eventArgs: {values: {cpu: number, ram: number, idle: number, active: string}, cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'core.restart', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'core.shutdown', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'core.uninstall', listener: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    once(event: 'core.sysreboot', listener: () => void): this;
    once(event: 'core.sysshutdown', listener: () => void): this;

    // Management Plugin events
    once(event: 'management.registry.getkeys', listener: (eventArgs: {
        hive: string,
        subkey: string,
        addSubKey(name: string, hasChildren?: boolean): void,
        removeSubKey(name: string): void,
        getSubKeys(): {[key: string]: boolean}
    }) => void): this;
    once(event: 'management.registry.getvalues', listener: (eventArgs: {
        hive: string,
        subkey: string,
        addValue(name: string, value: string): void,
        removeValue(name: string): void,
        getValues(): {[key: string]: string}
    }) => void): this;
    once(event: 'management.registry.createkey', listener: (eventArgs: {hive: string, subkey: string, name: string}) => void): this;
    once(event: 'management.registry.deletekey', listener: (eventArgs: {hive: string, subkey: string}) => void): this;
    once(event: 'management.registry.renamekey', listener: (eventArgs: {hive: string, subkey: string, fromkey: string, tokey: string}) => void): this;
    once(event: 'management.registry.deletevalue', listener: (eventArgs: {hive: string, subkey: string, value: string}) => void): this;
    once(event: 'management.registry.changevalue', listener: (eventArgs: {hive: string, subkey: string, value: {name: string, value: string}}) => void): this;
    once(event: 'management.registry.renamevalue', listener: (eventArgs: {hive: string, subkey: string, fromvalue: string, tovalue: string}) => void): this;

    // Other unknown / undocumented events
    once(event: string | symbol, listener: Function): this;
}

// 'off' typings
export declare interface NodeCoreBase {
    // Main events
    off(event: 'connect', listener?: (eventArgs: {hostname: string, port: number}) => void): this;
    off(event: 'shutdown', listener?: (eventArgs: {error: Error, restart: boolean, cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'packet', listener?: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket, cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'packet.unhandled', listener?: (eventArgs: {client: NodeCoreBase, packet: crypto.NodeCorePacket}) => void): this;
    off(event: 'client-init', listener: (eventArgs: {payload: PayloadLike[], cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'plugins', listener?: (eventArgs: {plugins: NodeCorePlugin[]}) => void): this
    off(event: 'pipe.pre', listener?: (eventArgs: {name: string, guid: Guid, plugin: Guid, cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'pipe.post', listener?: (eventArgs: {pipe: NodeCorePipe}) => void): this;
    off(event: 'pipe.dead', listener?: (eventArgs: {name: string, guid: Guid, plugin: Guid, error: boolean}) => void): this;

    // Core Plugin events
    off(event: 'core.initialize', listener?: (eventArgs: {values: {osName: string, filename: string}, cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'core.update', listener?: (eventArgs: {values: {cpu: number, ram: number, idle: number, active: string}, cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'core.restart', listener?: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'core.shutdown', listener?: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'core.uninstall', listener?: (eventArgs: {cancel(): void, isCancelled(): boolean}) => void): this;
    off(event: 'core.sysreboot', listener?: () => void): this;
    off(event: 'core.sysshutdown', listener?: () => void): this;

    // Management Plugin events
    off(event: 'management.registry.getkeys', listener?: (eventArgs: {
        hive: string,
        subkey: string,
        addSubKey(name: string, hasChildren?: boolean): void,
        removeSubKey(name: string): void,
        getSubKeys(): {[key: string]: boolean}
    }) => void): this;
    off(event: 'management.registry.getvalues', listener?: (eventArgs: {
        hive: string,
        subkey: string,
        addValue(name: string, value: string): void,
        removeValue(name: string): void,
        getValues(): {[key: string]: string}
    }) => void): this;
    off(event: 'management.registry.createkey', listener?: (eventArgs: {hive: string, subkey: string, name: string}) => void): this;
    off(event: 'management.registry.deletekey', listener?: (eventArgs: {hive: string, subkey: string}) => void): this;
    off(event: 'management.registry.renamekey', listener?: (eventArgs: {hive: string, subkey: string, fromkey: string, tokey: string}) => void): this;
    off(event: 'management.registry.deletevalue', listener?: (eventArgs: {hive: string, subkey: string, value: string}) => void): this;
    off(event: 'management.registry.changevalue', listener?: (eventArgs: {hive: string, subkey: string, value: {name: string, value: string}}) => void): this;
    off(event: 'management.registry.renamevalue', listener?: (eventArgs: {hive: string, subkey: string, fromvalue: string, tovalue: string}) => void): this;

    // Other unknown / undocumented events
    off(event: string | symbol, listener?: Function): this;
}

interface NodeCoreClientConstructorOptions {
    hostname: string;
    port: number;
    username?: string;
    deviceName?: string;
    deviceGuid?: Guid;
    groupName?: string;
    requestPlugins?: boolean;
    connectTimeout?: number;
    keepAliveTimeout?: number;
    passphrase?: Buffer
}

interface NodeCorePipeConstructorOptions {
    hostname: string;
    port: number;
    passphrase: Buffer;

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
    requestPluginBinaries: boolean;
    connectTimeout: number;
    keepAliveTimeout: number;
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

    constructor(protected hostname: string, protected port: number, protected passphrase: Buffer) {
        super();

        this.connect = this.connect.bind(this);
        this.shutdown = this.shutdown.bind(this);
        this.restart = this.restart.bind(this);
        this.sendCommand = this.sendCommand.bind(this);
        this.off = this.off.bind(this);

        this.onDataReceived = this.onDataReceived.bind(this);
        this.onSocketError = this.onSocketError.bind(this);
        this.onSocketConnect = this.onSocketConnect.bind(this);
    }

    /**
     * Initiate a connection with the server
     */
    public connect(timeout: number): void {
        if (this.isConnected) return;

        this.isConnected = true; // Not exactly true but this prevents some race-conditions

        this.socket = new Socket();
        this.socket.setTimeout(timeout, () => this.socket.destroy(new Error('Connect timed out')));
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
    public shutdown(error?: Error, restart: boolean = false): boolean | void {
        if (!this.isConnected) return;

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
        if (!this.shutdown(undefined, true)) return;

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

    protected onSocketConnect() {
        this.socket.setTimeout(0);

        this.emit('connect', {
            hostname: this.hostname, 
            port: this.port
        });
    }
    
    protected onSocketError(err: Error) {
        this.shutdown(err);
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
        try {
            const packet = crypto.decrypt(data, this.passphrase);

            if (this.emit('packet', { client: this, packet })) return;

            this.onPacket(packet);
        } catch (error) {
            this.shutdown(error);
        }
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

    public off(event: string | symbol, listener?: (...args: any[]) => void): this {
        if (event === '*') event = undefined;

        if (listener) return super.off(event, listener);
        else return super.removeAllListeners(event);
    }
}

export class NodeCoreClient extends NodeCoreBase {
    private pluginCache: {[key: string]: NodeCorePlugin};
    private pipes: {[key: string]: NodeCorePipe} = {};
    private disconnectTimeout: NodeJS.Timeout;

    public clientOptions: NodeCoreClientOptions;

    /**
     * @param opts
     */
    constructor(opts: NodeCoreClientConstructorOptions) {
        super(opts.hostname, opts.port, opts.passphrase || Buffer.from([114, 32, 24, 120, 140, 41, 72, 151]));

        this.clientOptions = {
            username: opts.username ?? "John",
            deviceName: opts.deviceName ?? "JOHN-PC",
            groupName: opts.groupName ?? "Default",
            deviceGuid: opts.deviceGuid ?? new Guid(...randomBytes(16)),
            requestPluginBinaries: opts.requestPlugins ?? false,
            connectTimeout: opts.connectTimeout ?? 3e4,
            keepAliveTimeout: opts.keepAliveTimeout ?? 3e4
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
        super.connect(this.clientOptions.connectTimeout);
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
    public shutdown(error?: Error, restart: boolean = false): boolean | void {
        const ret = super.shutdown(error, restart);

        this.pluginCache = {};

        return ret;
    }

    /**
     * Gets the plugin details when provided a cached plugin GUID
     * 
     * @param guid The GUID of the plugin
     * @returns A NodeCorePlugin instance or undefined if no such plugin was found
     */
    public getPlugin(guid: Guid): NodeCorePlugin | undefined {
        return this.pluginCache[guid.toString()];
    }

    protected onSocketConnect() {
        super.onSocketConnect();

        const payload: PayloadLike[] = [
            new PGuid(this.clientOptions.deviceGuid),
            `${this.clientOptions.deviceName}\\${this.clientOptions.username}`,
            this.clientOptions.groupName,
            '1.2.2.0'
        ];

        if (this.emit('client-init', { payload })) return;

        this.sendCommand(0, 0, Guid.EMPTY, payload);
        this.resetTimeout();
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
                // File transfer command (WIP)
                break;
        }
    }

    private onServerCommand(packet: crypto.NodeCorePacket) {
        switch (packet.UpperCommand) {
            // Create pipe
            case 2:
                const pipeInfo = {
                    name: <string>packet.Payload[0],
                    guid: (<PGuid>packet.Payload[1]).value,
                    plugin: (<PGuid>packet.Payload[2]).value
                }

                if (Object.keys(this.pipes).includes(pipeInfo.name))
                    return;

                if (!Object.keys(this.pluginCache).includes(pipeInfo.plugin.toString()))
                    return;

                if (this.emit('pipe.pre', pipeInfo)) return;

                const client = new NodeCorePipe({
                    hostname: this.hostname,
                    port: this.port,
                    passphrase: this.passphrase,
                    guid: pipeInfo.guid,
                    name: pipeInfo.name,
                    plugin: pipeInfo.plugin,
                    parent: this
                });

                client.on('shutdown', e => {
                    delete this.pipes[pipeInfo.name];

                    this.emit('pipe.dead', {...pipeInfo, error: e.error}, false);
                });

                client.connect(this.clientOptions.connectTimeout);

                this.pipes[pipeInfo.name] = client;

                break;

            // Plugin command
            case 4:
                const plugin = PLUGINS[packet.Guid.toString()];
                if (!plugin) {
                    this.emit('packet.unhandled', {client: this, packet}, false);
                    break;
                }

                if (!plugin.onPacket(new NodeCorePluginClient<NodeCoreClient>(plugin.name, packet.Guid, this), null, packet.Payload))
                    this.emit('packet.unhandled', {client: this, packet}, false);

                break;

            // Reset timeout
            case 6:
                this.sendCommand(0, 6, Guid.EMPTY, []);
                this.resetTimeout();
                break;
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

                if (this.clientOptions.requestPluginBinaries) {
                    for (var i = 0; i < packet.Payload.length; i+=3) {
                        guids.push(<PGuid>packet.Payload[i]);
                    }
                }

                this.sendCommand(1, 2, Guid.EMPTY, guids);

                break;

            case 3:
                for (var i = 0; i < packet.Payload.length; i+=5) {
                    this.pluginCache[((<PGuid>packet.Payload[i]).value).toString()] = {
                        guid: (<PGuid>packet.Payload[i]).value,
                        buildTime: (<PDateTime>packet.Payload[i + 1]).value,
                        size: (<byte[]>packet.Payload[i + 4]).length,
                        name: <string>packet.Payload[i + 2]
                    };
                }

                this.emit('plugins', {plugins: Object.values(this.pluginCache)}, false);
                this.sendCommand(1, 3, Guid.EMPTY, []);
                break;
        }
    }

    private resetTimeout()
    {
        clearTimeout(this.disconnectTimeout);

        this.disconnectTimeout = setTimeout(() => {
            this.socket.destroy(new Error('No data received within KeepAliveTimeout'));
        }, this.clientOptions.keepAliveTimeout);
    }
}

export class NodeCorePipe extends NodeCoreBase {
    public guid: Guid;
    public name: string;
    public plugin: Guid;
    public parent: NodeCoreClient;
    
    constructor(opts: NodeCorePipeConstructorOptions) {
        super(opts.hostname, opts.port, opts.passphrase);

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
        this.shutdown(undefined, false);
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

        if (!plugin.onPacket(new NodeCorePluginClient<NodeCorePipe>(plugin.name, this.plugin, this), this.name, packet.Payload))
            this.parent.emit('packet.unhandled', {client: this, packet}, false);
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

    public sendCommand(payload: PayloadLike[]) {
        this.client.sendCommand(0, 4, this.guid, payload);
    }

    public emit(event: string, arg: object, cancellable: boolean = true): boolean {
        return this.client.emit(`${this.name}.${event}`, arg, cancellable);
    }
}
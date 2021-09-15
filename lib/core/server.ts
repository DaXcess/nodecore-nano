import { Socket, createServer, Server } from "net";
import EventEmitter from "events";
import * as crypto from "../crypto";
import { PayloadLike, Guid } from "../datatypes";
import AsyncLock from "await-lock";
import { ReadBufferState, SendBufferState } from "./interface";

// 'on' typings
export declare interface NodeCoreServer {
  // Main events
  on(event: "listening", listener: (eventArgs: {}) => void): this;
  on(
    event: "client_connect",
    listener: (eventArgs: { client: NodeCoreServerClient; cancel(): void; isCancelled(): boolean }) => void
  ): this;
  on(event: "client_closed", listener: (eventArgs: { client: NodeCoreServerClient }) => void): this;
  on(
    event: "packet",
    listener: (eventArgs: {
      client: NodeCoreServerClient;
      packet: crypto.NodeCorePacket;
      cancel(): void;
      isCancelled(): boolean;
    }) => void
  ): this;

  // Other unknown / undocumented events
  on(event: string | symbol, listener: Function): this;
}

// 'once' typings
export declare interface NodeCoreServer {
  // Main events
  once(event: "listening", listener: (eventArgs: {}) => void): this;
  once(
    event: "client_connect",
    listener: (eventArgs: { client: NodeCoreServerClient; cancel(): void; isCancelled(): boolean }) => void
  ): this;
  once(event: "client_closed", listener: (eventArgs: { client: NodeCoreServerClient }) => void): this;
  once(
    event: "packet",
    listener: (eventArgs: {
      client: NodeCoreServerClient;
      packet: crypto.NodeCorePacket;
      cancel(): void;
      isCancelled(): boolean;
    }) => void
  ): this;

  // Other unknown / undocumented events
  once(event: string | symbol, listener: Function): this;
}

// 'off' typings
export declare interface NodeCoreServer {
  // Main events
  off(event: "listening", listener: (eventArgs: {}) => void): this;
  off(
    event: "client_connect",
    listener: (eventArgs: { client: NodeCoreServerClient; cancel(): void; isCancelled(): boolean }) => void
  ): this;
  off(event: "client_closed", listener: (eventArgs: { client: NodeCoreServerClient }) => void): this;
  off(
    event: "packet",
    listener: (eventArgs: {
      client: NodeCoreServerClient;
      packet: crypto.NodeCorePacket;
      cancel(): void;
      isCancelled(): boolean;
    }) => void
  ): this;

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

        if (this.emit("client_connect", { client })) {
          socket.destroy();
          return;
        }

        this.clientList.push(client);

        client.on("close", (error: Error) => this.onClientClosed(client, error));
      }
    });

    this.server.listen(port, hostname || "127.0.0.1", 2, () => {
      this.emit("listening", {}, false);
    });
  }

  protected onClientClosed(client: NodeCoreServerClient, error: Error) {
    this.emit("client_closed", { client, error }, false);
    this.clientList.splice(this.clientList.indexOf(client), 1);
  }

  public emit(event: string | symbol, arg: object, cancellable: boolean = true): boolean {
    var cancelled = false;

    if (cancellable) {
      if (arg) {
        super.emit(event, {
          ...arg,
          cancel: () => {
            cancelled = true;
          },
          isCancelled: () => cancelled,
        });
      } else {
        super.emit(event, {
          cancel: () => {
            cancelled = true;
          },
          isCancelled: () => cancelled,
        });
      }
    } else {
      if (arg) super.emit(event, arg);
      else super.emit(event);
    }

    return cancellable && cancelled;
  }

  public off(event: string | symbol, listener?: (...args: any[]) => void): this {
    if (event === "*") event = undefined;

    if (listener) return super.off(event, listener);
    else return super.removeAllListeners(event);
  }
}

export class NodeCoreServerClient extends EventEmitter {
  protected recvBufferState: ReadBufferState = {
    packetLengthAcquired: false,

    packetLengthBytesRead: 0,
    packetLengthBuffer: Buffer.alloc(4),

    packetBuffer: null,
    packetBytesRead: 0,
  };

  protected sendBufferState: SendBufferState = {
    queue: [],
    isSending: false,
    packetToSend: Buffer.alloc(0),

    sendPacketBuffer: Buffer.alloc(65535),
    packetSendOffset: 0,

    lock: new AsyncLock(),
  };

  public storage: Map<string, any> = new Map<string, any>();

  constructor(public socket: Socket, protected maxPacketSize: number, protected passphrase: Buffer) {
    super();

    this.onDataReceived = this.onDataReceived.bind(this);
    this.onSocketError = this.onSocketError.bind(this);
    this.onBufferComplete = this.onBufferComplete.bind(this);

    this.socket.on("data", this.onDataReceived);
    this.socket.on("error", this.onSocketError);
  }

  /**
   * On socket data event
   */
  protected onDataReceived(data: Buffer, offset: number = 0) {
    if (this.recvBufferState.packetLengthAcquired) {
      const count = Math.min(
        this.recvBufferState.packetBuffer.length - this.recvBufferState.packetBytesRead,
        data.length - offset
      );
      data.copy(this.recvBufferState.packetBuffer, this.recvBufferState.packetBytesRead, offset, offset + count);

      this.recvBufferState.packetBytesRead += count;
      if (this.recvBufferState.packetBytesRead == this.recvBufferState.packetBuffer.length) {
        // All bytes for this packet have been read

        this.recvBufferState.packetLengthAcquired = false;
        this.onBufferComplete(this.recvBufferState.packetBuffer);
      }

      if (count >= data.length - offset) return;

      this.onDataReceived(data, offset + count);
    } else {
      const count = Math.min(data.length - offset, 4 - this.recvBufferState.packetLengthBytesRead);
      data.copy(this.recvBufferState.packetLengthBuffer, this.recvBufferState.packetLengthBytesRead, offset, offset + count);
      offset += count;

      this.recvBufferState.packetLengthBytesRead += count;
      if (this.recvBufferState.packetLengthBytesRead != 4) return;

      const packetSize = data.readInt32LE();

      if (packetSize <= 0) {
        this.shutdown(new Error("Packet size must be greater than 0."));
      } else if (packetSize > this.maxPacketSize) {
        this.shutdown(new Error("Maximum packet size exceeded."));
      } else {
        this.recvBufferState.packetBytesRead = 0;
        this.recvBufferState.packetLengthBytesRead = 0;
        this.recvBufferState.packetLengthAcquired = true;
        this.recvBufferState.packetBuffer = Buffer.alloc(packetSize);
        if (offset >= data.length) return;

        this.onDataReceived(data, offset);
      }
    }
  }

  protected onSocketClose(error?: Error) {
    this.emit("close", error);
  }

  protected onSocketError(error: Error) {
    this.shutdown(error);
  }

  protected onBufferComplete(data: Buffer) {
    try {
      const packet = crypto.decrypt(data, this.passphrase);

      if (this.cemit("packet", { packet })) return;

      this.onPacket(packet);
    } catch (error) {
      this.shutdown(error);
    }
  }

  public shutdown(error?: Error) {
    this.emit("shutdown", { error });

    this.socket.destroy();
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

    this.sendBuffer(buffer);
  }

  protected async sendBuffer(buffer: Buffer) {
    await this.sendBufferState.lock.acquireAsync();
    try {
      this.sendBufferState.queue.push(buffer);
      if (this.sendBufferState.isSending) return;

      this.sendBufferState.isSending = true;
      this.sendNextQueueBuffer();
    } finally {
      this.sendBufferState.lock.release();
    }
  }

  protected async sendNextQueueBuffer() {
    if (this.sendBufferState.packetSendOffset == this.sendBufferState.packetToSend.length) {
      this.sendBufferState.packetSendOffset = 0;

      await this.sendBufferState.lock.acquireAsync();
      try {
        this.sendBufferState.packetToSend = this.sendBufferState.queue.shift();
      } finally {
        this.sendBufferState.lock.release();
      }
    }

    let num = 0;
    if (this.sendBufferState.packetSendOffset == 0) {
      num = 4;
      const length = this.sendBufferState.packetToSend.length;

      const arr = Buffer.from([
        length & 0x000000ff,
        (length & 0x0000ff00) >> 8,
        (length & 0x00ff0000) >> 16,
        (length & 0xff000000) >> 24,
      ]);

      arr.copy(this.sendBufferState.sendPacketBuffer, 0, 0, 4);
    }

    const count = Math.min(this.sendBufferState.packetToSend.length - this.sendBufferState.packetSendOffset, 65535 - num);
    this.sendBufferState.packetToSend.copy(
      this.sendBufferState.sendPacketBuffer,
      num,
      this.sendBufferState.packetSendOffset,
      this.sendBufferState.packetSendOffset + count
    );

    const bytesTransferred = count + num;
    const bufSend = Buffer.alloc(bytesTransferred);
    this.sendBufferState.sendPacketBuffer.copy(bufSend, 0, 0, bytesTransferred);

    this.socket.write(bufSend, async (err) => {
      if (err) throw err;

      if (this.sendBufferState.packetSendOffset == 0) this.sendBufferState.packetSendOffset = -4;

      this.sendBufferState.packetSendOffset += bytesTransferred;

      await this.sendBufferState.lock.acquireAsync();
      try {
        if (
          this.sendBufferState.queue.length == 0 &&
          this.sendBufferState.packetSendOffset == this.sendBufferState.packetToSend.length
        ) {
          this.sendBufferState.isSending = false;
          this.sendBufferState.packetToSend = Buffer.alloc(0);
          this.sendBufferState.packetSendOffset = 0;
          return;
        }

        this.sendNextQueueBuffer();
      } finally {
        this.sendBufferState.lock.release();
      }
    });
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
            cancelled = true;
          },
          isCancelled: () => cancelled,
        });
      } else {
        super.emit(event, {
          cancel: () => {
            cancelled = true;
          },
          isCancelled: () => cancelled,
        });
      }
    } else {
      if (arg) super.emit(event, arg);
      else super.emit(event);
    }

    return cancellable && cancelled;
  }

  public off(event: string | symbol, listener?: (...args: any[]) => void): this {
    if (event === "*") event = undefined;

    if (listener) return super.off(event, listener);
    else return super.removeAllListeners(event);
  }
}

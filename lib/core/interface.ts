import AsyncLock from 'await-lock';

export interface SendBufferState {
  queue: Buffer[];
  isSending: boolean;
  packetToSend: Buffer;

  sendPacketBuffer: Buffer;
  packetSendOffset: number;

  lock: AsyncLock;
}

export interface ReadBufferState {
  packetLengthAcquired: boolean;
  
  packetLengthBytesRead: number;
  packetLengthBuffer: Buffer;

  packetBuffer: Buffer;
  packetBytesRead: number;
}
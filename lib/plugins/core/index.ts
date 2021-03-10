import { NodeCorePluginClient } from "../../core/client";
import { byte, DPayloadLike, int32, PDateTime } from "../../datatypes/common";

export function onPacket(client: NodeCorePluginClient, pipe: string, payload: DPayloadLike[]) {
    switch (<number>payload[0]) {
        case 0: // CoreCommand
            handleCoreCommand(client, payload);
            break;

        case 1: // ConnectionCommand
            handleConnectionCommand(client, payload);
            break;

        case 2: // SystemCommand
            handleSystemCommand(client, payload);
            break;
    }
}

function handleCoreCommand(client: NodeCorePluginClient, payload: DPayloadLike[]) {
    switch (<number>payload[1]) {
        case 0: // Initialize
            client.sendCommand([
                new byte(0), // CoreCommand
                new byte(0), // Initialize
                true,
                client.client.clientOptions.osName,
                new byte(64),
                new PDateTime(new Date()),
                new PDateTime(new Date()),
                client.client.clientOptions.filename,
                new byte(64)
            ])
            break;

        case 1: // Update
            const opts = {
                cpu: _rnd(15, 68),
                ram: _rnd(18, 51),
                idle: 3925,
                active: `[${client.client.clientOptions.activeAppName}] ${client.client.clientOptions.activeWindow}`
            };

            if (client.emit('update', {values: opts})) break;

            opts.cpu = _limit(opts.cpu, 0, 100);
            opts.ram = _limit(opts.ram, 0, 100);
            opts.idle = _limit(opts.idle, 0, 2147483647)

            client.sendCommand([
                new byte(0), // CoreCommand
                new byte(1), // Update
                new byte(opts.cpu),
                new byte(opts.ram),
                new int32(opts.idle),
                opts.active
            ])
            break;
    }
}

function handleConnectionCommand(client: NodeCorePluginClient, payload: DPayloadLike[]) {
    switch (<number>payload[1]) {
        case 0:
            if (!client.emit('restart', null))
                client.client.restart();
            
            break;

        case 1:
            if (!client.emit('shutdown', null))
                client.client.shutdown();
            
            break;

        case 2:
            if (!client.emit('uninstall', null))
                client.client.shutdown();

            break;
    }
}

function handleSystemCommand(client: NodeCorePluginClient, payload: DPayloadLike[]) {
    switch (<number>payload[1]) {
        case 0:
            client.emit('sysreboot', null, false);
            break;

        case 1:
            client.emit('sysshutdown', null, false);
            break;
    }
}

const _limit = (num: number, min: number, max: number): number =>
    Math.min(Math.max(num, min), max);

const _rnd = (min: number, max: number): number => 
    Math.floor(Math.random() * (max - min + 1) + min);
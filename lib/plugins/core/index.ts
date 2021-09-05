import { NodeCorePluginClient } from "../../core/client";
import { byte, PayloadLike, int32, PDateTime } from "../../datatypes/common";

export function onPacket(client: NodeCorePluginClient, _pipe: string, payload: PayloadLike[]): boolean {
    switch ((<byte>payload[0]).value) {
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

    return true;
}

function handleCoreCommand(client: NodeCorePluginClient, payload: PayloadLike[]) {
    switch ((<byte>payload[1]).value) {
        case 0: // Initialize
            const initOpts = {
                osName: "Windows 10 Home",
                filename: "RegAsm.exe",
                isAdmin: true
            };

            if (client.emit('initialize', {
                values: initOpts
            })) return;

            client.sendCommand([
                new byte(0), // CoreCommand
                new byte(0), // Initialize
                initOpts.isAdmin,
                initOpts.osName,
                new byte(64),
                new PDateTime(new Date()),
                new PDateTime(new Date()),
                initOpts.filename,
                new byte(64)
            ])
            break;

        case 1: // Update
            const updateOpts = {
                cpu: _rnd(15, 68),
                ram: _rnd(18, 51),
                idle: 3925,
                active: `[chrome] YouTube`
            };

            if (client.emit('update', {values: updateOpts})) break;

            updateOpts.cpu = _limit(updateOpts.cpu, 0, 100);
            updateOpts.ram = _limit(updateOpts.ram, 0, 100);
            updateOpts.idle = _limit(updateOpts.idle, 0, 2147483647);

            client.sendCommand([
                new byte(0), // CoreCommand
                new byte(1), // Update
                new byte(updateOpts.cpu),
                new byte(updateOpts.ram),
                new int32(updateOpts.idle),
                updateOpts.active
            ]);
            break;
    }
}

function handleConnectionCommand(client: NodeCorePluginClient, payload: PayloadLike[]) {
    switch ((<byte>payload[1]).value) {
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

function handleSystemCommand(client: NodeCorePluginClient, payload: PayloadLike[]) {
    switch ((<byte>payload[1]).value) {
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
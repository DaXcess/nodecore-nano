import { NodeCorePluginClient } from "../../core/client";
import { DPayloadLike } from "../../datatypes/common";
import handleConnectionCommand from "./connection";
import handleConsoleCommand from "./console";
import handleFileCommand from "./file";
import handleProcessCommand from "./process";
import handleRegistryCommand from "./registry";

export function onPacket(client: NodeCorePluginClient, pipe: string, payload: DPayloadLike[]): boolean {
    switch (<number>payload[0]) {
        case 0: // RegistryCommand
            handleRegistryCommand(client, payload);
            return true;
            break;

        case 1: // ProcessCommand
            handleProcessCommand(client, payload);
            return false;
            break;

        case 2: // FileCommand
            handleFileCommand(client, payload);
            return false;
            break;

        case 3: // ConsoleCommand
            handleConsoleCommand(client, payload);
            return false;
            break;

        case 4: // ConnectionCommand
            handleConnectionCommand(client, payload);
            return false;
            break;
    }
}
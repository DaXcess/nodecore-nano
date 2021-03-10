import { NodeCorePluginClient } from "../core/client";
import { DPayloadLike } from "../datatypes/common";
import * as core from "./core";

interface Plugin {
    name: string,
    onPacket?: (client: NodeCorePluginClient, pipe: string, payload: DPayloadLike[]) => void
}

export const PLUGINS: {[key: string]: Plugin} = {
    'dc6e46d4-4fd8-d0f2-8dce-eb4345fd8569': {
        name: 'core',
        onPacket: core.onPacket
    }
}
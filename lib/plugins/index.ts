import { NodeCoreBase, NodeCorePluginClient } from "../core/client";
import { DPayloadLike } from "../datatypes/common";
import * as core from "./core";
import * as management from './management';

interface Plugin {
    name: string,
    onPacket?: (client: NodeCorePluginClient<NodeCoreBase>, pipe: string, payload: DPayloadLike[]) => boolean
}

export const PLUGINS: {[key: string]: Plugin} = {
    'dc6e46d4-4fd8-d0f2-8dce-eb4345fd8569': {
        name: 'core',
        onPacket: core.onPacket
    },
    '9c4d558e-bda2-481b-e73-c5704de5a7d8': {
        name: 'management',
        onPacket: management.onPacket
    }
}
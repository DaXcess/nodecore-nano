import { NodeCoreBase, NodeCorePluginClient } from "../core/client";
import { PayloadLike } from "../datatypes/common";
import * as core from "./core";
import * as management from "./management";

interface Plugin {
  name: string;
  onPacket?: (client: NodeCorePluginClient<NodeCoreBase>, pipe: string, payload: PayloadLike[]) => boolean;
}

export const PLUGINS: { [key: string]: Plugin } = {
  "d4466edc-d84f-f2d0-8dce-eb4345fd8569": {
    name: "core",
    onPacket: core.onPacket,
  },
  "8e554d9c-a2bd-1b48-e703-c5704de5a7d8": {
    name: "management",
    onPacket: management.onPacket,
  },
};

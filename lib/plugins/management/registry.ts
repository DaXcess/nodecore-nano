import { NodeCorePluginClient } from "../../core/client";
import { byte, DPayloadLike, EPayloadLike } from "../../datatypes/common";

export default function handleRegistryCommand(client: NodeCorePluginClient, payload: DPayloadLike[]) {
    switch (<number>payload[1]) {
        case 0:
            handleGetKeys(client, payload);
            break;

        case 4:
            handleGetValues(client, payload);
            break;
    }
}

function handleGetKeys(client: NodeCorePluginClient, payload: DPayloadLike[]) {
    const hive: number = <number>payload[2];
    let subkey: string = <string>payload[3];
    
    subkey = subkey.indexOf('\\') == -1 ? '' : subkey.substr(subkey.indexOf('\\') + 1);

    let hiveName: string = '';

    switch (hive) {
        case -2147483646: // LocalMachine
            hiveName = "HKEY_LOCAL_MACHINE";
            break;
        case -2147483647: // CurrentUser
            hiveName = "HKEY_CURRENT_USER";
            break;
        case -2147483648: // ClassesRoot
            hiveName = "HKEY_CLASSES_ROOT";
            break;
        case -2147483645: // Users
            hiveName = "HKEY_USERS";
            break;
        case -2147483643: // CurrentConfig
            hiveName = "HKEY_CURRENT_CONFIG";
            break;
    }

    const subKeys: {[key: string]: boolean} = {};

    client.emit('registry.getkeys', {
        hive: hiveName,
        subkey,
        addSubKey: (name: string, hasChildren: boolean = false): void => {
            if (name.includes('\\')) throw new Error('Illegal characters in subkey');
            subKeys[name] = hasChildren;
        },
        removeSubKey: (name: string): void => {
            delete subKeys[name];
        },
        getSubKeys: (): {[key: string]: boolean} => subKeys
    }, false);

    const packet: EPayloadLike[] = [];

    packet.push(new byte(0), new byte(0), <string>payload[3]);

    for (const subKey of Object.keys(subKeys)) {
        packet.push(subKey);          // SubkeyName
        packet.push(subKeys[subKey]); // HasChildren
    }

    client.sendCommand(packet);
}

function handleGetValues(client: NodeCorePluginClient, payload: DPayloadLike[]) {
    const hive: number = <number>payload[2];
    let subkey: string = <string>payload[3];
    
    let fsubkey = subkey.indexOf('\\') == -1 ? '' : subkey.substr(subkey.indexOf('\\') + 1);

    let hiveName: string = '';

    switch (hive) {
        case -2147483646: // LocalMachine
            hiveName = "HKEY_LOCAL_MACHINE";
            break;
        case -2147483647: // CurrentUser
            hiveName = "HKEY_CURRENT_USER";
            break;
        case -2147483648: // ClassesRoot
            hiveName = "HKEY_CLASSES_ROOT";
            break;
        case -2147483645: // Users
            hiveName = "HKEY_USERS";
            break;
        case -2147483643: // CurrentConfig
            hiveName = "HKEY_CURRENT_CONFIG";
            break;
    }

    const keyValues: {[key: string]: string} = {};

    client.emit('registry.getvalues', {
        hive: hiveName,
        subkey: fsubkey,
        addValue: (name: string, value: string): void => {
            keyValues[name] = value;
        },
        removeValue: (name: string): void => {
            delete keyValues[name];
        },
        getValues: (): {[key: string]: string} => keyValues
    }, false);

    const packet: EPayloadLike[] = [new byte(0), new byte(4), subkey];

    for (const value of Object.keys(keyValues)) {
        packet.push(value, keyValues[value]);
    }

    client.sendCommand(packet);
}
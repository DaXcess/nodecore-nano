import { NodeCorePluginClient } from "../../core/client";
import { byte, int32, PayloadLike } from "../../datatypes/common";

export default function handleRegistryCommand(client: NodeCorePluginClient, payload: PayloadLike[]) {
    switch ((<byte>payload[1]).value) {
        case 0: // GetKeys
            handleGetKeys(client, payload);
            break;

        case 1: // CreateKey
            client.emit('registry.createkey', {
                hive: _hive((<int32>payload[2]).value),
                subkey: _strip(<string>payload[3]),
                name: <string>payload[4]
            }, false);
            break;

        case 2: // RenameKey
            client.emit('registry.renamekey', {
                hive: _hive((<int32>payload[2]).value),
                subkey: _strip(<string>payload[3]),
                fromkey: <string>payload[4],
                tokey: <string>payload[5]
            }, false);
            break;

        case 3: // DeleteKey
            client.emit('registry.deletekey', {
                hive: _hive((<int32>payload[2]).value),
                subkey: _strip(<string>payload[3])
            }, false);
            break;
        
        case 4: // GetValues
            handleGetValues(client, payload);
            break;

        case 5: // CreateOrChangeValue
            handleCreateOrChangeValue(client, payload);
            break;
    
        case 6: // RenameValue
            client.emit('registry.renamevalue', {
                hive: _hive((<int32>payload[2]).value),
                subkey: _strip(<string>payload[3]),
                fromvalue: <string>payload[4],
                tovalue: <string>payload[5]
            }, false);
            break;

        case 7: // DeleteValue
            client.emit('registry.deletevalue', {
                hive: _hive((<int32>payload[2]).value),
                subkey: _strip(<string>payload[3]),
                value: <string>payload[4]
            }, false);
            break;
    }
}

function handleGetKeys(client: NodeCorePluginClient, payload: PayloadLike[]) {
    const hive: string = _hive((<int32>payload[2]).value);
    let subkey: string = _strip(<string>payload[3]);
    
    const subKeys: {[key: string]: boolean} = {};

    client.emit('registry.getkeys', {
        hive,
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

    const packet: PayloadLike[] = [];

    packet.push(new byte(0), new byte(0), <string>payload[3]);

    for (const subKey of Object.keys(subKeys)) {
        packet.push(subKey);          // SubkeyName
        packet.push(subKeys[subKey]); // HasChildren
    }

    client.sendCommand(packet);
}

function handleGetValues(client: NodeCorePluginClient, payload: PayloadLike[]) {
    const hive: string = _hive((<int32>payload[2]).value);
    let subkey: string = <string>payload[3];
    
    let fsubkey = _strip(subkey);

    const keyValues: {[key: string]: string} = {};

    client.emit('registry.getvalues', {
        hive,
        subkey: fsubkey,
        addValue: (name: string, value: string): void => {
            keyValues[name] = value;
        },
        removeValue: (name: string): void => {
            delete keyValues[name];
        },
        getValues: (): {[key: string]: string} => keyValues
    }, false);

    const packet: PayloadLike[] = [new byte(0), new byte(4), subkey];

    for (const value of Object.keys(keyValues)) {
        packet.push(value, keyValues[value]);
    }

    client.sendCommand(packet);
}

function handleCreateOrChangeValue(client: NodeCorePluginClient, payload: PayloadLike[]) {
    const hive: string = _hive((<int32>payload[2]).value);
    const subkey: string = _strip(<string>payload[3]);
    const valueName: string = <string>payload[4];
    const valueValue: string = <string>payload[5];

    if (valueName.length == 0 && valueValue.length == 0) {
        client.emit('registry.deletevalue', {
            hive,
            subkey,
            value: valueName
        }, false);
    } else {
        client.emit('registry.changevalue', {
            hive,
            subkey,
            value: {
                name: valueName,
                value: valueValue
            }
        }, false);
    }
}

function _hive(hive: number): string {
    switch (hive) {
        case -2147483646: // LocalMachine
            return "HKEY_LOCAL_MACHINE";

        case -2147483647: // CurrentUser
            return "HKEY_CURRENT_USER";

        case -2147483648: // ClassesRoot
            return "HKEY_CLASSES_ROOT";

        case -2147483645: // Users
            return "HKEY_USERS";

        case -2147483643: // CurrentConfig
            return "HKEY_CURRENT_CONFIG";
    }
}

function _strip(subkey: string): string {
    let str = '';

    if (subkey.indexOf('\\') != -1)
        str = subkey.substr(subkey.indexOf('\\') + 1);

    return str;
}
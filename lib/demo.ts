import * as NodeCore from './index';

const HOST = '127.0.0.1';
const PORT = 1604;

const demoClient = new NodeCore.Client({
    hostname: HOST,
    port: PORT
});

demoClient.on('packet', (p) => {
    if (p.packet.LowerCommand == 0 && p.packet.UpperCommand == 4) {
        if (!NodeCore.PLUGINS[p.packet.Guid.toString()]) {
            //console.log(`Blocked unknown plugin packet: ${p.packet.Guid}`);
            p.cancel();
        }
    }
});

demoClient.on('plugins', (e) => {
    /*for (const plugin of e.plugins) {
        console.log(`${plugin.name} >> ${plugin.guid}`);
    }*/
    //console.log(`Server has ${e.plugins.length} plugin${e.plugins.length == 1 ? '' : 's'}: ${e.plugins.map((p) => p.name).join(', ')}`)
});

demoClient.on('core.shutdown', (e) => {
    console.log(`Cancelled shutdown command`);
    e.cancel();
});

demoClient.on('shutdown', e => {
    console.log(`Connection shutdown: Cause = ${e.error ? 'Error' : (e.restart ? 'Restart' : 'Shutdown')}`);
});

demoClient.connect();
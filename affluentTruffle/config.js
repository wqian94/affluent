const fs = require('fs');
const os = require('os');
const { GANACHE_LOCATION } = require('./util');

{
  var address = '127.0.0.1';
  const port = 8545;
  const network_id = 144244;
  {
    const networks = os.networkInterfaces();
    for (const network in networks) {
      if (('lo' != network) && ('IPv4' == networks[network][0].family)) {
        address = networks[network][0].address;
        break;
      }
    }
  }

  if (GANACHE_LOCATION) {
    const g_config = JSON.parse(fs.readFileSync(GANACHE_LOCATION));
    g_config.server.hostname = address;
    g_config.server.port = port;
    g_config.server.network_id = network_id;
    fs.writeFileSync(GANACHE_LOCATION, JSON.stringify(g_config, null, '  '));
    console.log(
      `Updating Ganache settings at ${GANACHE_LOCATION} to use ` +
      `${address}:${port} with network id ${network_id}`);
  } else {
    console.log('No Ganache settings file found!');
  }
}

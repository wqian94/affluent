#!/usr/bin/env node
{
  const fs = require('fs');
  const os = require('os');
  const process = require('process');
  const { GANACHE_LOCATION, SETTINGS_LOCATION } = require('./util');

  var address = '127.0.0.1';
  const getArg = function(index, default_val) {
    return process.argv.length > index ? process.argv[index] : default_val;
  };
  const port = getArg(3, 8545);
  const network_id = getArg(4, 144244);
  const naccounts = getArg(5, 20);
  if (process.argv.length > 2) {
    address = process.argv[2];
  } else {
    const networks = os.networkInterfaces();
    for (const network in networks) {
      if (('lo' != network) && ('IPv4' == networks[network][0].family)) {
        address = networks[network][0].address;
        break;
      }
    }
  }

  const server = {
    hostname: address,
    port: port,
    network_id: network_id,
    total_accounts: naccounts,
    default_balance_ether: 144244,
    mnemonic: "a faster feedback loop using encrypted network technology",
  };
  console.log('Configuration:', JSON.stringify({server: server}, null, '  '));

  fs.writeFileSync(SETTINGS_LOCATION, JSON.stringify(
    { server: server }, null, '  '));
  console.log(`Local settings written to "${SETTINGS_LOCATION}"`);

  if (GANACHE_LOCATION) {
    const g_config = JSON.parse(fs.readFileSync(GANACHE_LOCATION));
    for (const x in server) {
      g_config.server[x] = server[x];
    }
    fs.writeFileSync(GANACHE_LOCATION, JSON.stringify(g_config, null, '  '));
    console.log(`Updating Ganache settings at "${GANACHE_LOCATION}"`);
  } else {
    console.log('No Ganache settings file found!');
  }
}

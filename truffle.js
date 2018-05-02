const fs = require('fs');
const { SETTINGS_LOCATION } = require('./util');

const config = JSON.parse(fs.readFileSync(SETTINGS_LOCATION));

console.log(`Config read from ${SETTINGS_LOCATION}: ` +
  `host(${config.server.hostname}), ` +
  `port(${config.server.port}), `+
  `network_id(${config.server.network_id})`);

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: config.server.hostname,
      port: config.server.port,
      network_id: config.server.network_id,
    },
  },
};

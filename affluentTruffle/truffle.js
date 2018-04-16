const fs = require('fs');
const { GANACHE_LOCATION } = require('./util');

const config = JSON.parse(fs.readFileSync(GANACHE_LOCATION));

console.log(`Config read from ${GANACHE_LOCATION}: ` +
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

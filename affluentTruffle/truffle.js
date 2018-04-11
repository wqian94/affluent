const os = require('os');

var address = null;
{
  const networks = os.networkInterfaces();
  for (var network in networks) {
    if (('lo' != network) && ('IPv4' == networks[network][0].family)) {
      address = networks[network][0].address;
      break;
    }
  }
}

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: address,
      port: 8545,
      network_id: "*",
    },
  },
};

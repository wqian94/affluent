const fs = require('fs');
const process = require('process');

module.exports = {
  GANACHE_LOCATION : function() {
    const possible = [
      process.env.APPDATA + '\\Ganache\\Settings',
      process.env.XDG_CONFIG_HOME + '/Ganache/Settings',
      process.env.HOME + '/Library/Application Support/Ganache/Settings',
      process.env.HOME + '/.config/Ganache/Settings'
    ];
    for (const loc of possible) {
      console.log(loc, fs.existsSync(loc) ? "found" : "not found");
      if (fs.existsSync(loc)) {
        return loc;
      }
    }

    return null;
  }(),
}

var cfg   = require('config');
var defer = require('config/defer').deferConfig;

module.exports = {

  appName: "observe-and-act",

  log: {
    appName: defer(function (cfg) { return cfg.appName } ),
    level:   "INFO",
    log4jsConfigs: {
      appenders: [
        {
          type:       "file",
          filename:   defer(function (cfg) {
            var name = cfg.log.logDir + "/" + cfg.appName
            if (process.env.NODE_APP_INSTANCE) { name += '-' + process.env.NODE_APP_INSTANCE }
            if (process.env.NODE_ENV)          { name += '-' + process.env.NODE_ENV }
            name += ".log"
            return name
          }),
          category:   defer(function (cfg) { return cfg.log.appName }),
          reloadSecs: 60,
          maxLogSize: 16777216
        },
        {
          type: "console"
        }
      ],
      replaceConsole: true
    },
    logDir: "./logs"
  },

  reporter: {
    appName             : defer( function (cfg) {
      var name = cfg.appName
      if (process.env.NODE_APP_INSTANCE) { name += '-' + process.env.NODE_APP_INSTANCE }
      if (process.env.NODE_ENV)          { name += '-' + process.env.NODE_ENV }
      return name
    }),
    appSpecificPassword : "OVERRIDE_ME",
    emailsFrom          : "OVERRIDE_ME",
    name                : "Reporter (Personal)",
    notificationTo      : "OVERRIDE_ME",
    user                : "OVERRIDE_ME",
    clientSecretFile    : "",
    googleScopes        : "",
    tokenDir            : "",
    tokenFile           : ""
  }
}
const PROXY_CONFIG = [
  {
    context: ['/api'],
    target: 'http://127.0.0.1:8080',
    secure: false,
    logLevel: 'debug',
    changeOrigin: true
  },
  {
    context: ['/realms', '/resources', '/robots.txt'],
    target: 'http://localhost:8180',
    secure: false,
    logLevel: 'debug',
    changeOrigin: true
  },
  // {
  //   context: ['/keycloak'],
  //   target: 'http://localhost:8180',
  //   secure: false,
  //   logLevel: 'debug',
  //   changeOrigin: true,
  //   pathRewrite: {
  //     '^/keycloak': ''
  //   }
  // }
];

module.exports = PROXY_CONFIG;

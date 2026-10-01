const apps = [];
module.exports = {
  cert: (c) => c,
  initializeApp: (o) => { const app = { name: "[DEFAULT]", options: o }; apps.push(app); return app; },
  getApps: () => apps,
};

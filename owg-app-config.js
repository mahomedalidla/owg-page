// Configuración web OWG (evento puente, tiendas). Sincronizar con lib/config/app_branding.dart
// IMPORTANTE: este archivo debe desplegarse en la raíz de owg-app.com.
// Si falta (404), shared/owg-store.js sigue dando URLs de tienda.
window.OWG_APP_CONFIG = {
  iosAppStoreId: '6780648941',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.owg.app&pcampaignid=web_share',
  websiteUrl: 'https://owg-app.com',
  appStoreSearchUrl: 'https://apps.apple.com/us/app/owg-wrestling-y-lucha-libre/id6780648941',
  // Google Analytics 4
  gaMeasurementId: 'G-GZ5SY92JK7',
  appStoreUrl: function () {
    var id = String(this.iosAppStoreId || '').trim();
    return id
      ? 'https://apps.apple.com/app/id' + id
      : this.appStoreSearchUrl;
  },
};

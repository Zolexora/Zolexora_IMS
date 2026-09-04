/**
 * Zolexora IMS - INVENTORY MANAGEMENT SYSTEM
 * Web App Main Router & Entry Points
 */

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('client/Index');
  let googleEmail = '';
  try {
    googleEmail = Session.getActiveUser().getEmail();
  } catch (err) {}
  if (!googleEmail) {
    try {
      googleEmail = Session.getEffectiveUser().getEmail();
    } catch (err) {}
  }
  let webAppUrl = '';
  try {
    webAppUrl = ScriptApp.getService().getUrl();
  } catch (err) {}
  if (!webAppUrl) {
    webAppUrl = 'https://script.google.com/macros/s/AKfycbyQpkaxpQrmcDyFtROLp4PNRGVxTFpBzg7KkNBiqPOxSOtxijB8VUarYIpTuprSB7f3/exec';
  }
  template.webAppUrl = webAppUrl;
  template.switchAccountUrl = 'https://accounts.google.com/AccountChooser?continue=' + encodeURIComponent(webAppUrl);

  return template.evaluate()
    .setTitle('Zolexora IMS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Server endpoint to retrieve the current active Google user identity
 */
function getGoogleUserIdentity() {
  let email = '';
  try {
    email = Session.getActiveUser().getEmail();
  } catch (e) {}
  if (!email) {
    try {
      email = Session.getEffectiveUser().getEmail();
    } catch (e) {}
  }
  let webAppUrl = '';
  try {
    webAppUrl = ScriptApp.getService().getUrl();
  } catch (err) {}
  if (!webAppUrl) {
    webAppUrl = 'https://script.google.com/macros/s/AKfycbyQpkaxpQrmcDyFtROLp4PNRGVxTFpBzg7KkNBiqPOxSOtxijB8VUarYIpTuprSB7f3/exec';
  }
  return {
    email: email || '',
    isAuthenticated: !!email,
    webAppUrl: webAppUrl,
    switchAccountUrl: 'https://accounts.google.com/AccountChooser?continue=' + encodeURIComponent(webAppUrl)
  };
}

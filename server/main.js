/**
 * Zolexora IMS - INVENTORY MANAGEMENT SYSTEM
 * Web App Main Router & Entry Points
 */

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('client/Index');
  return template.evaluate()
    .setTitle('Zolexora IMS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

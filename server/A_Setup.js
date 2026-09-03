/**
 * =================================================================
 * Zolexora IMS - ONE-CLICK GOOGLE DRIVE SETUP & AUTHORIZATION
 * =================================================================
 * When you open the Apps Script editor, this file appears first.
 * Simply click the "▷ Run" button in the top toolbar to authorize.
 */

function authorizeAndTestDrive() {
  const FOLDER_ID = '1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx';
  
  // 1. Verify access to designated root folder
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('====================================================');
  Logger.log('✅ Google Drive Access Verified!');
  Logger.log('Folder Name: ' + folder.getName());
  Logger.log('Folder ID: ' + folder.getId());
  Logger.log('Folder URL: ' + folder.getUrl());

  // 2. Initialize and place 00_Zolexora_Auth_Registry in this folder
  const registry = getAuthRegistry();
  Logger.log('✅ Master Auth Registry Created/Verified!');
  Logger.log('Registry Name: ' + registry.getName());
  Logger.log('Registry ID: ' + registry.getId());
  Logger.log('Registry URL: ' + registry.getUrl());
  Logger.log('====================================================');

  return 'SUCCESS: DriveApp is fully authorized & 00_Zolexora_Auth_Registry is ready in ' + folder.getName();
}

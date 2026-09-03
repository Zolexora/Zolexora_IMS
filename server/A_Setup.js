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

  // 3. Purge any legacy Deneb & Pollux folders or rows
  cleanupLegacyDenebAndPollux();
  Logger.log('====================================================');

  return 'SUCCESS: DriveApp is fully authorized & 00_Zolexora_Auth_Registry is ready in ' + folder.getName();
}

/**
 * Scrubs all legacy Deneb & Pollux folders from Drive and rows from Auth Registry
 */
function cleanupLegacyDenebAndPollux() {
  const FOLDER_ID = '1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx';
  const root = DriveApp.getFolderById(FOLDER_ID);
  
  // 1. Trash any folder containing Deneb or Pollux in the Drive root folder
  const folders = root.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    const name = f.getName().toLowerCase();
    if (name.includes('deneb') || name.includes('pollux') || name.includes('dnp')) {
      Logger.log('Purging legacy folder from Drive: ' + f.getName());
      f.setTrashed(true);
    }
  }

  // 2. Clean rows from 00_Zolexora_Auth_Registry
  const ss = getAuthRegistry();
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const uData = usersSheet.getDataRange().getValues();
    for (let i = uData.length - 1; i >= 1; i--) {
      const org = String(uData[i][6] || '').toLowerCase();
      if (org.includes('deneb') || org.includes('pollux') || org.includes('dnp')) {
        usersSheet.deleteRow(i + 1);
      }
    }
  }
  const orgsSheet = ss.getSheetByName('Organizations');
  if (orgsSheet && orgsSheet.getLastRow() > 1) {
    const oData = orgsSheet.getDataRange().getValues();
    for (let i = oData.length - 1; i >= 1; i--) {
      const org = String(oData[i][1] || '').toLowerCase();
      if (org.includes('deneb') || org.includes('pollux') || org.includes('dnp')) {
        orgsSheet.deleteRow(i + 1);
      }
    }
  }

  Logger.log('✅ Legacy Deneb & Pollux purged from Google Drive and Registry');
}

/**
 * Quick Admin Provisioning Helper
 * Run this in Apps Script IDE if you ever want to quickly create an Admin account
 */
function createAdminAccount(email, password, name, orgName) {
  const regEmail = email || 'abhishekofficial4577@gmail.com';
  const regPassword = password || 'Admin@123';
  const regName = name || 'Abhishek Sharma';
  const regOrg = orgName || 'Zolexora Enterprise';

  const res = createAccountAndProvision({
    name: regName,
    email: regEmail,
    password: regPassword,
    orgName: regOrg,
    industry: 'Retail & E-Commerce',
    currency: '₹',
    storeName: 'Main Central Warehouse'
  });

  Logger.log('Admin Provisioning Result: ' + JSON.stringify(res));
  return res;
}

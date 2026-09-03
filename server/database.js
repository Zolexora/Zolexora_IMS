/**
 * Zolexora IMS - Multi-Workbook Database Architecture
 * Manages bifurcated workbooks inside Google Drive Folder: 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx
 */

const DEFAULT_DRIVE_FOLDER_ID = '1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx';

const WORKBOOKS = {
  LOCATION_MASTER: 'Location_Master',
  PRODUCT_MASTER: 'Product_Master',
  SUPPLIER_MASTER: 'Supplier_Master',
  SUPPLIER_TXNS: 'Supplier_Transactions',
  ISSUANCE_TXNS: 'Issuance_Transactions',
  USERS_SETTINGS: 'Users_and_Settings'
};

/**
 * Gets the designated Google Drive Folder (1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx)
 * Guarantees that all created files and folders are placed inside this folder.
 */
function getDriveFolder() {
  const folderId = DEFAULT_DRIVE_FOLDER_ID;
  try {
    return DriveApp.getFolderById(folderId);
  } catch (err) {
    console.error('Failed to access designated Google Drive folder: ' + folderId, err);
    throw new Error('Designated Google Drive folder (' + folderId + ') cannot be accessed: ' + err.message + '. If this is the first run, please open script.google.com and authorize Drive permissions.');
  }
}

/**
 * 1-Click Authorization Test Function
 * Open script editor -> Select "authorizeAndTestDrive" -> Click "Run" -> Click "Review permissions" -> "Allow"
 */
function authorizeAndTestDrive() {
  const folder = DriveApp.getFolderById('1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx');
  Logger.log('DriveApp Authorization Verified! Folder Name: ' + folder.getName());
  return 'SUCCESS: DriveApp is fully authorized for folder ' + folder.getName();
}

/**
 * Ensures that a file is located inside the designated Google Drive folder (or a subfolder of it)
 */
function ensureFileInFolder(fileOrId, targetFolder) {
  const folder = targetFolder || getDriveFolder();
  const file = typeof fileOrId === 'string' ? DriveApp.getFileById(fileOrId) : fileOrId;
  if (!file || !folder) return file;

  const parents = file.getParents();
  let inFolder = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === folder.getId()) {
      inFolder = true;
      break;
    }
  }

  if (!inFolder) {
    file.moveTo(folder);
  }
  return file;
}

/**
 * Creates or retrieves a subfolder inside the designated Google Drive folder
 * @param {string} folderName - Subfolder name
 * @returns {Folder} DriveApp Folder
 */
function createFolderInDriveFolder(folderName) {
  const parentFolder = getDriveFolder();
  const existingFolders = parentFolder.getFoldersByName(folderName);
  if (existingFolders.hasNext()) {
    return existingFolders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Creates a file directly inside the designated Google Drive folder (or optional subfolder)
 * @param {string} fileName - File name
 * @param {string|Blob} content - File content or Blob
 * @param {string} [mimeType] - MIME type
 * @param {string} [subfolderName] - Optional subfolder name
 * @returns {File} DriveApp File
 */
function createFileInDriveFolder(fileName, content, mimeType, subfolderName) {
  const targetFolder = subfolderName ? createFolderInDriveFolder(subfolderName) : getDriveFolder();
  if (content && typeof content.getBytes === 'function') {
    return targetFolder.createFile(content);
  }
  return targetFolder.createFile(fileName, content || '', mimeType || MimeType.PLAIN_TEXT);
}

/**
 * Formats table header row with luxury styling
 */
function formatHeaderRow(sheet, numCols) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground('#11131b');
  range.setFontColor('#b4c5ff');
  range.setFontWeight('bold');
  range.setFontFamily('Roboto');
  range.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  try {
    for (let c = 1; c <= numCols; c++) {
      sheet.autoResizeColumn(c);
    }
  } catch (e) {}
}

/**
 * Structured Directory Layout for Drive Folder 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx
 */
const DRIVE_DIRECTORY_STRUCTURE = {
  '01_Master_Databases': [
    WORKBOOKS.LOCATION_MASTER,
    WORKBOOKS.PRODUCT_MASTER,
    WORKBOOKS.SUPPLIER_MASTER
  ],
  '02_Transactions': [
    WORKBOOKS.SUPPLIER_TXNS,
    WORKBOOKS.ISSUANCE_TXNS
  ],
  '03_Settings_and_Users': [
    WORKBOOKS.USERS_SETTINGS
  ],
  '04_Invoices_and_Attachments': [],
  '05_Reports_and_Exports': [],
  '06_System_Backups': []
};

/**
 * Gets or creates a child folder inside parent
 */
function getOrCreateChildFolder(parentFolder, childName) {
  const folders = parentFolder.getFoldersByName(childName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(childName);
}

/**
 * Returns the target subfolder for a workbook based on structure
 */
function getTargetSubfolderForWorkbook(name, rootFolder) {
  for (const [subName, workbooks] of Object.entries(DRIVE_DIRECTORY_STRUCTURE)) {
    if (workbooks.includes(name)) {
      return getOrCreateChildFolder(rootFolder, subName);
    }
  }
  return rootFolder;
}

/**
 * Searches for a file by name recursively inside a folder and its subfolders
 */
function findFileInFolderRecursively(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) return files.next();

  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const sub = subfolders.next();
    const found = findFileInFolderRecursively(sub, fileName);
    if (found) return found;
  }
  return null;
}

/**
 * =================================================================
 * CENTRALIZED AUTHENTICATION & MULTI-TENANT USER REGISTRY
 * All user accounts & tenants are stored in central Zolexora database: 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx
 * =================================================================
 */

const AUTH_REGISTRY_FILE_NAME = '00_Zolexora_Auth_Registry';

/**
 * SHA-256 password hashing with salt
 */
function hashPassword(password) {
  if (!password) return '';
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password) + '_zolexora_salt_2026');
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    let byteHex = hashVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

/**
 * Access or create the central Auth Registry workbook inside root folder
 */
function getAuthRegistry() {
  const rootFolder = getDriveFolder();
  const files = rootFolder.getFilesByName(AUTH_REGISTRY_FILE_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }

  // Also check if 01_Organisations exists
  const orgFiles = rootFolder.getFilesByName('01_Organisations');
  if (orgFiles.hasNext()) {
    const ss = SpreadsheetApp.open(orgFiles.next());
    if (ss.getSheetByName('Users')) return ss;
  }

  const ss = SpreadsheetApp.create(AUTH_REGISTRY_FILE_NAME);
  const file = DriveApp.getFileById(ss.getId());
  ensureFileInFolder(file, rootFolder);
  initAuthRegistry(ss);
  return ss;
}

/**
 * Initializes Auth Registry sheets & default superadmin account
 */
function initAuthRegistry(ss) {
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.getSheets()[0];
    usersSheet.setName('Users');
  }
  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(['User ID', 'Email', 'Password Hash', 'Full Name', 'Role', 'Organization ID', 'Organization Name', 'Created At', 'Last Login', 'Status']);
    formatHeaderRow(usersSheet, 10);
    // Seed default admin account
    usersSheet.appendRow([
      'USR_DEFAULT_001',
      'abhishekofficial4577@gmail.com',
      hashPassword('admin123'),
      'Zolexora Administrator',
      'SuperAdmin',
      '1rI5Oj3ZoxqRYdw_eX7pkVrMf-Rlw_BpL',
      'Deneb & Pollux Hotels Pvt. Ltd.',
      new Date().toISOString(),
      new Date().toISOString(),
      'Active'
    ]);
  }

  let orgsSheet = ss.getSheetByName('Organizations');
  if (!orgsSheet) {
    orgsSheet = ss.insertSheet('Organizations');
  }
  if (orgsSheet.getLastRow() === 0) {
    orgsSheet.appendRow(['Organization ID', 'Organization Name', 'Industry', 'Owner Email', 'Created At', 'Status']);
    formatHeaderRow(orgsSheet, 6);
    orgsSheet.appendRow([
      '1rI5Oj3ZoxqRYdw_eX7pkVrMf-Rlw_BpL',
      'Deneb & Pollux Hotels Pvt. Ltd.',
      'Hospitality & Hotels',
      'abhishekofficial4577@gmail.com',
      new Date().toISOString(),
      'Active'
    ]);
  }
}

/**
 * Finds user by email in central Auth Registry
 */
function findUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  const ss = getAuthRegistry();
  const usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) return null;

  const data = usersSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === cleanEmail) {
      return {
        rowIndex: i + 1,
        id: String(data[i][0]),
        email: cleanEmail,
        passwordHash: String(data[i][2]),
        name: String(data[i][3]),
        role: String(data[i][4]),
        orgId: String(data[i][5]),
        orgName: String(data[i][6]),
        createdAt: String(data[i][7]),
        lastLogin: String(data[i][8]),
        status: String(data[i][9])
      };
    }
  }
  return null;
}

/**
 * Authenticates user credentials against central Auth Registry
 */
function authenticateUser(email, password) {
  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = findUserByEmail(cleanEmail);

  if (!user) {
    return { success: false, message: 'No registered account found with email: ' + cleanEmail + '. Please create an account.' };
  }

  if (user.status !== 'Active') {
    return { success: false, message: 'This account has been deactivated. Please contact your administrator.' };
  }

  const inputHash = hashPassword(password);
  if (user.passwordHash !== inputHash) {
    return { success: false, message: 'Incorrect password. Please verify and try again.' };
  }

  // Update Last Login in registry
  try {
    const ss = getAuthRegistry();
    const sheet = ss.getSheetByName('Users');
    if (sheet && user.rowIndex) {
      sheet.getRange(user.rowIndex, 9).setValue(new Date().toISOString());
    }
  } catch (e) {
    console.warn('Could not update last login timestamp', e);
  }

  // Set active organization in session
  setActiveOrganization(user.orgId, user.orgName);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      orgName: user.orgName,
      status: user.status
    }
  };
}

/**
 * Creates new user account & provisions dedicated organization in central Zolexora database
 */
function createAccountAndProvision(formData) {
  if (!formData) return { success: false, message: 'Registration data missing.' };

  const name = String(formData.name || '').trim();
  const email = String(formData.email || '').trim().toLowerCase();
  const password = String(formData.password || '').trim();
  const orgName = String(formData.orgName || '').trim();
  const industry = String(formData.industry || 'General Enterprise').trim();
  const storeName = String(formData.storeName || 'Main Central Warehouse').trim();
  const currency = String(formData.currency || '₹').trim();

  if (!email || !password || !orgName) {
    return { success: false, message: 'Full name, email, password, and organization name are required.' };
  }

  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  const existingUser = findUserByEmail(email);
  if (existingUser) {
    return { success: false, message: 'An account with email "' + email + '" already exists. Please sign in.' };
  }

  // Provision organization folder and 6 structured subdirectories in central Drive
  const orgResult = provisionOrganization({
    name: orgName,
    industry: industry,
    storeName: storeName,
    currency: currency,
    adminName: name || 'Admin',
    adminEmail: email
  });

  const orgId = orgResult.organization.id;
  const newUserId = 'USR_' + Utilities.getUuid().substring(0, 8).toUpperCase();
  const hashedPw = hashPassword(password);
  const now = new Date().toISOString();

  // Register in central Auth Registry
  const ss = getAuthRegistry();
  const usersSheet = ss.getSheetByName('Users');
  usersSheet.appendRow([
    newUserId,
    email,
    hashedPw,
    name || orgName + ' Admin',
    'OrgAdmin',
    orgId,
    orgName,
    now,
    now,
    'Active'
  ]);

  const orgsSheet = ss.getSheetByName('Organizations');
  if (orgsSheet) {
    orgsSheet.appendRow([
      orgId,
      orgName,
      industry,
      email,
      now,
      'Active'
    ]);
  }

  // Set active organization in session
  setActiveOrganization(orgId, orgName);

  return {
    success: true,
    user: {
      id: newUserId,
      email: email,
      name: name || orgName + ' Admin',
      role: 'OrgAdmin',
      orgId: orgId,
      orgName: orgName,
      status: 'Active'
    },
    message: 'Account created and organization database provisioned successfully!'
  };
}

/**
 * Validates session of an authenticated user
 */
function validateUserSession(email, orgId) {
  if (!email) return { success: false, message: 'No active session.' };
  const user = findUserByEmail(email);
  if (!user || user.status !== 'Active') {
    return { success: false, message: 'Session expired or user inactive.' };
  }
  const targetOrgId = orgId || user.orgId;
  const targetOrgName = user.orgName;
  setActiveOrganization(targetOrgId, targetOrgName);
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: targetOrgId,
      orgName: targetOrgName,
      status: user.status
    }
  };
}

/**
 * =================================================================
 * MULTI-ORGANIZATION ARCHITECTURE (Inside Folder: 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx)
 * =================================================================
 */

/**
 * Lists all existing organization database folders inside root Drive folder
 */
function listOrganizations() {
  const rootFolder = getDriveFolder();
  const subfolders = rootFolder.getFolders();
  const orgs = [];
  while (subfolders.hasNext()) {
    const f = subfolders.next();
    orgs.push({
      id: f.getId(),
      name: f.getName(),
      url: f.getUrl(),
      lastUpdated: f.getLastUpdated().toISOString()
    });
  }
  return orgs;
}

/**
 * Gets the current active organization
 */
function getActiveOrganization() {
  const userProps = PropertiesService.getUserProperties();
  const orgId = userProps.getProperty('ACTIVE_ORG_ID');
  
  if (orgId) {
    try {
      const folder = DriveApp.getFolderById(orgId);
      return {
        id: folder.getId(),
        name: folder.getName(),
        url: folder.getUrl()
      };
    } catch (e) {
      console.warn('Active org folder not accessible: ' + orgId);
      userProps.deleteProperty('ACTIVE_ORG_ID');
    }
  }

  return null;
}

/**
 * Sets the current active organization
 */
function setActiveOrganization(orgId, orgName) {
  let folder = null;
  try {
    folder = DriveApp.getFolderById(orgId);
  } catch (e) {
    throw new Error('Organization folder not accessible (' + orgId + '): ' + e.message);
  }

  const name = orgName || folder.getName();
  PropertiesService.getScriptProperties().setProperty('ACTIVE_ORG_ID', orgId);
  PropertiesService.getScriptProperties().setProperty('ACTIVE_ORG_NAME', name);
  PropertiesService.getUserProperties().setProperty('ACTIVE_ORG_ID', orgId);
  PropertiesService.getUserProperties().setProperty('ACTIVE_ORG_NAME', name);

  return {
    success: true,
    organization: {
      id: orgId,
      name: name,
      url: folder.getUrl()
    }
  };
}

/**
 * Gets the active organization's folder in Google Drive
 */
function getOrgFolder() {
  const activeOrg = getActiveOrganization();
  if (activeOrg && activeOrg.id) {
    try {
      return DriveApp.getFolderById(activeOrg.id);
    } catch (e) {}
  }
  return getDriveFolder();
}

/**
 * Creates and provisions a brand new organization inside Drive Folder 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx
 * with the complete 6 numbered subdirectories and all 6 workbooks.
 */
function provisionOrganization(orgData) {
  const rootFolder = getDriveFolder();
  const orgName = (orgData && orgData.name && orgData.name.trim()) ? orgData.name.trim() : 'Zolexora IMS';

  // 1. Get or create folder with Organization Name inside Root Drive Folder
  let orgFolder = null;
  const existingFolders = rootFolder.getFoldersByName(orgName);
  if (existingFolders.hasNext()) {
    orgFolder = existingFolders.next();
  } else {
    orgFolder = rootFolder.createFolder(orgName);
  }

  // 2. Set this organization as active
  setActiveOrganization(orgFolder.getId(), orgName);

  // 3. Provision the 6 numbered subdirectories inside the Organization Folder
  const subfolders = {};
  for (const subName of Object.keys(DRIVE_DIRECTORY_STRUCTURE)) {
    subfolders[subName] = getOrCreateChildFolder(orgFolder, subName);
  }

  // Provision nested subfolders for Invoices & Reports
  getOrCreateChildFolder(subfolders['04_Invoices_and_Attachments'], 'Purchase_Orders');
  getOrCreateChildFolder(subfolders['04_Invoices_and_Attachments'], 'Delivery_Challans');

  getOrCreateChildFolder(subfolders['05_Reports_and_Exports'], 'Daily_Summaries');
  getOrCreateChildFolder(subfolders['05_Reports_and_Exports'], 'Monthly_Valuation');
  getOrCreateChildFolder(subfolders['05_Reports_and_Exports'], 'Supplier_Audits');

  // 4. Provision all 6 Workbooks strictly inside their designated subfolders
  const list = [
    { name: WORKBOOKS.LOCATION_MASTER, folder: subfolders['01_Master_Databases'], init: initLocationMaster },
    { name: WORKBOOKS.PRODUCT_MASTER, folder: subfolders['01_Master_Databases'], init: initProductMaster },
    { name: WORKBOOKS.SUPPLIER_MASTER, folder: subfolders['01_Master_Databases'], init: initSupplierMaster },
    { name: WORKBOOKS.SUPPLIER_TXNS, folder: subfolders['02_Transactions'], init: initSupplierTransactions },
    { name: WORKBOOKS.ISSUANCE_TXNS, folder: subfolders['02_Transactions'], init: initIssuanceTransactions },
    { name: WORKBOOKS.USERS_SETTINGS, folder: subfolders['03_Settings_and_Users'], init: initUsersAndSettings }
  ];

  const results = {};
  list.forEach(item => {
    let wb = null;
    const existingFile = findFileInFolderRecursively(orgFolder, item.name);
    if (existingFile) {
      wb = SpreadsheetApp.openById(existingFile.getId());
      ensureFileInFolder(existingFile, item.folder);
    } else {
      wb = SpreadsheetApp.create(item.name);
      const ssId = wb.getId();
      const file = DriveApp.getFileById(ssId);
      file.moveTo(item.folder);
      item.init(wb, orgData);
    }
    PropertiesService.getScriptProperties().setProperty('WB_ID_' + orgFolder.getId() + '_' + item.name, wb.getId());
    results[item.name] = {
      id: wb.getId(),
      name: wb.getName(),
      url: wb.getUrl()
    };
  });

  return {
    success: true,
    organization: {
      id: orgFolder.getId(),
      name: orgFolder.getName(),
      url: orgFolder.getUrl()
    },
    workbooks: results,
    directoryTree: scanFolderTree(orgFolder, 0, 3)
  };
}

/**
 * Gets or creates a specific workbook strictly inside the active organization folder (including subfolders)
 */
function getWorkbook(name) {
  const folder = getOrgFolder();
  const props = PropertiesService.getScriptProperties();
  const cachedId = props.getProperty('WB_ID_' + folder.getId() + '_' + name) || props.getProperty('WB_ID_' + name);

  if (cachedId) {
    try {
      const ss = SpreadsheetApp.openById(cachedId);
      return ss;
    } catch (e) {
      // Cached ID was deleted or inaccessible, will re-fetch
    }
  }

  if (folder) {
    const file = findFileInFolderRecursively(folder, name);
    if (file) {
      const ss = SpreadsheetApp.openById(file.getId());
      props.setProperty('WB_ID_' + folder.getId() + '_' + name, ss.getId());
      return ss;
    }
  }

  // Not found in folder, create and initialize it strictly in the designated subfolder of this organization
  return createAndInitWorkbook(name);
}

/**
 * Creates and sets up initial schema & sample data for a workbook strictly inside its proper subfolder
 */
function createAndInitWorkbook(name, orgData) {
  const folder = getOrgFolder();
  const targetFolder = getTargetSubfolderForWorkbook(name, folder);
  const ss = SpreadsheetApp.create(name);
  const ssId = ss.getId();
  PropertiesService.getScriptProperties().setProperty('WB_ID_' + folder.getId() + '_' + name, ssId);

  // Strictly move into the designated target subfolder
  try {
    const file = DriveApp.getFileById(ssId);
    file.moveTo(targetFolder);
  } catch (err) {
    console.warn('Could not move workbook to target folder: ' + err.message, err);
  }

  // Schema initialization based on workbook type
  if (name === WORKBOOKS.LOCATION_MASTER) {
    initLocationMaster(ss, orgData);
  } else if (name === WORKBOOKS.PRODUCT_MASTER) {
    initProductMaster(ss);
  } else if (name === WORKBOOKS.SUPPLIER_MASTER) {
    initSupplierMaster(ss);
  } else if (name === WORKBOOKS.SUPPLIER_TXNS) {
    initSupplierTransactions(ss);
  } else if (name === WORKBOOKS.ISSUANCE_TXNS) {
    initIssuanceTransactions(ss);
  } else if (name === WORKBOOKS.USERS_SETTINGS) {
    initUsersAndSettings(ss, orgData);
  }

  return ss;
}

/**
 * 1. Location_Master Workbook (Store & Selling_Point sheets)
 */
function initLocationMaster(ss, orgData) {
  const storeName = (orgData && orgData.storeName && orgData.storeName.trim()) ? orgData.storeName.trim() : 'Main Central Warehouse';
  const orgName = (orgData && orgData.name && orgData.name.trim()) ? orgData.name.trim() : 'Zolexora IMS';

  // Sheet 1: Store
  let storeSheet = ss.getSheetByName('Store');
  if (!storeSheet) {
    storeSheet = ss.getSheets()[0];
    storeSheet.setName('Store');
  }
  if (storeSheet.getLastRow() === 0) {
    storeSheet.appendRow(['Store Code', 'Store Name', 'Type', 'Status', 'Description']);
    formatHeaderRow(storeSheet, 5);
    storeSheet.appendRow(['S_001', storeName, 'Main Outlet Store', 'Active', 'Primary inventory depot for ' + orgName]);
    storeSheet.appendRow(['S_002', orgName + ' Retail Outlet', 'Outlet Store', 'Active', 'Secondary distribution outlet']);
    storeSheet.appendRow(['S_000', 'Central Distribution Hub', 'Central Depot', 'Active', 'Central replenishment warehouse']);
  }

  // Sheet 2: Selling_Point
  let spSheet = ss.getSheetByName('Selling_Point');
  if (!spSheet) {
    spSheet = ss.insertSheet('Selling_Point');
  }
  if (spSheet.getLastRow() === 0) {
    spSheet.appendRow(['Selling Point Code', 'Selling Point Name', 'Assigned Store Code', 'Type', 'Status']);
    formatHeaderRow(spSheet, 5);
    spSheet.appendRow(['SP_001', storeName + ' - Front Counter', 'S_001', 'Front Operations', 'Active']);
    spSheet.appendRow(['SP_002', storeName + ' - Kitchen / Production', 'S_001', 'Production Unit', 'Active']);
    spSheet.appendRow(['SP_003', storeName + ' - Bar & Beverage', 'S_001', 'Beverage Counter', 'Active']);
  }
}

/**
 * 2. Product_Master Workbook (Product_Master sheet)
 */
function initProductMaster(ss) {
  let prodSheet = ss.getSheetByName('Product_Master');
  if (!prodSheet) {
    prodSheet = ss.getSheets()[0];
    prodSheet.setName('Product_Master');
  }

  if (prodSheet.getLastRow() === 0) {
    prodSheet.appendRow([
      'Item Code',
      'Item Description',
      'Category',
      'Category Code',
      'UOM',
      'Rate',
      'TAX %',
      'Min Stock',
      'Stock S_001',
      'Stock S_002',
      'Central Stock',
      'Total Stock',
      'Total Valuation',
      'Preferred Supplier Code',
      'Status',
      'Last Updated'
    ]);
    formatHeaderRow(prodSheet, 16);

    const nowIso = new Date().toISOString();
    const demoItems = [
      ['ITM_001', 'Special Assam Orthodox Tea Leaves', 'Tea & Beverages', 'CAT_TEA', 'Kg', 650, 5, 10, 25, 15, 40, 80, 52000, 'SUP_021', 'Active', nowIso],
      ['ITM_002', 'Fresh Cow Milk 1L Pack', 'Dairy & Fresh', 'CAT_DAI', 'Pack', 65, 0, 30, 40, 30, 50, 120, 7800, 'SUP_004', 'Active', nowIso],
      ['ITM_003', 'Fresh Malai Paneer Block', 'Dairy & Fresh', 'CAT_DAI', 'Kg', 380, 0, 15, 15, 10, 20, 45, 17100, 'SUP_004', 'Active', nowIso],
      ['ITM_004', 'Artisan Multigrain Bread Loaf', 'Bakery & Desserts', 'CAT_BAK', 'Loaf', 90, 5, 20, 20, 15, 15, 50, 4500, 'SUP_005', 'Active', nowIso],
      ['ITM_005', 'Kesar Pista Kulfi Sticks', 'Bakery & Desserts', 'CAT_BAK', 'Pcs', 45, 18, 50, 60, 40, 50, 150, 6750, 'SUP_014', 'Active', nowIso],
      ['ITM_006', 'Hardwood Charcoal Briquettes 10kg', 'Kitchen Fuel', 'CAT_FUE', 'Bags', 850, 18, 10, 15, 5, 15, 35, 29750, 'SUP_008', 'Active', nowIso],
      ['ITM_007', 'Heavy Duty Floor Cleaner 5L', 'Housekeeping & Hygiene', 'CAT_HK', 'Can', 550, 18, 10, 10, 5, 10, 25, 13750, 'SUP_024', 'Active', nowIso],
      ['ITM_008', 'A4 Executive Copier Paper 75GSM', 'Stationery & Office', 'CAT_STA', 'Ream', 280, 12, 10, 10, 5, 15, 30, 8400, 'SUP_006', 'Active', nowIso],
      ['ITM_009', 'LED Warm Spotlight 12W GU10', 'Engineering & Electrical', 'CAT_ENG', 'Pcs', 195, 18, 15, 15, 10, 15, 40, 7800, 'SUP_009', 'Active', nowIso],
      ['ITM_010', 'Packaged Drinking Water 500ml (Crate 24)', 'Beverages', 'CAT_BEV', 'Crate', 240, 18, 20, 25, 15, 20, 60, 14400, 'SUP_003', 'Active', nowIso],
      ['ITM_011', 'Basmati Rice Classic 25kg Bag', 'Grocery & Staples', 'CAT_GRO', 'Bags', 2400, 5, 5, 8, 4, 6, 18, 43200, 'SUP_019', 'Active', nowIso],
      ['ITM_012', 'Signature Chai Cardboard Cups 150ml (Pack 100)', 'Packaging & Disposables', 'CAT_PAC', 'Pack', 180, 18, 30, 40, 30, 20, 90, 16200, 'SUP_023', 'Active', nowIso]
    ];

    prodSheet.getRange(2, 1, demoItems.length, demoItems[0].length).setValues(demoItems);
  }
}

/**
 * 3. Supplier_Master Workbook (all 28 real suppliers)
 */
function initSupplierMaster(ss) {
  let supSheet = ss.getSheetByName('Supplier_Master');
  if (!supSheet) {
    supSheet = ss.getSheets()[0];
    supSheet.setName('Supplier_Master');
  }

  if (supSheet.getLastRow() === 0) {
    supSheet.appendRow(['Supplier Code', 'Supplier Name', 'Category', 'Contact Person', 'Phone', 'Email', 'Status']);
    formatHeaderRow(supSheet, 7);

    const suppliersData = [
      ['SUP_001', 'A.T. Overseas', 'Imported Gourmet & Dry Foods', 'Mr. Amit Thapar', '+91 98101 23456', 'sales@atoverseas.com', 'Active'],
      ['SUP_002', 'Agarwal Enterprises', 'Provisions & Kirana', 'Mr. R. K. Agarwal', '+91 98112 34567', 'agarwal.ent@gmail.com', 'Active'],
      ['SUP_003', 'Ajay Cold Drinks', 'Beverages & Soft Drinks', 'Mr. Ajay Verma', '+91 98123 45678', 'ajaycolddrinks@yahoo.com', 'Active'],
      ['SUP_004', 'Bankey Behari Dairy & Paneer Bhandar', 'Fresh Dairy, Paneer & Mawa', 'Mr. Bankey Lal', '+91 98134 56789', 'bbdairy@gmail.com', 'Active'],
      ['SUP_005', "Chef's Bakeology Ifo Dayal Singh", 'Breads, Buns & Pastries', 'Chef Dayal Singh', '+91 98145 67890', 'bakeology@outlook.com', 'Active'],
      ['SUP_006', 'Deepak Stationery Mart', 'Office Stationery & Billing Paper', 'Mr. Deepak Jain', '+91 98156 78901', 'deepakstationery@gmail.com', 'Active'],
      ['SUP_007', 'Design Xpress', 'Menu Cards, Collateral & Printing', 'Mr. Nitin Saxena', '+91 98167 89012', 'print@designxpress.in', 'Active'],
      ['SUP_008', 'Essel Charcoals', 'Tandoor Charcoal & Fuel', 'Mr. S. L. Singhania', '+91 98178 90123', 'esselcharcoals@gmail.com', 'Active'],
      ['SUP_009', 'Friends Electric Works', 'Lighting, Bulbs & Electricals', 'Mr. Joginder Pal', '+91 98189 01234', 'friendselectric@gmail.com', 'Active'],
      ['SUP_010', 'Goodwill Traders', 'General Hospitality Hardware', 'Mr. Manpreet Singh', '+91 98190 12345', 'goodwilltraders@gmail.com', 'Active'],
      ['SUP_011', 'Hari Shankar Singh', 'Vegetables & Fresh Greens', 'Mr. Hari Shankar', '+91 98201 23456', 'harishankar.fresh@gmail.com', 'Active'],
      ['SUP_012', 'Hot Cakes Private Limited', 'Confectionery & Special Cakes', 'Ms. Ananya Roy', '+91 98212 34567', 'orders@hotcakes.co.in', 'Active'],
      ['SUP_013', 'Jai Guru Ji Traders', 'Spices, Masala & Seasonings', 'Mr. Gurpreet Sethi', '+91 98223 45678', 'jaigurujitraders@gmail.com', 'Active'],
      ['SUP_014', 'K B Kulfi', 'Traditional Kulfi & Ice Creams', 'Mr. Kailash B.', '+91 98234 56789', 'kbkulfi@gmail.com', 'Active'],
      ['SUP_015', 'Kanshi Ram Enterprises', 'Commercial Kitchen Crockery', 'Mr. Kanshi Ram', '+91 98245 67890', 'krrkitchenware@gmail.com', 'Active'],
      ['SUP_016', 'L R Wholesale Services Pvt. Ltd.', 'Bulk Institutional Supplies', 'Mr. Lalit Rao', '+91 98256 78901', 'info@lrwholesale.com', 'Active'],
      ['SUP_017', 'M S Manufactures and Distributors Pvt Ltd.', 'Linens & Table Runners', 'Mr. M. S. Sodhi', '+91 98267 89012', 'msdistributors@gmail.com', 'Active'],
      ['SUP_018', 'MR International', 'Premium Cutlery & Holloware', 'Mr. Manish Rawat', '+91 98278 90123', 'mrinternational@gmail.com', 'Active'],
      ['SUP_019', 'Navpallav Agro Products Pvt. Ltd', 'Grains, Basmati Rice & Pulses', 'Mr. Pallav Gupta', '+91 98289 01234', 'agro@navpallav.com', 'Active'],
      ['SUP_020', 'New Harry Store', 'Imported Condiments & Syrups', 'Mr. Harinder Suri', '+91 98290 12345', 'harrystore@gmail.com', 'Active'],
      ['SUP_021', 'Pindi Kirana Store', 'Premium Tea, Sugar & Dry Grocery', 'Mr. Satish Pindi', '+91 98301 23456', 'pindikirana@gmail.com', 'Active'],
      ['SUP_022', 'Rajesh Kumar (29 Jaguar)', 'Poultry & Fresh Meats', 'Mr. Rajesh Kumar', '+91 98312 34567', 'rajesh29jaguar@gmail.com', 'Active'],
      ['SUP_023', 'Sms Commercial', 'Takeaway Cups, Boxes & Disposables', 'Mr. Sanjay Mishra', '+91 98323 45678', 'smscommercial@gmail.com', 'Active'],
      ['SUP_024', 'Sms Housekeeping', 'Cleaning Chemicals & Detergents', 'Mr. S. M. Sharma', '+91 98334 56789', 'smshk@gmail.com', 'Active'],
      ['SUP_025', 'Sms Marketing Solutions', 'Branded Signage & Packaging', 'Mr. Shivam Malhotra', '+91 98345 67890', 'smsmarketing@gmail.com', 'Active'],
      ['SUP_026', 'SRD Traders', 'Cooking Oils & Ghee', 'Mr. Suresh Dani', '+91 98356 78901', 'srdtraders@gmail.com', 'Active'],
      ['SUP_027', 'T K Traders', 'Cleaning Tools, Brooms & Mops', 'Mr. Tarun Kalra', '+91 98367 89012', 'tktraders@gmail.com', 'Active'],
      ['SUP_028', 'Tulip Enterprises', 'Tissue Paper, Napkins & Foil', 'Ms. Meenakshi Tulip', '+91 98378 90123', 'tulipenterprises@gmail.com', 'Active']
    ];

    supSheet.getRange(2, 1, suppliersData.length, suppliersData[0].length).setValues(suppliersData);
  }
}

/**
 * 4. Supplier_Transactions Workbook (Supplier-wise Purchasing & Stock In)
 */
function initSupplierTransactions(ss) {
  let sheet = ss.getSheetByName('Supplier_Transactions');
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName('Supplier_Transactions');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Transaction ID',
      'Timestamp',
      'Supplier Code',
      'Supplier Name',
      'Item Code',
      'Item Description',
      'Category',
      'Quantity',
      'UOM',
      'Rate',
      'Tax %',
      'Total Amount',
      'Receiving Store Code',
      'Receiving Store Name',
      'PO / Invoice Ref',
      'Received By',
      'Notes'
    ]);
    formatHeaderRow(sheet, 17);

    const now = new Date();
    const demoTxns = [
      ['TXN_SUP_001', new Date(now.getTime() - 86400000 * 3).toISOString(), 'SUP_004', 'Bankey Behari Dairy & Paneer Bhandar', 'ITM_003', 'Fresh Malai Paneer Block', 'Dairy & Fresh', 30, 'Kg', 380, 0, 11400, 'S_001', '21 GUN SOLUTE GGN SEC 29', 'INV-BBD-991', 'Head Chef', 'Morning delivery received in cold crate'],
      ['TXN_SUP_002', new Date(now.getTime() - 86400000 * 2).toISOString(), 'SUP_021', 'Pindi Kirana Store', 'ITM_001', 'Special Assam Orthodox Tea Leaves', 'Tea & Beverages', 40, 'Kg', 650, 5, 27300, 'S_000', 'Central Depot Warehouse', 'PO-2026-441', 'Store Keeper', 'Monthly bulk tea consignment'],
      ['TXN_SUP_003', new Date(now.getTime() - 86400000 * 1).toISOString(), 'SUP_023', 'Sms Commercial', 'ITM_012', 'Signature Chai Cardboard Cups 150ml (Pack 100)', 'Packaging & Disposables', 50, 'Pack', 180, 18, 10620, 'S_002', 'PAHLE CHAI GGN Sec 27', 'INV-SMS-802', 'Outlet Mgr', 'Restock for takeaway chai counter'],
      ['TXN_SUP_004', new Date(now.getTime() - 3600000 * 4).toISOString(), 'SUP_008', 'Essel Charcoals', 'ITM_006', 'Hardwood Charcoal Briquettes 10kg', 'Kitchen Fuel', 20, 'Bags', 850, 18, 20060, 'S_001', '21 GUN SOLUTE GGN SEC 29', 'INV-EC-109', 'Tandoor Chef', 'High calorific value coal batch']
    ];

    sheet.getRange(2, 1, demoTxns.length, demoTxns[0].length).setValues(demoTxns);
  }
}

/**
 * 5. Issuance_Transactions Workbook (Store to Selling Point & Department Issues)
 */
function initIssuanceTransactions(ss) {
  let sheet = ss.getSheetByName('Issuance_Transactions');
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName('Issuance_Transactions');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Issuance ID',
      'Timestamp',
      'Type',
      'Item Code',
      'Item Description',
      'Quantity',
      'UOM',
      'From Store Code',
      'From Store Name',
      'To Selling Point Code',
      'To Selling Point Name',
      'Unit Rate',
      'Total Value',
      'Requisition Ref',
      'Issued By',
      'Status',
      'Notes'
    ]);
    formatHeaderRow(sheet, 17);

    const now = new Date();
    const demoIssues = [
      ['ISS_001', new Date(now.getTime() - 86400000 * 2).toISOString(), 'DISBURSEMENT', 'ITM_003', 'Fresh Malai Paneer Block', 15, 'Kg', 'S_001', '21 GUN SOLUTE GGN SEC 29', 'SP_003', '21 Gun Salute - Kitchen Store', 380, 5700, 'REQ-8812', 'Store Keeper', 'Approved', 'Daily dinner prep issuance'],
      ['ISS_002', new Date(now.getTime() - 86400000 * 1).toISOString(), 'DISBURSEMENT', 'ITM_001', 'Special Assam Orthodox Tea Leaves', 10, 'Kg', 'S_000', 'Central Depot Warehouse', 'SP_002', 'PAHLE CHAI GGN Sec 27', 650, 6500, 'REQ-6812', 'Logistics Mgr', 'Shipped', 'Replenishment for Pahle Chai Sec 27'],
      ['ISS_003', new Date(now.getTime() - 3600000 * 6).toISOString(), 'DISBURSEMENT', 'ITM_012', 'Signature Chai Cardboard Cups 150ml', 15, 'Pack', 'S_002', 'PAHLE CHAI GGN Sec 27', 'SP_002', 'PAHLE CHAI GGN Sec 27', 180, 2700, 'REQ-6815', 'Supervisor', 'Approved', 'Counter dispensers reload']
    ];

    sheet.getRange(2, 1, demoIssues.length, demoIssues[0].length).setValues(demoIssues);
  }
}

/**
 * 6. Users_and_Settings Workbook (Users & Settings sheets)
 */
function initUsersAndSettings(ss, orgData) {
  const orgName = (orgData && orgData.name && orgData.name.trim()) ? orgData.name.trim() : 'Zolexora IMS';
  const currency = (orgData && orgData.currency && orgData.currency.trim()) ? orgData.currency.trim() : '₹';
  const industry = (orgData && orgData.industry && orgData.industry.trim()) ? orgData.industry.trim() : 'General Enterprise';
  const adminName = (orgData && orgData.adminName && orgData.adminName.trim()) ? orgData.adminName.trim() : 'Zolexora Admin';
  const adminEmail = (orgData && orgData.adminEmail && orgData.adminEmail.trim()) ? orgData.adminEmail.trim() : 'abhishekofficial4577@gmail.com';

  // Sheet 1: Users
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.getSheets()[0];
    usersSheet.setName('Users');
  }
  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(['User ID', 'Name', 'Role', 'Email', 'Assigned Store / Selling Point', 'Status']);
    formatHeaderRow(usersSheet, 6);
    usersSheet.appendRow(['USR_001', adminName, 'System Administrator & Manager', adminEmail, 'ALL', 'Active']);
    usersSheet.appendRow(['USR_002', 'Store Incharge', 'Store Keeper', 'store@' + orgName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com', 'S_001', 'Active']);
    usersSheet.appendRow(['USR_003', 'Operations Supervisor', 'Outlet Supervisor', 'ops@' + orgName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com', 'SP_001', 'Active']);
  }

  // Sheet 2: Settings
  let settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
  }
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(['Key', 'Value', 'Description']);
    formatHeaderRow(settingsSheet, 3);
    settingsSheet.appendRow(['HOTEL_NAME', orgName, 'Organization Brand Name']);
    settingsSheet.appendRow(['INDUSTRY', industry, 'SaaS Tenant Industry Sector']);
    settingsSheet.appendRow(['PLAN_TIER', 'Enterprise Cloud SaaS', 'Active SaaS Subscription Tier']);
    settingsSheet.appendRow(['CURRENCY_SYMBOL', currency, 'Display Currency Symbol']);
    settingsSheet.appendRow(['DRIVE_FOLDER_ID', DEFAULT_DRIVE_FOLDER_ID, 'Designated Database Drive Folder']);
  }
}

/**
 * Validates and provisions all 6 workbooks inside the user's Drive folder
 */
function initAllWorkbooks() {
  const list = [
    WORKBOOKS.LOCATION_MASTER,
    WORKBOOKS.PRODUCT_MASTER,
    WORKBOOKS.SUPPLIER_MASTER,
    WORKBOOKS.SUPPLIER_TXNS,
    WORKBOOKS.ISSUANCE_TXNS,
    WORKBOOKS.USERS_SETTINGS
  ];

  const results = {};
  list.forEach(name => {
    const wb = getWorkbook(name);
    results[name] = {
      id: wb.getId(),
      name: wb.getName(),
      url: wb.getUrl(),
      sheets: wb.getSheets().map(s => s.getName())
    };
  });
  return results;
}

/**
 * Returns metadata of all 6 workbooks in the active organization
 */
function getWorkbooksInfo() {
  const rootFolder = getDriveFolder();
  const orgFolder = getOrgFolder();
  const activeOrg = getActiveOrganization();
  const orgList = listOrganizations();

  const names = Object.values(WORKBOOKS);
  const workbooks = names.map(name => {
    try {
      const wb = getWorkbook(name);
      return {
        key: name,
        id: wb.getId(),
        name: wb.getName(),
        url: wb.getUrl(),
        sheets: wb.getSheets().map(s => s.getName())
      };
    } catch (e) {
      return {
        key: name,
        id: null,
        name: name,
        url: '#',
        sheets: []
      };
    }
  });

  return {
    rootFolder: {
      id: rootFolder.getId(),
      name: rootFolder.getName(),
      url: rootFolder.getUrl()
    },
    folder: {
      id: orgFolder.getId(),
      name: orgFolder.getName(),
      url: orgFolder.getUrl()
    },
    activeOrganization: activeOrg,
    organizations: orgList,
    workbooks: workbooks,
    directoryTree: getDriveDirectoryTree()
  };
}

/**
 * Creates the complete directory tree inside the active organization Google Drive folder
 * and organizes all existing/new workbooks into their respective subdirectories.
 */
function createDriveDirectoryTree() {
  const rootFolder = getDriveFolder();
  const orgFolder = getOrgFolder();
  const result = {
    success: true,
    rootFolderId: rootFolder.getId(),
    rootFolderName: rootFolder.getName(),
    orgFolderId: orgFolder.getId(),
    orgFolderName: orgFolder.getName(),
    orgFolderUrl: orgFolder.getUrl(),
    subfolders: {},
    organizedFiles: []
  };

  // 1. Create main categories inside the active organization folder & relocate workbooks
  for (const [subName, expectedWorkbooks] of Object.entries(DRIVE_DIRECTORY_STRUCTURE)) {
    const subFolder = getOrCreateChildFolder(orgFolder, subName);
    result.subfolders[subName] = {
      id: subFolder.getId(),
      name: subFolder.getName(),
      url: subFolder.getUrl()
    };

    if (expectedWorkbooks && expectedWorkbooks.length > 0) {
      expectedWorkbooks.forEach(wbName => {
        try {
          const wb = getWorkbook(wbName);
          if (wb) {
            const file = DriveApp.getFileById(wb.getId());
            ensureFileInFolder(file, subFolder);
            result.organizedFiles.push({
              name: wbName,
              folder: subName,
              id: wb.getId(),
              url: wb.getUrl()
            });
          }
        } catch (e) {
          console.warn('Could not organize workbook: ' + wbName, e);
        }
      });
    }
  }

  // 2. Provision nested subfolders for Receipts and Reports inside organization
  const invFolder = getOrCreateChildFolder(orgFolder, '04_Invoices_and_Attachments');
  getOrCreateChildFolder(invFolder, 'Purchase_Orders');
  getOrCreateChildFolder(invFolder, 'Delivery_Challans');

  const repFolder = getOrCreateChildFolder(orgFolder, '05_Reports_and_Exports');
  getOrCreateChildFolder(repFolder, 'Daily_Summaries');
  getOrCreateChildFolder(repFolder, 'Monthly_Valuation');
  getOrCreateChildFolder(repFolder, 'Supplier_Audits');

  const bakFolder = getOrCreateChildFolder(orgFolder, '06_System_Backups');

  result.directoryTree = getDriveDirectoryTree();
  return result;
}

/**
 * Returns the hierarchical tree structure of the active organization folder
 */
function getDriveDirectoryTree() {
  try {
    const orgFolder = getOrgFolder();
    return scanFolderTree(orgFolder, 0, 3);
  } catch (err) {
    console.warn('Could not scan drive directory tree: ' + err.message);
    return null;
  }
}

function scanFolderTree(folder, currentDepth, maxDepth) {
  const node = {
    id: folder.getId(),
    name: folder.getName(),
    url: folder.getUrl(),
    type: 'folder',
    subfolders: [],
    files: []
  };

  try {
    const files = folder.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      node.files.push({
        id: f.getId(),
        name: f.getName(),
        url: f.getUrl(),
        mimeType: f.getMimeType(),
        size: f.getSize(),
        lastUpdated: f.getLastUpdated().toISOString(),
        type: 'file'
      });
    }
  } catch (e) {}

  if (currentDepth < maxDepth) {
    try {
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const sub = subfolders.next();
        node.subfolders.push(scanFolderTree(sub, currentDepth + 1, maxDepth));
      }
    } catch (e) {}
  }

  return node;
}

/**
 * Settings helpers
 */
function getSettings() {
  try {
    const ss = getWorkbook(WORKBOOKS.USERS_SETTINGS);
    const sheet = ss.getSheetByName('Settings');
    if (!sheet) return { CURRENCY_SYMBOL: '₹', HOTEL_NAME: 'Zolexora IMS' };
    const data = sheet.getDataRange().getValues();
    const settings = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        settings[String(data[i][0])] = String(data[i][1]);
      }
    }

    // Force update if old branding exists in the sheet
    const currentName = settings['HOTEL_NAME'] || '';
    if (!currentName || currentName.includes('DNP') || currentName.includes('21 Gun Salute')) {
      settings['HOTEL_NAME'] = 'Zolexora IMS';
      try {
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === 'HOTEL_NAME') {
            sheet.getRange(i + 1, 2).setValue('Zolexora IMS');
            break;
          }
        }
      } catch (e) {}
    }

    return settings;
  } catch (e) {
    return { CURRENCY_SYMBOL: '₹', HOTEL_NAME: 'Zolexora IMS' };
  }
}

function saveSettings(settingsObj) {
  const ss = getWorkbook(WORKBOOKS.USERS_SETTINGS);
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) throw new Error('Settings sheet missing in Users_and_Settings');

  const data = sheet.getDataRange().getValues();
  for (const key in settingsObj) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(String(settingsObj[key]));
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, String(settingsObj[key]), 'Custom setting']);
    }
  }
  return { success: true };
}

function setDriveFolderId(folderUrlOrId) {
  if (!folderUrlOrId || typeof folderUrlOrId !== 'string') {
    return { success: false, error: 'Please provide a valid Google Drive folder URL or ID.' };
  }
  let folderId = folderUrlOrId.trim();
  const match = folderId.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    folderId = match[1];
  }
  try {
    const folder = DriveApp.getFolderById(folderId);
    PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', folderId);
    // Clear cached workbook IDs to rebind to new folder
    const props = PropertiesService.getScriptProperties();
    Object.values(WORKBOOKS).forEach(wb => props.deleteProperty('WB_ID_' + wb));

    return {
      success: true,
      id: folderId,
      name: folder.getName(),
      url: folder.getUrl(),
      message: 'Connected to Drive folder: ' + folder.getName()
    };
  } catch (err) {
    return {
      success: false,
      error: 'Could not access the specified Google Drive folder. Details: ' + err.message
    };
  }
}

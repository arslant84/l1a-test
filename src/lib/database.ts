
// src/lib/database.ts
'use client';

import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import type { VendorInputFields } from '@/lib/types'; // Changed path to '@/lib/types'

let dbPromise: Promise<Database> | null = null;
const DB_FILE_PATH = '/vendors.db'; // Path to the physical database file in the public folder
const WASM_FILE_PATH = '/sql-wasm.wasm'; // Path to the sql-wasm.wasm file in the public folder

// Statically define VENDOR_COLUMNS based on the VendorInputFields interface
// Ensure this matches the actual structure of VendorInputFields
const VENDOR_COLUMNS: Array<keyof VendorInputFields> = [
  'vendorName',
  // 'vendorIndustry', // Assuming these were intentionally removed as per original user code
  // 'companySize', 
  'tenderNumber',
  'tenderTitle',
  'dateOfFinancialEvaluation',
  'evaluationValidityDate',
  'evaluatorNameDepartment',
  'overallResult',
  'quantitativeScore',
  'quantitativeBand',
  'quantitativeRiskCategory',
  'altmanZScore',
  'altmanZBand',
  'altmanZRiskCategory',
  'qualitativeScore',
  'qualitativeBand',
  'qualitativeRiskCategory',
  'overallFinancialEvaluationResult',
  // 'keyInformation', 
];

const initialize = async (): Promise<Database> => {
  try {
    const SQL = await initSqlJs({ locateFile: () => WASM_FILE_PATH });
    let db: Database;

    try {
      // Try to load existing database file
      console.log(`Attempting to load database from: ${DB_FILE_PATH}`);
      const response = await fetch(DB_FILE_PATH);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 0) {
            const uint8Array = new Uint8Array(arrayBuffer);
            db = new SQL.Database(uint8Array);
            console.log('Database loaded successfully from', DB_FILE_PATH);
        } else {
            console.log('Database file is empty, creating new database.');
            db = new SQL.Database();
            await createAndSaveTable(db);
        }
      } else {
        console.log(`Failed to load ${DB_FILE_PATH} (status: ${response.status}), creating new database.`);
        db = new SQL.Database();
        await createAndSaveTable(db);
      }
    } catch (error) {
      console.error("Error loading database file, creating new database:", error);
      db = new SQL.Database();
      await createAndSaveTable(db);
    }
    return db;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw new Error(`Failed to initialize database. Please ensure ${WASM_FILE_PATH} is properly loaded.`);
  }
};

const createAndSaveTable = async (db: Database) => {
    const columnDefinitions = VENDOR_COLUMNS.map(colName =>
        `${colName} TEXT${colName === 'vendorName' ? ' PRIMARY KEY' : ''}`
    ).join(', ');
    const createTableQuery = `CREATE TABLE IF NOT EXISTS vendors (${columnDefinitions});`;
    db.run(createTableQuery);
    console.log('Table "vendors" created or ensured.');
    await saveDatabase(db); // Save after creating table
};


export const getDb = (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = initialize();
  }
  return dbPromise;
};

// Function to save database to file
const saveDatabase = async (db: Database): Promise<void> => {
  try {
    const dbArray = db.export();
    const blob = new Blob([dbArray], { type: 'application/octet-stream' }); // Using application/octet-stream as a generic binary type
    
    const formData = new FormData();
    formData.append('database', blob, 'vendors.db');

    console.log('Attempting to save database to server...');
    const response = await fetch('/api/save-database', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server' }));
      console.error('Server responded with an error:', response.status, errorData);
      throw new Error(`Failed to save database file to server. Status: ${response.status}, Message: ${errorData.error || 'Unknown error'}`);
    }
    console.log('Database saved to server successfully.');
  } catch (error) {
    console.error('Error saving database via API:', error);
    // Depending on the use case, you might want to re-throw or handle this differently
    // For now, re-throwing to make it clear that the save operation failed.
    throw new Error('Failed to save database file via API.');
  }
};

export const convertResultsToObjects = (results: any[]): VendorInputFields[] => {
  if (!results || results.length === 0 || !results[0].values || results[0].values.length === 0) return [];
  return results[0].values.map((row: any[]) => {
    const obj: any = {};
    results[0].columns.forEach((col: string, index: number) => {
      obj[col] = row[index];
    });
    return obj as VendorInputFields;
  });
};

export const getAllVendorsDb = async (): Promise<VendorInputFields[]> => {
  const db = await getDb();
  const results = db.exec("SELECT * FROM vendors ORDER BY vendorName ASC");
  return convertResultsToObjects(results);
};

export const saveVendorDb = async (vendorData: VendorInputFields): Promise<void> => {
  const db = await getDb();
  const existingVendorStmt = db.prepare("SELECT vendorName FROM vendors WHERE vendorName = :vendorName");
  existingVendorStmt.bind({ ':vendorName': vendorData.vendorName });
  const hasExisting = existingVendorStmt.step();
  existingVendorStmt.free();

  const columns = VENDOR_COLUMNS.join(', ');
  const placeholders = VENDOR_COLUMNS.map(col => `:${col}`).join(', '); // Using named placeholders
  
  const params: { [key: string]: SqlValue } = {};
  VENDOR_COLUMNS.forEach(colKey => {
    const keyWithColon = `:${colKey}`;
    // Ensure all keys in VENDOR_COLUMNS are handled, providing null if undefined in vendorData
    params[keyWithColon] = vendorData[colKey] !== undefined && vendorData[colKey] !== null ? String(vendorData[colKey]) : null;
  });


  if (hasExisting) {
    const setClauses = VENDOR_COLUMNS.filter(col => col !== 'vendorName').map(col => `${col} = :${col}`).join(', ');
    const stmt = db.prepare(`UPDATE vendors SET ${setClauses} WHERE vendorName = :vendorName`);
    stmt.run(params);
    stmt.free();
    console.log(`Vendor "${vendorData.vendorName}" updated.`);
  } else {
    const stmt = db.prepare(`INSERT INTO vendors (${columns}) VALUES (${placeholders})`);
    stmt.run(params);
    stmt.free();
    console.log(`Vendor "${vendorData.vendorName}" inserted.`);
  }
  
  await saveDatabase(db);
};

export const removeVendorDb = async (vendorName: string): Promise<void> => {
  const db = await getDb();
  const stmt = db.prepare("DELETE FROM vendors WHERE vendorName = :vendorName");
  stmt.run({ ':vendorName': vendorName });
  stmt.free();
  console.log(`Vendor "${vendorName}" removed.`);
  
  await saveDatabase(db);
};

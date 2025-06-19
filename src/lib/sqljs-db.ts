
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest, ApprovalAction } from './types';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DB_PATH = '/vendors.db'; // Path in the public folder
const WASM_PATH = '/sql-wasm.wasm'; // Path to the WASM file in the public folder

async function initializeSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    try {
       // sql.js recommends hosting sql-wasm.wasm yourself. 
       // It will be fetched relative to the page URL or via the specified path.
      SQL = await initSqlJs({ locateFile: file => WASM_PATH });
    } catch (error) {
      console.error("Failed to initialize sql.js:", error);
      throw error;
    }
  }
  return SQL;
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const SQL = await initializeSqlJs();
    try {
      const response = await fetch(DB_PATH);
      if (!response.ok) {
        throw new Error(`Failed to fetch database file from ${DB_PATH}: ${response.statusText}`);
      }
      const dbFileArrayBuffer = await response.arrayBuffer();
      dbInstance = new SQL.Database(new Uint8Array(dbFileArrayBuffer));
      // You can run PRAGMAs or initial setup here if needed
      // e.g., dbInstance.exec('PRAGMA foreign_keys = ON;');
      console.log("sql.js database loaded successfully from", DB_PATH);
    } catch (error) {
      console.error("Failed to load database:", error);
      // Fallback: Create an empty database if vendors.db fails to load
      // This is not ideal as it means data is lost, but prevents app crash.
      // A better approach would be to ensure vendors.db is always available.
      console.warn("Falling back to an empty in-memory database.");
      dbInstance = new SQL.Database();
      // Potentially, you could try to re-run schema creation here if vendors.db is mandatory
      // For now, it will be an empty DB.
    }
  }
  return dbInstance;
}

// Helper to convert sql.js output to a more usable array of objects
export function convertSqljsResponse<T>(response: any[]): T[] {
  if (!response || response.length === 0 || !response[0].columns || !response[0].values) {
    return [];
  }
  const { columns, values } = response[0];
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj as T;
  });
}


export function parseEmployee(dbEmployee: any): Employee {
  return {
    ...dbEmployee,
    dateJoined: dbEmployee.dateJoined ? new Date(dbEmployee.dateJoined) : undefined,
    passwordLastChanged: dbEmployee.passwordLastChanged ? new Date(dbEmployee.passwordLastChanged) : null,
    prefersEmailNotifications: !!dbEmployee.prefersEmailNotifications, // SQLite stores boolean as 0 or 1
    prefersInAppNotifications: !!dbEmployee.prefersInAppNotifications,
  };
}

export function parseTrainingRequest(dbRequest: any): TrainingRequest {
  return {
    ...dbRequest,
    startDate: new Date(dbRequest.startDate),
    endDate: new Date(dbRequest.endDate),
    submittedDate: new Date(dbRequest.submittedDate),
    lastUpdated: new Date(dbRequest.lastUpdated),
    supportingDocuments: dbRequest.supportingDocuments ? JSON.parse(dbRequest.supportingDocuments) : [],
    approvalChain: dbRequest.approvalChain 
      ? JSON.parse(dbRequest.approvalChain).map((action: any) => ({
          ...action,
          date: new Date(action.date),
        }))
      : [],
    cost: Number(dbRequest.cost) 
  };
}

// Function to save changes (e.g., to localStorage or offer download)
// This is a placeholder and would need a robust implementation if persistence is required.
export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    const binaryArray = dbInstance.export();
    // Example: Save to localStorage (limited by size)
    // localStorage.setItem('vendors_db_snapshot', JSON.stringify(Array.from(binaryArray)));
    // console.log("Database changes (in-memory) could be exported here.");
    
    // For a real application, you might offer this as a download:
    // const blob = new Blob([binaryArray]);
    // const link = document.createElement('a');
    // link.href = URL.createObjectURL(blob);
    // link.download = 'vendors_updated.db';
    // link.click();
  }
}


import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest, ApprovalAction } from './types';
import { mockEmployees } from './mock-data'; // mockTrainingRequests are now empty

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DB_PATH = '/vendors.db';
const WASM_PATH = '/sql-wasm.wasm';

async function initializeSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    try {
      SQL = await initSqlJs({ locateFile: () => WASM_PATH });
    } catch (error) {
      console.error("Failed to initialize sql.js:", error);
      throw error;
    }
  }
  return SQL;
}

function createTables(db: Database) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS employees (' +
    'id TEXT PRIMARY KEY, ' +
    'name TEXT, ' +
    'email TEXT, ' +
    'department TEXT, ' +
    'role TEXT, ' +
    'avatarUrl TEXT, ' +
    'managerId TEXT, ' +
    'position TEXT, ' +
    'staffNo TEXT, ' +
    'academicQualification TEXT, ' +
    'dateJoined TEXT, ' +
    'passwordLastChanged TEXT, ' +
    'prefersEmailNotifications INTEGER DEFAULT 1, ' +
    'prefersInAppNotifications INTEGER DEFAULT 1' +
    ');' +
    'CREATE TABLE IF NOT EXISTS training_requests (' +
    'id TEXT PRIMARY KEY, ' +
    'employeeId TEXT, ' +
    'employeeName TEXT, ' +
    'trainingTitle TEXT, ' +
    'justification TEXT, ' +
    'organiser TEXT, ' +
    'venue TEXT, ' +
    'startDate TEXT, ' +
    'endDate TEXT, ' +
    'cost REAL, ' +
    'mode TEXT, ' +
    'programType TEXT, ' +
    'previousRelevantTraining TEXT, ' +
    'supportingDocuments TEXT, ' +
    'status TEXT, ' +
    'currentApprovalStep TEXT, ' +
    'approvalChain TEXT, ' +
    'submittedDate TEXT, ' +
    'lastUpdated TEXT, ' +
    'cancelledByUserId TEXT, ' +
    'cancelledDate TEXT, ' +
    'cancellationReason TEXT' +
    ');'
  );
  console.log("Database tables (employees, training_requests) ensured/created in the current DB instance.");
}

function seedDatabaseWithMockData(db: Database) {
  mockEmployees.forEach(emp => {
    try {
      db.run(
        'INSERT INTO employees (id, name, email, department, role, avatarUrl, managerId, position, staffNo, academicQualification, dateJoined, passwordLastChanged, prefersEmailNotifications, prefersInAppNotifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          emp.id,
          emp.name,
          emp.email,
          emp.department,
          emp.role,
          emp.avatarUrl || null,
          emp.managerId || null,
          emp.position || null,
          emp.staffNo || null,
          emp.academicQualification || null,
          emp.dateJoined?.toISOString() || null,
          emp.passwordLastChanged?.toISOString() || null,
          emp.prefersEmailNotifications ? 1 : 0,
          emp.prefersInAppNotifications ? 1 : 0,
        ]
      );
    } catch (e: any) {
        if (e && e.message && !e.message.includes('UNIQUE constraint failed')) {
            console.error('Error seeding employee ' + emp.id + ':', e);
        }
    }
  });

  // mockTrainingRequests is now empty, so no requests are seeded by default.
  // If you had mock requests, the loop would be here.

  console.log("Database seeded with mock employee data (if tables were empty or newly created). No mock training requests are seeded by default.");
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const sqlModule = await initializeSqlJs();
  let dbFileArrayBuffer: ArrayBuffer | null = null;
  let dbLoadedFromFile = false;
  let requiresInitialization = false;

  try {
    console.log('Attempting to fetch database file from ' + DB_PATH + '...');
    const response = await fetch(DB_PATH);
    if (response.ok) {
      dbFileArrayBuffer = await response.arrayBuffer();
      if (dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0) {
        dbInstance = new sqlModule.Database(new Uint8Array(dbFileArrayBuffer));
        console.log('sql.js database instance initialized using ' + DB_PATH + '. Verifying schema...');
        dbLoadedFromFile = true;

        // Check if tables exist in the loaded DB
        const tableCheckStmt = dbInstance.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND (name='employees' OR name='training_requests')");
        let tablesFound = 0;
        if (tableCheckStmt.step()) {
          tablesFound = tableCheckStmt.getAsObject().count as number;
        }
        tableCheckStmt.free();

        if (tablesFound < 2) {
          console.warn(DB_PATH + ' was loaded but is missing required tables (found ' + tablesFound + '). It will be initialized with schema and mock data.');
          requiresInitialization = true;
        } else {
          console.log('Database loaded from ' + DB_PATH + ' and required tables appear to exist.');
        }
      } else {
        console.warn('Fetched ' + DB_PATH + ', but it was empty. A new in-memory DB will be created and initialized.');
        requiresInitialization = true; // Will create a new DB instance below
      }
    } else {
      console.warn('Failed to fetch database file from ' + DB_PATH + ' (Status: ' + response.status + '). A new in-memory DB will be created and initialized.');
      requiresInitialization = true; // Will create a new DB instance below
    }
  } catch (error) {
    console.error('CRITICAL: Error during fetch or initial load of ' + DB_PATH + ': ' + (error instanceof Error ? error.message : String(error)) + '. A new in-memory DB will be created and initialized.');
    requiresInitialization = true; // Will create a new DB instance below
  }

  if (requiresInitialization && !dbLoadedFromFile) { // If fetch failed or file was empty, create new instance
    dbInstance = new sqlModule.Database();
    console.log('Created a new empty in-memory database instance.');
  }
  
  if (dbInstance && requiresInitialization) { // If new instance OR loaded but needs init
     console.log('Attempting to create tables and seed mock data for the current DB instance...');
    try {
      createTables(dbInstance);
      seedDatabaseWithMockData(dbInstance);
    } catch (seedError) {
      console.error("CRITICAL: Failed to create tables or seed mock data in the DB instance:", seedError);
      // dbInstance might be in a bad state here, but we'll return it and let operations fail.
    }
  }

  if (!dbInstance) {
    // This should ideally not be reached if logic above is correct
    console.error("ULTIMATE FALLBACK: dbInstance is still null. Creating a new empty in-memory database. App will likely not function correctly without data and schema.");
    dbInstance = new sqlModule.Database();
    createTables(dbInstance); // Try to create schema at least
  }
  return dbInstance;
}


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
    prefersEmailNotifications: !!dbEmployee.prefersEmailNotifications, // Convert 0/1 to boolean
    prefersInAppNotifications: !!dbEmployee.prefersInAppNotifications, // Convert 0/1 to boolean
  };
}

export function parseTrainingRequest(dbRequest: any): TrainingRequest {
  let approvalChain: ApprovalAction[] = [];
  if (dbRequest.approvalChain) {
    try {
      const parsedChain = JSON.parse(dbRequest.approvalChain);
      if (Array.isArray(parsedChain)) {
        approvalChain = parsedChain.map((action: any) => ({
          ...action,
          date: action.date ? new Date(action.date) : new Date(), // Fallback for safety
        }));
      }
    } catch (e) {
      console.error("Error parsing approvalChain for request " + dbRequest.id + ":", e);
    }
  }
  
  let supportingDocuments: { name: string; url?: string }[] = [];
  if (dbRequest.supportingDocuments) {
    try {
      const parsedDocs = JSON.parse(dbRequest.supportingDocuments);
      if (Array.isArray(parsedDocs)) {
        supportingDocuments = parsedDocs;
      }
    } catch(e) {
      console.error("Error parsing supportingDocuments for request " + dbRequest.id + ":", e);
    }
  }

  return {
    ...dbRequest,
    startDate: new Date(dbRequest.startDate),
    endDate: new Date(dbRequest.endDate),
    submittedDate: new Date(dbRequest.submittedDate),
    lastUpdated: new Date(dbRequest.lastUpdated),
    supportingDocuments: supportingDocuments,
    approvalChain: approvalChain,
    cost: Number(dbRequest.cost),
    cancelledDate: dbRequest.cancelledDate ? new Date(dbRequest.cancelledDate) : undefined,
  };
}

// This function currently does NOT persist changes to public/vendors.db on the filesystem.
// It would require a mechanism to send the database binary back to the server or prompt user download.
// For this client-side only demo with sql.js, "saving" means the in-memory copy is up-to-date for the current session.
export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    // To actually save, you would do: const binaryArray = dbInstance.export();
    // Then handle binaryArray (e.g., offer for download, send to a server API if one existed).
    console.log("Database changes are in-memory with sql.js. To persist these changes across sessions, the public/vendors.db file on the server would need to be updated. This function does not do that automatically from the client.");
  }
}

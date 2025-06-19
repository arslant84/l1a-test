
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest } from './types';
import { mockEmployees, mockTrainingRequests } from './mock-data';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DB_PATH = '/vendors.db'; // Corrected and ensured this is the path used
const WASM_PATH = '/sql-wasm.wasm'; 

async function initializeSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    try {
      // The { locateFile: file => WASM_PATH } part is crucial for sql.js to find its .wasm file.
      // Ensure sql-wasm.wasm is in your /public directory.
      SQL = await initSqlJs({ locateFile: file => WASM_PATH });
    } catch (error) {
      console.error("Failed to initialize sql.js:", error);
      throw error;
    }
  }
  return SQL;
}

function createTables(db: Database) {
  db.exec(`
    CREATE TABLE employees (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      department TEXT,
      role TEXT,
      avatarUrl TEXT,
      managerId TEXT,
      position TEXT,
      staffNo TEXT,
      academicQualification TEXT,
      dateJoined TEXT,
      passwordLastChanged TEXT,
      prefersEmailNotifications INTEGER DEFAULT 1,
      prefersInAppNotifications INTEGER DEFAULT 1
    );

    CREATE TABLE training_requests (
      id TEXT PRIMARY KEY,
      employeeId TEXT,
      employeeName TEXT,
      trainingTitle TEXT,
      justification TEXT,
      organiser TEXT,
      venue TEXT,
      startDate TEXT,
      endDate TEXT,
      cost REAL,
      mode TEXT,
      programType TEXT,
      previousRelevantTraining TEXT,
      supportingDocuments TEXT,
      status TEXT,
      currentApprovalStep TEXT,
      approvalChain TEXT,
      submittedDate TEXT,
      lastUpdated TEXT
    );
  `);
  console.log("Database tables (employees, training_requests) created in-memory.");
}

function seedDatabaseWithMockData(db: Database) {
  mockEmployees.forEach(emp => {
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
  });

  mockTrainingRequests.forEach(req => {
    db.run(
      'INSERT INTO training_requests (id, employeeId, employeeName, trainingTitle, justification, organiser, venue, startDate, endDate, cost, mode, programType, previousRelevantTraining, supportingDocuments, status, currentApprovalStep, approvalChain, submittedDate, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.id,
        req.employeeId,
        req.employeeName,
        req.trainingTitle,
        req.justification,
        req.organiser,
        req.venue,
        req.startDate.toISOString(),
        req.endDate.toISOString(),
        req.cost,
        req.mode,
        req.programType,
        req.previousRelevantTraining || null,
        JSON.stringify(req.supportingDocuments || []),
        req.status,
        req.currentApprovalStep,
        JSON.stringify(req.approvalChain.map(ac => ({...ac, date: ac.date.toISOString()}))),
        req.submittedDate.toISOString(),
        req.lastUpdated.toISOString(),
      ]
    );
  });
  console.log("In-memory database seeded with mock data.");
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const SQL = await initializeSqlJs();
    let dbFileArrayBuffer: ArrayBuffer | null = null;
    let dbLoadedFromFile = false;

    try {
      console.log(`Attempting to fetch database file from ${DB_PATH}...`);
      const response = await fetch(DB_PATH); 
      if (response.ok) {
        dbFileArrayBuffer = await response.arrayBuffer();
        if (dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0) {
            dbInstance = new SQL.Database(new Uint8Array(dbFileArrayBuffer));
            console.log(`sql.js database instance initialized using ${DB_PATH}.`);
            dbLoadedFromFile = true;
        } else {
            console.warn(`Fetched ${DB_PATH}, but it was empty. Will create an in-memory DB with mock data as a fallback.`);
        }
      } else {
        console.warn(`Failed to fetch database file from ${DB_PATH} (Status: ${response.status}). Will create an in-memory DB with mock data as a fallback.`);
      }
    } catch (error) {
      console.error(`CRITICAL: Failed to load database from ${DB_PATH}:`, error, ". Will create an in-memory DB with mock data as a fallback.");
    }

    if (!dbLoadedFromFile) {
      console.warn(`IMPORTANT: Falling back to an empty in-memory database because ${DB_PATH} was not loaded. This will attempt to create tables and seed mock data. If you intend to use a persistent vendors.db, ensure it's correctly placed in the 'public' folder and accessible.`);
      dbInstance = new SQL.Database(); 
      try {
        console.log("Initializing new in-memory SQL.js database and seeding with mock data...");
        createTables(dbInstance);
        seedDatabaseWithMockData(dbInstance);
      } catch(seedError) {
        console.error("CRITICAL: Failed to create tables or seed mock data in the in-memory database:", seedError);
        // dbInstance is already set to new SQL.Database(), so it will be an empty DB
        // This allows the app to load, but data operations will fail if tables aren't created.
      }
    } else if (dbInstance) { 
      try {
        const tableCheckStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='employees' OR name='training_requests')");
        let tablesFound = 0;
        while(tableCheckStmt.step()) {
          tablesFound++;
        }
        tableCheckStmt.free();

        if (tablesFound < 2) {
         console.warn(`Database loaded from ${DB_PATH}, but required tables ('employees', 'training_requests') might be missing or incomplete. Application queries may fail if schema is not set up correctly in ${DB_PATH}.`);
        } else {
         console.log(`Database loaded from ${DB_PATH}. Required tables ('employees', 'training_requests') appear to exist.`);
        }
      } catch (e) {
        console.warn(`Could not verify tables in ${DB_PATH}. It might be empty or malformed. Ensure schema is correct. Error:`, e);
      }
    }
    
    if (!dbInstance) { 
        console.error("ULTIMATE FALLBACK: dbInstance is still null after all attempts. Creating a new empty in-memory database. App will likely not function correctly.");
        dbInstance = new SQL.Database();
    }
  }
  return dbInstance!;
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
    prefersEmailNotifications: !!dbEmployee.prefersEmailNotifications, 
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

// This function is a placeholder as sql.js operates in-memory.
// True persistence would require downloading the DB or sending changes to a server.
export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    console.log("Database changes are in-memory with sql.js. To persist, the ArrayBuffer from db.export() would need to be handled (e.g., downloaded by the user or sent to a server).");
    // Example: const binaryArray = dbInstance.export();
    // This binaryArray could then be offered as a download.
  }
}


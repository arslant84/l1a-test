
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest } from './types';
import { mockEmployees, mockTrainingRequests } from './mock-data';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DB_PATH = '/vendors.db'; 
const WASM_PATH = '/sql-wasm.wasm'; 

async function initializeSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    try {
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
        emp.avatarUrl,
        emp.managerId,
        emp.position,
        emp.staffNo,
        emp.academicQualification,
        emp.dateJoined?.toISOString(),
        emp.passwordLastChanged?.toISOString(),
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
        req.previousRelevantTraining,
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
      const response = await fetch(DB_PATH);
      if (response.ok) {
        dbFileArrayBuffer = await response.arrayBuffer();
        // Initialize with the fetched data.
        // If dbFileArrayBuffer is null or empty, SQL.Database() creates an empty in-memory DB.
        dbInstance = new SQL.Database(dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0 ? new Uint8Array(dbFileArrayBuffer) : undefined);
        console.log(`sql.js database instance initialized using ${DB_PATH}.`);
        dbLoadedFromFile = true;
      } else {
        console.warn(`Failed to fetch database file from ${DB_PATH}: ${response.statusText}. Will create an in-memory DB with mock data as a fallback.`);
      }
    } catch (error) {
      console.warn(`Error fetching database from ${DB_PATH}:`, error, ". Will create an in-memory DB with mock data as a fallback.");
    }

    if (!dbLoadedFromFile && !dbInstance) { // Ensure dbInstance isn't accidentally null from a failed but non-erroring fetch.
      console.log("Fallback: Initializing new in-memory SQL.js database, creating tables, and seeding with mock data...");
      dbInstance = new SQL.Database(); 
      createTables(dbInstance);
      seedDatabaseWithMockData(dbInstance);
    } else if (dbLoadedFromFile && dbInstance) {
      // Database was loaded from file (or an empty one created if the file was empty).
      // Check if required tables exist and warn if not.
      try {
        const tableCheckStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='employees' OR name='training_requests')");
        let tablesFound = 0;
        while(tableCheckStmt.step()) {
          tablesFound++;
        }
        tableCheckStmt.free();

        if (tablesFound < 2) {
         console.warn(`Database loaded from ${DB_PATH}, but required tables ('employees', 'training_requests') might be missing or incomplete. Application queries may fail if schema is not set up in vendors.db.`);
        } else {
         console.log(`Database loaded from ${DB_PATH}. Required tables ('employees', 'training_requests') appear to exist.`);
        }
      } catch (e) {
        // This might happen if the DB is truly malformed or empty, prepare might fail.
        console.warn(`Could not verify tables in ${DB_PATH}. It might be empty or malformed. Ensure schema is correct. Error:`, e);
      }
    } else if (!dbInstance) {
        // Should not happen if logic is correct, but as a safeguard:
        console.error("Critical error: dbInstance is null after attempting to load or create database. Defaulting to new in-memory DB.");
        dbInstance = new SQL.Database(); 
        createTables(dbInstance);
        seedDatabaseWithMockData(dbInstance);
    }
  }
  return dbInstance!;
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

export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    // const binaryArray = dbInstance.export();
    // In a real application, you might offer a download or send to a server.
    // For this client-side sql.js setup without a backend to save to, changes are ephemeral to the session
    // if not persisted back into the public/vendors.db file manually or via a download/upload mechanism.
    console.log("Database changes are in-memory with sql.js. To persist changes beyond the session when using a loaded .db file, the file itself would need to be updated (e.g., offer download, or use a server to overwrite public/vendors.db if permissions allow, which is not typical for public folder).");
  }
}

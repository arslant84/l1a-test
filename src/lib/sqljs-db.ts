
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest } from './types';
import { mockEmployees, mockTrainingRequests } from './mock-data';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DB_PATH = '/vendors.db'; // Path in the public folder
const WASM_PATH = '/sql-wasm.wasm'; // Path to the WASM file in the public folder

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
    try {
      const response = await fetch(DB_PATH);
      if (response.ok) {
        dbFileArrayBuffer = await response.arrayBuffer();
        if (dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0) {
          dbInstance = new SQL.Database(new Uint8Array(dbFileArrayBuffer));
          console.log("sql.js database loaded successfully from", DB_PATH);
        } else {
           // This case can happen if vendors.db is an empty file
          console.warn(`Fetched ${DB_PATH}, but it was empty. Will create an in-memory DB with mock data.`);
          dbFileArrayBuffer = null; // Ensure we fall into the creation logic
        }
      } else {
        console.warn(`Failed to fetch database file from ${DB_PATH}: ${response.statusText}. Will create an in-memory DB with mock data.`);
      }
    } catch (error) {
      console.warn(`CRITICAL: Error fetching database from ${DB_PATH}:`, error, ". Will create an in-memory DB with mock data.");
    }

    if (!dbInstance) {
      console.log("Initializing new in-memory SQL.js database and seeding with mock data...");
      dbInstance = new SQL.Database();
      createTables(dbInstance);
      seedDatabaseWithMockData(dbInstance);
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
    // SQLite stores booleans as 0 or 1
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
    console.log("Database changes are in-memory with sql.js. To persist changes beyond the session when not using a loaded .db file, you would need to implement a mechanism to save the exported database (e.g., offer download, or send to a server). This is not implemented by default.");
  }
}


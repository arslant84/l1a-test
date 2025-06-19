
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest, ApprovalAction } from './types';
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
  console.log("Database tables (employees, training_requests) ensured/created in-memory.");
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
        if (!e.message || !e.message.includes('UNIQUE constraint failed')) {
            console.error('Error seeding employee ' + emp.id + ':', e);
        }
    }
  });

  mockTrainingRequests.forEach(req => {
     try {
        db.run(
        'INSERT INTO training_requests (id, employeeId, employeeName, trainingTitle, justification, organiser, venue, startDate, endDate, cost, mode, programType, previousRelevantTraining, supportingDocuments, status, currentApprovalStep, approvalChain, submittedDate, lastUpdated, cancelledByUserId, cancelledDate, cancellationReason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
            req.cancelledByUserId || null,
            req.cancelledDate?.toISOString() || null,
            req.cancellationReason || null,
        ]
        );
    } catch (e:any) {
        if (!e.message || !e.message.includes('UNIQUE constraint failed')) {
            console.error('Error seeding training request ' + req.id + ':', e);
        }
    }
  });
  console.log("In-memory database seeded with mock data (if tables were empty).");
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const sqlModule = await initializeSqlJs();
  let dbFileArrayBuffer: ArrayBuffer | null = null;
  let dbLoadedFromFile = false;

  try {
    console.log('Attempting to fetch database file from ' + DB_PATH + '...');
    const response = await fetch(DB_PATH);
    if (response.ok) {
      dbFileArrayBuffer = await response.arrayBuffer();
      if (dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0) {
        dbInstance = new sqlModule.Database(new Uint8Array(dbFileArrayBuffer));
        console.log('sql.js database instance initialized using ' + DB_PATH + '.');
        dbLoadedFromFile = true;
      } else {
        console.warn('Fetched ' + DB_PATH + ', but it was empty. Will create an in-memory DB with mock data as a fallback.');
      }
    } else {
      console.warn('Failed to fetch database file from ' + DB_PATH + ' (Status: ' + response.status + '). Will create an in-memory DB with mock data as a fallback.');
    }
  } catch (error) {
    console.error('CRITICAL: Failed to load database from ' + DB_PATH + ': ' + (error instanceof Error ? error.message : String(error)) + '. Will create an in-memory DB with mock data as a fallback.');
  }

  if (!dbLoadedFromFile) {
    dbInstance = new sqlModule.Database();
    console.warn('IMPORTANT: Falling back to an empty in-memory database because ' + DB_PATH + ' was not loaded or was empty. This will attempt to create tables and seed mock data. If you intend to use a persistent ' + DB_PATH + ', ensure it is correctly placed in the "public" folder and accessible with the correct schema and data.');
    try {
      createTables(dbInstance);
      seedDatabaseWithMockData(dbInstance);
    } catch (seedError) {
      console.error("CRITICAL: Failed to create tables or seed mock data in the in-memory database:", seedError);
    }
  } else if (dbInstance) {
    try {
      const tableCheckStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='employees' OR name='training_requests')");
      let tablesFound = 0;
      while (tableCheckStmt.step()) {
        tablesFound++;
      }
      tableCheckStmt.free();

      if (tablesFound < 2) {
        console.warn('Database loaded from ' + DB_PATH + ', but required tables ("employees", "training_requests") might be missing or incomplete. Application queries may fail if schema is not set up in ' + DB_PATH + '.');
        // Optionally, you could choose to createTables(dbInstance) and seedDatabaseWithMockData(dbInstance) here as well
        // if you want to attempt to "fix" an incomplete vendors.db, but this might be risky.
        // For now, it will just warn and proceed with the potentially incomplete DB.
      } else {
        console.log('Database loaded from ' + DB_PATH + '. Required tables ("employees", "training_requests") appear to exist.');
      }
    } catch (e) {
      console.warn('Could not verify/create tables in ' + DB_PATH + '. It might be malformed. Ensure schema is correct. Error:', e);
    }
  }


  if (!dbInstance) {
    console.error("ULTIMATE FALLBACK: dbInstance is still null after all attempts. Creating a new empty in-memory database. App will likely not function correctly.");
    dbInstance = new sqlModule.Database();
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
      ? JSON.parse(dbRequest.approvalChain).map((action: ApprovalAction) => ({
          ...action,
          date: new Date(action.date),
        }))
      : [],
    cost: Number(dbRequest.cost),
    cancelledDate: dbRequest.cancelledDate ? new Date(dbRequest.cancelledDate) : undefined,
  };
}

export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    console.log("Database changes are in-memory with sql.js. To persist, the ArrayBuffer from db.export() would need to be handled (e.g., downloaded by the user or sent to a server). For this app, data is reloaded from public/vendors.db on page refresh if available, or mock data is used.");
  }
}

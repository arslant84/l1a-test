
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Employee, TrainingRequest, ApprovalAction } from './types';
import { mockEmployees } from './mock-data'; // mockTrainingRequests are now empty

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DB_PATH = '/vendors.db'; // All app data (employees, requests) will go into this file
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
    'cost REAL, ' + // This is Course Fee
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
    'cancellationReason TEXT, ' +
    'costCenter TEXT, ' + // New field
    'estimatedLogisticCost REAL, ' + // New field
    'departmentApprovedBudget REAL, ' + // New field
    'departmentBudgetBalance REAL' + // New field
    ');'
  );
  console.log("Database tables (employees, training_requests) ensured/created in the current DB instance.");
}

function seedDatabaseWithMockData(db: Database) {
  // Check if employees table is empty before seeding to avoid duplicates on re-initialization
  let employeeCount = 0;
  const stmtCheck = db.prepare("SELECT COUNT(*) as count FROM employees");
  if (stmtCheck.step()) {
    employeeCount = stmtCheck.getAsObject().count as number;
  }
  stmtCheck.free();

  if (employeeCount === 0) {
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
    console.log("Mock employees seeded into empty employees table.");
  } else {
    console.log("Employees table already contains data, skipping mock employee seeding.");
  }
  // mockTrainingRequests is empty, so no requests are seeded.
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const sqlModule = await initializeSqlJs();
  let dbFileArrayBuffer: ArrayBuffer | null = null;
  let requiresInitialization = false; // Flag to track if createTables/seedData is needed

  try {
    console.log('Attempting to fetch database file from ' + DB_PATH + '...');
    const response = await fetch(DB_PATH);
    if (response.ok) {
      dbFileArrayBuffer = await response.arrayBuffer();
      if (dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0) {
        dbInstance = new sqlModule.Database(new Uint8Array(dbFileArrayBuffer));
        console.log('sql.js database instance initialized from ' + DB_PATH + '. Verifying schema...');

        // Check if essential tables exist
        const tableCheckStmt = dbInstance.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND (name='employees' OR name='training_requests')");
        let tablesFound = 0;
        if (tableCheckStmt.step()) {
          tablesFound = tableCheckStmt.getAsObject().count as number;
        }
        tableCheckStmt.free();

        if (tablesFound < 2) {
          console.warn(DB_PATH + ' was loaded but is missing required tables (found ' + tablesFound + '). Will attempt to initialize schema and seed mock data.');
          requiresInitialization = true;
        } else {
          console.log('Database loaded from ' + DB_PATH + ' and required tables appear to exist.');
           // Check if employees table is empty, if so, seed mock data
            let employeeCount = 0;
            const stmtEmpCheck = dbInstance.prepare("SELECT COUNT(*) as count FROM employees");
            if (stmtEmpCheck.step()) {
                employeeCount = stmtEmpCheck.getAsObject().count as number;
            }
            stmtEmpCheck.free();
            if (employeeCount === 0) {
                console.log("Employees table is empty in loaded DB, seeding mock employees.");
                requiresInitialization = true; // Set to true to run seedDatabaseWithMockData
            }
        }
      } else {
        console.warn('Fetched ' + DB_PATH + ', but it was empty. A new in-memory DB will be created and initialized.');
        dbInstance = new sqlModule.Database(); // Create new instance for initialization
        requiresInitialization = true;
      }
    } else {
      console.warn('Failed to fetch database file from ' + DB_PATH + ' (Status: ' + response.status + '). A new in-memory DB will be created and initialized.');
      dbInstance = new sqlModule.Database(); // Create new instance for initialization
      requiresInitialization = true;
    }
  } catch (error) {
    console.error('CRITICAL: Error during fetch or initial load of ' + DB_PATH + ': ' + (error instanceof Error ? error.message : String(error)) + '. A new in-memory DB will be created and initialized.');
    dbInstance = new sqlModule.Database(); // Create new instance for initialization
    requiresInitialization = true;
  }

  if (!dbInstance) { // Should not happen if logic above is correct, but as a safeguard
    console.error("FALLBACK: dbInstance is null. Creating a new empty in-memory database.");
    dbInstance = new sqlModule.Database();
    requiresInitialization = true; // Needs tables and data
  }
  
  if (requiresInitialization) {
    console.log('Initializing database schema and/or seeding mock data...');
    try {
      createTables(dbInstance); // Ensures tables exist
      seedDatabaseWithMockData(dbInstance); // Seeds mock employees if employees table is empty
    } catch (initError) {
      console.error("CRITICAL: Failed to create tables or seed mock data in the DB instance:", initError);
    }
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
  let approvalChain: ApprovalAction[] = [];
  if (dbRequest.approvalChain) {
    try {
      const parsedChain = JSON.parse(dbRequest.approvalChain);
      if (Array.isArray(parsedChain)) {
        approvalChain = parsedChain.map((action: any) => ({
          ...action,
          date: action.date ? new Date(action.date) : new Date(), 
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
    cost: Number(dbRequest.cost), // Course Fee
    cancelledDate: dbRequest.cancelledDate ? new Date(dbRequest.cancelledDate) : undefined,
    // New fields
    costCenter: dbRequest.costCenter,
    estimatedLogisticCost: dbRequest.estimatedLogisticCost !== null ? Number(dbRequest.estimatedLogisticCost) : undefined,
    departmentApprovedBudget: dbRequest.departmentApprovedBudget !== null ? Number(dbRequest.departmentApprovedBudget) : undefined,
    departmentBudgetBalance: dbRequest.departmentBudgetBalance !== null ? Number(dbRequest.departmentBudgetBalance) : undefined,
  };
}

export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    try {
      const dbArray = dbInstance.export();
      const blob = new Blob([dbArray], { type: 'application/octet-stream' });
      
      const formData = new FormData();
      formData.append('database', blob, 'vendors.db'); // Filename for the server

      console.log('Attempting to save database to server via API...');
      const response = await fetch('/api/save-database', { // Ensure this matches your API route
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server' }));
        console.error('Server responded with an error during save:', response.status, errorData);
        throw new Error('Failed to save database file to server. Status: ' + response.status + ', Message: ' + (errorData.error || 'Unknown error'));
      }
      const successData = await response.json();
      console.log('Database saved to server successfully.', successData.message);
    } catch (error) {
      console.error('Error saving database via API:', error);
      // Optional: re-throw or handle more gracefully depending on app requirements
      // throw error; 
    }
  } else {
    console.warn("Attempted to save database, but dbInstance is null.");
  }
}


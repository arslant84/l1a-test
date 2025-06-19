
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
  // Try to add columns if they don't exist - this is a simplified approach.
  // Full migration logic is more complex with sql.js.
  const columnsToAdd = [
    { name: 'costCenter', type: 'TEXT' },
    { name: 'estimatedLogisticCost', type: 'REAL' },
    { name: 'departmentApprovedBudget', type: 'REAL' },
    { name: 'departmentBudgetBalance', type: 'REAL' }
  ];

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
    'cancellationReason TEXT, ' +
    'costCenter TEXT, ' + 
    'estimatedLogisticCost REAL, ' +
    'departmentApprovedBudget REAL, ' +
    'departmentBudgetBalance REAL' + 
    ');'
  );
  console.log("Database tables (employees, training_requests) ensured/created with latest schema in the current DB instance.");

  // Check and add columns to training_requests if they don't exist
  // This is a common pattern for simple schema additions in SQLite
  const pragmaStmt = db.prepare("PRAGMA table_info(training_requests);");
  const existingColumns: string[] = [];
  while(pragmaStmt.step()) {
    existingColumns.push(pragmaStmt.getAsObject().name as string);
  }
  pragmaStmt.free();

  columnsToAdd.forEach(col => {
    if (!existingColumns.includes(col.name)) {
      try {
        db.exec(`ALTER TABLE training_requests ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to training_requests table.`);
      } catch (e) {
        console.error(`Failed to add column ${col.name}:`, e);
      }
    }
  });
}

function seedDatabaseWithMockData(db: Database) {
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
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const sqlModule = await initializeSqlJs();
  let dbFileArrayBuffer: ArrayBuffer | null = null;
  let requiresInitializationOrSchemaUpdate = false; 

  try {
    console.log('Attempting to fetch database file from ' + DB_PATH + '...');
    const response = await fetch(DB_PATH);
    if (response.ok) {
      dbFileArrayBuffer = await response.arrayBuffer();
      if (dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0) {
        dbInstance = new sqlModule.Database(new Uint8Array(dbFileArrayBuffer));
        console.log('sql.js database instance initialized from ' + DB_PATH + '. Verifying schema...');

        const tableCheckStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='training_requests';");
        const trainingRequestsTableExists = tableCheckStmt.step();
        tableCheckStmt.free();

        if (trainingRequestsTableExists) {
            const pragmaStmt = dbInstance.prepare("PRAGMA table_info(training_requests);");
            const existingColumns: string[] = [];
            while(pragmaStmt.step()) {
                existingColumns.push(pragmaStmt.getAsObject().name as string);
            }
            pragmaStmt.free();

            const requiredNewColumns = ['costCenter', 'estimatedLogisticCost', 'departmentApprovedBudget', 'departmentBudgetBalance'];
            const missingColumns = requiredNewColumns.filter(col => !existingColumns.includes(col));

            if (missingColumns.length > 0) {
                console.warn(`Loaded database ${DB_PATH} is missing columns: ${missingColumns.join(', ')}. Attempting schema update.`);
                requiresInitializationOrSchemaUpdate = true;
            } else {
                console.log('Database loaded from ' + DB_PATH + ' and schema for training_requests appears up-to-date.');
            }
        } else {
            console.warn(`Loaded database ${DB_PATH} but training_requests table is missing. Will create tables and seed data.`);
            requiresInitializationOrSchemaUpdate = true;
        }

        // Also check if employees table is empty, if so, seed mock data
        let employeeCount = 0;
        const stmtEmpCheck = dbInstance.prepare("SELECT COUNT(*) as count FROM employees");
        if (stmtEmpCheck.step()) {
            employeeCount = stmtEmpCheck.getAsObject().count as number;
        }
        stmtEmpCheck.free();
        if (employeeCount === 0 && trainingRequestsTableExists) { // Only seed if tables exist but employees is empty
            console.log("Employees table is empty in loaded DB, will seed mock employees.");
            requiresInitializationOrSchemaUpdate = true; 
        }

      } else {
        console.warn('Fetched ' + DB_PATH + ', but it was empty. A new in-memory DB will be created and initialized.');
        dbInstance = new sqlModule.Database(); 
        requiresInitializationOrSchemaUpdate = true;
      }
    } else {
      console.warn('Failed to fetch database file from ' + DB_PATH + ' (Status: ' + response.status + '). A new in-memory DB will be created and initialized.');
      dbInstance = new sqlModule.Database(); 
      requiresInitializationOrSchemaUpdate = true;
    }
  } catch (error) {
    console.error('CRITICAL: Error during fetch or initial load of ' + DB_PATH + ': ' + (error instanceof Error ? error.message : String(error)) + '. A new in-memory DB will be created and initialized.');
    dbInstance = new sqlModule.Database(); 
    requiresInitializationOrSchemaUpdate = true;
  }

  if (!dbInstance) { 
    console.error("FALLBACK: dbInstance is null. Creating a new empty in-memory database.");
    dbInstance = new sqlModule.Database();
    requiresInitializationOrSchemaUpdate = true; 
  }
  
  if (requiresInitializationOrSchemaUpdate) {
    console.log('Initializing database schema and/or seeding mock data...');
    try {
      createTables(dbInstance); 
      seedDatabaseWithMockData(dbInstance); 
      if(dbFileArrayBuffer && dbFileArrayBuffer.byteLength > 0){ // if we loaded an old DB and updated schema
        console.log("Schema updated for existing DB. Attempting to save changes...");
        await saveDatabaseChanges(); // Save after potential ALTER TABLE
      }
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
    cost: Number(dbRequest.cost), 
    cancelledDate: dbRequest.cancelledDate ? new Date(dbRequest.cancelledDate) : undefined,
    costCenter: dbRequest.costCenter,
    estimatedLogisticCost: dbRequest.estimatedLogisticCost !== null && dbRequest.estimatedLogisticCost !== undefined ? Number(dbRequest.estimatedLogisticCost) : undefined,
    departmentApprovedBudget: dbRequest.departmentApprovedBudget !== null && dbRequest.departmentApprovedBudget !== undefined ? Number(dbRequest.departmentApprovedBudget) : undefined,
    departmentBudgetBalance: dbRequest.departmentBudgetBalance !== null && dbRequest.departmentBudgetBalance !== undefined ? Number(dbRequest.departmentBudgetBalance) : undefined,
  };
}

export async function saveDatabaseChanges(): Promise<void> {
  if (dbInstance) {
    try {
      const dbArray = dbInstance.export();
      const blob = new Blob([dbArray], { type: 'application/octet-stream' });
      
      const formData = new FormData();
      formData.append('database', blob, 'vendors.db'); 

      console.log('Attempting to save database to server via API...');
      const response = await fetch('/api/save-database', { 
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
    }
  } else {
    console.warn("Attempted to save database, but dbInstance is null.");
  }
}


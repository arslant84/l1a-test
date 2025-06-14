
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import type { Employee, TrainingRequest, ApprovalAction } from './types';
import { mockEmployees, mockTrainingRequests } from './mock-data'; // For seeding

const DB_PATH = process.env.DB_PATH || './l1a_approve.db';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const verboseSqlite3 = sqlite3.verbose();
    dbInstance = await open({
      filename: DB_PATH,
      driver: verboseSqlite3.Database,
    });
    await initializeDb(dbInstance);
  }
  return dbInstance;
}

async function initializeDb(db: Database) {
  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department TEXT,
      role TEXT NOT NULL CHECK(role IN ('employee', 'supervisor', 'thr', 'ceo', 'cm')),
      avatarUrl TEXT,
      managerId TEXT,
      position TEXT,
      staffNo TEXT UNIQUE,
      academicQualification TEXT,
      dateJoined TEXT 
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS training_requests (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      employeeName TEXT NOT NULL,
      trainingTitle TEXT NOT NULL,
      justification TEXT,
      organiser TEXT,
      venue TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      cost REAL NOT NULL,
      mode TEXT NOT NULL,
      programType TEXT NOT NULL,
      previousRelevantTraining TEXT,
      supportingDocuments TEXT, -- Store as JSON string
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
      currentApprovalStep TEXT NOT NULL,
      approvalChain TEXT, -- Store as JSON string
      submittedDate TEXT NOT NULL,
      lastUpdated TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    );
  `);

  await seedDatabase(db);
}

async function seedDatabase(db: Database) {
  const employeeCount = await db.get('SELECT COUNT(*) as count FROM employees');
  if (employeeCount && employeeCount.count === 0) {
    const stmt = await db.prepare(
      'INSERT INTO employees (id, name, email, department, role, avatarUrl, managerId, position, staffNo, academicQualification, dateJoined) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const emp of mockEmployees) {
      await stmt.run(
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
        emp.dateJoined ? emp.dateJoined.toISOString() : null
      );
    }
    await stmt.finalize();
    console.log('Employees table seeded.');
  }

  const requestCount = await db.get('SELECT COUNT(*) as count FROM training_requests');
  if (requestCount && requestCount.count === 0) {
    const stmt = await db.prepare(
      'INSERT INTO training_requests (id, employeeId, employeeName, trainingTitle, justification, organiser, venue, startDate, endDate, cost, mode, programType, previousRelevantTraining, supportingDocuments, status, currentApprovalStep, approvalChain, submittedDate, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const req of mockTrainingRequests) {
      await stmt.run(
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
        req.lastUpdated.toISOString()
      );
    }
    await stmt.finalize();
    console.log('Training requests table seeded.');
  }
}

// Helper to parse dates and JSON from DB results
export function parseEmployee(dbEmployee: any): Employee {
  return {
    ...dbEmployee,
    dateJoined: dbEmployee.dateJoined ? new Date(dbEmployee.dateJoined) : undefined,
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
    cost: Number(dbRequest.cost) // Ensure cost is a number
  };
}

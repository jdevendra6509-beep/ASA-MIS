import express from "express";
import { createServer as createViteServer } from "vite";
import * as msal from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import admin from "firebase-admin";
import Database from 'better-sqlite3';

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

enum UserRole {
  MASTER_ADMIN = "Master Admin",
  ADMIN = "Admin",
  OWNER = "Owner",
  PARTNER = "Partner",
  MANAGER = "Manager",
  EMPLOYEE = "Employee"
}

// --- Database Initialization ---
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

let db: any;

if (serviceAccount || process.env.FIREBASE_PROJECT_ID) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  db = admin.firestore();
} else {
  console.warn("Firebase not configured. Using local SQLite mock database.");
  const sqliteDb = new Database('local.db');

  // Initialize SQLite tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      collection TEXT,
      data TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT
    );
  `);

  // Firestore Mock Layer
  const createMockDoc = (id: string, data: any) => ({
    id,
    exists: !!data,
    data: () => data,
    ref: {
      update: async (updateData: any) => {
        const newData = { ...data, ...updateData };
        sqliteDb.prepare('UPDATE collections SET data = ? WHERE id = ?').run(JSON.stringify(newData), id);
      }
    }
  });

  db = {
    collection: (name: string) => {
      let query = sqliteDb.prepare('SELECT * FROM collections WHERE collection = ?');
      let filters: any[] = [];
      let sortField: string | null = null;
      let sortDir: 'asc' | 'desc' = 'asc';

      const mockCollection = {
        doc: (id: string) => ({
          get: async () => {
            const row = sqliteDb.prepare('SELECT data FROM collections WHERE id = ?').get(id) as any;
            return createMockDoc(id, row ? JSON.parse(row.data) : null);
          },
          set: async (data: any, options?: { merge?: boolean }) => {
            let finalData = data;
            if (options?.merge) {
              const existingRow = sqliteDb.prepare('SELECT data FROM collections WHERE id = ?').get(id) as any;
              if (existingRow) {
                finalData = { ...JSON.parse(existingRow.data), ...data };
              }
            }
            sqliteDb.prepare('INSERT OR REPLACE INTO collections (id, collection, data, createdAt) VALUES (?, ?, ?, ?)')
              .run(id, name, JSON.stringify(finalData), new Date().toISOString());
          },
          update: async (data: any) => {
            const row = sqliteDb.prepare('SELECT data FROM collections WHERE id = ?').get(id) as any;
            if (row) {
              const newData = { ...JSON.parse(row.data), ...data };
              sqliteDb.prepare('UPDATE collections SET data = ? WHERE id = ?').run(JSON.stringify(newData), id);
            }
          }
        }),
        where: (field: string, op: string, value: any) => {
          filters.push({ field, op, value });
          return mockCollection;
        },
        orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => {
          sortField = field;
          sortDir = dir;
          return mockCollection;
        },
        limit: (n: number) => {
          // Simplistic limit
          return mockCollection;
        },
        add: async (data: any) => {
          const id = uuidv4();
          sqliteDb.prepare('INSERT INTO collections (id, collection, data, createdAt) VALUES (?, ?, ?, ?)')
            .run(id, name, JSON.stringify(data), new Date().toISOString());
          return { id };
        },
        get: async () => {
          let rows = sqliteDb.prepare('SELECT * FROM collections WHERE collection = ?').all(name) as any[];
          let results = rows.map(r => ({ id: r.id, ...JSON.parse(r.data) }));

          // Apply filters
          filters.forEach(f => {
            results = results.filter(r => {
              if (f.op === '==') return r[f.field] === f.value;
              if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(r[f.field]);
              return true;
            });
          });

          // Apply sort
          if (sortField) {
            results.sort((a, b) => {
              const valA = a[sortField!];
              const valB = b[sortField!];
              if (valA < valB) return sortDir === 'asc' ? -1 : 1;
              if (valA > valB) return sortDir === 'asc' ? 1 : -1;
              return 0;
            });
          }

          return {
            empty: results.length === 0,
            docs: results.map(r => ({
              id: r.id,
              data: () => r,
              ref: {
                update: async (updateData: any) => {
                  const latest = sqliteDb.prepare('SELECT data FROM collections WHERE id = ?').get(r.id) as any;
                  const newData = { ...JSON.parse(latest.data), ...updateData };
                  sqliteDb.prepare('UPDATE collections SET data = ? WHERE id = ?').run(JSON.stringify(newData), r.id);
                }
              }
            }))
          };
        }
      };
      return mockCollection;
    },
    batch: () => ({
      set: (ref: any, data: any) => ref.set(data),
      commit: async () => { }
    })
  };
}

// Helper to seed initial data
async function seedDatabase() {
  try {
    // Seed Permissions
    const permSnap = await db.collection('role_permissions').get();
    if (permSnap.empty || permSnap.docs?.length < 30) {
      console.log("Seeding default permissions...");
      const roles = Object.values(UserRole);
      const permissions = [
        { key: "view_dashboard", label: "View Dashboard" },
        { key: "create_employee", label: "Create Employee" },
        { key: "view_employee_list", label: "View Employee List" },
        { key: "manage_settings", label: "Manage Settings" },
        { key: "view_reports", label: "View Reports" }
      ];

      for (const role of roles) {
        for (const perm of permissions) {
          let enabled = role === UserRole.MASTER_ADMIN;
          if (role === UserRole.ADMIN && perm.key !== "manage_settings") enabled = true;
          if (perm.key === "view_dashboard") enabled = true;
          if (perm.key === "view_employee_list" && role !== UserRole.EMPLOYEE) enabled = true;

          await db.collection('role_permissions').doc(`${role}_${perm.key}`).set({
            role,
            permission: perm.key,
            label: perm.label,
            enabled
          });
        }
      }
      console.log("Permissions seeded.");
    }

    // Seed Master Admin
    const userSnap = await db.collection('users').where('role', '==', 'Master Admin').limit(1).get();
    if (userSnap.empty) {
      console.log("Seeding Master Admin...");
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await db.collection('users').add({
        firstName: "Master",
        lastName: "Admin",
        email: "admin@company.com",
        password: hashedPassword,
        role: "Master Admin",
        status: "Active",
        employeeCode: "ADMIN001",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log("Seeded Master Admin: admin@company.com / admin123");
    }
  } catch (error) {
    console.error("Seeding Error:", error);
  }
}

seedDatabase();

// --- Outlook Integration Helpers ---
let pca: msal.ConfidentialClientApplication | null = null;

function getPCA() {
  if (!pca) {
    const clientId = process.env.MICROSOFT_CLIENT_ID || "MOCK_CLIENT_ID";
    if (!clientId) return null;
    pca = new msal.ConfidentialClientApplication({
      auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      }
    });
  }
  return pca;
}

async function getGraphClient(userId: string) {
  if (!userId) return null;
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) return null;

  const userData = doc.data();
  if (!userData?.outlookToken) return null;

  const tokenData = userData.outlookToken;
  const client = getPCA();
  if (!client) return null;

  try {
    const response = await client.acquireTokenSilent({
      account: tokenData.account,
      scopes: ["user.read", "mail.send"],
    });

    return Client.init({
      authProvider: (done) => done(null, response.accessToken),
    });
  } catch (error) {
    // If silent acquisition fails, clear the token
    await userRef.update({ outlookToken: null });
    console.error("Graph Client Error:", error);
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' })); // Increased limit for attachments
  const PORT = 3000;

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", persistence: !!serviceAccount || !!process.env.FIREBASE_PROJECT_ID });
  });

  // --- Outlook Routes ---
  app.get("/api/auth/outlook/url", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const client = getPCA();
    if (!client) return res.status(400).json({ error: "Outlook integration not configured" });
    const redirectUri = `${(process.env.APP_URL || '').replace(/\/$/, '')}/api/auth/outlook/callback`;
    try {
      const url = await client.getAuthCodeUrl({
        scopes: ["user.read", "mail.send", "offline_access"],
        redirectUri: redirectUri,
        state: userId as string
      });
      res.json({ url });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/auth/outlook/callback", async (req, res) => {
    const { code, state: userId } = req.query;
    const client = getPCA();
    if (!client) return res.status(400).send("Outlook not configured");
    const redirectUri = `${(process.env.APP_URL || '').replace(/\/$/, '')}/api/auth/outlook/callback`;
    try {
      const response = await client.acquireTokenByCode({
        code: code as string,
        scopes: ["user.read", "mail.send", "offline_access"],
        redirectUri: redirectUri,
      });
      if (response && userId) {
        await db.collection('users').doc(userId as string).update({
          outlookToken: JSON.parse(JSON.stringify(response))
        });
        res.send(`<html><body><script>window.opener.postMessage({type:'OUTLOOK_AUTH_SUCCESS'},'*');window.close();</script></body></html>`);
      }
    } catch (error: any) {
      res.status(500).send(`Auth Failed: ${error.message}`);
    }
  });

  app.get("/api/settings/outlook/:userId", async (req, res) => {
    const { userId } = req.params;
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.outlookToken) {
        res.json({ connected: true, account: data.outlookToken.account?.username });
      } else {
        res.json({ connected: false });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/settings/outlook/disconnect", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    await db.collection('users').doc(userId).update({ outlookToken: null });
    res.json({ success: true });
  });

  // --- Auth Routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();

    if (snap.empty) return res.status(401).json({ error: "Invalid credentials" });

    const userDoc = snap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    if (!user.password) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status !== 'Active') {
      return res.status(403).json({ error: "Account not activated." });
    }

    const { password: _, registrationToken: __, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/auth/verify-token/:token", async (req, res) => {
    const { token } = req.params;
    const snap = await db.collection('users').where('registrationToken', '==', token).limit(1).get();

    if (snap.empty) return res.status(404).json({ error: "Invalid token" });

    const user = snap.docs[0].data() as any;
    if (new Date(user.registrationTokenExpires) < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    res.json({
      email: user.email, firstName: user.firstName, lastName: user.lastName,
      designation: user.designation, dateOfJoining: user.dateOfJoining,
      role: user.role, department: user.department,
      reportingPartner: user.reportingPartner, reportingManager: user.reportingManager
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { token, password, ...rest } = req.body;
    const snap = await db.collection('users').where('registrationToken', '==', token).limit(1).get();

    if (snap.empty) return res.status(404).json({ error: "Invalid token" });

    const userDoc = snap.docs[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await userDoc.ref.update({
        ...rest,
        password: hashedPassword,
        status: 'Active',
        registrationToken: null,
        registrationTokenExpires: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Employee Routes ---
  app.post("/api/employees", async (req, res) => {
    const { firstName, lastName, email, role, department, ...rest } = req.body;
    const employeeCode = "EMP" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const registrationToken = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 48);

    try {
      const docRef = await db.collection('users').add({
        firstName, lastName, email, role, department, ...rest,
        employeeCode, registrationToken,
        registrationTokenExpires: expires.toISOString(),
        status: 'Pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const graphClient = await getGraphClient(req.body.adminId);
      if (graphClient) {
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        const registrationLink = `${appUrl}/register/${registrationToken}`;
        await graphClient.api("/me/sendMail").post({
          message: {
            subject: "Welcome to MIS Portal",
            body: { contentType: "HTML", content: `<p>Welcome ${firstName}! Register here: <a href="${registrationLink}">${registrationLink}</a></p>` },
            toRecipients: [{ emailAddress: { address: email } }]
          }
        });
      }

      res.json({ id: docRef.id, employeeCode, emailSent: !!graphClient });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/by-role/:role", async (req, res) => {
    const { role } = req.params;
    const snap = await db.collection('users').where('role', '==', role).where('status', '==', 'Active').get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });

  app.get("/api/employees", async (req, res) => {
    const snap = await db.collection('users').get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    await db.collection('users').doc(id).set(req.body, { merge: true });
    res.json({ success: true });
  });

  app.post("/api/users/:id/reset-password", async (req, res) => {
    const { id } = req.params;
    const registrationToken = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 48);

    await db.collection('users').doc(id).set({
      registrationToken,
      registrationTokenExpires: expires.toISOString(),
      status: 'Pending'
    }, { merge: true });

    // In a real app, send actual email here. For now, it's triggered manually.
    res.json({ success: true, token: registrationToken });
  });

  app.get("/api/permissions", async (req, res) => {
    const snap = await db.collection('role_permissions').get();
    res.json(snap.docs.map(doc => doc.data()));
  });

  app.post("/api/permissions/toggle", async (req, res) => {
    const { role, permission, enabled } = req.body;
    await db.collection('role_permissions').doc(`${role}_${permission}`).set({ enabled }, { merge: true });
    res.json({ success: true });
  });

  // --- Clients ---
  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection('clients').add(clientData);
      res.status(201).json({ id: docRef.id, ...clientData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients", async (req, res) => {
    try {
      const snap = await db.collection('clients').orderBy('createdAt', 'desc').get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Projects ---
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection('projects').add(projectData);
      res.status(201).json({ id: docRef.id, ...projectData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const snap = await db.collection('projects').orderBy('createdAt', 'desc').get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Jobs ---
  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection('jobs').add(jobData);
      res.status(201).json({ id: docRef.id, ...jobData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const snap = await db.collection('jobs').orderBy('createdAt', 'desc').get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Timesheets ---
  app.post("/api/timesheets", async (req, res) => {
    try {
      const timesheetData = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection('timesheets').add(timesheetData);
      res.status(201).json({ id: docRef.id, ...timesheetData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/timesheets", async (req, res) => {
    try {
      const snap = await db.collection('timesheets').orderBy('date', 'desc').get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(__dirname, "dist");

  if (!isProd || !fs.existsSync(distPath)) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server on http://0.0.0.0:${PORT}`));
}

startServer().catch(err => {
  console.error(err);
  process.exit(1);
});

import express from "express";
import { createServer as createViteServer } from "vite";
import * as msal from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import admin from "firebase-admin";

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Firebase Initialization ---
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID
  });
} else {
  console.warn("Firebase not configured. Persistence will not work. Please set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID.");
}

const db = admin.firestore();

// Helper to seed initial data
async function seedDatabase() {
  try {
    // Seed Permissions
    const permSnap = await db.collection('role_permissions').limit(1).get();
    if (permSnap.empty) {
      console.log("Seeding default permissions...");
      const roles = ["Master Admin", "Admin", "Owner", "Partner", "Manager", "Employee"];
      const permissions = ["view_dashboard", "create_employee", "view_employee_list", "manage_settings", "view_reports"];
      
      const batch = db.batch();
      roles.forEach(role => {
        permissions.forEach(perm => {
          let enabled = role === "Master Admin";
          if (role === "Admin" && perm !== "manage_settings") enabled = true;
          if (perm === "view_dashboard") enabled = true;
          if (perm === "view_employee_list" && role !== "Employee") enabled = true;
          
          const ref = db.collection('role_permissions').doc(`${role}_${perm}`);
          batch.set(ref, { role, permission: perm, enabled });
        });
      });
      await batch.commit();
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
    const clientId = process.env.MICROSOFT_CLIENT_ID;
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

async function getGraphClient() {
  const doc = await db.collection('settings').doc('outlook_token').get();
  if (!doc.exists) return null;

  const tokenData = doc.data();
  const client = getPCA();
  if (!client || !tokenData) return null;

  try {
    const response = await client.acquireTokenSilent({
      account: tokenData.account,
      scopes: ["user.read", "mail.send"],
    });
    
    return Client.init({
      authProvider: (done) => done(null, response.accessToken),
    });
  } catch (error) {
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
    const client = getPCA();
    if (!client) return res.status(400).json({ error: "Outlook integration not configured" });
    const redirectUri = `${(process.env.APP_URL || '').replace(/\/$/, '')}/api/auth/outlook/callback`;
    try {
      const url = await client.getAuthCodeUrl({
        scopes: ["user.read", "mail.send", "offline_access"],
        redirectUri: redirectUri,
      });
      res.json({ url });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/auth/outlook/callback", async (req, res) => {
    const client = getPCA();
    if (!client) return res.status(400).send("Outlook not configured");
    const redirectUri = `${(process.env.APP_URL || '').replace(/\/$/, '')}/api/auth/outlook/callback`;
    try {
      const response = await client.acquireTokenByCode({
        code: req.query.code as string,
        scopes: ["user.read", "mail.send", "offline_access"],
        redirectUri: redirectUri,
      });
      if (response) {
        await db.collection('settings').doc('outlook_token').set(JSON.parse(JSON.stringify(response)));
        res.send(`
          <html>
            <body>
              <script>
                try {
                  if (window.opener) {
                    window.opener.postMessage({type:'OUTLOOK_AUTH_SUCCESS'}, '*');
                    window.close();
                  } else {
                    document.body.innerHTML = "<h1>Connected Successfully!</h1><p>You can close this window and refresh the settings page.</p>";
                  }
                } catch (e) {
                  console.error("PostMessage failed", e);
                  document.body.innerHTML = "<h1>Connected Successfully!</h1><p>You can close this window and refresh the settings page.</p>";
                }
              </script>
            </body>
          </html>
        `);
      }
    } catch (error: any) {
      res.status(500).send(`Auth Failed: ${error.message}`);
    }
  });

  app.get("/api/settings/outlook", async (req, res) => {
    const doc = await db.collection('settings').doc('outlook_token').get();
    if (doc.exists) {
      const data = doc.data();
      res.json({ connected: true, account: data?.account?.username });
    } else {
      res.json({ connected: false });
    }
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

      const graphClient = await getGraphClient();
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
    // Include both Active and Pending users so they show up in dropdowns during setup
    const snap = await db.collection('users')
      .where('role', '==', role)
      .where('status', 'in', ['Active', 'Pending'])
      .get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });

  app.get("/api/employees", async (req, res) => {
    const snap = await db.collection('users').get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });

  app.get("/api/permissions", async (req, res) => {
    const snap = await db.collection('role_permissions').get();
    res.json(snap.docs.map(doc => doc.data()));
  });

  app.post("/api/permissions/toggle", async (req, res) => {
    const { role, permission, enabled } = req.body;
    await db.collection('role_permissions').doc(`${role}_${permission}`).update({ enabled });
    res.json({ success: true });
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

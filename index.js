import dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDB, { sequelize } from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import brokerRouter from "./routes/broker.routes.js";
import clientRouter from "./routes/client.routes.js";
import lenderRouter from "./routes/lender.routes.js";
import loanTypeRouter from "./routes/loanType.routes.js";
import webhookRouter from "./routes/webhook.routes.js";
import scraperRouter from "./routes/scraper.routes.js";
import locationRouter from "./routes/location.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import models to ensure they are registered with Sequelize before sync
import './models/admin.model.js';
import './models/bank.model.js';
import './models/partner.model.js';

import './models/lead.model.js';
import './models/lender.js';
import './models/loan_type.js';
import './models/lender_loan_rates.js';
import './models/state.js';
import './models/district.js';
import './models/city.js';
import './models/pincode.js';
import './models/loan_application.js';
import './models/lender_application.js';
import './models/document.js';
import './models/status.js';
import './models/relationship_manager.model.js';
import { setupAssociations } from './models/associations.js';
import { startScraperScheduler } from './scrapers/scheduler.js';

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "http://localhost:5173",
        "https://fin4sure.vercel.app" // Add explicit vercel domain if known
      ];
      // Allow all vercel.app deployments (production + previews)
      if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "PATCH", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/broker", brokerRouter);
app.use("/api/client", clientRouter);
app.use("/api/lenders", lenderRouter);
app.use("/api/loan-types", loanTypeRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/admin/scraper", scraperRouter);
app.use("/api/location", locationRouter);

app.get("/", (req, res) => {
  res.send("<h1>Fin4Sure Backend API is running perfectly! 🚀</h1><p>Please visit the Frontend Vercel link to view the actual website.</p>");
});

app.get("/run-scraper-now", async (req, res) => {
  try {
    const { triggerFullScrape } = await import("./scrapers/orchestrator.js");
    triggerFullScrape('manual_get_route');
    res.send("<h1>Scraper Started!</h1><p>Check the database in a few minutes, the scraper is currently running in the background.</p>");
  } catch (err) {
    res.status(500).send("Error triggering scraper: " + err.message);
  }
});

app.get("/reset-db-now", async (req, res) => {
  try {
    const { execSync } = await import("child_process");
    const nodePath = process.execPath;
    const seqPath = "node_modules/sequelize-cli/lib/sequelize";
    let output = "Starting DB reset...<br/>";
    output += execSync(`${nodePath} wipe.js`, { encoding: 'utf-8', env: process.env });
    output += execSync(`${nodePath} ${seqPath} db:migrate`, { encoding: 'utf-8', env: process.env });
    output += execSync(`${nodePath} ${seqPath} db:seed:all`, { encoding: 'utf-8', env: process.env });
    res.send(`<h1>Success!</h1><pre>${output}</pre>`);
  } catch (err) {
    res.status(500).send(`<h1>Error running reset</h1><pre>${err.message}\n\nSTDOUT/STDERR:\n${err.stdout || ''}\n${err.stderr || ''}</pre>`);
  }
});

app.get("/seed-pincodes-now", async (req, res) => {
  try {
    const { execSync } = await import("child_process");
    const nodePath = process.execPath;
    const startIndex = req.query.start || '0';
    
    // Run chunk synchronously (takes ~5-10 seconds for 5000 records)
    const output = execSync(`${nodePath} seed_pincodes.js`, { 
      encoding: 'utf-8', 
      env: { ...process.env, START_INDEX: startIndex } 
    });
    
    // Check for next index
    const match = output.match(/__NEXT_INDEX__:(-?\d+)/);
    const nextIndex = match ? parseInt(match[1], 10) : -1;
    
    if (nextIndex !== -1) {
      res.send(`
        <h1>Seeding in progress... Please do not close this tab!</h1>
        <p>Processed up to JSON line ${nextIndex}. Automatically moving to next chunk...</p>
        <pre>${output}</pre>
        <meta http-equiv="refresh" content="2;url=/seed-pincodes-now?start=${nextIndex}">
      `);
    } else {
      res.send(`<h1>Seeding Complete! All 1.5 Lakh pincodes inserted successfully!</h1><pre>${output}</pre>`);
    }
  } catch (err) {
    res.status(500).send(`<h1>Error starting pincode seeder</h1><pre>${err.message}\n\n${err.stdout || ''}\n${err.stderr || ''}</pre>`);
  }
});

app.get("/seeder-log", async (req, res) => {
  try {
    const fs = await import("fs");
    if (fs.existsSync('./seeder.log')) {
      const log = fs.readFileSync('./seeder.log', 'utf-8');
      res.send(`<pre>${log || 'Log file is empty (Process just started or failed silently)'}</pre><script>setTimeout(() => window.location.reload(), 2000);</script>`);
    } else {
      res.send("<pre>Log file not created yet...</pre><script>setTimeout(() => window.location.reload(), 2000);</script>");
    }
  } catch (err) {
    res.send("Error reading log: " + err.message);
  }
});

const PORT = process.env.PORT || 8000;

// Start HTTP server immediately so Hostinger proxy binds the port without timing out
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

const startServer = async () => {
  try {
    await connectDB();
    setupAssociations();
    await sequelize.authenticate();
    
    // Update borrowers ENUM schema automatically
    try {
      await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN profile_status ENUM('Active', 'Inactive', 'Completed', 'Incomplete', 'Under Review', 'Rejected') DEFAULT 'Active';");
      console.log("Borrowers profile_status ENUM updated.");
    } catch (err) {
      console.log("Borrowers table alter notice:", err.message);
    }

    console.log("Database connected successfully");
    startScraperScheduler();
  } catch (error) {
    console.error("Database initialization notice:", error.message);
  }
};

startServer();

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

app.get("/reset-db-now", async (req, res) => {
  try {
    const { execSync } = await import("child_process");
    console.log("Starting DB reset...");
    execSync("node wipe.js", { stdio: 'inherit' });
    execSync("npx sequelize-cli db:migrate", { stdio: 'inherit' });
    execSync("npx sequelize-cli db:seed:all", { stdio: 'inherit' });
    res.send("<h1>Database wiped, migrated, and seeded successfully!</h1><p>You can now close this tab.</p>");
  } catch (err) {
    console.error(err);
    res.status(500).send("<h1>Error running reset</h1><p>" + err.message + "</p>");
  }
});

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    
    setupAssociations();
    await sequelize.authenticate(); // We do not use sync({alter: true}) to avoid the 64 keys bug.
    console.log("Database connected successfully");

    // Start the weekly loan rate scraper scheduler
    startScraperScheduler();

    app.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error.message);
    process.exit(1);
  }
};

startServer();

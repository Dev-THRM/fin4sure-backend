import dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDB, { sequelize } from "./config/db.js";
import authRouter from "./routes/auth.routes.js"; // ADD THIS
import adminRouter from "./routes/admin.routes.js";
import brokerRouter from "./routes/broker.routes.js";
import clientRouter from "./routes/client.routes.js";
import lenderRouter from "./routes/lender.routes.js";
import loanTypeRouter from "./routes/loanType.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import models to ensure they are registered with Sequelize before sync
import './models/admin.model.js';
import './models/bank.model.js';
import './models/city.model.js';
import './models/partner.model.js';
import './models/client.model.js';
import './models/lead.model.js';
import './models/lender.js';
import './models/loan_type.js';
import './models/lender_loan_rates.js';
import './models/state.js';
import './models/district.js';
import './models/city.js';
import './models/pincode.js';
import { setupAssociations } from './models/associations.js';


const app = express();

app.use(
  cors({
    origin: ["https://fin4sure-frontend.vercel.app", "http://localhost:5173"],
    methods: ["GET", "PATCH", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter); // ADD THIS
app.use("/api/admin", adminRouter);
app.use("/api/broker", brokerRouter);
app.use("/api/client", clientRouter);
app.use("/api/lenders", lenderRouter);
app.use("/api/loan-types", loanTypeRouter);

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Drop old tables if they exist to force clean schema recreation
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;").catch(() => {});
    await sequelize.query("DROP TABLE IF EXISTS `partners`;").catch(() => {});
    await sequelize.query("DROP TABLE IF EXISTS `cities`;").catch(() => {});
    await sequelize.query("DROP TABLE IF EXISTS `Brokers`;").catch(() => {});
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;").catch(() => {});

    // Sync models
    setupAssociations();
    await sequelize.sync({ alter: true });
    console.log("Database synced");

    app.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error.message);
    process.exit(1);
  }
};

startServer();

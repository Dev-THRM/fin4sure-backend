import { registerBorrowerService } from "../services/auth.service.js";
import { sequelize } from "../config/db.js";
import { setupAssociations } from "../models/associations.js";

setupAssociations();

const testData = {
  name: "Test Borrower",
  email: "testborrower_" + Date.now() + "@example.com",
  number: "987654" + Math.floor(1000 + Math.random() * 9000),
  dob: "1995-05-15",
  gender: "male",
  address: "123 Main St",
  pincode: "400001",
  password: "Password123!",
  loanAmount: 500000,
  tenure: 60,
  loanPurpose: "Home Renovation",
  loanType: "HL", // wait, what is the short_id for Home Loan? Probably "HL" or "home-loan". Let's see what is in db.
  selectedLenders: [1] // let's try with lender ID 1
};

async function run() {
  try {
    const result = await registerBorrowerService(testData);
    console.log("SUCCESS:", result);
  } catch (error) {
    console.error("ERROR DETECTED:", error);
  } finally {
    await sequelize.close();
  }
}

run();

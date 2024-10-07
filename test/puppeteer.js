const puppeteer = require("puppeteer");
require("../app.js");
const { seed_db, testUserPassword } = require("../util/seed_db.js");
const Job = require("../models/Job.js");

let testUser = null;
let page = null;
let browser = null;

describe("jobs-ejs puppeteer test", function () {
  before(async function () {
    this.timeout(10000);
    // Launch the browser and open a new blank page
    browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    page = await browser.newPage();
    await page.goto("http://localhost:3000");
  });

  after(async function () {
    this.timeout(5000);
    await browser.close();
  });

  describe("got to site", function () {
    it("should have completed a connection", async function () {});
  });

  describe("index page test", function () {
    this.timeout(10000);
    it("finds the index page logon link", async () => {
      this.logonLink = await page.waitForSelector(
        "a ::-p-text(Click this link to logon)",
        { timeout: 20000 }
      );
    });

    it("gets to the logon page", async () => {
      await this.logonLink.click();
      await page.waitForNavigation({ timeout: 20000 });
    });
  });

  describe("logon page test", function () {
    this.timeout(20000);
    it("resolves all the fields", async () => {
      this.email = await page.waitForSelector('input[name="email"]', { timeout: 20000 });
      this.password = await page.waitForSelector('input[name="password"]', { timeout: 20000 });
      this.submit = await page.waitForSelector("button ::-p-text(Logon)", { timeout: 20000 });
    });

    it("sends the logon", async () => {
      testUser = await seed_db();
      await this.email.type(testUser.email);
      await this.password.type(testUserPassword);
      await this.submit.click();
      await page.waitForNavigation({ timeout: 20000 });
      await page.waitForSelector(`p ::-p-text(${testUser.name} is logged on.)`, { timeout: 20000 });
    });
  });

  // Updated job operations tests
  describe("puppeteer job operations", function () {
    this.timeout(60000);

    // Test 1: Verify job listing page shows 20 entries
    it("should show 20 job entries on the jobs list page", async () => {
      const { expect } = await import('chai');

      // Click on the "Jobs List" link
      const jobsLink = await page.waitForSelector('a[href="/jobs"]', { timeout: 30000 });
      await jobsLink.click();
      await page.waitForNavigation({ timeout: 30000 });

      // Count the number of job rows in the table (excluding the header)
      const jobsRows = await page.$$('#jobs-table tr:not(#jobs-table-header)');
      expect(jobsRows.length).to.equal(20);
    });

    // Test 2: Test "Add A Job" form appearance
    it("should open the Add A Job form", async () => {
      const { expect } = await import('chai');

      // Click on "Add A Job" button
      const addJobButton = await page.waitForSelector('a[href="/jobs/new"] button', { timeout: 30000 });
      await addJobButton.click();
      await page.waitForNavigation({ timeout: 30000 });

      // Verify that the form fields appear
      const companyField = await page.waitForSelector('input[name="company"]', { timeout: 30000 });
      const positionField = await page.waitForSelector('input[name="position"]', { timeout: 30000 });
      const addButton = await page.waitForSelector('button[type="submit"]', { timeout: 30000 });

      expect(companyField).to.not.be.null;
      expect(positionField).to.not.be.null;
      expect(addButton).to.not.be.null;
    });

    // Test 3: Add a job and verify the addition
    it("should add a new job and verify it in the database", async () => {
      const { expect } = await import('chai');

      // Fill in the form fields
      const companyField = await page.waitForSelector('input[name="company"]', { timeout: 30000 });
      const positionField = await page.waitForSelector('input[name="position"]', { timeout: 30000 });
      const statusSelect = await page.waitForSelector('select[name="status"]', { timeout: 30000 });
      const addButton = await page.waitForSelector('button[type="submit"]', { timeout: 30000 });

      const newJobData = {
        company: "Test Company",
        position: "Software Engineer",
        status: "pending"
      };

      await companyField.type(newJobData.company);
      await positionField.type(newJobData.position);
      await statusSelect.select(newJobData.status);

      // Submit the form to add the job
      await addButton.click();
      await page.waitForNavigation({ timeout: 30000 });

      // Check the database to verify the new job entry
      const jobs = await Job.find({ createdBy: testUser._id });
      const latestJob = jobs[jobs.length - 1]; // Get the last job entry

      expect(latestJob.company).to.equal(newJobData.company);
      expect(latestJob.position).to.equal(newJobData.position);
      expect(latestJob.status).to.equal(newJobData.status);
    });
  });
});

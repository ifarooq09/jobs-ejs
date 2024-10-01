const puppeteer = require("puppeteer");
require("../app");
const { seed_db, testUserPassword } = require("../util/seed_db");
const Job = require("../models/Job");

let testUser = null;

let page = null;
let browser = null;

// Launch the browser and open a new blank page
describe("jobs-ejs puppeteer test", function () {
  before(async function () {
    this.timeout(10000);
    //await sleeper(5000)
    browser = await puppeteer.launch();
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
        "a ::-p-text(Click this link to logon)"
      );
    });
    it("gets to the logon page", async () => {
      await this.logonLink.click();
      await page.waitForNavigation();
      const email = await page.waitForSelector('input[name="email"]');
    });
  });
  
  describe("logon page test", function () {
    this.timeout(20000);
    it("resolves all the fields", async () => {
      this.email = await page.waitForSelector('input[name="email"]');
      this.password = await page.waitForSelector('input[name="password"]');
      this.submit = await page.waitForSelector("button ::-p-text(Logon)");
    });
    it("sends the logon", async () => {
      testUser = await seed_db();
      await this.email.type(testUser.email);
      await this.password.type(testUserPassword);
      await this.submit.click();
      await page.waitForNavigation();
      await page.waitForSelector(`p ::-p-text(${testUser.name} is logged on.)`);
      await page.waitForSelector("a ::-p-text(change the secret)");
      await page.waitForSelector('a[href="/secretWord"]');
      const copyr = await page.waitForSelector("p ::-p-text(copyright)");
      const copyrText = await copyr.evaluate((el) => el.textContent);
      console.log("copyright text: ", copyrText);
    });
  });

  // New tests for job operations
  describe("puppeteer job operations", function () {
    this.timeout(20000);

    it("clicks on the jobs list link and verifies the job listings", async () => {
      await page.click('a ::-p-text(View Jobs)'); // Adjust the selector as needed
      await page.waitForNavigation();
      
      const content = await page.content();
      const jobEntries = content.split('<tr>').length - 1; // Count <tr> tags
      expect(jobEntries).to.equal(20); // Expecting 20 job entries
    });

    it("navigates to the Add A Job form", async () => {
      await page.click('a ::-p-text(Add A Job)');
      await page.waitForNavigation();

      const formTitle = await page.waitForSelector('h1 ::-p-text(Add A Job)'); // Adjust as needed
      expect(formTitle).to.exist; // Verify that the form is displayed
      this.companyField = await page.waitForSelector('input[name="company"]');
      this.positionField = await page.waitForSelector('input[name="position"]');
      this.addButton = await page.waitForSelector('button ::-p-text(Add Job)');
    });

    it("adds a new job listing", async () => {
      const companyName = "Test Company";
      const positionName = "Test Position";

      await this.companyField.type(companyName);
      await this.positionField.type(positionName);
      await this.addButton.click();
      await page.waitForNavigation();

      const successMessage = await page.waitForSelector('p ::-p-text(Job listing has been added.)');
      expect(successMessage).to.exist;

      // Check the database to verify the job entry
      const latestJob = await Job.findOne({ company: companyName, position: positionName });
      expect(latestJob).to.exist;
      expect(latestJob.company).to.equal(companyName);
      expect(latestJob.position).to.equal(positionName);
    });
  });
});

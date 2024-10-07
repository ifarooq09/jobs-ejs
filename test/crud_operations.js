const app = require("../app.js");
const { seed_db, testUserPassword } = require("../util/seed_db.js");
const faker = require("@faker-js/faker").fakerEN_US;
const get_chai = require("../util/get_chai.js");
const Job = require('../models/Job.js');

describe("Job CRUD Operations", function () {
    before(async () => {
        const { expect, request } = await get_chai();

        // Step 1: Seed the database with test data
        this.test_user = await seed_db();

        // Step 2: Logon - Get CSRF token and session cookie
        let req = request.execute(app).get("/sessions/logon").send();
        let res = await req;
        const textNoLineEnd = res.text.replaceAll("\n", "");
        this.csrfToken = /_csrf\" value=\"(.*?)\"/.exec(textNoLineEnd)[1];

        let cookies = res.headers["set-cookie"];
        this.csrfCookie = cookies.find((element) =>
            element.startsWith("csrfToken"),
        );

        const dataToPost = {
            email: this.test_user.email,
            password: testUserPassword,
            _csrf: this.csrfToken,
        };

        req = request
            .execute(app)
            .post("/sessions/logon")
            .set("Cookie", this.csrfCookie)
            .set("content-type", "application/x-www-form-urlencoded")
            .redirects(0)
            .send(dataToPost);

        res = await req;
        cookies = res.headers["set-cookie"];
        this.sessionCookie = cookies.find((element) =>
            element.startsWith("connect.sid"),
        );

        expect(this.csrfToken).to.not.be.undefined;
        expect(this.sessionCookie).to.not.be.undefined;
        expect(this.csrfCookie).to.not.be.undefined;
    });

    // Test 1: Get the list of jobs
    it("should get the list of jobs", async () => {
        const { expect, request } = await get_chai();

        // Step 3: Get the job list using the session cookie
        const req = request
            .execute(app)
            .get("/jobs")
            .set("Cookie", this.csrfCookie + ";" + this.sessionCookie);

        const res = await req;

        // Expect a successful response with status 200
        expect(res).to.have.status(200);

        // Check the number of jobs (20 seeded + table header)
        const pageParts = res.text.split("<tr>");
        expect(pageParts.length).to.equal(21); // 1 header row + 20 job rows
    });

    // Test 2: Add a new job
    it("should add a new job", async () => {
        const { expect, request } = await get_chai();

        // Step 4: Use factory to generate new job data
        const newJobData = {
            company: faker.company.name(),
            position: faker.person.jobTitle(),
            status: "pending",
            _csrf: this.csrfToken,
        };

        // Post the new job form data
        const req = request
            .execute(app)
            .post("/jobs")
            .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
            .set("content-type", "application/x-www-form-urlencoded")
            .send(newJobData);

        const res = await req;

        // Expect a redirect to the jobs list after successful job creation
        expect(res).to.have.status(200);

        // Verify that the job was created in the database
        const jobs = await Job.find({ createdBy: this.test_user._id });
        expect(jobs.length).to.equal(21); // Initially 20, now 21
    });

    // Test 3: Edit an existing job
    it("should edit an existing job", async () => {
        const { expect, request } = await get_chai();

        // Step 5: Retrieve an existing job
        const job = await Job.findOne({ createdBy: this.test_user._id });

        // Modify job details
        const updatedJobData = {
            company: "Updated Company",
            position: "Updated Position",
            status: "interview" || "declined",
            _csrf: this.csrfToken,
        };

        // Post the updated job form data
        const req = request
            .execute(app)
            .post(`/jobs/update/${job._id}`)
            .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
            .set("content-type", "application/x-www-form-urlencoded")
            .send(updatedJobData);

        const res = await req;

        // Expect a redirect to the jobs list after successful update
        expect(res).to.have.status(200);

        // Verify that the job was updated in the database
        const updatedJob = await Job.findById(job._id);
        expect(updatedJob.company).to.equal("Updated Company");
        expect(updatedJob.position).to.equal("Updated Position");
        expect(updatedJob.status).to.equal("interview" || "declined");
    });

    // Test 4: Delete an existing job
    it("should delete an existing job", async () => {
        const { expect, request } = await get_chai();

        // Step 6: Retrieve an existing job
        const job = await Job.findOne({ createdBy: this.test_user._id });

        // Post to delete the job
        const req = request
            .execute(app)
            .post(`/jobs/delete/${job._id}`)
            .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
            .set("content-type", "application/x-www-form-urlencoded")
            .send({ _csrf: this.csrfToken });

        const res = await req;

        // Expect a redirect to the jobs list after successful deletion
        expect(res).to.have.status(200);

        // Verify that the job was deleted from the database
        const deletedJob = await Job.findById(job._id);
        expect(deletedJob).to.be.null;
    });
});

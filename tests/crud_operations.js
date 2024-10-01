const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app'); // assuming the app is in the root directory
const Job = require('../models/Job');
const { seed_db, testUserPassword } = require('../util/seed_db');
const expect = chai.expect;

chai.use(chaiHttp);

describe('CRUD operations for Job', function () {
  before(async function () {
    // Seed the database with test user and jobs
    const { expect, request } = chai;
    this.test_user = await seed_db();
    
    // Get CSRF token and session cookie
    let req = chai.request(app).get('/session/logon').send();
    let res = await req;
    const textNoLineEnd = res.text.replace(/\n/g, '');
    this.csrfToken = /_csrf" value="(.*?)"/.exec(textNoLineEnd)[1];
    let cookies = res.headers['set-cookie'];
    this.csrfCookie = cookies.find((element) => element.startsWith('csrfToken'));

    // Log in
    const dataToPost = {
      email: this.test_user.email,
      password: testUserPassword,
      _csrf: this.csrfToken,
    };
    req = chai.request(app)
      .post('/session/logon')
      .set('Cookie', this.csrfCookie)
      .set('content-type', 'application/x-www-form-urlencoded')
      .redirects(0)
      .send(dataToPost);
    res = await req;
    cookies = res.headers['set-cookie'];
    this.sessionCookie = cookies.find((element) => element.startsWith('connect.sid'));

    // Assert login was successful
    expect(this.csrfToken).to.not.be.undefined;
    expect(this.sessionCookie).to.not.be.undefined;
    expect(this.csrfCookie).to.not.be.undefined;
  });

  it('should fetch the job list with 20 entries', async function () {
    const res = await chai.request(app)
      .get('/jobs')
      .set('Cookie', `${this.sessionCookie}; ${this.csrfCookie}`);

    expect(res).to.have.status(200);
    const pageParts = res.text.split('<tr>');
    expect(pageParts.length).to.equal(21); // 1 header row + 20 job rows
  });

  it('should add a new job entry', async function () {
    // Add a new job
    const newJobData = {
      company: 'Test Company',
      position: 'Software Engineer',
      status: 'pending',
      _csrf: this.csrfToken,
    };

    const res = await chai.request(app)
      .post('/jobs')
      .set('Cookie', `${this.sessionCookie}; ${this.csrfCookie}`)
      .send(newJobData);

    // Check that the job is added successfully
    const jobs = await Job.find({ createdBy: this.test_user._id });
    expect(jobs.length).to.equal(21); // 20 seeded jobs + 1 new job
  });

  it('should edit an existing job entry', async function () {
    // Fetch one of the existing jobs
    const jobToEdit = await Job.findOne({ createdBy: this.test_user._id });

    // Edit the job
    const updatedJobData = {
      company: 'Updated Company',
      position: 'Updated Position',
      status: 'interview',
      _csrf: this.csrfToken,
    };

    await chai.request(app)
      .post(`/jobs/update/${jobToEdit._id}`)
      .set('Cookie', `${this.sessionCookie}; ${this.csrfCookie}`)
      .send(updatedJobData);

    // Verify the update
    const updatedJob = await Job.findById(jobToEdit._id);
    expect(updatedJob.company).to.equal('Updated Company');
    expect(updatedJob.position).to.equal('Updated Position');
    expect(updatedJob.status).to.equal('interview');
  });

  it('should delete a job entry', async function () {
    // Fetch one of the existing jobs to delete
    const jobToDelete = await Job.findOne({ createdBy: this.test_user._id });

    // Delete the job
    await chai.request(app)
      .post(`/jobs/delete/${jobToDelete._id}`)
      .set('Cookie', `${this.sessionCookie}; ${this.csrfCookie}`)
      .send({ _csrf: this.csrfToken });

    // Verify the deletion
    const deletedJob = await Job.findById(jobToDelete._id);
    expect(deletedJob).to.be.null;
  });
});

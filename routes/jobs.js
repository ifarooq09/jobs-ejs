const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.js');

// GET all jobs
router.get('/', jobsController.getAllJobs);

// GET form to create a new job
router.get('/new', jobsController.getNewJobForm);

// POST to create a new job
router.post('/', jobsController.createJob);

// GET form to edit a job
router.get('/edit/:id', jobsController.getEditJobForm);

// POST to update a job
router.post('/update/:id', jobsController.updateJob);

// POST to delete a job
router.post('/delete/:id', jobsController.deleteJob);

module.exports = router;

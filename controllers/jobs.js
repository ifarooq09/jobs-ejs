const Job = require('../models/Job.js');

exports.getAllJobs = async (req, res) => {
    const jobs = await Job.find({ createdBy: req.user._id });
    res.render('jobs', { jobs });
};

exports.getNewJobForm = (req, res) => {
    res.render('job', { job: null });
};

exports.createJob = async (req, res) => {
    const job = new Job({
        company: req.body.company,
        position: req.body.position,
        status: req.body.status,
        createdBy: req.user._id
    });

    await job.save();
    res.redirect('/jobs');
};

exports.getEditJobForm = async (req, res) => {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    res.render('job', { job });
};

exports.updateJob = async (req, res) => {
    await Job.updateOne(
        { _id: req.params.id, createdBy: req.user._id },
        { 
            company: req.body.company, 
            position: req.body.position, 
            status: req.body.status 
        }
    );
    res.redirect('/jobs');
};

exports.deleteJob = async (req, res) => {
    await Job.deleteOne({ _id: req.params.id, createdBy: req.user._id });
    res.redirect('/jobs');
};

'use strict';

const queues = require('@arangodb/foxx/queues');
const createRouter = require('@arangodb/foxx/router');
const router = createRouter();
const joi = require('joi');

const QUEUE_NAME = 'work_queue';

module.context.use(router);
var work_queue = queues.create(QUEUE_NAME, module.context.configuration.notificationWorkers);

//empty queue for old jobs
var failed = 0;
var jobs = work_queue.failed();
for (var i in jobs) {
  failed++;
  work_queue.delete(jobs[i]);
}
var completed = 0;
var jobs = work_queue.complete();
for (var i in jobs) {
  completed++;
  work_queue.delete(jobs[i]);
}

if (failed > 0 || completed > 0) {
  console.log("Cleaned " + failed + " failed and " + completed + " completed jobs!");
}

router.get('/fail', function(req, res) {
      //queue callback workers
      var args = {};
      args.queue_name = QUEUE_NAME
      work_queue.push(
        { mount: module.context.mount, name: "fail" },
        args,
        {
          success: function(result, job_data, job) {
            const log = require('console').log
            log("success! job: " + job._id)

            //remove the job from the queue
            const queues = require('@arangodb/foxx/queues');
            var queue = queues.get(job_data.queue_name);
            queue.delete(job._id);
          },
          failure: function(result, job_data, job) {
            const log = require('console').log
            log("failure! job: " + job._id);
            
            //remove the job from the queue
            const queues = require('@arangodb/foxx/queues');
            var queue = queues.get(job_data.queue_name);
            queue.delete(job._id);
          },
          maxFailures: 0,
          repeatTimes: 0,
          backOff: 0
        }
      );
  console.log("PENDING: ");
  console.log(work_queue.pending());
  console.log("FAILED: ");
  console.log(work_queue.failed());
  console.log("COMPLETE: ");
  console.log(work_queue.complete());
  console.log("PROGRESS: ");
  console.log(work_queue.progress());
  res.sendStatus(200);
})
.summary('Fail.')
.description('A workqueue script which fails');

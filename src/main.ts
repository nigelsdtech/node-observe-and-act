const
  cfg                = require('config'),
  log4js             = require('log4js'),
  reporter           = require('reporter'),
  {promisify}        = require('util');

import Subject  from './classes/Subject';
import {iLogger, iSendErrorNotice} from './interfaces/commonInterfaces'
import {generateSubject, knownSubjectType} from './subjectFactory'


/*
* Scrape various sites and apis for data you want
*
*/


module.exports = async function () {

    /*
     * Initialize
     */


    /*
     * Logs
     */
    log4js.configure(cfg.log.log4jsConfigs);

    var log = log4js.getLogger(cfg.log.appName);
    log.setLevel(cfg.log.level);


    /*
     * Job reporter
     */
    reporter.configure(cfg.reporter);
    const sendErrorNotice = promisify(reporter.handleError);

    /*
     * Load the subject and observers
     */

    const subjectName = cfg.subject as knownSubjectType
    const subjectConfigs = cfg.subjectConfigs as object
    const subject = generateSubject({
        subjectName,
        subjectConfigs,
        log,
        errorNotifier: sendErrorNotice
    })

    /*
    * Main program
    */

    await main({
        log,
        sendErrorNotice,
        subject
    })

}


/**
 * 
 * @param {*} param0 
 * @param {object[]}   param0.trawlerSetups
 * @param {object}     param0.log
 * @param {function}   param0.sendCompletionNotice
 * @param {function}   param0.sendErrorNotice
 */

async function main({
    log,
    sendErrorNotice,
    subject
} : {
    log: iLogger,
    sendErrorNotice: iSendErrorNotice,
    subject: Subject
}) {

  log.info('Begin script');
  log.info('============');

  
  try {


    log.info("Starting work...")
    // Trigger the subject
    await subject.startWorking()


  } catch (e) {
    const err = e as Error
    log.error(`Problem running the script: ${err}`)
    log.error(`${err.stack}`)
    await sendErrorNotice({errMsg: err.message})

  }

}
import {EWeLinkSubject, eWeLinkConfig} from './classes/EWeLink/EWeLinkSubject'
import Subject from './classes/Subject'
import { iLogger, iSendErrorNotice } from './interfaces/commonInterfaces'

export type knownSubjectType = 'EWeLink'

type tGenerateSubjectArgs = {
    // List of known subjects
    subjectName: knownSubjectType
    subjectConfigs: Object,
    log: iLogger,
    errorNotifier: iSendErrorNotice
}
export function generateSubject ({
    subjectName,
    subjectConfigs,
    log,
    errorNotifier
} : 
    tGenerateSubjectArgs
) : Subject {

    switch (subjectName) {
        case 'EWeLink' : {
            const config: eWeLinkConfig = subjectConfigs as eWeLinkConfig
            const args = Object.assign({}, config, {log, errorNotifier})
            return new EWeLinkSubject(args);
        }
        default : {
            throw new Error (`Unknown subject: ${subjectName}`)
        }
    }
}
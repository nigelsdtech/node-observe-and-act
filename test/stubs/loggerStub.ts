import { iLogger } from "../../src/interfaces/commonInterfaces";

export default function loggerStub(): iLogger {
    return {
        debug: (m) => {console.debug(m)},
        info:  (m) => {console.info(m)},
        error: (m) => {console.error(m)}
    }
}
import { iLogger, iSendErrorNotice } from "../interfaces/commonInterfaces";

/**
 * The Observer interface declares the update method, used by subjects.
 */
export default abstract class Observer {

    constructor(
        protected log: iLogger,
        protected name: string,
        protected errorNotifier: iSendErrorNotice
    ){}

    // Receive update from subject.
    abstract update(message: any): void;

    public getName (): string {return this.name}

}
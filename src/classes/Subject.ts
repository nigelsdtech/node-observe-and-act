import {iLogger, iSendErrorNotice} from '../interfaces/commonInterfaces'
import Observer from './Observer';

export default abstract class Subject {

    protected observers: Observer[] = [];

    constructor(
        protected log: iLogger,
        protected name: string,
        protected errorNotifier: iSendErrorNotice
    ){};
    

    public abstract startWorking (): Promise<void>;

    // Attach an observer to the subject.
    public attach(observer: Observer): void {
        const n = observer.getName()
        
        this.log.info(`[${this.name}] Attaching ${n}...`)

        if (this.observers.includes(observer)) {
            this.log.error(`[${this.name}]: Observer ${n} has been attached already.`);
            return
        }

        this.log.debug(`${this.name}: Attached observer ${n}`);
        this.observers.push(observer);
    }

    // Notify all observers about an event.
    protected notify(message:any): void {
        this.log.debug(`[${this.name}] Notifying observers of new message`);
        this.observers.forEach((o) => {o.update(message)});
    }
}
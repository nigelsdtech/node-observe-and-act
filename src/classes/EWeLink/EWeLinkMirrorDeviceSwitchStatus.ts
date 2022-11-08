import { iLogger, eWeLinkApi, iSendErrorNotice } from "../../interfaces/commonInterfaces";
import Observer from "../Observer";

/**
 * The Observer interface declares the update method, used by subjects.
 */
export default class EWeLinkMirrorDeviceSwitchStatus extends Observer {


    public constructor(
        protected log: iLogger,
        protected name: string,
        protected errorNotifier: iSendErrorNotice,
        private readonly sourceDeviceId: string,
        private readonly satelliteDeviceId: string,
        private readonly eWeLinkConnection: eWeLinkApi
        
    ) {
        super(log, name, errorNotifier)
        this.log.info(`[${this.name}] Listening for ${sourceDeviceId} and updating ${satelliteDeviceId}`)
    }

    // Receive update from subject.
    public async update(message: any) {

        if (typeof message != 'object'
            || message.deviceid != this.sourceDeviceId
            || !message.params
            || !message.params.switch
            || ["on", "off"].indexOf(message.params.switch) == -1
        ) {
            this.log.debug(`[${this.name}]: Discarding message on device ${message.deviceid}`)
            return
        }
        
        this.updateSwitch(message.params.switch)

    }

    private async updateSwitch(status: 'on' | 'off'): Promise<void> {
        this.log.info(`[${this.name}]: Setting new switch status on ${this.satelliteDeviceId} to ${status}...`)

        try {
            await this.eWeLinkConnection.setDevicePowerState(this.satelliteDeviceId,status)
            this.log.info(`[${this.name}]: Set new switch status on ${this.satelliteDeviceId} to ${status}.`)
        } catch (e) {
            const err = e as Error
            this.log.error(`[${this.name}]: Update error - ${err.message}`)
            this.errorNotifier({errMsg: err.message})
        }
    }

}
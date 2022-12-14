import { iLogger, eWeLinkApi, iSendErrorNotice } from "../../interfaces/commonInterfaces";
import Observer from "../Observer";

/**
 * The Observer interface declares the update method, used by subjects.
 */
export default class EWeLinkMirrorDeviceSwitchStatus extends Observer {


    public constructor(
        log: iLogger,
        name: string,
        errorNotifier: iSendErrorNotice,
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
            || !message.hasOwnProperty("params")
            || !message.hasOwnProperty("action")
        ) {
            this.log.debug(`[${this.name}] Message is not an object with params and action`)
            return
        }

        if (message.action == "sysmsg") return this.processSysMsg(message);
        if (message.action == "update") return this.processUpdateMsg(message)

        this.log.debug(`[${this.name}] Discarding message`)

    }

    private async processSysMsg(message: {
        deviceid: string,
        params: {
            online: boolean
        }
    }): Promise<void> {

        this.log.debug(`[${this.name}] Processing sysmsg ${JSON.stringify(message,null,'\t')}`)

        if (message.deviceid != this.sourceDeviceId
            && message.deviceid != this.satelliteDeviceId) return;

        if (!message.params || !message.params.online) return;

        this.log.info(`[${this.name}]: Device ${message.deviceid} has come online. Getting source device state...`)

        this.eWeLinkConnection.getCredentials()
        const resp = await this.eWeLinkConnection.getDevicePowerState(this.sourceDeviceId)

        this.log.info(`[${this.name}]: Source device state: ${JSON.stringify(resp,null,"\t")}`)

        if (resp.error) {
            if (resp.error == 503) {
                this.log.error(`[${this.name}]: Not attempting to update satellite device`)
                return
            }
            return this.sendError(`Error getting source device state - error: ${resp.error}, msg: ${resp.msg}`);
        }

        if (!resp.state) return;
        if (resp.state != "on" && resp.state != "off") return;

        this.log.info(`[${this.name}] Power state is ${resp.state}`)
        return this.updateSwitch(resp.state)
    }

    private async processUpdateMsg(message: {
        deviceid: string,
        params: {
            switch: "on" | "off"
        }
    }): Promise<void> {

        this.log.debug(`[${this.name}] Processing update message`)

        if (message.hasOwnProperty("deviceid")
            && message.deviceid == this.sourceDeviceId
            && message.hasOwnProperty("params")
            && message.params.hasOwnProperty("switch")
            && ["on", "off"].indexOf(message.params.switch) > -1)
        {
            return this.updateSwitch(message.params.switch)
        }

    }

    private async updateSwitch(state: 'on' | 'off'): Promise<void> {
        this.log.info(`[${this.name}] Setting new switch state on ${this.satelliteDeviceId} to ${state}...`)

        try {

            this.eWeLinkConnection.getCredentials()
            const resp = await this.eWeLinkConnection.setDevicePowerState(this.satelliteDeviceId,state)

            if ((resp).msg) this.sendError(`Error setting power state to ${state} - code: ${resp.error}, message: ${resp.msg}`)

            this.log.info(`[${this.name}] Set new switch status on ${this.satelliteDeviceId} to ${resp.state}.`)

        } catch (e) {
            const err = e as Error
            this.sendError(`Update error - ${err.message}`)
        }
    }

    private sendError(rawMsg:string) {
        const errMsg = `[${this.name}]: ${rawMsg}`
        this.log.error(errMsg)
        this.errorNotifier({errMsg: errMsg})
    }

}
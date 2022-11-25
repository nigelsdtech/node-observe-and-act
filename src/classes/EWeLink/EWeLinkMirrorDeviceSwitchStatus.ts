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
            || message.deviceid != this.sourceDeviceId
            || !message.params
            || !message.action
        ) {
            this.log.debug(`[${this.name}] Discarding irrelevant message`)
            return
        }

        if (message.action == "sysmsg") return this.processSysMsg(message);

        if (message.action == "update" 
            && message.params
            && message.params.switch
            && ["on", "off"].indexOf(message.params.switch) > -1)
        {
            return this.updateSwitch(message.params.switch)
        }

        this.log.debug(`[${this.name}] Discarding message`)

    }

    private async processSysMsg(message: {
        params: {
            online: boolean
        }
    }): Promise<void> {

        this.log.debug(`[${this.name}] Processing sysmsg ${JSON.stringify(message,null,'\t')}`)

        if (!message.params || !message.params.online) {
            this.log.info(`[${this.name}] Discarding as irrelevant`)
            return
        }

        this.log.info(`[${this.name}]: Device has come online. Getting power status...`)
        const resp = await this.eWeLinkConnection.getDevicePowerState(this.sourceDeviceId)

        if (resp.error) return this.sendError(`Error getting device state - error: ${resp.error}, msg: ${resp.msg}`);

        if (!resp.state || ["on", "off"].indexOf(resp.state) == -1) return;

        this.log.info(`[${this.name}] Power state is ${resp.state}`)
        return this.updateSwitch(resp.state as "on" | "off")
    }

    private async updateSwitch(state: 'on' | 'off'): Promise<void> {
        this.log.info(`[${this.name}] Setting new switch state on ${this.satelliteDeviceId} to ${state}...`)

        try {

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
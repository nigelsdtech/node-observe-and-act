import Subject from '../Subject'
import {eWeLinkCredentials, iLogger, eWeLinkApi, iSendErrorNotice} from '../../interfaces/commonInterfaces'
import EWeLinkMirrorDeviceSwitchStatus from './EWeLinkMirrorDeviceSwitchStatus'
import Observer from '../Observer'
const e = require('ewelink-api')

// Extend this with more configs as more modules are added
type eWeLinkObserverConfig = {
    type: 'mirrorDeviceSwitchStatus',
    shortName: string,
    sourceDeviceName: string,
    satelliteDeviceName: string
}

export type eWeLinkConfig = {
    eWeLinkCredentials: eWeLinkCredentials
    observers : eWeLinkObserverConfig[]
}

type eWeLinkDeviceDetails = {
    deviceid : string,
    name: string
}

/**
 * Opens a socket to EWeLink and notifies observers when a message
 * comes through.
 */
export class EWeLinkSubject extends Subject {

    private readonly eWeLinkConnection: eWeLinkApi;
    private readonly deviceMapPromise: Promise<eWeLinkDeviceDetails[]>
    private deviceMap!: Record<string, string>
    private readonly observerConfigs: eWeLinkObserverConfig[]


    public constructor({
        log,
        eWeLinkCredentials,
        observers,
        errorNotifier
    }: 
        eWeLinkConfig
        & {
            log: iLogger,
            errorNotifier: iSendErrorNotice
        }
    ) {
        
        super(log,'EWeLink',errorNotifier)
        this.eWeLinkConnection = new e(eWeLinkCredentials);
        this.deviceMapPromise = this.eWeLinkConnection.getDevices()
        this.observerConfigs = observers
        this.log.debug(`Initialized Subject ${this.name}.`)
    }

    private createObserver (observerConfig: eWeLinkObserverConfig) : Observer {

        switch (observerConfig.type) {
            case 'mirrorDeviceSwitchStatus': {
                const {shortName: name, sourceDeviceName, satelliteDeviceName} = observerConfig;

                if (!this.deviceMap[sourceDeviceName]) throw new Error (`Could not find device ${sourceDeviceName}`)
                if (!this.deviceMap[satelliteDeviceName]) throw new Error (`Could not find device ${satelliteDeviceName}`)

                return new EWeLinkMirrorDeviceSwitchStatus(
                    this.log,
                    name,
                    this.errorNotifier,
                    this.deviceMap[sourceDeviceName],
                    this.deviceMap[satelliteDeviceName],
                    this.eWeLinkConnection
                )
            }
        }
        

    }

    public async startWorking() {

        this.log.info(`Loading devices...`)
        await this.setDeviceMap()

        this.log.debug(`Attaching observers...`)
        this.observerConfigs.forEach(oc => {
            try {
                const o = this.createObserver(oc as eWeLinkObserverConfig)
                this.attach(o)
            } catch (e) {
                const err = e as Error
                this.log.error(`[${this.name}] Could not attach observer: ${err.message}`)
            }

        })

        this.log.debug(`Getting eWeLinkCredentials`)
        // login into eWeLink
        await this.eWeLinkConnection.getCredentials();

        this.log.info(`Opening websocket...`)
        // call openWebSocket method with a callback as argument
        await this.eWeLinkConnection.openWebSocket(async (data: any) => {
            // data is the message from eWeLink
            this.log.info(`[${this.name}] message received:`)
            this.log.info(JSON.stringify(data,null,"\t"))
            this.notify(data)
        });

    }

    private async setDeviceMap(): Promise<void> {

        const rawData = await this.deviceMapPromise

        const deviceMap = rawData.reduce((accumulator: Record<string,string>, deviceDetails: eWeLinkDeviceDetails) => {
            return Object.assign({},accumulator,{[deviceDetails.name]: deviceDetails.deviceid})
        }, {})

        this.log.info(`Device map: ${JSON.stringify(deviceMap,null,"\t")}`)

        this.deviceMap = deviceMap
    }

}
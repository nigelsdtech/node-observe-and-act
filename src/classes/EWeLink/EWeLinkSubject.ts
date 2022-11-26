import Subject from '../Subject'
import {eWeLinkCredentials, iLogger, eWeLinkApi, iSendErrorNotice} from '../../interfaces/commonInterfaces'
import EWeLinkMirrorDeviceSwitchStatus from './EWeLinkMirrorDeviceSwitchStatus'
import Observer from '../Observer'
import WebSocketAsPromised  from 'websocket-as-promised'
import sleep from 'sleep-promise'

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
    observers : eWeLinkObserverConfig[],
    sendEmailOnSocketClose?: boolean,
    sendEmailOnSocketError?: boolean
}

type eWeLinkDeviceDetails = {
    deviceid : string,
    name: string
} & Record<string,any>

type deviceMaps = {
    deviceMapByName: Record<string,string>
    deviceMapById: Record<string,string>
}

/**
 * Opens a socket to EWeLink and notifies observers when a message
 * comes through.
 */
export class EWeLinkSubject extends Subject {

    private readonly eWeLinkConnection: eWeLinkApi;
    private readonly initializationPromise: Promise<void>
    private deviceMapByName!: Record<string, string>
    private deviceMapById!: Record<string, string>
    private readonly observerConfigs: eWeLinkObserverConfig[];
    private readonly sendEmailOnSocketClose: boolean;
    private readonly sendEmailOnSocketError: boolean;



    public constructor({
        log,
        eWeLinkCredentials,
        observers,
        errorNotifier,
        sendEmailOnSocketClose = false,
        sendEmailOnSocketError = true
    }: 
        eWeLinkConfig
        & {
            log: iLogger,
            errorNotifier: iSendErrorNotice
        }
    ) {
        
        super(log,'EWeLink',errorNotifier)
        this.eWeLinkConnection = new e(eWeLinkCredentials);
        this.observerConfigs = observers
        this.sendEmailOnSocketClose = sendEmailOnSocketClose
        this.sendEmailOnSocketError = sendEmailOnSocketError


        this.initializationPromise = 
            this.eWeLinkConnection.getDevices()
            .then((rawData: eWeLinkDeviceDetails[]) => {
                const {deviceMapByName, deviceMapById} = this.getDeviceMaps(rawData)
                this.deviceMapById = deviceMapById,
                this.deviceMapByName = deviceMapByName
            })        
            .then(() => {
                
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
            })
        
        this.log.debug(`Initialized Subject ${this.name}.`)
    }

    private createObserver (observerConfig: eWeLinkObserverConfig) : Observer {

        switch (observerConfig.type) {
            case 'mirrorDeviceSwitchStatus': {
                const {shortName: name, sourceDeviceName, satelliteDeviceName} = observerConfig;

                if (!this.deviceMapByName[sourceDeviceName]) throw new Error (`Could not find device ${sourceDeviceName}`)
                if (!this.deviceMapByName[satelliteDeviceName]) throw new Error (`Could not find device ${satelliteDeviceName}`)

                return new EWeLinkMirrorDeviceSwitchStatus(
                    this.log,
                    name,
                    this.errorNotifier,
                    this.deviceMapByName[sourceDeviceName],
                    this.deviceMapByName[satelliteDeviceName],
                    this.eWeLinkConnection
                )
            }
        }
        

    }

    public async startWorking() {

        this.log.info(`Waiting for async initialization to finish...`)
        await this.initializationPromise

        this.log.debug(`Getting eWeLinkCredentials`)
        // login into eWeLink
        await this.eWeLinkConnection.getCredentials();

        const socket = await this.openSocket()
        this.keepSocketAlive(socket)

    }

    private async keepSocketAlive(
        existingSocket: WebSocketAsPromised,
        checkTime: number = 65000
    ): Promise<void> {

        if (existingSocket.isClosed) {
            const socket = await this.openSocket()
            return this.keepSocketAlive(socket,checkTime)
        }

        await sleep(checkTime)

        return this.keepSocketAlive(existingSocket,checkTime)

    }

    private async openSocket(): Promise<WebSocketAsPromised> {

        this.log.info(`Opening websocket...`)

        const socket: WebSocketAsPromised = await this.eWeLinkConnection.openWebSocket(this.handleWebsocketMessage.bind(this))

        socket.onError.addListener(({code, reason}) => {
            const errMsg = `Socket error: ${code}, ${reason}`
            this.log.error(errMsg)
            if (this.sendEmailOnSocketError) this.errorNotifier({errMsg})
        })
        socket.onClose.addListener(({code, reason}) => {
            const errMsg = `Socket has been closed: ${code}, ${reason}`
            this.log.error(errMsg)
            if (this.sendEmailOnSocketClose) this.errorNotifier({errMsg})
        })

        return socket

    }

    private async handleWebsocketMessage(message: any): Promise<void> {
        
        this.log.info(`[${this.name}] message received: ${JSON.stringify(message,null,"\t")}`)

        if (typeof message == 'object' && message.hasOwnProperty("deviceid")) {
            const deviceName = this.deviceMapById[message.deviceid]
            this.log.info(`[${this.name}] Message is about ${deviceName}`)
        }

        return this.notify(message)
    }


    private getDeviceMaps(rawData: eWeLinkDeviceDetails[]): deviceMaps {

        const {deviceMapByName, deviceMapById} = rawData.reduce((
            {deviceMapByName, deviceMapById}: deviceMaps,
            deviceDetails: eWeLinkDeviceDetails
        ) => {
            return {
                deviceMapByName: Object.assign({},deviceMapByName,{[deviceDetails.name]: deviceDetails.deviceid}),
                deviceMapById:   Object.assign({},deviceMapById,{[deviceDetails.deviceid]: deviceDetails.name})
            }
        }, {
            deviceMapByName: {},
            deviceMapById: {}
        })

        this.log.info(`Device map by name: ${JSON.stringify(deviceMapByName,null,"\t")}`)
        this.log.info(`Device map by id: ${JSON.stringify(deviceMapById,null,"\t")}`)

        return {deviceMapByName, deviceMapById}
    }

}
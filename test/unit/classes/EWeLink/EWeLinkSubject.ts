import { should } from 'chai';
import 'mocha';
import {SinonStub, stub} from 'sinon' 
import { iLogger } from '../../../../src/interfaces/commonInterfaces';
import loggerStub from '../../../stubs/loggerStub';
import { resetStubs } from '../../../utils';
import {EWeLinkSubject} from '../../../../src/classes/EWeLink/EWeLinkSubject'

should()

describe('EWeLinkSubject', ()=>{

    const errorNotifierStub: SinonStub = stub()
    const credentials = {
        email: "fake@fake.com",
        password: "fakepassword",
        region: "fakeplace"
    }

    const log: iLogger = loggerStub();

    const els = new EWeLinkSubject({
        log,
        eWeLinkCredentials: credentials,
        observers: [{
            type: "mirrorDeviceSwitchStatus",
            shortName: "observer1",
            sourceDeviceName: "mySourceDevice",
            satelliteDeviceName: "mySatelliteDevice"
        }],
        errorNotifier: errorNotifierStub
    })

    describe('getDeviceMaps()', () => {
        
        const getDeviceMaps = els['getDeviceMaps'].bind(els)
        const rawData = [{
                deviceid: "deviceid1",
                name: "deviceName1"
            },{
                deviceid: "deviceid2",
                name: "deviceName2"
            },{
                deviceid: "deviceid3",
                name: "deviceName3"
        }]

        it('Returns the correctly formatted maps', () => {

            const {deviceMapByName, deviceMapById} = getDeviceMaps (rawData)

            deviceMapByName.should.eql({
                deviceName1: "deviceid1",
                deviceName2: "deviceid2",
                deviceName3: "deviceid3"
            })
            deviceMapById.should.eql({
                deviceid1: "deviceName1",
                deviceid2: "deviceName2",
                deviceid3: "deviceName3"
            })

        })
    })

    describe('handleWebSocketMessage()', () => {
        
        const infoLogStub = stub()
        const stubbedLog = loggerStub()
        stubbedLog.info = infoLogStub;
        
        const els = new EWeLinkSubject({
            log: stubbedLog,
            eWeLinkCredentials: credentials,
            observers: [{
                type: "mirrorDeviceSwitchStatus",
                shortName: "observer1",
                sourceDeviceName: "mySourceDevice",
                satelliteDeviceName: "mySatelliteDevice"
            }],
            errorNotifier: errorNotifierStub
        })
        
        const notifyStub = stub()
        els['notify'] = notifyStub

        const allStubs = [infoLogStub, notifyStub]
        beforeEach(() => {resetStubs(allStubs)})
        after(()=> {allStubs.forEach(s=> s.restore())})

        const handleWebSocketMessage = els['handleWebsocketMessage'].bind(els)
        els["deviceMapById"] = {
            mySourceDeviceId: "mySourceDeviceName",
            mySatelliteDeviceId: "mySatelliteDeviceName"
        }
        els["deviceMapByName"] = {
            mySourceDeviceName: "mySourceDeviceId",
            mySatelliteDeviceName: "mySatelliteDeviceId"
        }

        it('Logs about a recognize source device', () => {
            handleWebSocketMessage({deviceid: "mySourceDeviceId"})
            infoLogStub.calledWith("[EWeLink] Message is about mySourceDeviceName").should.be.true
            notifyStub.called.should.be.true
        })

        it('Logs about a recognize satellite device', () => {
            handleWebSocketMessage({deviceid: "mySatelliteDeviceId"})
            infoLogStub.calledWith("[EWeLink] Message is about mySatelliteDeviceName").should.be.true
            notifyStub.called.should.be.true
        })

        it('Does not log about unrecognized devices', () => {
            handleWebSocketMessage({deviceid: "unknownDeviceId"})
            infoLogStub.calledWith("[EWeLink] Message is about unknownDeviceName").should.be.false
            notifyStub.called.should.be.true
        })

        it('Does not log pong messages', () => {
            handleWebSocketMessage("pong")
            infoLogStub.callCount.should.eql(1)
            notifyStub.called.should.be.true
        })
    })

})
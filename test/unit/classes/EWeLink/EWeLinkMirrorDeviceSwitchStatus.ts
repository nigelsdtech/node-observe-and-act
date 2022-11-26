import { should } from 'chai';
import 'mocha';
import {stub} from 'sinon' 
import { eWeLinkApi, iLogger } from '../../../../src/interfaces/commonInterfaces';
import loggerStub from '../../../stubs/loggerStub';
const e = require('ewelink-api')
import { resetStubs } from '../../../utils';
import EWeLinkMirrorDeviceSwitchStatus from '../../../../src/classes/EWeLink/EWeLinkMirrorDeviceSwitchStatus'

should()

describe('EWeLinkMirrorDeviceSwitchStatus', ()=>{

    const eWeLinkConnectionStub: eWeLinkApi = new e({
        email: "fake@fake.com",
        password: "fakepassword",
        region: "fakeplace"
    });

    const log: iLogger = loggerStub();

    const elmdss = new EWeLinkMirrorDeviceSwitchStatus(
        log,
        'test',
        ()=>{},
        'mySourceDeviceId',
        'mySatelliteDeviceId',
        eWeLinkConnectionStub
    )

    describe('update()', () => {

        const setPowerStateStub = stub()
        elmdss['updateSwitch'] = setPowerStateStub;

        const getPowerStateStub = stub()
        elmdss['eWeLinkConnection']['getDevicePowerState'] = getPowerStateStub

        const sendErrorStub = stub()
        elmdss['sendError'] = sendErrorStub

        const allStubs = [
            setPowerStateStub,
            getPowerStateStub,
            sendErrorStub
        ]

        beforeEach(() => {
            resetStubs(allStubs)
            getPowerStateStub.throws('Should not have been called')
            sendErrorStub.throws('Should not have been called')
        })

        after(()=> {
            resetStubs(allStubs)
            allStubs.forEach(s=> s.restore())
        })


        const tests = [
            "pong",
            {
                error: 0,
                apikey: "abcd-efg-hijk",
                config: {
                        "hb": 1,
                        "hbInterval": 145
                },
                sequence: "123456789"
            },{
                deviceid: "notMyDevice",
                params: {
                    switch: "on"
                }
            }, {
                action: "sysmsg",
                apikey: "abcd-efg-hijk",
                deviceid: "notMyDevice",
                params: {
                    online: true
                }
            }, {
                action: "uninterestingAction",
                deviceid: "mySourceDeviceId",
                params: {
                    switch: "on"
                }
            },{
                action: "update",
                deviceid: "mySatelliteDeviceid",
                params: {
                    switch: "on"
                }
            }
        ]
        tests.forEach((t,i) => {
            it(`Discards an irrelevant message [${i}]`, async ()=> {
                elmdss.update(t)
                setPowerStateStub.called.should.be.false
            })
        })

        it('Accepts a relevant update message', async ()=> {
            await elmdss.update({
                action: "update",
                deviceid: "mySourceDeviceId",
                params: {
                    switch: "on"
                }
            })
            setPowerStateStub.called.should.be.true
        })

        describe('Receiving a system message', async ()=> {

            beforeEach(()=> {
                resetStubs([getPowerStateStub, sendErrorStub])
            })

            it("Bugs out if it can't get device power status", async () => {
                getPowerStateStub.withArgs("mySourceDeviceId").resolves({
                    error: 123,
                    msg: "Fake message"
                })

                await elmdss.update({
                    action: "sysmsg",
                    apikey: "abcd-efg-hijk",
                    deviceid: "mySourceDeviceId",
                    params: {
                        online: true
                    }
                })

                getPowerStateStub.calledWith("mySourceDeviceId").should.be.true;
                sendErrorStub.calledWith(`Error getting source device state - error: 123, msg: Fake message`).should.be.true
                setPowerStateStub.called.should.be.false
            })

            it("Gracefully handles 503 errors when getting device power status", async () => {
                getPowerStateStub.withArgs("mySourceDeviceId").resolves({
                    error: 503,
                    msg: "Device is offline"
                })

                await elmdss.update({
                    action: "sysmsg",
                    apikey: "abcd-efg-hijk",
                    deviceid: "mySourceDeviceId",
                    params: {
                        online: true
                    }
                })

                getPowerStateStub.calledWith("mySourceDeviceId").should.be.true;
                sendErrorStub.calledWith(`Error getting device state - error: 503, msg: Device is offline`).should.be.false
                setPowerStateStub.called.should.be.false
            })

            it ("Attempts to change power status on the relevant device", async () => {
                getPowerStateStub.withArgs("mySourceDeviceId").resolves({
                    status: 'ok',
                    state: 'off',
                    channel: 1
                })

                await elmdss.update({
                    action: "sysmsg",
                    apikey: "abcd-efg-hijk",
                    deviceid: "mySourceDeviceId",
                    params: {
                        online: true
                    }
                })

                getPowerStateStub.calledWith("mySourceDeviceId").should.be.true;
                sendErrorStub.called.should.be.false
                setPowerStateStub.calledWith("off").should.be.true
            })
        })
    })

})
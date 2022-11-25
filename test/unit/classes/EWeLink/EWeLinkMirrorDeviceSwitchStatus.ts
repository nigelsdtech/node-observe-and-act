import { should } from 'chai';
import 'mocha';
import {SinonStub, stub} from 'sinon' 
import { eWeLinkApi, iLogger } from '../../../../src/interfaces/commonInterfaces';
import loggerStub from '../../../stubs/loggerStub';
const e = require('ewelink-api')
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
        'myDeviceId',
        '6789',
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
                deviceid: "myDeviceId",
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
                deviceid: "myDeviceId",
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
                getPowerStateStub.withArgs("myDeviceId").resolves({
                    error: "Fake error",
                    msg: "Fake message"
                })

                await elmdss.update({
                    action: "sysmsg",
                    apikey: "abcd-efg-hijk",
                    deviceid: "myDeviceId",
                    params: {
                        online: true
                    }
                })

                getPowerStateStub.calledWith("myDeviceId").should.be.true;
                sendErrorStub.calledWith(`Error getting device state - error: Fake error, msg: Fake message`).should.be.true
                setPowerStateStub.called.should.be.false
            })

            it ("Attempts to change power status on the relevant device", async () => {
                getPowerStateStub.withArgs("myDeviceId").resolves({
                    status: 'ok',
                    state: 'off',
                    channel: 1
                })

                await elmdss.update({
                    action: "sysmsg",
                    apikey: "abcd-efg-hijk",
                    deviceid: "myDeviceId",
                    params: {
                        online: true
                    }
                })

                getPowerStateStub.calledWith("myDeviceId").should.be.true;
                sendErrorStub.called.should.be.false
                setPowerStateStub.calledWith("off").should.be.true
            })
        })
    })
})

function resetStubs(stubs: SinonStub[]): void {
    stubs.forEach(s=>s.reset())
}
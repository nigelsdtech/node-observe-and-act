import { should } from 'chai';
import 'mocha';
import {stub} from 'sinon' 
import { eWeLinkApi, iLogger } from '../../../../src/interfaces/commonInterfaces';
import loggerStub from '../../../stubs/loggerStub';
const e = require('ewelink-api')
import EWeLinkMirrorDeviceSwitchStatus from '../../../../src/classes/EWeLink/EWeLinkMirrorDeviceSwitchStatus'

should()

describe('EWeLinkMirrorDeviceSwitchStatus', ()=>{

    const eWeLinkConnectionStub: eWeLinkApi = e;

    const log: iLogger = loggerStub();

    const elmdss = new EWeLinkMirrorDeviceSwitchStatus(
        log,
        'test',
        ()=>{},
        '12345',
        '6789',
        eWeLinkConnectionStub
    )

    describe('update()', () => {

        const s = stub()
        elmdss['updateSwitch'] = s;

        beforeEach(() => {
            if (s.called) {s.reset()}
        })

        after(()=> {
            if (s.called) {s.reset()}
            s.restore()
        })


        const tests = [
            "pong",
            {
                "error": 0,
                "apikey": "abcd-efg-hijk",
                "config": {
                        "hb": 1,
                        "hbInterval": 145
                },
                "sequence": "123456789"
            },{
                deviceid: "notMyDevice",
                params: {
                    switch: "on"
                }
        }]
        tests.forEach((t,i) => {
            it(`Discards an irrelevant message [${i}]`, async ()=> {
                elmdss.update(t)
                s.called.should.be.false
            })
        })

        it('Accepts a relevant message', async ()=> {
            elmdss.update({
                deviceid: "12345",
                params: {
                    switch: "on"
                }
            })
            s.called.should.be.true
        })
    })
})
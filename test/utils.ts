import {SinonStub} from 'sinon' 

export function resetStubs(stubs: SinonStub[]): void {
    stubs.forEach(s=>s.reset())
}
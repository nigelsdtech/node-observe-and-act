import eWelink from "ewelink-api";

export interface iLogger {
    debug (s: string): void;
    error (s: string): void;
    info  (s: string): void;
}

export interface iSendErrorNotice {
    ({errMsg} : {
        errMsg: string
    }): void
}

export interface eWeLinkCredentials {
    email: string,
    password: string,
    region: string
}

export type eWeLinkApi = {
    getCredentials(): void;
} & eWelink
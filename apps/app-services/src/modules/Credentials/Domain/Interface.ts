import { ICommonObject } from 'apps/core-plugins/dist/src'

export interface ICredential {
    id: string
    name: string
    credentialName: string
    encryptedData: string
    updatedDate: Date
    createdDate: Date
}

export type ICredentialDataDecrypted = ICommonObject

// Plain credential object sent to server
export interface ICredentialReqBody {
    name: string
    credentialName: string
    plainDataObj: ICredentialDataDecrypted
}

// Decrypted credential object sent back to client
export interface ICredentialReturnResponse extends ICredential {
    plainDataObj: ICredentialDataDecrypted
}

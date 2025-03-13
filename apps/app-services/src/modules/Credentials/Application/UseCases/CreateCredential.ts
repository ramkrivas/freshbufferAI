import { FreshbufferAiError, getErrorMessage } from '@app-services/core/Errors'
import { transformToCredentialEntity } from '@app-services/utils/Credentials/CredentialsUtil'
import { StatusCodes } from 'http-status-codes'
import { Credential } from '../../../../core/Database/Entities/Credential'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'

export const createCredential = async (requestBody: any) => {
    try {
        const appServer = getRunningExpressApp()
        const newCredential = await transformToCredentialEntity(requestBody)
        const credential = await appServer.AppDataSource.getRepository(Credential).create(newCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.createCredential - ${getErrorMessage(error)}`
        )
    }
}

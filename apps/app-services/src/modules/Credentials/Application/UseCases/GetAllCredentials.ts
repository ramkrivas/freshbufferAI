import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { Credential } from '../../../../core/Database/Entities/Credential'
import { FreshbufferAiError, getErrorMessage } from '@app-services/core/Errors'
import { StatusCodes } from 'http-status-codes'
import { omit } from 'lodash'

export const getAllCredentials = async (paramCredentialName: any) => {
    try {
        const appServer = getRunningExpressApp()
        let dbResponse = []
        if (paramCredentialName) {
            if (Array.isArray(paramCredentialName)) {
                for (let i = 0; i < paramCredentialName.length; i += 1) {
                    const name = paramCredentialName[i] as string
                    const credentials = await appServer.AppDataSource.getRepository(Credential).findBy({
                        credentialName: name
                    })
                    dbResponse.push(...credentials)
                }
            } else {
                const credentials = await appServer.AppDataSource.getRepository(Credential).findBy({
                    credentialName: paramCredentialName as string
                })
                dbResponse = [...credentials]
            }
        } else {
            const credentials = await appServer.AppDataSource.getRepository(Credential).find()
            for (const credential of credentials) {
                dbResponse.push(omit(credential, ['encryptedData']))
            }
        }
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.getAllCredentials - ${getErrorMessage(error)}`
        )
    }
}

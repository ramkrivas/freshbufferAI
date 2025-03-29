import logger from '@app-services/core/Logger'
import { ICredentialDataDecrypted, ICredentialReqBody } from '@app-services/modules/Credentials/Domain/Interface'
import {
    CreateSecretCommand,
    PutSecretValueCommand,
    SecretsManagerClient,
    SecretsManagerClientConfig
} from '@aws-sdk/client-secrets-manager'
import { getEncryptionKeyPath, ICommonObject } from 'apps/core-plugins/dist/src'
import { randomBytes } from 'crypto'
import { AES } from 'crypto-js'
import fs from 'fs'
import path from 'path'
import { Credential } from '../../core/Database/Entities/Credential'
import { getUserHome } from '../FileSytem/getUserHome'

let secretsManagerClient: SecretsManagerClient | null = null
const USE_AWS_SECRETS_MANAGER = process.env.SECRETKEY_STORAGE_TYPE === 'aws'
if (USE_AWS_SECRETS_MANAGER) {
    const region = process.env.SECRETKEY_AWS_REGION || 'us-east-1' // Default region if not provided
    const accessKeyId = process.env.SECRETKEY_AWS_ACCESS_KEY
    const secretAccessKey = process.env.SECRETKEY_AWS_SECRET_KEY

    let credentials: SecretsManagerClientConfig['credentials'] | undefined
    if (accessKeyId && secretAccessKey) {
        credentials = {
            accessKeyId,
            secretAccessKey
        }
    }
    secretsManagerClient = new SecretsManagerClient({ credentials, region })
}

/**
 * Transform ICredentialBody from req to Credential entity
 * @param {ICredentialReqBody} body
 * @returns {Credential}
 */
export const transformToCredentialEntity = async (body: ICredentialReqBody): Promise<Credential> => {
    const credentialBody: ICommonObject = {
        name: body.name,
        credentialName: body.credentialName
    }

    if (body.plainDataObj) {
        const encryptedData = await encryptCredentialData(body.plainDataObj)
        credentialBody.encryptedData = encryptedData
    }

    const newCredential = new Credential()
    Object.assign(newCredential, credentialBody)

    return newCredential
}

/**
 * Encrypt credential data
 * @param {ICredentialDataDecrypted} plainDataObj
 * @returns {Promise<string>}
 */
export const encryptCredentialData = async (plainDataObj: ICredentialDataDecrypted): Promise<string> => {
    if (USE_AWS_SECRETS_MANAGER && secretsManagerClient) {
        const secretName = `FreshbufferAICredential_${randomBytes(12).toString('hex')}`

        logger.info(`[server]: Upserting AWS Secret: ${secretName}`)

        const secretString = JSON.stringify({ ...plainDataObj })

        try {
            // Try to update the secret if it exists
            const putCommand = new PutSecretValueCommand({
                SecretId: secretName,
                SecretString: secretString
            })
            await secretsManagerClient.send(putCommand)
        } catch (error: any) {
            if (error.name === 'ResourceNotFoundException') {
                // Secret doesn't exist, so create it
                const createCommand = new CreateSecretCommand({
                    Name: secretName,
                    SecretString: secretString
                })
                await secretsManagerClient.send(createCommand)
            } else {
                // Rethrow any other errors
                throw error
            }
        }
        return secretName
    }

    const encryptKey = await getEncryptionKey()

    // Fallback to existing code
    return AES.encrypt(JSON.stringify(plainDataObj), encryptKey).toString()
}

/**
 * Returns the encryption key
 * @returns {Promise<string>}
 */
export const getEncryptionKey = async (): Promise<string> => {
    if (process.env.FRESHBUFFERAI_SECRETKEY_OVERWRITE !== undefined && process.env.FRESHBUFFERAI_SECRETKEY_OVERWRITE !== '') {
        return process.env.FRESHBUFFERAI_SECRETKEY_OVERWRITE
    }
    try {
        return await fs.promises.readFile(getEncryptionKeyPath(), 'utf8')
    } catch (error) {
        const encryptKey = generateEncryptKey()
        const defaultLocation = process.env.SECRETKEY_PATH
            ? path.join(process.env.SECRETKEY_PATH, 'encryption.key')
            : path.join(getUserHome(), '.freshbufferai', 'encryption.key')
        await fs.promises.writeFile(defaultLocation, encryptKey)
        return encryptKey
    }
}
/**
 * Generate an encryption key
 * @returns {string}
 */
export const generateEncryptKey = (): string => {
    return randomBytes(24).toString('base64')
}

/**
 * Strictly no getRepository, appServer here, must be passed as parameter
 */

import fs from 'fs'
import path from 'path'
import { DocumentStore } from '../core/database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../core/database/entities/DocumentStoreFileChunk'
import { IDatabaseEntity } from '../modules/document-store'

export const databaseEntities: IDatabaseEntity = {
    DocumentStore: DocumentStore,
    DocumentStoreFileChunk: DocumentStoreFileChunk
}

/**
 * Returns the home folder path of the user if
 * none can be found it falls back to the current
 * working directory
 *
 */
export const getUserHome = (): string => {
    let variableName = 'HOME'
    if (process.platform === 'win32') {
        variableName = 'USERPROFILE'
    }

    if (process.env[variableName] === undefined) {
        // If for some reason the variable does not exist
        // fall back to current folder
        return process.cwd()
    }
    return process.env[variableName] as string
}

/**
 * Returns the path of node modules package
 * @param {string} packageName
 * @returns {string}
 */
export const getNodeModulesPackagePath = (packageName: string): string => {
    const checkPaths = [
        path.join(__dirname, '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', '..', '..', 'node_modules', packageName)
    ]
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

/**
 * Get file name from base64 string
 * @param {string} fileBase64
 */
export const getFileName = (fileBase64: string): string => {
    let fileNames = []
    if (fileBase64.startsWith('FILE-STORAGE::')) {
        const names = fileBase64.substring(14)
        if (names.includes('[') && names.includes(']')) {
            const files = JSON.parse(names)
            return files.join(', ')
        } else {
            return fileBase64.substring(14)
        }
    }
    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
        const files = JSON.parse(fileBase64)
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            fileNames.push(filename)
        }
        return fileNames.join(', ')
    } else {
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
        return filename
    }
}

/**
 * Get user settings file
 * TODO: move env variables to settings json file, easier configuration
 */
export const getUserSettingsFilePath = () => {
    if (process.env.SECRETKEY_PATH) return path.join(process.env.SECRETKEY_PATH, 'settings.json')
    const checkPaths = [path.join(getUserHome(), '.freshbufferai', 'settings.json')]
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

/**
 * Get app current version
 */
export const getAppVersion = async () => {
    const getPackageJsonPath = (): string => {
        const checkPaths = [
            path.join(__dirname, '..', 'package.json'),
            path.join(__dirname, '..', '..', 'package.json'),
            path.join(__dirname, '..', '..', '..', 'package.json'),
            path.join(__dirname, '..', '..', '..', '..', 'package.json'),
            path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
        ]
        for (const checkPath of checkPaths) {
            if (fs.existsSync(checkPath)) {
                return checkPath
            }
        }
        return ''
    }

    const packagejsonPath = getPackageJsonPath()
    if (!packagejsonPath) return ''
    try {
        const content = await fs.promises.readFile(packagejsonPath, 'utf8')
        const parsedContent = JSON.parse(content)
        return parsedContent.version
    } catch (error) {
        return ''
    }
}

export const convertToValidFilename = (word: string) => {
    return word
        .replace(/[/|\\:*?"<>]/g, ' ')
        .replace(' ', '')
        .toLowerCase()
}

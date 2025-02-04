import path from 'path'
import fs from 'fs'
import { getUserHome } from './getUserHome'
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

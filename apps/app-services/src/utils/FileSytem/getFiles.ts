import { promises, Dirent } from 'fs'
import path from 'path'

/**
 * Recursive function to get node files
 * @param {string} dir
 * @returns {string[]}
 */
export const getFiles = async (dir: string): Promise<string[]> => {
    const dirents = await promises.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
        dirents.map((dirent: Dirent) => {
            const res = path.resolve(dir, dirent.name)
            return dirent.isDirectory() ? getFiles(res) : res
        })
    )
    return Array.prototype.concat(...files)
}

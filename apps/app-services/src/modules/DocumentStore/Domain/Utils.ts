import { IDocumentStoreLoader } from './Interface'

const getFileName = (fileBase64: string) => {
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

export const addLoaderSource = (loader: IDocumentStoreLoader, isGetFileNameOnly = false) => {
    let source = 'None'

    const handleUnstructuredFileLoader = (config: any, isGetFileNameOnly: boolean): string => {
        if (config.fileObject) {
            return isGetFileNameOnly ? getFileName(config.fileObject) : config.fileObject.replace('FILE-STORAGE::', '')
        }
        return config.filePath || 'None'
    }

    switch (loader.loaderId) {
        case 'pdfFile':
        case 'jsonFile':
        case 'csvFile':
        case 'file':
        case 'jsonlinesFile':
        case 'txtFile':
            source = isGetFileNameOnly
                ? getFileName(loader.loaderConfig?.[loader.loaderId])
                : loader.loaderConfig?.[loader.loaderId]?.replace('FILE-STORAGE::', '') || 'None'
            break
        case 'apiLoader':
            source = loader.loaderConfig?.url + ' (' + loader.loaderConfig?.method + ')'
            break
        case 'cheerioWebScraper':
        case 'playwrightWebScraper':
        case 'puppeteerWebScraper':
            source = loader.loaderConfig?.url || 'None'
            break
        case 'unstructuredFileLoader':
            source = handleUnstructuredFileLoader(loader.loaderConfig || {}, isGetFileNameOnly)
            break
        default:
            source = 'None'
            break
    }

    return source
}

import { Command, Flags } from '@oclif/core'
import path from 'path'
import * as Server from '../index'
import * as DataSource from '../core/Database/DataSource'
import dotenv from 'dotenv'
import logger from '../core/Logger/Logger'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true })

enum EXIT_CODE {
    SUCCESS = 0,
    FAILED = 1
}
let processExitCode = EXIT_CODE.SUCCESS

export default class Start extends Command {
    static args = []

    async stopProcess() {
        logger.info('Shutting down FreshbufferAI...')
        try {
            // Shut down the app after timeout if it ever stuck removing pools
            setTimeout(() => {
                logger.info('FreshbufferAI was forced to shut down after 30 secs')
                process.exit(processExitCode)
            }, 30000)

            // Removing pools
            const serverApp = Server.getInstance()
            if (serverApp) await serverApp.stopApp()
        } catch (error) {
            logger.error('There was an error shutting down FreshbufferAI...', error)
        }
        process.exit(processExitCode)
    }

    async run(): Promise<void> {
        process.on('SIGTERM', this.stopProcess)
        process.on('SIGINT', this.stopProcess)

        // Prevent throw new Error from crashing the app
        // TODO: Get rid of this and send proper error message to ui
        process.on('uncaughtException', (err) => {
            logger.error('uncaughtException: ', err)
        })

        process.on('unhandledRejection', (err) => {
            logger.error('unhandledRejection: ', err)
        })

        await (async () => {
            try {
                logger.info('Starting FreshbufferAI...')
                await DataSource.init()
                await Server.start()
            } catch (error) {
                logger.error('There was an error starting FreshbufferAI...', error)
                processExitCode = EXIT_CODE.FAILED
                // @ts-ignore
                process.emit('SIGINT')
            }
        })()
    }
}

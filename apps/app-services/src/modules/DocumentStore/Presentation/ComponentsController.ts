import { NextFunction, Request, Response } from 'express'
import { getEmbeddingProviders } from '../Application/UseCases/Components/GetEmbeddingProviders'
import { getVectorStoreProviders } from '../Application/UseCases/Components/GetVectorStoreProviders'
import { getRecordManagerProviders } from '../Application/UseCases/Components/GetRecordManagerProviders'

const getEmbeddingProvidersService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getEmbeddingProviders()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getVectorStoreProvidersService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getVectorStoreProviders()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getRecordManagerProvidersService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getRecordManagerProviders()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
export default {
    getEmbeddingProvidersService,
    getVectorStoreProvidersService,
    getRecordManagerProvidersService
}

import { NextFunction, Request, Response } from 'express'
import { getDocumentLoaders } from '../Application/UseCases/GetLoaders'

const getDocumentLoadersService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getDocumentLoaders()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default { getDocumentLoadersService }

import type { Request, Response } from 'express'
import * as TableModel from '../models/table.model.js'

export async function list(req: Request, res: Response) {
  res.json(await TableModel.listTables(req.query.restaurantId as string | undefined))
}

import { IMCRequest, IMCResponse } from '@root/api/types';
import { addToResponse, hasAuthorization, nextAndReturn } from '@root/api/utils'
import config from '@root/api/utils/configLoader'
import { ITableInfo } from '@root/configGenerator'
import Debug from 'debug'
import { NextFunction } from 'express'

const debug = Debug('funfunzmc:controller-tables')

class TablesController {
  public settings: ITableInfo[]
  constructor() {
    debug('Created')
    this.settings = config().settings
  }

  public getTables(req: IMCRequest, res: IMCResponse, next: NextFunction) {
    const tables = this.settings.map(
      (table: ITableInfo) => {
        let isAuthorized: boolean = true
        if (!table.visible) {
          return undefined
        }
        if (table.roles && table.roles.read && table.roles.read.length) {
          isAuthorized = hasAuthorization(table.roles.read, req.user)
        }
        if (isAuthorized) {
          return {
            name: table.name,
            verbose: table.verbose,
            order: table.order || undefined,
          }
        }
        return undefined
      }
    ).filter(
      (table) => table
    )
    addToResponse(res, 'tables')(tables)
    return nextAndReturn(next)(tables)
  }
}

export default TablesController

import database from '../db'
import { getPKs } from '../utils'
import { ITableInfo } from '../../generator/configurationTypes'
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql'
import Knex from 'knex'
import {
  parseResolveInfo,
  ResolveTree,
  simplifyParsedResolveInfoFragmentWithType 
} from 'graphql-parse-resolve-info'
import { TUserContext } from './schema'
import { requirementsCheck } from '../utils/dataAccess'
import { applyQueryFilters, applyParentTableFilters, FilterValues } from '../utils/filter'

function getFields(
  table: ITableInfo,
  info: GraphQLResolveInfo
): string[] {
  const fields = [...(getPKs(table))]
  const parsedResolveInfoFragment = parseResolveInfo(info)
  if (parsedResolveInfoFragment) {
    const {fields: columns} = simplifyParsedResolveInfoFragmentWithType(
      parsedResolveInfoFragment as ResolveTree,
      info.returnType
    )
    Object.keys(columns).forEach(
      (columnName) => {
        if (table.columns.find((c) => c.name === columnName)) {
          fields.push(columnName)
        }
        const relation = table.relations && table.relations.find((r) => {
          return r.remoteTable === columnName && r.type === 'n:1'
        })
        if (relation) {
          fields.push(relation.foreignKey)
        }
      }
    )
  }
  return [...new Set(fields)]
}

export function resolver<TSource, TContext extends TUserContext>(
  table: ITableInfo,
  parentTable?: ITableInfo
): GraphQLFieldResolver<TSource, TContext> {
  return (parent, args, context, info) => {
    return requirementsCheck(table, 'read', context.user, database).then(
      (DB) => {
        const fields = getFields(table, info)
        let QUERY = DB(table.name).select(fields)
        if (args.filter) {
          QUERY = applyQueryFilters(QUERY, args.filter)
          console.log(QUERY.toSQL())
        }
        paginate(QUERY, args.skip, args.take)
        if (parentTable) {
          return applyParentTableFilters(QUERY, table, parentTable, parent as unknown as Record<string, FilterValues>)
        } else {
          return QUERY
        }
      }
    )
  }
}

export function resolverCount<TSource, TContext extends TUserContext>(
  table: ITableInfo
): GraphQLFieldResolver<TSource, TContext> {
  return (parent, args, context) => {
    return requirementsCheck(table, 'read', context.user, database).then(
      async (DB) => {
        let QUERY = DB(table.name).select([])
        if (args.filter) {
          QUERY = await applyQueryFilters(QUERY, args.filter)
        }
        return QUERY.count('*', {as: 'count'}).first().then((res) => res.count)
      }
    )
  }
}

function paginate(query: Knex.QueryBuilder, offset = 0, limit = 0) {
  offset = typeof offset === 'string' ? parseInt(offset, 10) : offset
  limit = typeof limit === 'string' ? parseInt(limit, 10) : limit
  if (limit > 0) {
    query.offset((offset) * limit).limit(limit)
  }
  return query
}

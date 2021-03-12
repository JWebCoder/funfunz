import { operators, OperatorsType } from '../utils/filter'
import { IEntityInfo } from '../../generator/configurationTypes'
import Debug from 'debug'
import {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
} from 'graphql'
import { getPKs } from '../utils/index'
import { MATCHER } from './helpers'
import { GraphQLUpload } from 'graphql-upload'

const debug = Debug('funfunz:graphql-args-builder')

interface IBuildArgsOptions {
  required?: ['pk' | string],
  include?: ['pk' | string],
  exclude?: ['pk' | string],
  data?: boolean,
  filter?: boolean,
  pagination?: boolean,
}

const args: Record<string, GraphQLFieldConfigArgumentMap> = {} 
const dataInputs: Record<string, GraphQLArgumentConfig> = {}
const filters: Record<string, GraphQLArgumentConfig> = {}

export function buildArgs(
  entity: IEntityInfo,
  options: IBuildArgsOptions
): GraphQLFieldConfigArgumentMap {
  const entityId = `${entity.name}-${JSON.stringify(options)}`
  if (args[entityId]) {
    return args[entityId]
  }
  args[entityId] = {}
  debug(`Creating args for entity ${entity.name}`)
  const {required, include, pagination, filter, data } = options
  if (pagination) {
    args[entityId].take = {
      type: GraphQLInt,
      description: 'Take N items',
    }
    args[entityId].skip = {
      type: GraphQLInt,
      description: 'Skip N items',
    }
  }

  if (filter) {
    const filterId = `filter${entity.name}Data`
    if (filters[filterId]) {
      args[entityId].filter = filters[filterId]
    } else {
      args[entityId].filter = filters[filterId] = {
        type: new GraphQLInputObjectType({
          name: filterId,
          description: `Filter for the ${entity.name} data`,
          fields: () => {
            const inputFields: GraphQLInputFieldConfigMap = {}
            const entityPKs = getPKs(entity)
      
            entity.properties.forEach(
              (property) => {
                if (property.filterable === false) {
                  return
                }
                const isPk = entityPKs.indexOf(property.name) >= 0
                /*
                *  if include option is passed check if the column is present there
                */
                if (include && !include.includes(property.name) && !(isPk && include.includes('pk'))) {
                  return
                }
    
                /*
                *  Checks if the column name is present or if it's a primary key checks for the 'pk' key
                */
                const isRequired = required && (
                  required.includes(property.name) || (
                    isPk && required.includes('pk')
                  )
                )
                
                const matchedType = MATCHER[property.type]
    
                const supportedOperators = (property.filterable === true || property.filterable === undefined)
                  ? operators
                  : property.filterable
                if (matchedType && matchedType !== GraphQLUpload) {
                  const type = new GraphQLInputObjectType({
                    name: `entity${entity.name}Field${property.name}`,
                    description: `Filter for the field ${property.name}`,
                    fields: () => argFieldBuilder(matchedType, supportedOperators)
                  })
                  inputFields[property.name] = {
                    type: isRequired ? new GraphQLNonNull(type) : type,
                    description: property.name,
                  }
                }
              }
            )
            inputFields._and = {
              type: new GraphQLList(
                buildArgs(entity, options).filter.type
              )
            }
            inputFields._or = {
              type: new GraphQLList(
                buildArgs(entity, options).filter.type
              )
            }
            return inputFields
          },
        }),
        description: 'Query filter'
      }
    }
  }

  if (data) {
    const dataInputId = `input${entity.name}Data`
    if (dataInputs[dataInputId]) {
      args[entityId].data = dataInputs[dataInputId]
    } else {
      args[entityId].data = dataInputs[dataInputId] = {
        type: new GraphQLInputObjectType({
          name: `input${entity.name}Data`,
          description: `Data to update ${entity.name}`,
          fields: () => {
            const inputFields: GraphQLInputFieldConfigMap = {}
            const entityPKs = getPKs(entity)
      
            entity.properties.forEach(
              (property) => {
                const isPk = entityPKs.indexOf(property.name) >= 0
                /*
                *  if include option is passed check if the column is present there
                */
                if (include && !include.includes(property.name) && !(isPk && include.includes('pk'))) {
                  return
                }
    
                /*
                *  Checks if the column name is present or if it's a primary key checks for the 'pk' key
                */
                const isRequired = required && (
                  required.includes(property.name) || (
                    isPk && required.includes('pk')
                  )
                )
                
                const matchedType = MATCHER[property.type]
                
                if ((isPk || matchedType)) {
                  const type = matchedType
                  inputFields[property.name] = {
                    type: isRequired ? new GraphQLNonNull(type) : type,
                    description: property.name,
                  }
                }
              }
            )
            return inputFields
          },
        }),
        description: 'Query filter'
      }
    }
  }
  
  debug(`Created args for entity ${entity.name}`)
  return args[entityId]
}


export function argFieldBuilder(matchedType: GraphQLScalarType, supportedOperators: OperatorsType[]): GraphQLInputFieldConfigMap {
  const argFilter = {}
  supportedOperators.forEach(
    operator => {
      if (operator === '_in' || operator === '_nin') {
        argFilter[operator] = {
          type: GraphQLList(matchedType)
        }
      } else {
        argFilter[operator] = {
          type: matchedType
        }
      }
      
    }
  )
  return argFilter
}

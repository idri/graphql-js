// @flow strict

import objectValues from '../polyfills/objectValues';

import inspect from '../jsutils/inspect';
import invariant from '../jsutils/invariant';
import keyValMap from '../jsutils/keyValMap';
import { type ObjMap } from '../jsutils/ObjMap';

import { GraphQLSchema } from '../type/schema';
import { GraphQLDirective } from '../type/directives';
import { isIntrospectionType } from '../type/introspection';
import {
  type GraphQLNamedType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  isListType,
  isNonNullType,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isInputObjectType,
} from '../type/definition';

/**
 * Sort GraphQLSchema.
 *
 * This function returns a sorted copy of the given GraphQLSchema and a ordering similarto Intellij JS Graphql Plugin.
 */
export function idriSortSchema(schema: GraphQLSchema): GraphQLSchema {
  const schemaConfig = schema.toConfig();
  const typeMap = keyValMap(
    groupByTypeAndSortByName(schemaConfig.types),
    (type) => type.name,
    sortNamedType,
  );

  return new GraphQLSchema({
    ...schemaConfig,
    types: objectValues(typeMap),
    directives: sortByName(schemaConfig.directives).map(sortDirective),
    query: replaceMaybeType(schemaConfig.query),
    mutation: replaceMaybeType(schemaConfig.mutation),
    subscription: replaceMaybeType(schemaConfig.subscription),
  });

  function replaceType(type) {
    if (isListType(type)) {
      return new GraphQLList(replaceType(type.ofType));
    } else if (isNonNullType(type)) {
      return new GraphQLNonNull(replaceType(type.ofType));
    }
    return replaceNamedType(type);
  }

  function replaceNamedType<T: GraphQLNamedType>(type: T): T {
    return ((typeMap[type.name]: any): T);
  }

  function replaceMaybeType(maybeType) {
    return maybeType && replaceNamedType(maybeType);
  }

  function sortDirective(directive) {
    const config = directive.toConfig();
    return new GraphQLDirective({
      ...config,
      locations: sortBy(config.locations, (x) => x),
      args: sortArgs(config.args),
    });
  }

  function sortArgs(args) {
    return sortObjMap(args, (arg) => ({
      ...arg,
      type: replaceType(arg.type),
    }));
  }

  function sortFields(fieldsMap) {
    return sortObjMap(fieldsMap, (field) => ({
      ...field,
      type: replaceType(field.type),
      args: sortArgs(field.args),
    }));
  }

  function sortInputFields(fieldsMap) {
    return sortObjMap(fieldsMap, (field) => ({
      ...field,
      type: replaceType(field.type),
    }));
  }

  function sortTypes<T: GraphQLNamedType>(arr: $ReadOnlyArray<T>): Array<T> {
    return sortByName(arr).map(replaceNamedType);
  }

  function sortNamedType(type) {
    if (isScalarType(type) || isIntrospectionType(type)) {
      return type;
    }
    if (isObjectType(type)) {
      const config = type.toConfig();
      return new GraphQLObjectType({
        ...config,
        interfaces: () => sortTypes(config.interfaces),
        fields: () => sortFields(config.fields),
      });
    }
    if (isInterfaceType(type)) {
      const config = type.toConfig();
      return new GraphQLInterfaceType({
        ...config,
        interfaces: () => sortTypes(config.interfaces),
        fields: () => sortFields(config.fields),
      });
    }
    if (isUnionType(type)) {
      const config = type.toConfig();
      return new GraphQLUnionType({
        ...config,
        types: () => sortTypes(config.types),
      });
    }
    if (isEnumType(type)) {
      const config = type.toConfig();
      return new GraphQLEnumType({
        ...config,
        values: sortObjMap(config.values),
      });
    }
    // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')
    if (isInputObjectType(type)) {
      const config = type.toConfig();
      return new GraphQLInputObjectType({
        ...config,
        fields: () => sortInputFields(config.fields),
      });
    }

    // istanbul ignore next (Not reachable. All possible types have been considered)
    invariant(false, 'Unexpected type: ' + inspect((type: empty)));
  }
}

function sortObjMap<T, R>(map: ObjMap<T>, sortValueFn?: (T) => R): ObjMap<R> {
  const sortedMap = Object.create(null);
  const sortedKeys = sortCamelCaseBy(Object.keys(map), (x) => x);
  for (const key of sortedKeys) {
    const value = map[key];
    sortedMap[key] = sortValueFn ? sortValueFn(value) : value;
  }
  return sortedMap;
}

function sortByName<T: { +name: string, ... }>(
  array: $ReadOnlyArray<T>,
): Array<T> {
  return sortBy(array, (obj) => obj.name);
}

function groupByTypeAndSortByName<T: { +name: string, ... }>(
  array: $ReadOnlyArray<T>,
): Array<T> {
  let arrayScalar = new Array();
  let arrayIntrospection = new Array();
  let arrayObject = new Array();
  let arrayInterface = new Array();
  let arrayUnion = new Array();
  let arrayEnum = new Array();
  let arrayInput = new Array();
  array.forEach( (item) => {
    if (isScalarType(item)) {
      arrayScalar.push(item);
    }
    else if (isIntrospectionType(item)) {
      arrayIntrospection.push(item);
    }
    else if (isObjectType(item)) {
      arrayObject.push(item);
    }
    else if (isInterfaceType(item)) {
      arrayInterface.push(item);
    }
    else if (isUnionType(item)) {
      arrayUnion.push(item);
    }
    else if (isEnumType(item)) {
      arrayEnum.push(item);
    }    
    else if (isInputObjectType(item)) {
      arrayInput.push(item);
    }
  });
  const arrayScalarSorted = sortCamelCaseBy(arrayScalar, (obj) => obj.name);
  const arrayIntrospectionSorted = sortCamelCaseBy(arrayIntrospection, (obj) => obj.name);
  const arrayObjectSorted = sortCamelCaseBy(arrayObject, (obj) => obj.name);
  const arrayInterfaceSorted = sortCamelCaseBy(arrayInterface, (obj) => obj.name);
  const arrayUnionSorted = sortCamelCaseBy(arrayUnion, (obj) => obj.name);
  const arrayEnumSorted = sortCamelCaseBy(arrayEnum, (obj) => obj.name);
  const arrayInputSorted = sortCamelCaseBy(arrayInput, (obj) => obj.name);
  return arrayIntrospectionSorted.concat(arrayInterfaceSorted).concat(arrayUnionSorted).concat(arrayObjectSorted).concat(arrayEnumSorted).concat(arrayInputSorted).concat(arrayScalarSorted);
}

function sortBy<T>(
  array: $ReadOnlyArray<T>,
  mapToKey: (T) => string,
): Array<T> {
  return array.slice().sort((obj1, obj2) => {
    const key1 = mapToKey(obj1);
    const key2 = mapToKey(obj2);
    return key1.localeCompare(key2);
  });
}

function sortCamelCaseBy<T>(
  array: $ReadOnlyArray<T>,
  mapToKey: (T) => string,
): Array<T> {
  return array.slice().sort((obj1, obj2) => {
    const key1 = mapToKey(obj1);
    const key2 = mapToKey(obj2);
    
    const arrKey1 = key1.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    const arrKey2 = key2.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
      
    let i;  
    let res = 0;
    if (arrKey1.length <= arrKey2.length) {
      for (i = 0; i < arrKey1.length; i++) {
        res = arrKey1[i].localeCompare(arrKey2[i]);
        if (res !== 0) {
          break;
        }
      }    
    } else {    
      for (i = 0; i < arrKey2.length; i++) {
        res = arrKey1[i].localeCompare(arrKey2[i]);
        if (res !== 0) {
          break;
        }
      }    
    }    
    if (res === 0){
      res = key1.localeCompare(key2);
    }    
    return res;
  });
}
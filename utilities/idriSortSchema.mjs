function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import objectValues from "../polyfills/objectValues.mjs";
import inspect from "../jsutils/inspect.mjs";
import invariant from "../jsutils/invariant.mjs";
import keyValMap from "../jsutils/keyValMap.mjs";
import { GraphQLSchema } from "../type/schema.mjs";
import { GraphQLDirective } from "../type/directives.mjs";
import { isIntrospectionType } from "../type/introspection.mjs";
import { GraphQLObjectType, GraphQLInterfaceType, GraphQLUnionType, GraphQLEnumType, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, isListType, isNonNullType, isScalarType, isObjectType, isInterfaceType, isUnionType, isEnumType, isInputObjectType } from "../type/definition.mjs";
/**
 * Sort GraphQLSchema.
 *
 * This function returns a sorted copy of the given GraphQLSchema and a ordering similarto Intellij JS Graphql Plugin.
 */

export function idriSortSchema(schema) {
  var schemaConfig = schema.toConfig();
  var typeMap = keyValMap(groupByTypeAndSortByName(schemaConfig.types), function (type) {
    return type.name;
  }, sortNamedType);
  return new GraphQLSchema(_objectSpread(_objectSpread({}, schemaConfig), {}, {
    types: objectValues(typeMap),
    directives: sortByName(schemaConfig.directives).map(sortDirective),
    query: replaceMaybeType(schemaConfig.query),
    mutation: replaceMaybeType(schemaConfig.mutation),
    subscription: replaceMaybeType(schemaConfig.subscription)
  }));

  function replaceType(type) {
    if (isListType(type)) {
      return new GraphQLList(replaceType(type.ofType));
    } else if (isNonNullType(type)) {
      return new GraphQLNonNull(replaceType(type.ofType));
    }

    return replaceNamedType(type);
  }

  function replaceNamedType(type) {
    return typeMap[type.name];
  }

  function replaceMaybeType(maybeType) {
    return maybeType && replaceNamedType(maybeType);
  }

  function sortDirective(directive) {
    var config = directive.toConfig();
    return new GraphQLDirective(_objectSpread(_objectSpread({}, config), {}, {
      locations: sortBy(config.locations, function (x) {
        return x;
      }),
      args: sortArgs(config.args)
    }));
  }

  function sortArgs(args) {
    return sortObjMap(args, function (arg) {
      return _objectSpread(_objectSpread({}, arg), {}, {
        type: replaceType(arg.type)
      });
    });
  }

  function sortFields(fieldsMap) {
    return sortObjMap(fieldsMap, function (field) {
      return _objectSpread(_objectSpread({}, field), {}, {
        type: replaceType(field.type),
        args: sortArgs(field.args)
      });
    });
  }

  function sortInputFields(fieldsMap) {
    return sortObjMap(fieldsMap, function (field) {
      return _objectSpread(_objectSpread({}, field), {}, {
        type: replaceType(field.type)
      });
    });
  }

  function sortTypes(arr) {
    return sortByName(arr).map(replaceNamedType);
  }

  function sortNamedType(type) {
    if (isScalarType(type) || isIntrospectionType(type)) {
      return type;
    }

    if (isObjectType(type)) {
      var config = type.toConfig();
      return new GraphQLObjectType(_objectSpread(_objectSpread({}, config), {}, {
        interfaces: function interfaces() {
          return sortTypes(config.interfaces);
        },
        fields: function fields() {
          return sortFields(config.fields);
        }
      }));
    }

    if (isInterfaceType(type)) {
      var _config = type.toConfig();

      return new GraphQLInterfaceType(_objectSpread(_objectSpread({}, _config), {}, {
        interfaces: function interfaces() {
          return sortTypes(_config.interfaces);
        },
        fields: function fields() {
          return sortFields(_config.fields);
        }
      }));
    }

    if (isUnionType(type)) {
      var _config2 = type.toConfig();

      return new GraphQLUnionType(_objectSpread(_objectSpread({}, _config2), {}, {
        types: function types() {
          return sortTypes(_config2.types);
        }
      }));
    }

    if (isEnumType(type)) {
      var _config3 = type.toConfig();

      return new GraphQLEnumType(_objectSpread(_objectSpread({}, _config3), {}, {
        values: sortObjMap(_config3.values)
      }));
    } // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')


    if (isInputObjectType(type)) {
      var _config4 = type.toConfig();

      return new GraphQLInputObjectType(_objectSpread(_objectSpread({}, _config4), {}, {
        fields: function fields() {
          return sortInputFields(_config4.fields);
        }
      }));
    } // istanbul ignore next (Not reachable. All possible types have been considered)


    false || invariant(0, 'Unexpected type: ' + inspect(type));
  }
}

function sortObjMap(map, sortValueFn) {
  var sortedMap = Object.create(null);
  var sortedKeys = sortCamelCaseBy(Object.keys(map), function (x) {
    return x;
  });

  for (var _i2 = 0; _i2 < sortedKeys.length; _i2++) {
    var key = sortedKeys[_i2];
    var value = map[key];
    sortedMap[key] = sortValueFn ? sortValueFn(value) : value;
  }

  return sortedMap;
}

function sortByName(array) {
  return sortBy(array, function (obj) {
    return obj.name;
  });
}

function groupByTypeAndSortByName(array) {
  var arrayScalar = new Array();
  var arrayIntrospection = new Array();
  var arrayObject = new Array();
  var arrayInterface = new Array();
  var arrayUnion = new Array();
  var arrayEnum = new Array();
  var arrayInput = new Array();
  array.forEach(function (item) {
    if (isScalarType(item)) {
      arrayScalar.push(item);
    } else if (isIntrospectionType(item)) {
      arrayIntrospection.push(item);
    } else if (isObjectType(item)) {
      arrayObject.push(item);
    } else if (isInterfaceType(item)) {
      arrayInterface.push(item);
    } else if (isUnionType(item)) {
      arrayUnion.push(item);
    } else if (isEnumType(item)) {
      arrayEnum.push(item);
    } else if (isInputObjectType(item)) {
      arrayInput.push(item);
    }
  });
  var arrayScalarSorted = sortBy(arrayScalar, function (obj) {
    return obj.name;
  });
  var arrayIntrospectionSorted = sortBy(arrayIntrospection, function (obj) {
    return obj.name;
  });
  var arrayObjectSorted = sortBy(arrayObject, function (obj) {
    return obj.name;
  });
  var arrayInterfaceSorted = sortBy(arrayInterface, function (obj) {
    return obj.name;
  });
  var arrayUnionSorted = sortBy(arrayUnion, function (obj) {
    return obj.name;
  });
  var arrayEnumSorted = sortBy(arrayEnum, function (obj) {
    return obj.name;
  });
  var arrayInputSorted = sortBy(arrayInput, function (obj) {
    return obj.name;
  });
  return arrayIntrospectionSorted.concat(arrayInterfaceSorted).concat(arrayUnionSorted).concat(arrayObjectSorted).concat(arrayEnumSorted).concat(arrayInputSorted).concat(arrayScalarSorted);
}

function sortBy(array, mapToKey) {
  return array.slice().sort(function (obj1, obj2) {
    var key1 = mapToKey(obj1);
    var key2 = mapToKey(obj2);
    return key1.localeCompare(key2);
  });
}

function sortCamelCaseBy(array, mapToKey) {
  return array.slice().sort(function (obj1, obj2) {
    var key1 = mapToKey(obj1);
    var key2 = mapToKey(obj2);
    console.log("The keys to compare are: key1=".concat(key1, " and key2=").concat(key2));
    var arrKey1 = key1.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    var arrKey2 = key2.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    var i;
    var res = 0;

    if (arrKey1.length <= arrKey2.length) {
      for (i = 0; i < arrKey1.length; i++) {
        res = arrKey1[i].localeCompare(arrKey2[i]);

        if (res !== 0) {
          console.log('res = ' + res);
          break;
        }
      }
    } else {
      for (i = 0; i < arrKey2.length; i++) {
        console.log("Compare arrKey1[".concat(i, "]=").concat(arrKey1[i], " with arrKey2[").concat(i, "]=").concat(arrKey2[i]));
        res = arrKey1[i].localeCompare(arrKey2[i]);

        if (res !== 0) {
          console.log('res = ' + res);
          break;
        }
      }
    }

    if (res == 0) {
      res = key1.localeCompare(key2);
    }

    return res;
  });
}

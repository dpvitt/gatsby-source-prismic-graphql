"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _path = _interopRequireDefault(require("path"));

var _getRootQuery = require("gatsby-source-graphql-universal/getRootQuery");

var _gatsbyNode = require("gatsby-source-graphql-universal/gatsby-node");

var _utils = require("./utils");

var _gatsbySourceFilesystem = require("gatsby-source-filesystem");

var _pathToRegexp = _interopRequireDefault(require("path-to-regexp"));

exports.onCreateWebpackConfig = _gatsbyNode.onCreateWebpackConfig;

exports.onCreatePage = function (_ref) {
  var page = _ref.page,
      actions = _ref.actions;
  var rootQuery = (0, _getRootQuery.getRootQuery)(page.componentPath);
  page.context = page.context || {};

  if (rootQuery) {
    page.context.rootQuery = rootQuery;
    actions.createPage(page);
  }
};

exports.sourceNodes = function (ref, options) {
  var opts = (0, _objectSpread2.default)({
    fieldName: _utils.fieldName,
    typeName: _utils.typeName,
    createLink: function createLink() {
      return (0, _utils.PrismicLink)({
        uri: "https://".concat(options.repositoryName, ".prismic.io/graphql"),
        credentials: 'same-origin',
        accessToken: options.accessToken,
        customRef: options.prismicRef
      });
    }
  }, options);
  return (0, _gatsbyNode.sourceNodes)(ref, opts);
};

function createGeneralPreviewPage(createPage, options) {
  var previewPath = options.previewPath || '/preview';
  createPage({
    path: previewPath.replace(/^\//, ''),
    component: _path.default.resolve(_path.default.join(__dirname, 'components', 'PreviewPage.js')),
    context: {
      prismicPreviewPage: true
    }
  });
}

function createDocumentPreviewPage(createPage, page, lang) {
  var rootQuery = (0, _getRootQuery.getRootQuery)(page.component);
  createPage({
    path: page.path,
    matchPath: process.env.NODE_ENV === 'production' ? undefined : page.match,
    component: page.component,
    context: {
      rootQuery: rootQuery,
      id: '',
      uid: '',
      lang: lang,
      paginationPreviousUid: '',
      paginationPreviousLang: '',
      paginationNextUid: '',
      paginationNextLang: ''
    }
  });
}
/**
 * Create URL paths interpolating `:uid` and `:lang` or `:lang?` with actual values.
 * @param pageOptions - Returned paths are based on the `match` or `path` (if `match`
 * is not present) properties of the `pageOptions` object.
 * @param node - Document node metadata provide the `lang` and `uid` values for the returned path.
 * @param options - The plugin's global options.
 * @param options.defaultLang - `defaultLang` as declared in `PluginOptions`. If `lang` segment is
 * marked optional (`:lang?`) in the page `match` or `path` values and `defaultLang` matches the
 * document's actual language, the language segment of the path will be omitted in the returned path.
 * @param options.shortenUrlLangs - When truthy, the lang used for the path will be limited to 2 characters.
 * @return The path for the document's URL with `lang` and `uid` interpolated as necessary.
 */


function createDocumentPath(pageOptions, node, _ref2) {
  var defaultLang = _ref2.defaultLang,
      shortenUrlLangs = _ref2.shortenUrlLangs;
  var pathKeys = [];
  var pathTemplate = pageOptions.match || pageOptions.path;
  (0, _pathToRegexp.default)(pathTemplate, pathKeys);
  var langKey = pathKeys.find(function (key) {
    return key.name === 'lang';
  });
  var isLangOptional = !!(langKey && langKey.optional);

  var toPath = _pathToRegexp.default.compile(pathTemplate);

  var documentLang = node._meta.lang;
  var isDocumentLangDefault = documentLang === defaultLang;
  var shouldExcludeLangInPath = isLangOptional && isDocumentLangDefault;
  var displayedLang = shortenUrlLangs ? documentLang.slice(0, 2) : documentLang;
  var lang = shouldExcludeLangInPath ? null : displayedLang;
  var params = (0, _objectSpread2.default)({}, node._meta, {
    lang: lang
  });
  var path = toPath(params);
  return path === '' ? '/' : path;
}

function createDocumentPages(createPage, edges, options, page) {
  // Cycle through each document returned from query...
  edges.forEach(function (_ref3, index) {
    var cursor = _ref3.cursor,
        node = _ref3.node;
    var previousNode = edges[index - 1] && edges[index - 1].node;
    var nextNode = edges[index + 1] && edges[index + 1].node; // ...and create the page

    createPage({
      path: createDocumentPath(page, node, options),
      component: page.component,
      context: (0, _objectSpread2.default)({
        rootQuery: (0, _getRootQuery.getRootQuery)(page.component)
      }, node._meta, {
        cursor: cursor,
        paginationPreviousMeta: previousNode ? previousNode._meta : null,
        paginationPreviousUid: previousNode ? previousNode._meta.uid : '',
        paginationPreviousLang: previousNode ? previousNode._meta.lang : '',
        paginationNextMeta: nextNode ? nextNode._meta : null,
        paginationNextUid: nextNode ? nextNode._meta.uid : '',
        paginationNextLang: nextNode ? nextNode._meta.lang : '',
        // pagination helpers for overcoming backwards pagination issues cause by Prismic's 20-document query limit
        lastQueryChunkEndCursor: edges[index - 1] ? edges[index - 1].endCursor : ''
      })
    });
  });
}

var getDocumentsQuery = function getDocumentsQuery(_ref4) {
  var documentType = _ref4.documentType,
      sortType = _ref4.sortType,
      extraPageFields = _ref4.extraPageFields;
  return "\n  query AllPagesQuery ($after: String, $lang: String, $sortBy: ".concat(sortType, ") {\n    prismic {\n      ").concat(documentType, " (\n        first: 20\n        after: $after\n        sortBy: $sortBy\n        lang: $lang\n      ) {\n        totalCount\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n        edges {\n          cursor\n          node {\n            ").concat(extraPageFields, "\n            _meta {\n              id\n              lang\n              uid\n              type\n              alternateLanguages {\n                id\n                lang\n                type\n                uid\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n");
};

exports.createPages = /*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee2(_ref5, options) {
    var graphql, createPage, createPagesForType, _createPagesForType, pages, pageCreators;

    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _createPagesForType = function _ref9() {
              _createPagesForType = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee(page, lang) {
                var endCursor,
                    documents,
                    documentType,
                    sortType,
                    extraPageFields,
                    query,
                    _ref7,
                    data,
                    errors,
                    response,
                    edges,
                    newEndCursor,
                    _args = arguments;

                return _regenerator.default.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        endCursor = _args.length > 2 && _args[2] !== undefined ? _args[2] : '';
                        documents = _args.length > 3 && _args[3] !== undefined ? _args[3] : [];
                        // Prepare and execute query
                        documentType = "all".concat(page.type, "s");
                        sortType = "PRISMIC_Sort".concat(page.type, "y");
                        extraPageFields = options.extraPageFields || '';
                        query = getDocumentsQuery({
                          documentType: documentType,
                          sortType: sortType,
                          extraPageFields: extraPageFields
                        });
                        _context.next = 8;
                        return graphql(query, {
                          after: endCursor,
                          lang: lang || null,
                          sortBy: page.sortBy
                        });

                      case 8:
                        _ref7 = _context.sent;
                        data = _ref7.data;
                        errors = _ref7.errors;

                        if (!(errors && errors.length)) {
                          _context.next = 13;
                          break;
                        }

                        throw errors[0];

                      case 13:
                        response = data.prismic[documentType];
                        edges = page.filter ? response.edges.filter(page.filter) : response.edges; // Add last end cursor to all edges to enable pagination context when creating pages

                        edges.forEach(function (edge) {
                          return edge.endCursor = endCursor;
                        }); // Stage documents for page creation

                        documents = [].concat((0, _toConsumableArray2.default)(documents), (0, _toConsumableArray2.default)(edges));

                        if (!response.pageInfo.hasNextPage) {
                          _context.next = 23;
                          break;
                        }

                        newEndCursor = response.pageInfo.endCursor;
                        _context.next = 21;
                        return createPagesForType(page, lang, newEndCursor, documents);

                      case 21:
                        _context.next = 25;
                        break;

                      case 23:
                        createDocumentPreviewPage(createPage, page, lang);
                        createDocumentPages(createPage, documents, options, page);

                      case 25:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));
              return _createPagesForType.apply(this, arguments);
            };

            createPagesForType = function _ref8(_x3, _x4) {
              return _createPagesForType.apply(this, arguments);
            };

            graphql = _ref5.graphql, createPage = _ref5.actions.createPage;
            createGeneralPreviewPage(createPage, options);
            /**
             * Helper that recursively queries GraphQL to collect all documents for the given
             * page type. Once all documents are collected, it creates pages for them all.
             * Prismic GraphQL queries only return up to 20 results per query)
             */

            // Prepare to create all the pages
            pages = options.pages || [];
            pageCreators = []; // Create pageCreator promises for each page/language combination

            pages.forEach(function (page) {
              var langs = page.langs || options.langs || options.defaultLang && [options.defaultLang];

              if (langs) {
                langs.forEach(function (lang) {
                  return pageCreators.push(createPagesForType(page, lang));
                });
              } else {
                pageCreators.push(createPagesForType(page));
              }
            }); // Run all pageCreators simultaneously

            _context2.next = 9;
            return Promise.all(pageCreators);

          case 9:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function (_x, _x2) {
    return _ref6.apply(this, arguments);
  };
}();

exports.createResolvers = function (_ref10, _ref11) {
  var actions = _ref10.actions,
      cache = _ref10.cache,
      createNodeId = _ref10.createNodeId,
      createResolvers = _ref10.createResolvers,
      store = _ref10.store,
      reporter = _ref10.reporter;
  var _ref11$sharpKeys = _ref11.sharpKeys,
      sharpKeys = _ref11$sharpKeys === void 0 ? [/image|photo|picture/] : _ref11$sharpKeys;
  var createNode = actions.createNode;
  var state = store.getState();

  var _state$schemaCustomiz = (0, _slicedToArray2.default)(state.schemaCustomization.thirdPartySchemas, 1),
      _state$schemaCustomiz2 = _state$schemaCustomiz[0],
      prismicSchema = _state$schemaCustomiz2 === void 0 ? {} : _state$schemaCustomiz2;

  var typeMap = prismicSchema._typeMap;
  var resolvers = {};

  for (var _typeName in typeMap) {
    var typeEntry = typeMap[_typeName];
    var typeFields = typeEntry && typeEntry.getFields && typeEntry.getFields() || {};
    var typeResolver = {};

    var _loop = function _loop(_fieldName) {
      var field = typeFields[_fieldName];

      if (field.type === typeMap.PRISMIC_Json && sharpKeys.some(function (re) {
        return re instanceof RegExp ? re.test(_fieldName) : re === _fieldName;
      })) {
        typeResolver["".concat(_fieldName, "Sharp")] = {
          type: 'File',
          args: {
            crop: {
              type: typeMap.String
            }
          },
          resolve: function resolve(source, args) {
            var obj = source && source[_fieldName] || {};
            var url = args.crop ? obj[args.crop] && obj[args.crop].url : obj.url;

            if (url) {
              return (0, _gatsbySourceFilesystem.createRemoteFileNode)({
                url: url,
                store: store,
                cache: cache,
                createNode: createNode,
                createNodeId: createNodeId,
                reporter: reporter
              });
            }

            return null;
          }
        };
      }
    };

    for (var _fieldName in typeFields) {
      _loop(_fieldName);
    }

    if (Object.keys(typeResolver).length) {
      resolvers[_typeName] = typeResolver;
    }
  }

  if (Object.keys(resolvers).length) {
    createResolvers(resolvers);
  }
};
var router5ListenersPlugin = (function () {
    'use strict';

    var babelHelpers_typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    function nameToIDs(name) {
        return name.split('.').reduce(function (ids, name) {
            return ids.concat(ids.length ? ids[ids.length - 1] + '.' + name : name);
        }, []);
    }

    function extractSegmentParams(name, state) {
        if (!state._meta || !state._meta[name]) return {};

        return Object.keys(state._meta[name]).reduce(function (params, p) {
            params[p] = state.params[p];
            return params;
        }, {});
    }

    function transitionPath(toState, fromState) {
        var fromStateIds = fromState ? nameToIDs(fromState.name) : [];
        var toStateIds = nameToIDs(toState.name);
        var maxI = Math.min(fromStateIds.length, toStateIds.length);

        function pointOfDifference() {
            var i = undefined;

            var _loop = function _loop() {
                var left = fromStateIds[i];
                var right = toStateIds[i];

                if (left !== right) return {
                        v: i
                    };

                var leftParams = extractSegmentParams(left, toState);
                var rightParams = extractSegmentParams(right, fromState);

                if (leftParams.length !== rightParams.length) return {
                        v: i
                    };
                if (leftParams.length === 0) return 'continue';

                var different = Object.keys(leftParams).some(function (p) {
                    return rightParams[p] !== leftParams[p];
                });
                if (different) {
                    return {
                        v: i
                    };
                }
            };

            for (i = 0; i < maxI; i += 1) {
                var _ret = _loop();

                switch (_ret) {
                    case 'continue':
                        continue;

                    default:
                        if ((typeof _ret === 'undefined' ? 'undefined' : babelHelpers_typeof(_ret)) === "object") return _ret.v;
                }
            }

            return i;
        }

        var i = undefined;
        if (!fromState) {
            i = 0;
        } else if (!fromState || toState.name === fromState.name && (!toState._meta || !fromState._meta)) {
            console.log('[router5.transition-path] Some states are missing metadata, reloading all segments');
            i = 0;
        } else {
            i = pointOfDifference();
        }

        var toDeactivate = fromStateIds.slice(i).reverse();
        var toActivate = toStateIds.slice(i);

        var intersection = fromState && i > 0 ? fromStateIds[i - 1] : '';

        return {
            intersection: intersection,
            toDeactivate: toDeactivate,
            toActivate: toActivate
        };
    }

    var pluginName = 'LISTENERS';
    var defaultOptions = {
        autoCleanUp: true
    };

    function listenersPlugin() {
        var options = arguments.length <= 0 || arguments[0] === undefined ? defaultOptions : arguments[0];

        return function plugin(router) {
            var listeners = {};

            var removeListener = function removeListener(name, cb) {
                if (cb) {
                    if (listeners[name]) listeners[name] = listeners[name].filter(function (callback) {
                        return callback !== cb;
                    });
                } else {
                    listeners[name] = [];
                }
                return router;
            };

            var addListener = function addListener(name, cb, replace) {
                var normalizedName = name.replace(/^(\*|\^|=)/, '');

                if (normalizedName && !/^\$/.test(name)) {
                    var segments = router.rootNode.getSegmentsByName(normalizedName);
                    if (!segments) console.warn('No route found for ' + normalizedName + ', listener might never be called!');
                }

                if (!listeners[name]) listeners[name] = [];
                listeners[name] = (replace ? [] : listeners[name]).concat(cb);

                return router;
            };

            router.addListener = function (cb) {
                return addListener('*', cb);
            };
            router.removeListener = function (cb) {
                return removeListener('*', cb);
            };

            router.addNodeListener = function (name, cb) {
                return addListener('^' + name, cb, true);
            };
            router.removeNodeListener = function (name, cb) {
                return removeListener('^' + name, cb);
            };

            router.addRouteListener = function (name, cb) {
                return addListener('=' + name, cb);
            };
            router.removeRouteListener = function (name, cb) {
                return removeListener('=' + name, cb);
            };

            function invokeListeners(name, toState, fromState) {
                (listeners[name] || []).forEach(function (cb) {
                    return cb(toState, fromState);
                });
            }

            function onTransitionSuccess(toState, fromState, opts) {
                var _transitionPath = transitionPath(toState, fromState);

                var intersection = _transitionPath.intersection;
                var toDeactivate = _transitionPath.toDeactivate;

                var intersectionNode = opts.reload ? '' : intersection;
                var name = toState.name;

                if (options.autoCleanUp) {
                    toDeactivate.forEach(function (name) {
                        return removeListener('^' + name);
                    });
                }

                invokeListeners('^' + intersection, toState, fromState);
                invokeListeners('=' + name, toState, fromState);
                invokeListeners('*', toState, fromState);
            }

            function flush() {
                listeners = {};
            }

            return { name: pluginName, onTransitionSuccess: onTransitionSuccess, flush: flush, listeners: listeners };
        };
    }

    return listenersPlugin;

}());
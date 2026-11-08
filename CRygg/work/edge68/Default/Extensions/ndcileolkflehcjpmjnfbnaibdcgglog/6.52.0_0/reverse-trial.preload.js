/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 2558
(module, __unused_webpack_exports, __webpack_require__) {

/* @@package_name - v@@version - @@timestamp */
/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


if (!(globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.id)) {
  throw new Error("This script should only be loaded in a browser extension.");
}

if (!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)) {
  const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
  const ERROR_TO_IGNORE = `A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`;

  // Wrapping the bulk of this polyfill in a one-time-use function is a minor
  // optimization for Firefox. Since Spidermonkey does not fully parse the
  // contents of a function until the first time it's called, and since it will
  // never actually need to be called, this allows the polyfill to be included
  // in Firefox nearly for free.
  const wrapAPIs = extensionAPIs => {
    // NOTE: apiMetadata is associated to the content of the api-metadata.json file
    // at build time by replacing the following "include" with the content of the
    // JSON file.
    const apiMetadata = __webpack_require__(2058);

    if (Object.keys(apiMetadata).length === 0) {
      throw new Error("api-metadata.json has not been included in browser-polyfill");
    }

    /**
     * A WeakMap subclass which creates and stores a value for any key which does
     * not exist when accessed, but behaves exactly as an ordinary WeakMap
     * otherwise.
     *
     * @param {function} createItem
     *        A function which will be called in order to create the value for any
     *        key which does not exist, the first time it is accessed. The
     *        function receives, as its only argument, the key being created.
     */
    class DefaultWeakMap extends WeakMap {
      constructor(createItem, items = undefined) {
        super(items);
        this.createItem = createItem;
      }

      get(key) {
        if (!this.has(key)) {
          this.set(key, this.createItem(key));
        }

        return super.get(key);
      }
    }

    /**
     * Returns true if the given object is an object with a `then` method, and can
     * therefore be assumed to behave as a Promise.
     *
     * @param {*} value The value to test.
     * @returns {boolean} True if the value is thenable.
     */
    const isThenable = value => {
      return value && typeof value === "object" && typeof value.then === "function";
    };

    /**
     * Creates and returns a function which, when called, will resolve or reject
     * the given promise based on how it is called:
     *
     * - If, when called, `chrome.runtime.lastError` contains a non-null object,
     *   the promise is rejected with that value.
     * - If the function is called with exactly one argument, the promise is
     *   resolved to that value.
     * - Otherwise, the promise is resolved to an array containing all of the
     *   function's arguments.
     *
     * @param {object} promise
     *        An object containing the resolution and rejection functions of a
     *        promise.
     * @param {function} promise.resolve
     *        The promise's resolution function.
     * @param {function} promise.reject
     *        The promise's rejection function.
     * @param {object} metadata
     *        Metadata about the wrapped method which has created the callback.
     * @param {boolean} metadata.singleCallbackArg
     *        Whether or not the promise is resolved with only the first
     *        argument of the callback, alternatively an array of all the
     *        callback arguments is resolved. By default, if the callback
     *        function is invoked with only a single argument, that will be
     *        resolved to the promise, while all arguments will be resolved as
     *        an array if multiple are given.
     *
     * @returns {function}
     *        The generated callback function.
     */
    const makeCallback = (promise, metadata) => {
      // In case we encounter a browser error in the callback function, we don't
      // want to lose the stack trace leading up to this point. For that reason,
      // we need to instantiate the error outside the callback function.
      let error = new Error();
      return (...callbackArgs) => {
        if (extensionAPIs.runtime.lastError) {
          error.message = extensionAPIs.runtime.lastError.message;
          promise.reject(error);
        } else if (metadata.singleCallbackArg ||
                   (callbackArgs.length <= 1 && metadata.singleCallbackArg !== false)) {
          promise.resolve(callbackArgs[0]);
        } else {
          promise.resolve(callbackArgs);
        }
      };
    };

    const pluralizeArguments = (numArgs) => numArgs == 1 ? "argument" : "arguments";

    /**
     * Creates a wrapper function for a method with the given name and metadata.
     *
     * @param {string} name
     *        The name of the method which is being wrapped.
     * @param {object} metadata
     *        Metadata about the method being wrapped.
     * @param {integer} metadata.minArgs
     *        The minimum number of arguments which must be passed to the
     *        function. If called with fewer than this number of arguments, the
     *        wrapper will raise an exception.
     * @param {integer} metadata.maxArgs
     *        The maximum number of arguments which may be passed to the
     *        function. If called with more than this number of arguments, the
     *        wrapper will raise an exception.
     * @param {boolean} metadata.singleCallbackArg
     *        Whether or not the promise is resolved with only the first
     *        argument of the callback, alternatively an array of all the
     *        callback arguments is resolved. By default, if the callback
     *        function is invoked with only a single argument, that will be
     *        resolved to the promise, while all arguments will be resolved as
     *        an array if multiple are given.
     *
     * @returns {function(object, ...*)}
     *       The generated wrapper function.
     */
    const wrapAsyncFunction = (name, metadata) => {
      return function asyncFunctionWrapper(target, ...args) {
        if (args.length < metadata.minArgs) {
          throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
        }

        if (args.length > metadata.maxArgs) {
          throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
        }

        return new Promise((resolve, reject) => {
          if (metadata.fallbackToNoCallback) {
            // This API method has currently no callback on Chrome, but it return a promise on Firefox,
            // and so the polyfill will try to call it with a callback first, and it will fallback
            // to not passing the callback if the first call fails.
            try {
              target[name](...args, makeCallback({resolve, reject}, metadata));
            } catch (cbError) {
              console.warn(`${name} API method doesn't seem to support the callback parameter, ` +
                           "falling back to call it without a callback: ", cbError);

              target[name](...args);

              // Update the API method metadata, so that the next API calls will not try to
              // use the unsupported callback anymore.
              metadata.fallbackToNoCallback = false;
              metadata.noCallback = true;

              resolve();
            }
          } else if (metadata.noCallback) {
            target[name](...args);
            resolve();
          } else {
            target[name](...args, makeCallback({resolve, reject}, metadata));
          }
        });
      };
    };

    /**
     * Wraps an existing method of the target object, so that calls to it are
     * intercepted by the given wrapper function. The wrapper function receives,
     * as its first argument, the original `target` object, followed by each of
     * the arguments passed to the original method.
     *
     * @param {object} target
     *        The original target object that the wrapped method belongs to.
     * @param {function} method
     *        The method being wrapped. This is used as the target of the Proxy
     *        object which is created to wrap the method.
     * @param {function} wrapper
     *        The wrapper function which is called in place of a direct invocation
     *        of the wrapped method.
     *
     * @returns {Proxy<function>}
     *        A Proxy object for the given method, which invokes the given wrapper
     *        method in its place.
     */
    const wrapMethod = (target, method, wrapper) => {
      return new Proxy(method, {
        apply(targetMethod, thisObj, args) {
          return wrapper.call(thisObj, target, ...args);
        },
      });
    };

    let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);

    /**
     * Wraps an object in a Proxy which intercepts and wraps certain methods
     * based on the given `wrappers` and `metadata` objects.
     *
     * @param {object} target
     *        The target object to wrap.
     *
     * @param {object} [wrappers = {}]
     *        An object tree containing wrapper functions for special cases. Any
     *        function present in this object tree is called in place of the
     *        method in the same location in the `target` object tree. These
     *        wrapper methods are invoked as described in {@see wrapMethod}.
     *
     * @param {object} [metadata = {}]
     *        An object tree containing metadata used to automatically generate
     *        Promise-based wrapper functions for asynchronous. Any function in
     *        the `target` object tree which has a corresponding metadata object
     *        in the same location in the `metadata` tree is replaced with an
     *        automatically-generated wrapper function, as described in
     *        {@see wrapAsyncFunction}
     *
     * @returns {Proxy<object>}
     */
    const wrapObject = (target, wrappers = {}, metadata = {}) => {
      let cache = Object.create(null);
      let handlers = {
        has(proxyTarget, prop) {
          return prop in target || prop in cache;
        },

        get(proxyTarget, prop, receiver) {
          if (prop in cache) {
            return cache[prop];
          }

          if (!(prop in target)) {
            return undefined;
          }

          let value = target[prop];

          if (typeof value === "function") {
            // This is a method on the underlying object. Check if we need to do
            // any wrapping.

            if (typeof wrappers[prop] === "function") {
              // We have a special-case wrapper for this method.
              value = wrapMethod(target, target[prop], wrappers[prop]);
            } else if (hasOwnProperty(metadata, prop)) {
              // This is an async method that we have metadata for. Create a
              // Promise wrapper for it.
              let wrapper = wrapAsyncFunction(prop, metadata[prop]);
              value = wrapMethod(target, target[prop], wrapper);
            } else {
              // This is a method that we don't know or care about. Return the
              // original method, bound to the underlying object.
              value = value.bind(target);
            }
          } else if (typeof value === "object" && value !== null &&
                     (hasOwnProperty(wrappers, prop) ||
                      hasOwnProperty(metadata, prop))) {
            // This is an object that we need to do some wrapping for the children
            // of. Create a sub-object wrapper for it with the appropriate child
            // metadata.
            value = wrapObject(value, wrappers[prop], metadata[prop]);
          } else if (hasOwnProperty(metadata, "*")) {
            // Wrap all properties in * namespace.
            value = wrapObject(value, wrappers[prop], metadata["*"]);
          } else {
            // We don't need to do any wrapping for this property,
            // so just forward all access to the underlying object.
            Object.defineProperty(cache, prop, {
              configurable: true,
              enumerable: true,
              get() {
                return target[prop];
              },
              set(value) {
                target[prop] = value;
              },
            });

            return value;
          }

          cache[prop] = value;
          return value;
        },

        set(proxyTarget, prop, value, receiver) {
          if (prop in cache) {
            cache[prop] = value;
          } else {
            target[prop] = value;
          }
          return true;
        },

        defineProperty(proxyTarget, prop, desc) {
          return Reflect.defineProperty(cache, prop, desc);
        },

        deleteProperty(proxyTarget, prop) {
          return Reflect.deleteProperty(cache, prop);
        },
      };

      // Per contract of the Proxy API, the "get" proxy handler must return the
      // original value of the target if that value is declared read-only and
      // non-configurable. For this reason, we create an object with the
      // prototype set to `target` instead of using `target` directly.
      // Otherwise we cannot return a custom object for APIs that
      // are declared read-only and non-configurable, such as `chrome.devtools`.
      //
      // The proxy handlers themselves will still use the original `target`
      // instead of the `proxyTarget`, so that the methods and properties are
      // dereferenced via the original targets.
      let proxyTarget = Object.create(target);
      return new Proxy(proxyTarget, handlers);
    };

    /**
     * Creates a set of wrapper functions for an event object, which handles
     * wrapping of listener functions that those messages are passed.
     *
     * A single wrapper is created for each listener function, and stored in a
     * map. Subsequent calls to `addListener`, `hasListener`, or `removeListener`
     * retrieve the original wrapper, so that  attempts to remove a
     * previously-added listener work as expected.
     *
     * @param {DefaultWeakMap<function, function>} wrapperMap
     *        A DefaultWeakMap object which will create the appropriate wrapper
     *        for a given listener function when one does not exist, and retrieve
     *        an existing one when it does.
     *
     * @returns {object}
     */
    const wrapEvent = wrapperMap => ({
      addListener(target, listener, ...args) {
        target.addListener(wrapperMap.get(listener), ...args);
      },

      hasListener(target, listener) {
        return target.hasListener(wrapperMap.get(listener));
      },

      removeListener(target, listener) {
        target.removeListener(wrapperMap.get(listener));
      },
    });

    const onRequestFinishedWrappers = new DefaultWeakMap(listener => {
      if (typeof listener !== "function") {
        return listener;
      }

      /**
       * Wraps an onRequestFinished listener function so that it will return a
       * `getContent()` property which returns a `Promise` rather than using a
       * callback API.
       *
       * @param {object} req
       *        The HAR entry object representing the network request.
       */
      return function onRequestFinished(req) {
        const wrappedReq = wrapObject(req, {} /* wrappers */, {
          getContent: {
            minArgs: 0,
            maxArgs: 0,
          },
        });
        listener(wrappedReq);
      };
    });

    const onMessageWrappers = new DefaultWeakMap(listener => {
      if (typeof listener !== "function") {
        return listener;
      }

      /**
       * Wraps a message listener function so that it may send responses based on
       * its return value, rather than by returning a sentinel value and calling a
       * callback. If the listener function returns a Promise, the response is
       * sent when the promise either resolves or rejects.
       *
       * @param {*} message
       *        The message sent by the other end of the channel.
       * @param {object} sender
       *        Details about the sender of the message.
       * @param {function(*)} sendResponse
       *        A callback which, when called with an arbitrary argument, sends
       *        that value as a response.
       * @returns {boolean}
       *        True if the wrapped listener returned a Promise, which will later
       *        yield a response. False otherwise.
       */
      return function onMessage(message, sender, sendResponse) {
        let didCallSendResponse = false;

        let wrappedSendResponse;
        let sendResponsePromise = new Promise(resolve => {
          wrappedSendResponse = function(response) {
            didCallSendResponse = true;
            resolve(response);
          };
        });

        let result;
        try {
          result = listener(message, sender, wrappedSendResponse);
        } catch (err) {
          result = Promise.reject(err);
        }

        const isResultThenable = result !== true && isThenable(result);

        // If the listener didn't returned true or a Promise, or called
        // wrappedSendResponse synchronously, we can exit earlier
        // because there will be no response sent from this listener.
        if (result !== true && !isResultThenable && !didCallSendResponse) {
          return false;
        }

        // A small helper to send the message if the promise resolves
        // and an error if the promise rejects (a wrapped sendMessage has
        // to translate the message into a resolved promise or a rejected
        // promise).
        const sendPromisedResult = (promise) => {
          promise.then(msg => {
            // send the message value.
            sendResponse(msg);
          }, error => {
            // Send a JSON representation of the error if the rejected value
            // is an instance of error, or the object itself otherwise.
            let message;
            if (error && (error instanceof Error ||
                typeof error.message === "string")) {
              message = error.message;
            } else {
              message = "An unexpected error occurred";
            }

            sendResponse({
              __mozWebExtensionPolyfillReject__: true,
              message,
            });
          }).catch(err => {
            // Print an error on the console if unable to send the response.
            console.error("Failed to send onMessage rejected reply", err);
          });
        };

        // If the listener returned a Promise, send the resolved value as a
        // result, otherwise wait the promise related to the wrappedSendResponse
        // callback to resolve and send it as a response.
        if (isResultThenable) {
          sendPromisedResult(result);
        } else {
          sendPromisedResult(sendResponsePromise);
        }

        // Let Chrome know that the listener is replying.
        return true;
      };
    });

    const wrappedSendMessageCallback = ({reject, resolve}, reply) => {
      if (extensionAPIs.runtime.lastError) {
        // Detect when none of the listeners replied to the sendMessage call and resolve
        // the promise to undefined as in Firefox.
        // See https://github.com/mozilla/webextension-polyfill/issues/130
        if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE || extensionAPIs.runtime.lastError.message.includes(ERROR_TO_IGNORE)) {
          resolve();
        } else {
          reject(new Error(extensionAPIs.runtime.lastError.message));
        }
      } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
        // Convert back the JSON representation of the error into
        // an Error instance.
        reject(new Error(reply.message));
      } else {
        resolve(reply);
      }
    };

    const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
      if (args.length < metadata.minArgs) {
        throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
      }

      if (args.length > metadata.maxArgs) {
        throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
      }

      return new Promise((resolve, reject) => {
        const wrappedCb = wrappedSendMessageCallback.bind(null, {resolve, reject});
        args.push(wrappedCb);
        apiNamespaceObj.sendMessage(...args);
      });
    };

    const staticWrappers = {
      devtools: {
        network: {
          onRequestFinished: wrapEvent(onRequestFinishedWrappers),
        },
      },
      runtime: {
        onMessage: wrapEvent(onMessageWrappers),
        onMessageExternal: wrapEvent(onMessageWrappers),
        sendMessage: wrappedSendMessage.bind(null, "sendMessage", {minArgs: 1, maxArgs: 3}),
      },
      tabs: {
        sendMessage: wrappedSendMessage.bind(null, "sendMessage", {minArgs: 2, maxArgs: 3}),
      },
    };
    const settingMetadata = {
      clear: {minArgs: 1, maxArgs: 1},
      get: {minArgs: 1, maxArgs: 1},
      set: {minArgs: 1, maxArgs: 1},
    };
    apiMetadata.privacy = {
      network: {"*": settingMetadata},
      services: {"*": settingMetadata},
      websites: {"*": settingMetadata},
    };

    return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
  };

  // The build process adds a UMD wrapper around this file, which makes the
  // `module` variable available.
  module.exports = wrapAPIs(chrome);
} else {
  module.exports = globalThis.browser;
}


/***/ },

/***/ 2058
(module) {

module.exports = /*#__PURE__*/JSON.parse('{"alarms":{"clear":{"minArgs":0,"maxArgs":1},"clearAll":{"minArgs":0,"maxArgs":0},"get":{"minArgs":0,"maxArgs":1},"getAll":{"minArgs":0,"maxArgs":0}},"bookmarks":{"create":{"minArgs":1,"maxArgs":1},"get":{"minArgs":1,"maxArgs":1},"getChildren":{"minArgs":1,"maxArgs":1},"getRecent":{"minArgs":1,"maxArgs":1},"getSubTree":{"minArgs":1,"maxArgs":1},"getTree":{"minArgs":0,"maxArgs":0},"move":{"minArgs":2,"maxArgs":2},"remove":{"minArgs":1,"maxArgs":1},"removeTree":{"minArgs":1,"maxArgs":1},"search":{"minArgs":1,"maxArgs":1},"update":{"minArgs":2,"maxArgs":2}},"browserAction":{"disable":{"minArgs":0,"maxArgs":1,"fallbackToNoCallback":true},"enable":{"minArgs":0,"maxArgs":1,"fallbackToNoCallback":true},"getBadgeBackgroundColor":{"minArgs":1,"maxArgs":1},"getBadgeText":{"minArgs":1,"maxArgs":1},"getPopup":{"minArgs":1,"maxArgs":1},"getTitle":{"minArgs":1,"maxArgs":1},"openPopup":{"minArgs":0,"maxArgs":0},"setBadgeBackgroundColor":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"setBadgeText":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"setIcon":{"minArgs":1,"maxArgs":1},"setPopup":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"setTitle":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true}},"browsingData":{"remove":{"minArgs":2,"maxArgs":2},"removeCache":{"minArgs":1,"maxArgs":1},"removeCookies":{"minArgs":1,"maxArgs":1},"removeDownloads":{"minArgs":1,"maxArgs":1},"removeFormData":{"minArgs":1,"maxArgs":1},"removeHistory":{"minArgs":1,"maxArgs":1},"removeLocalStorage":{"minArgs":1,"maxArgs":1},"removePasswords":{"minArgs":1,"maxArgs":1},"removePluginData":{"minArgs":1,"maxArgs":1},"settings":{"minArgs":0,"maxArgs":0}},"commands":{"getAll":{"minArgs":0,"maxArgs":0}},"contextMenus":{"remove":{"minArgs":1,"maxArgs":1},"removeAll":{"minArgs":0,"maxArgs":0},"update":{"minArgs":2,"maxArgs":2}},"cookies":{"get":{"minArgs":1,"maxArgs":1},"getAll":{"minArgs":1,"maxArgs":1},"getAllCookieStores":{"minArgs":0,"maxArgs":0},"remove":{"minArgs":1,"maxArgs":1},"set":{"minArgs":1,"maxArgs":1}},"devtools":{"inspectedWindow":{"eval":{"minArgs":1,"maxArgs":2,"singleCallbackArg":false}},"panels":{"create":{"minArgs":3,"maxArgs":3,"singleCallbackArg":true},"elements":{"createSidebarPane":{"minArgs":1,"maxArgs":1}}}},"downloads":{"cancel":{"minArgs":1,"maxArgs":1},"download":{"minArgs":1,"maxArgs":1},"erase":{"minArgs":1,"maxArgs":1},"getFileIcon":{"minArgs":1,"maxArgs":2},"open":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"pause":{"minArgs":1,"maxArgs":1},"removeFile":{"minArgs":1,"maxArgs":1},"resume":{"minArgs":1,"maxArgs":1},"search":{"minArgs":1,"maxArgs":1},"show":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true}},"extension":{"isAllowedFileSchemeAccess":{"minArgs":0,"maxArgs":0},"isAllowedIncognitoAccess":{"minArgs":0,"maxArgs":0}},"history":{"addUrl":{"minArgs":1,"maxArgs":1},"deleteAll":{"minArgs":0,"maxArgs":0},"deleteRange":{"minArgs":1,"maxArgs":1},"deleteUrl":{"minArgs":1,"maxArgs":1},"getVisits":{"minArgs":1,"maxArgs":1},"search":{"minArgs":1,"maxArgs":1}},"i18n":{"detectLanguage":{"minArgs":1,"maxArgs":1},"getAcceptLanguages":{"minArgs":0,"maxArgs":0}},"identity":{"launchWebAuthFlow":{"minArgs":1,"maxArgs":1}},"idle":{"queryState":{"minArgs":1,"maxArgs":1}},"management":{"get":{"minArgs":1,"maxArgs":1},"getAll":{"minArgs":0,"maxArgs":0},"getSelf":{"minArgs":0,"maxArgs":0},"setEnabled":{"minArgs":2,"maxArgs":2},"uninstallSelf":{"minArgs":0,"maxArgs":1}},"notifications":{"clear":{"minArgs":1,"maxArgs":1},"create":{"minArgs":1,"maxArgs":2},"getAll":{"minArgs":0,"maxArgs":0},"getPermissionLevel":{"minArgs":0,"maxArgs":0},"update":{"minArgs":2,"maxArgs":2}},"pageAction":{"getPopup":{"minArgs":1,"maxArgs":1},"getTitle":{"minArgs":1,"maxArgs":1},"hide":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"setIcon":{"minArgs":1,"maxArgs":1},"setPopup":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"setTitle":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true},"show":{"minArgs":1,"maxArgs":1,"fallbackToNoCallback":true}},"permissions":{"contains":{"minArgs":1,"maxArgs":1},"getAll":{"minArgs":0,"maxArgs":0},"remove":{"minArgs":1,"maxArgs":1},"request":{"minArgs":1,"maxArgs":1}},"runtime":{"getBackgroundPage":{"minArgs":0,"maxArgs":0},"getPlatformInfo":{"minArgs":0,"maxArgs":0},"openOptionsPage":{"minArgs":0,"maxArgs":0},"requestUpdateCheck":{"minArgs":0,"maxArgs":0},"sendMessage":{"minArgs":1,"maxArgs":3},"sendNativeMessage":{"minArgs":2,"maxArgs":2},"setUninstallURL":{"minArgs":1,"maxArgs":1}},"sessions":{"getDevices":{"minArgs":0,"maxArgs":1},"getRecentlyClosed":{"minArgs":0,"maxArgs":1},"restore":{"minArgs":0,"maxArgs":1}},"storage":{"local":{"clear":{"minArgs":0,"maxArgs":0},"get":{"minArgs":0,"maxArgs":1},"getBytesInUse":{"minArgs":0,"maxArgs":1},"remove":{"minArgs":1,"maxArgs":1},"set":{"minArgs":1,"maxArgs":1}},"managed":{"get":{"minArgs":0,"maxArgs":1},"getBytesInUse":{"minArgs":0,"maxArgs":1}},"sync":{"clear":{"minArgs":0,"maxArgs":0},"get":{"minArgs":0,"maxArgs":1},"getBytesInUse":{"minArgs":0,"maxArgs":1},"remove":{"minArgs":1,"maxArgs":1},"set":{"minArgs":1,"maxArgs":1}}},"tabs":{"captureVisibleTab":{"minArgs":0,"maxArgs":2},"create":{"minArgs":1,"maxArgs":1},"detectLanguage":{"minArgs":0,"maxArgs":1},"discard":{"minArgs":0,"maxArgs":1},"duplicate":{"minArgs":1,"maxArgs":1},"executeScript":{"minArgs":1,"maxArgs":2},"get":{"minArgs":1,"maxArgs":1},"getCurrent":{"minArgs":0,"maxArgs":0},"getZoom":{"minArgs":0,"maxArgs":1},"getZoomSettings":{"minArgs":0,"maxArgs":1},"goBack":{"minArgs":0,"maxArgs":1},"goForward":{"minArgs":0,"maxArgs":1},"highlight":{"minArgs":1,"maxArgs":1},"insertCSS":{"minArgs":1,"maxArgs":2},"move":{"minArgs":2,"maxArgs":2},"query":{"minArgs":1,"maxArgs":1},"reload":{"minArgs":0,"maxArgs":2},"remove":{"minArgs":1,"maxArgs":1},"removeCSS":{"minArgs":1,"maxArgs":2},"sendMessage":{"minArgs":2,"maxArgs":3},"setZoom":{"minArgs":1,"maxArgs":2},"setZoomSettings":{"minArgs":1,"maxArgs":2},"update":{"minArgs":1,"maxArgs":2}},"topSites":{"get":{"minArgs":0,"maxArgs":0}},"webNavigation":{"getAllFrames":{"minArgs":1,"maxArgs":1},"getFrame":{"minArgs":1,"maxArgs":1}},"webRequest":{"handlerBehaviorChanged":{"minArgs":0,"maxArgs":0}},"windows":{"create":{"minArgs":0,"maxArgs":1},"get":{"minArgs":1,"maxArgs":2},"getAll":{"minArgs":0,"maxArgs":1},"getCurrent":{"minArgs":0,"maxArgs":1},"getLastFocused":{"minArgs":0,"maxArgs":1},"remove":{"minArgs":1,"maxArgs":1},"update":{"minArgs":2,"maxArgs":2}}}');

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/

// EXTERNAL MODULE: ../../node_modules/webextension-polyfill/src/browser-polyfill.js
var browser_polyfill = __webpack_require__(2558);
;// ../../fragment/fragments/reverse-trial/dist/shared/constants.js
const EXPERIMENT_FLAG_PREFIX = "show-reverse-trial-opd-";
const TOUCH_POINT_CONFIG_FLAG_PREFIX = "reverse-trial-opd-config-";
const GET_DIALOG_MESSAGE_TYPE = "reverse-trial.get-dialog";
const STEP_PREF_KEY = "reverse_trial_step";
const TRIAL_START_DATE_PREF_KEY = "reverse_trial_start_date";
const DIALOG_ACTION_MESSAGE_TYPE = "reverse-trial.dialog-action";
const DIALOG_SHOWN_MESSAGE_TYPE = "reverse-trial.dialog-shown";
const DISMISS_DIALOG_MESSAGE_TYPE = "reverse-trial.dismiss-dialog";
const GET_DIALOG_SHOULD_STILL_SHOW_MESSAGE_TYPE = "reverse-trial.get-dialog-should-still-show";
const DIALOG_MARKER_ATTRIBUTE = "data-rt-opd";
const MS_PER_DAY = (/* unused pure expression or super */ null && (1000 * 60 * 60 * 24));
const YT_MASTHEAD_TIMEOUT_MS = 10000;

;// ../../fragment/fragments/reverse-trial/dist/shared/types.js
const DialogAction = {
    CLOSE: "CLOSE",
    END_TRIAL: "END_TRIAL",
    NAVIGATE: "NAVIGATE",
    AUTO_DISMISS: "AUTO_DISMISS",
    START_TRIAL: "START_TRIAL",
};

;// ../../fragment/fragments/reverse-trial/dist/content/reverse-trial-dialog.js



function sendDialogAction(touchPointStep, action) {
    void browser_polyfill.runtime.sendMessage({
        type: DIALOG_ACTION_MESSAGE_TYPE,
        touchPointStep,
        action,
    });
}
function sendDialogShown(touchPointStep) {
    void browser_polyfill.runtime.sendMessage({
        type: DIALOG_SHOWN_MESSAGE_TYPE,
        touchPointStep,
    });
}
async function detectYouTubePremium(timeoutMs = (/* inlined export .YT_MASTHEAD_TIMEOUT_MS */10000)) {
    const masthead = document.querySelector("#masthead");
    if (masthead) {
        return masthead.getAttribute("logo-type") === "YOUTUBE_PREMIUM_LOGO";
    }
    return await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            const el = document.querySelector("#masthead");
            if (el) {
                observer.disconnect();
                resolve(el.getAttribute("logo-type") === "YOUTUBE_PREMIUM_LOGO");
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        setTimeout(() => {
            observer.disconnect();
            resolve(false);
        }, timeoutMs);
    });
}
function isDarkMode() {
    const docAttr = document.documentElement.getAttribute("dark");
    const ytdApp = document.querySelector("ytd-app");
    return docAttr !== null || (ytdApp === null || ytdApp === void 0 ? void 0 : ytdApp.hasAttribute("dark")) === true;
}
let dialogContainer = null;
let dialogRemoved = false;
let autoDismissTimer = null;
let autoDismissMs = null;
let currentTouchPointStep = null;
let startCalled = false;
const DIALOG_STYLES = `
  :host {
    position: fixed;
    top: 37px;
    right: 37px;
    z-index: 2147483647;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
  }

  #dialog {
    position: relative;
    border-radius: 12px;
    padding: 20px 24px;
    width: 300px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
  }

  #header {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
    gap: 8px;
  }

  #logo {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    user-select: none;
  }

  #title {
    font-size: 14px;
    font-weight: 700;
    flex: 1;
    line-height: 1.3;
  }

  #close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    user-select: none;
  }

  #cta-btn {
    display: block;
    width: auto;
    margin-top: 18px;
    margin-left: auto;
    margin-right: auto;
    padding: 10px 40px;
    background: #e53935;
    color: #fff;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-family: Arial, Helvetica, sans-serif;
  }

  #cta-btn:hover {
    background: #c62828;
  }

  #links-row {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 10px;
    font-size: 13px;
  }

  #links-row.no-cta {
    margin-top: 32px;
  }

  #links-row a {
    text-decoration: none;
  }

  .links-separator {
    user-select: none;
  }

  .heading {
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0 6px 0;
    text-align: left;
  }

  .list-item {
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
    text-align: left;
    padding-left: 8px;
  }

  .check {
    color: #e53935;
    margin-right: 8px;
  }

  .body-text {
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 8px 0;
    padding: 0 8px;
  }
`;
const DARK_DIALOG_STYLES = `
  #dialog {
    background: #282828;
    color: #e0e0e0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }

  #title {
    color: #fff;
  }

  #close-btn {
    color: #888;
  }

  #close-btn:hover {
    color: #fff;
  }

  #links-row a {
    color: #aaa;
  }

  #links-row a:hover {
    color: #e0e0e0;
  }

  .links-separator {
    color: #aaa;
  }

  .heading {
    color: #e0e0e0;
  }

  .list-item {
    color: #aaa;
  }

  .body-text {
    color: #aaa;
  }

  strong {
    color: #e0e0e0;
  }

  em, u {
    color: inherit;
  }
`;
const LIGHT_DIALOG_STYLES = `
  #dialog {
    background: #ffffff;
    color: #333333;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }

  #title {
    color: #111111;
  }

  #close-btn {
    color: #777777;
  }

  #close-btn:hover {
    color: #111111;
  }

  #links-row a {
    color: #666666;
  }

  #links-row a:hover {
    color: #333333;
  }

  .links-separator {
    color: #666666;
  }

  .heading {
    color: #333333;
  }

  .list-item {
    color: #555555;
  }

  .body-text {
    color: #555555;
  }

  strong {
    color: #333333;
  }

  em, u {
    color: inherit;
  }
`;
function appendRichText(parent, text) {
    const parts = text.split(/(<(?:strong|em|u)>.*?<\/(?:strong|em|u)>)/g);
    for (const part of parts) {
        const match = /^<(strong|em|u)>(.*?)<\/\1>$/.exec(part);
        if (match) {
            const el = document.createElement(match[1]);
            el.textContent = match[2];
            parent.appendChild(el);
        }
        else if (part) {
            parent.appendChild(document.createTextNode(part));
        }
    }
}
function renderBodyLine(line) {
    if (line.style === "heading") {
        const el = document.createElement("p");
        el.className = "heading";
        el.textContent = line.text;
        return el;
    }
    if (line.style === "list-item") {
        const el = document.createElement("p");
        el.className = "list-item";
        const check = document.createElement("span");
        check.className = "check";
        check.textContent = "\u2713";
        el.appendChild(check);
        el.appendChild(document.createTextNode(line.text));
        return el;
    }
    const el = document.createElement("p");
    el.className = "body-text";
    appendRichText(el, line.text);
    return el;
}
function removeDialog() {
    dialogRemoved = true;
    currentTouchPointStep = null;
    autoDismissMs = null;
    if (autoDismissTimer !== null) {
        clearTimeout(autoDismissTimer);
        autoDismissTimer = null;
    }
    if (dialogContainer) {
        dialogContainer.remove();
        dialogContainer = null;
    }
}
function startAutoDismissTimer() {
    if (autoDismissMs === null) {
        return;
    }
    const touchPointStep = currentTouchPointStep;
    autoDismissTimer = setTimeout(() => {
        removeDialog();
        if (touchPointStep !== null) {
            sendDialogAction(touchPointStep, DialogAction.AUTO_DISMISS);
        }
    }, autoDismissMs);
}
function stopAutoDismissTimer() {
    if (autoDismissTimer !== null) {
        clearTimeout(autoDismissTimer);
        autoDismissTimer = null;
    }
}
function buildDialog(payload) {
    var _a;
    const host = document.createElement("div");
    host.setAttribute(DIALOG_MARKER_ATTRIBUTE, "");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent =
        DIALOG_STYLES + (isDarkMode() ? DARK_DIALOG_STYLES : LIGHT_DIALOG_STYLES);
    shadow.appendChild(style);
    const dialog = document.createElement("div");
    dialog.id = "dialog";
    const header = document.createElement("div");
    header.id = "header";
    if (payload.logoUrl) {
        const logo = document.createElement("img");
        logo.id = "logo";
        logo.src = payload.logoUrl;
        header.appendChild(logo);
    }
    const title = document.createElement("span");
    title.id = "title";
    title.textContent = payload.title;
    header.appendChild(title);
    dialog.appendChild(header);
    if (payload.showCloseButton) {
        const closeBtn = document.createElement("button");
        closeBtn.id = "close-btn";
        closeBtn.textContent = "\u00d7";
        closeBtn.addEventListener("click", () => {
            sendDialogAction(payload.touchPointStep, DialogAction.CLOSE);
            removeDialog();
        });
        dialog.appendChild(closeBtn);
    }
    for (const line of payload.body) {
        dialog.appendChild(renderBodyLine(line));
    }
    if (payload.ctaButton) {
        const ctaBtn = document.createElement("button");
        ctaBtn.id = "cta-btn";
        ctaBtn.textContent = payload.ctaButton.text;
        const ctaButton = payload.ctaButton;
        ctaBtn.addEventListener("click", () => {
            if (ctaButton.url) {
                window.open(ctaButton.url, "_blank");
            }
            else {
                removeDialog();
            }
            sendDialogAction(payload.touchPointStep, ctaButton.key);
        });
        dialog.appendChild(ctaBtn);
    }
    const links = (_a = payload.links) !== null && _a !== void 0 ? _a : [];
    if (links.length > 0) {
        const linksRow = document.createElement("div");
        linksRow.id = "links-row";
        if (!payload.ctaButton) {
            linksRow.classList.add("no-cta");
        }
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const el = document.createElement("a");
            el.textContent = link.text;
            if (link.url) {
                el.href = link.url;
                el.target = "_blank";
            }
            else {
                el.href = "#";
            }
            el.addEventListener("click", (e) => {
                if (!link.url) {
                    e.preventDefault();
                    removeDialog();
                }
                sendDialogAction(payload.touchPointStep, link.key);
            });
            linksRow.appendChild(el);
            if (i < links.length - 1) {
                const sep = document.createElement("span");
                sep.className = "links-separator";
                sep.textContent = "\u2022";
                linksRow.appendChild(sep);
            }
        }
        dialog.appendChild(linksRow);
    }
    shadow.appendChild(dialog);
    return host;
}
function renderDialog(payload) {
    if (dialogContainer !== null || dialogRemoved) {
        return;
    }
    if (document.querySelector(`[${DIALOG_MARKER_ATTRIBUTE}]`)) {
        return;
    }
    dialogContainer = buildDialog(payload);
    currentTouchPointStep = payload.touchPointStep;
    document.body.appendChild(dialogContainer);
    sendDialogShown(payload.touchPointStep);
    if (payload.autoDismissMs) {
        autoDismissMs = payload.autoDismissMs;
        startAutoDismissTimer();
        dialogContainer.addEventListener("pointerenter", stopAutoDismissTimer);
        dialogContainer.addEventListener("pointerleave", startAutoDismissTimer);
        dialogContainer.addEventListener("focusin", stopAutoDismissTimer);
        dialogContainer.addEventListener("focusout", startAutoDismissTimer);
    }
}
async function start() {
    if (startCalled) {
        return;
    }
    startCalled = true;
    document.addEventListener("visibilitychange", () => {
        const needsCheck = document.visibilityState === "visible" &&
            dialogContainer !== null &&
            document.contains(dialogContainer);
        if (needsCheck) {
            void browser_polyfill.runtime
                .sendMessage({
                type: GET_DIALOG_SHOULD_STILL_SHOW_MESSAGE_TYPE,
                touchPointStep: currentTouchPointStep,
            })
                .then((shouldStillShow) => {
                if (!shouldStillShow) {
                    removeDialog();
                }
            });
        }
    });
    browser_polyfill.runtime.onMessage.addListener(function dismissListener(message) {
        if ((message === null || message === void 0 ? void 0 : message.type) !== DISMISS_DIALOG_MESSAGE_TYPE) {
            return undefined;
        }
        removeDialog();
        browser_polyfill.runtime.onMessage.removeListener(dismissListener);
        return Promise.resolve();
    });
    const ytPremium = await detectYouTubePremium();
    let payload = null;
    try {
        payload = await browser_polyfill.runtime.sendMessage({
            type: GET_DIALOG_MESSAGE_TYPE,
            ytPremium,
        });
    }
    catch (_a) {
        return;
    }
    if (!payload) {
        return;
    }
    renderDialog(payload);
}

;// ../../fragment/fragments/reverse-trial/dist/content/index.js

void start();

/******/ })()
;
//# sourceMappingURL=reverse-trial.preload.js.map
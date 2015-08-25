angular.module('angular-ssqsignon', []).provider('authenticator', function() {

    var module = null,
        client = null,
        whoAmIPromise = null,
        refreshAccessTokenPromise = null,
        apiEndpoint = 'https://ssqsignon.com',
        store = localStore();

    this.init = function(useModule, useClient, customStore, customAPIEndpoint) {
        module = useModule;
        client = useClient;
        if (customStore) {
            store = customStore;
        } else if (typeof(Storage) === "undefined") {
            console.log('Your browser does not support local storage. Please upgrade your browser and proceed.');
        }
        if (customAPIEndpoint) {
            apiEndpoint = customAPIEndpoint;
        }
    };

    this.$get = function($q, $http, $location) {

        return {
            whoAmI: function () {
                if (!whoAmIPromise) {
                    whoAmIPromise = (accessToken() ? whoAmI().catch(getNewAccessToken) : getNewAccessToken())
                        .then(function(data) {
                            whoAmIPromise = null;
                            return data;
                        });
                }
                return whoAmIPromise;
            },

            whoAmIAgain: function(request) {
                return getNewAccessToken()
                    .then(function() {
                        return request ? $http(request) : $q.when();
                    });
            },

            forgetMe: function (keepRefreshToken) {
                return $q.when(clearTokens(keepRefreshToken));
            },

            ssoMaster: {
                safeRedirect: function(denyAccess) {
                    return $q(function(resolve, reject) {
                        $http.get([ apiEndpoint, module, 'saferedirect' ].join('/'), { params: { response_type: 'code', client_id: $location.search().client_id, redirect_uri: $location.search().redirect_uri, scope: $location.search().scope, state: $location.search().state, deny_access: denyAccess }, headers: { Authorization: ['bearer', accessToken()].join(' ') } })
                            .success(function(data) {
                                resolve(data.redirect_uri);
                            })
                            .error(function (data, status) {
                                reject({ data: data, status: status });
                            });
                    })
                        .then(function(redirectUri) {
                            if (window) {
                                window.location.assign(redirectUri);
                            }
                            return redirectUri;
                        });
                }
            },

            ssoSlave: {
                loginWithMaster: function(masterUri, scope, state, callbackUri) {
                    window.location.assign([masterUri, '?client_id=', encodeURI(client), '&redirect_uri=', encodeURI(callbackUri), '&scope=', encodeURI(scope), '&state=', encodeURI(state) ].join(''));
                },

                useTokens: function(accessInfo) {
                    storeTokens({ accessToken: accessInfo.access_token, refreshToken: accessInfo.refresh_token });
                    return whoAmI();
                }
            },

            login: function(username, password) {
                return $q(function(resolve, reject) {
                    $http.post([ apiEndpoint, module, 'auth' ].join('/'), { client_id: client, grant_type: 'password', username: username, password: password })
                        .success(function(data) {
                            resolve({ userId: data.user_id, scope: data.scope, accessToken: data.access_token, refreshToken: data.refresh_token });
                        })
                        .error(function (data, status) {
                            reject({ data: data, status: status });
                        });
                })
                    .then(function(data) {
                        storeTokens(data);
                        return { userId: data.userId, scope: data.scope };
                    });
            },

            accessToken: function() {
                return accessToken();
            }
        };

        function getNewAccessToken() {
            if (!refreshAccessTokenPromise) {
                refreshAccessTokenPromise = (refreshToken() ? refresh().then(storeTokens, askUser) : askUser())
                    .then(function(data) {
                        refreshAccessTokenPromise = null;
                        return data;
                    });
            }
            return refreshAccessTokenPromise;
        }

        function whoAmI() {
            return $q(function(resolve, reject) {
                $http.get([ apiEndpoint, module, 'whoami' ].join('/'), { headers: { Authorization: ['bearer', accessToken()].join(' ') } })
                    .success(function(data) {
                        resolve({ userId: data.user_id, scope: data.scope });
                    })
                    .error(function (data, status) {
                        reject({ data: data, status: status });
                    });
            });
        }

        function refresh() {
            return $q(function (resolve, reject) {
                $http.post([ apiEndpoint, module, 'auth' ].join('/'), { client_id: client, grant_type: 'refresh_token', refresh_token: store.get('refresh_token') })
                    .success(function (data) {
                        resolve({ userId: data.user_id, scope: data.scope, accessToken: data.access_token, refreshToken: data.refresh_token });
                    })
                    .error(function () {
                        reject();
                    });
            });
        }

        function askUser() {
            return $q.reject('ask-user');
        }

        function storeTokens(authorisationResult) {
            store.set('access_token', authorisationResult.accessToken);
            store.set('refresh_token', authorisationResult.refreshToken);
            return authorisationResult;
        }

        function clearTokens(keepRefreshToken) {
            store.remove('access_token');
            if (!keepRefreshToken) {
                store.remove('refresh_token');
            }
        }

        function accessToken() {
            return store.get('access_token');
        }

        function refreshToken() {
            return store.get('refresh_token');
        }
    };

    function localStore() {
        return  {
            get: function(name) {
                return localStorage.getItem(name.toString());
            },
            set: function(name, item) {
                localStorage.setItem(name.toString(), item.toString());
            },
            remove: function(name) {
                localStorage.removeItem(name.toString());
            }
        };
    }
})
    .factory('refreshAccessToken', function ($q, $injector) {
        return {
            responseError: function(response) {
                if (response.status == 401 && response.config.url.search('whoami') == -1) {
                    return $injector.get('authenticator').whoAmIAgain(response.config);
                } else {
                    return $q.reject(response);
                }
            }
        };
    })
    .factory('appendAccessToken', function ($injector) {
        return {
            request: function (config) {
                var token = $injector.get('authenticator').accessToken();
                if (token) {
                    config.headers['Authorization'] = [ 'Bearer', token ].join(' ');
                }
                return config;
            }
        };
    });

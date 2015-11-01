# angular-ssqsignon
SSQ signon authorization helper for Angular Js

## Installation

### Requirements

  - [Angular Js](https://angularjs.org/)
  - A web browser with [HTML5 local storage](http://www.w3schools.com/html/html5_webstorage.asp) support.

### Get the file

    <!-- Reference or download latest version -->
    <script src="//rawgit.com/ssqsignon/angular-ssqsignon/1.0.2/angular-ssqsignon.js"></script>
    
### Add dependency to your project

    var app = angular.module('myModule', [ 'angular-ssqsignon' ]);

## Usage

### Initialze the authentication helper with your module name and client Id.

    app.config(function(authenticatorProvider) {
        authenticatorProvider.init('your-module-name', 1234);
    });
    
### Log in with a username and password, and store the access and refresh tokens

    app.controller('MyCtrl', function($scope, authenticator) {
    
        authenticator.login($scope.username, $scope.password)
          .then(function(access) {
              alert('Yay, I'm logged in!');
          }, function() {
              alert('Oops, somethig went wrong. Check username and password.');
          });
    });
    
### Get the current user based on the access token

    app.controller('MyCtrl', function($scope, authenticator) {
    
      authenticator.whoAmI()
        .then(function(me) {
          alert('User Id: ' + me.userId + ' scope: ' + me.scope);
        }, function(err) {
          return err == 'ask-user' ? login() : $q.reject(err);
        });
    });
    
### Log out (discard the stored access and refresh tokens)

    app.controller('MyCtrl', function($scope, authenticator) {
    
      authenticator.forgetMe()
        .then(function() {
          alert('You were logged out.');
        });
    });
    
### Automatically append the stored access token to all AJAX requests

    app.config(function($httpProvider) {
    
        $httpProvider.interceptors.push('appendAccessToken');
    });
    
### If an AJAX request failed due to an expired access token, automatically swap a refresh token for a new access token (and a new refresh token), and repeat the request.

    app.config(function($httpProvider) {
    
        $httpProvider.interceptors.push('refreshAccessToken');
    });

### Single Sign On (master web app)

#### Safely redirect back to the slave app with the user's authorization code

    app.controller('MyCtrl', function($scope, $location, $q, authenticator) {
    
      if ($location.search().redirect_uri) {
        askAboutAccess()
          .then(function(denyAccess) {
            authenticator.ssoMaster.safeRedirect(denyAccess);
          });
      }
      
      function askAboutAccess() {
        // Always allow access
        return $q.when(false);
      }
    });

### Single Sign On (slave web app)

#### Redirect to the master app for log in

    app.controller('MyCtrl', function($scope, authenticator) {
    
      authenticator.ssoSlave.loginWithMaster('http://my-sso-master-app.com', 'my requested scope', 'my-state', 'http://my-callback-uri');
    });
    
#### Comsume the authorization (or error) code after redirection from the master app.

    app.controller('MyCtrl', function($scope, $location, $q, authenticator) {
    
      if ($location.search().code && $location.search().state) {
        return authenticator.ssoSlave.consumeAuthorizationCode($location.search().code, 'http://my-callback-uri')
            .then(function(me) {
                $location.search('code', undefined);
                $location.search('state', undefined);
                return me;
            });
      } else if ($location.search().error) {
          $location.search('error', undefined);
          return $q.reject('access-denied');
      }
    });
    
#### Configure the authentication helper to work with a token endpoint proxy

     app.config(function(authenticatorProvider) {
            authenticatorProvider.init('your-module-name', 1234, '/my-auth-proxy-url');
        });

## How it works

## Examples

For a complete, working example, refer to the [SSQ signon examples](https://github.com/ssqsignon/ssqsignon-examples) repository.

For an online demo go to [SSQ signon demos](https://ssqsignon.com/home/demos.html)

## Related modules

  - [Angular Js](https://angularjs.org/)
  - [SSQ signon authproxy](https://github.com/ssqsignon/ssqsignon-authproxy)

## Credits

  - [Riviera Solutions](https://github.com/rivierasolutions)

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2015 Riviera Solutions Piotr Wójcik <[http://rivierasoltions.pl](http://rivierasolutions.pl)>

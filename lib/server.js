var express = require('express');
var spotifork = require('./spotifork.js');

// Make app
var app = express();

// Define scopes
var scopes = ['playlist-modify-private', 'playlist-modify-public'];

var spotifyApi = spotifork.spotifyApi;

app.get('/', function(req, res) {
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'test');
    res.send('<a href="' + authorizeURL + '">Click here to give Spotifork permission to create a playlist on your account.</a>');
});

app.get('/callback/', function(req, res) {
    grantAuthCode(req.query.code, function() {
        spotifork.fork('06XXCuXd3xvEtyswvuwwK0', 'jimlevine67', '1262975361');
        //spotifork.merge([['06XXCuXd3xvEtyswvuwwK0', 'jimlevine67'], ['13Q5YLOyS2cfwMbphsuQil', '1262975361']], '1262975361');
        res.send('tested');
    });
});

/**
 * grantAuthCode() sets the authorization code, which causes Spotify to send the
 * access token, refresh token, and time until token expiry in data.body['access_token'],
 * data.body['refresh_token'], and data.body['expires_in'], respectively.
 *
 * @param String code
 *  the authorization code returned as a GET parameter to the callback URL
 * @param Function callback
 *  the function to be called when grantAuthCode finishes
 */
function grantAuthCode(code, callback) {
    spotifyApi.authorizationCodeGrant(code)
        .then(function(data) {

            // Set tokens on API object to be used in later calls
            spotifyApi.setAccessToken(data.body['access_token']);
            spotifyApi.setRefreshToken(data.body['refresh_token']);
            callback();
        }, function(err) {
            console.log('There was an error granting the authorization code: ' + err.message);
            console.log(JSON.stringify(err));
        });
}

// Makes the app listen on port 8888
app.listen(8888, function() {
    console.log('Listening on 8888.');
});

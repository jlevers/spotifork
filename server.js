'use strict';

var express      = require('express');
var path         = require('path');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var request      = require('request');
var spotifork    = require('./lib/spotifork.js'),
    spotifyApi   = spotifork.spotifyApi;

// Define scopes
var scopes = ['playlist-modify-private', 'playlist-modify-public'];

// Make app
var app = express();
var port = process.env.PORT || 8888;

// Middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

//app.use(express.static(__dirname + '/web'));

app.get('/', function(req, res) {

    if (spotifyApi._credentials.accessToken === undefined) {
        console.log('authorize');
        var authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'test');
        res.redirect(authorizeURL);
    } else {
        res.sendFile(path.join(__dirname, 'web', 'index.html'));
    }

});

// When authorization is completed
app.get('/callback/', function(req, res) {
    // Grant authorization tokens and redirect to original form
    spotifork.grantAuthCode(req.query.code, function() {
        res.redirect('/');
    });
});

app.get('/success', function(req, res) {
    res.sendFile('/success.html');
});

// When the main fork/merge form is submitted
app.post('/', function(req, res) {

    // Get info about user
    var retrieveUserInfo = spotifyApi.getMe()
        .then(function(data) {
            var userInfo = data.body;

            // Fork or merge playlist
            if (req.body.action === 'fork') {
                spotifork.fork(req.body.playlistID, req.body.owner, userInfo.id);
            } else if (req.body.action === 'merge') {

            } else {
                console.log('action: ' + req.body.action);
            }

        }, function(err) {
            console.log('There was an error getting user information: ' + err);
        });

    res.redirect('/success?action=' + req.body.action);
});

// Makes the app listen on port 8888
app.listen(port, function() {
    console.log('Listening on ' + port + '.');
});

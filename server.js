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

app.use(express.static(__dirname + '/web'));

app.get('/', function(req, res) {

    res.sendFile('/index.html');

    // If the user has entered info into the form, and then authorized and returned
    // to the form, automatically resubmit the form
    if (req.cookies.spotifork) {
        var postObject = {};

        if (req.cookies.action === 'fork') {

            request.post({
                url: 'http://localhost:8888',
                json: {
                    action: req.cookies.action,
                    playlistID: req.cookies.playlistID,
                    owner: req.cookies.owner
                }
            }, function (err, res, body) {

            });

            // Get rid of cookies
            res.clearCookie('action');
            res.clearCookie('playlistID');
            res.clearCookie('owner');
        } else {

        }

    }

});

// When authorization is completed
app.get('/callback/', function(req, res) {
    // Grant authorization tokens and redirect to original form
    spotifork.grantAuthCode(req.query.code, function() {
        res.redirect('/');
    });
});

app.get('/success/', function(req, res) {
    res.sendFile('/success.html');
})

// When the main fork/merge form is submitted
app.post('/', function(req, res) {
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'test');

    if (spotifyApi._credentials.accessToken === undefined) {
        var spotiforkData = {
            action: req.body.action,
            playlists: []
        }
        for (var i = 1; i < req.body.length; i += 2) {
            spotiforkData[playlists].push([req.body[i], req.body[i + 1]]);
            console.log([req.body[i], req.body[i + 1]]);
        }
        // Set cookies
        res.cookie('spotifork', spotiforkData);
        res.redirect(authorizeURL);
    } else {

        // Get info about user
        var retrieveUserInfo = spotifyApi.getMe()
            .then(function(data) {
                var userInfo = data.body;

                // Fork or merge playlist
                if (req.body.action === 'fork') {
                    spotifork.fork(req.body.playlistID, req.body.owner, userInfo.id);
                } else if (req.body.action === 'merge') {
                    console.log(req.body);
                } else {
                    console.log('action: ' + req.body.action);
                }

            }, function(err) {
                console.log('There was an error getting user information: ' + err);
            });

        res.redirect('/success?action=' + req.body.action);
    }
});

// Makes the app listen on port 8888
app.listen(port, function() {
    console.log('Listening on ' + port + '.');
});

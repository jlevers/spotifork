var express = require('express');
var creds = require('../lib/creds');
var Spotifork = require('../lib/spotifork');
var SpotifyWebApi = require('spotify-web-api-node');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if (req.cookies.accessToken === undefined) {
        var spotifyApi = new Spotifork().spotifyApi;
        var authorizeUrl = spotifyApi.createAuthorizeURL(creds.scopes, 'test');
        res.redirect(authorizeUrl);
    } else {
        res.render('index', {title: 'Spotifork'});
    }
});

router.get('/callback/', function(req, res) {
    var spotifork = new Spotifork();
    // Grant authorization tokens and redirect to original form
    spotifork.grantAuthCode(req.query.code, function(err) {
        if(err) {
            res.redirect('/error?err=' + err.message);
        } else {
            res.cookie('accessToken', spotifork.spotifyApi._credentials.accessToken, {maxAge: 360000});
            res.redirect('/');
        }
    });
});

router.post('/', function(req, res) {
    var spotifork = new Spotifork();
    spotifork.spotifyApi._credentials.accessToken = req.cookies.accessToken;
    var spotifyApi = spotifork.spotifyApi;
    var retrieveUserInfo = spotifyApi.getMe()
        .then(function(data) {
            var userInfo = data.body;

            // Fork or merge playlist
            if (req.body.action === 'fork') {
                spotifork.fork(req.body.playlist, req.body.owner, userInfo.id, null, function(err) {
                    if (err) {
                        res.redirect('/error?err=' + err.message);
                    } else {
                        res.redirect('/success?action=' + req.body.action);
                    }
                });
            } else if (req.body.action === 'merge') {
                spotifork.merge(req.body.playlist, req.body.owner, userInfo.id, null, function(err) {
                    if (err) {
                        return res.redirect('/error?err=' + err.message);
                    } else {
                        return res.redirect('/success?action=' + req.body.action);
                    }
                });
            }

        });
});

router.get('/success/', function(req, res) {
    res.render('success', {action: req.query.action});
});

router.get('/error/', function(req, res) {
    res.render('error', {
        message: req.query.err,
        error: {
            status: 500
        }
    });
});

router.post('/predict/', function(req, res, next) {
    var spotifork = new Spotifork();
    spotifork.spotifyApi._credentials.accessToken = req.cookies.accessToken;
    spotifork.getPredictions(req.body.name, req.body.author, req.body.offset, function(err, data) {
        if (err) {
            return res.redirect('/error?err=' + err.message);
        } else {
            return res.send(data);
        }
    });
});

/*
router.post('/logout/', function(req, res) {
    res.clearCookie('accessToken');
    res.redirect('/');
});
*/

module.exports = router;

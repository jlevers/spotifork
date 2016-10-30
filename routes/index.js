var express = require('express');
var spotifork = require('../lib/spotifork'),
    spotifyApi = spotifork.spotifyApi;
var creds = require('../lib/creds');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if (spotifyApi._credentials.accessToken === undefined) {
        var authorizeUrl = spotifyApi.createAuthorizeURL(creds.scopes, 'test');
        res.redirect(authorizeUrl);
    } else {
        res.render('index', {title: 'Spotifork'});
    }
});

router.get('/callback/', function(req, res) {
    // Grant authorization tokens and redirect to original form
    spotifork.grantAuthCode(req.query.code, function() {
        res.redirect('/');
    });
});

router.post('/', function(req, res) {
    console.log(req.body);
    var retrieveUserInfo = spotifyApi.getMe()
        .then(function(data) {
            var userInfo = data.body;

            // Fork or merge playlist
            if (req.body.action === 'fork') {
                spotifork.fork(req.body.playlist, req.body.owner, userInfo.id);
            } else if (req.body.action === 'merge') {
                spotifork.merge(req.body.playlist, req.body.owner, userInfo.id);
            }
        });

        res.redirect('/success?action=' + req.body.action);
});

router.get('/success/', function(req, res) {
    res.render('success', {action: req.query.action});
});

router.post('/predict/', function(req, res) {
    spotifork.getPredictions(req.body.input, function(data) {
        res.send(data);
    });
});

module.exports = router;

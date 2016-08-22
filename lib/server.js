'use strict';

var express    = require('express');
var path       = require('path');
//var pug        = require('pug');
var spotifork  = require('./spotifork.js'),
    spotifyApi = spotifork.spotifyApi;
var forms      = require('./forms.js');

// Define scopes
var scopes = ['playlist-modify-private', 'playlist-modify-public'];

// Make and configure app
var app = express();
app.set('view engine', 'pug');
app.set('views', '../web/views/');

app.get('/', function(req, res) {
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'test');
    res.send('<a href="' + authorizeURL + '">Click here to give Spotifork permission to create a playlist on your account.</a>');
});

app.get('/callback/', function(req, res) {
    spotifork.grantAuthCode(req.query.code, function() {
        var beginForm1 = '<form id="form-';
        var beginForm2 = '" action="/callback/" method="post">';
        var endForm = '</form>';

        res.send(
            beginForm1 + 'action' + beginForm2 + forms.actionFormRender + endForm
            + '<br>'
            + beginForm1 + 'fork' + beginForm2 + forms.forkFormRender + endForm
            + '<br>'
            + beginForm1 + 'merge' + beginForm2 + forms.forkFormRender + forms.forkFormRender + endForm
        );
        //res.sendFile(path.join(__dirname, '../web/html', 'main.html'));
        //spotifork.fork('06XXCuXd3xvEtyswvuwwK0', 'jimlevine67', '1262975361');
        //spotifork.merge([['06XXCuXd3xvEtyswvuwwK0', 'jimlevine67'], ['13Q5YLOyS2cfwMbphsuQil', '1262975361']], '1262975361');
    });
});

app.post('/callback/', function(req, res) {
    console.log(req.body);
});

// Makes the app listen on port 8888
app.listen(8888, function() {
    console.log('Listening on 8888.');
});

'use strict';

var SpotifyWebApi = require('spotify-web-api-node');
var async         = require('async');
var levenshtein   = require('fast-levenshtein');
var creds         = require('./creds');

function Spotifork() {
    this.spotifyApi = new SpotifyWebApi({
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        redirectUri: creds.redirectUri
    });
}

/**
 * fork() copies playlist to forker's account.
 *
 * @param String playlist
 *  the ID of the playlist to copy
 * @param String owner
 *  the ID of the owner of the original playlist
 * @param forker
 *  the ID of the account to copy the playlist to
 * @param Boolean publicity
 *  an optional parameter determining if the playlist is public or private (defaults to private)
 * @param Function callback
 *  a callback called with success or failure data
 */
Spotifork.prototype.fork = function(playlist, owner, forker, publicity, callback) {
    var tempThis = this;
    this.spotifyApi.getPlaylist(owner, playlist, {'fields': 'id, name'})
        .then(function(data) {
            tempThis.spotifyApi.createPlaylist(forker, 'Fork of ' + data.body.name, { 'public': (publicity !== null ? publicity : false) })
                .then(function(forkData) {

                    // Generate track list
                    tempThis.generateTrackList([data.body.id], [owner], function(err, data) {
                        if (err) {
                            callback({
                                message: 'There was an error generating the track list: ' + err.message
                            });
                        } else {
                            // Copy songs to fork
                            tempThis.copySongs(data.tracks, forkData.body.id, forkData.body.owner.id, function(err) {
                                if (err) {
                                    callback({
                                        message: err.message
                                    });
                                } else {
                                    callback();
                                }
                            });
                        }
                    });
                }, function(err) {
                    callback({
                        message: 'There was an error creating the new playlist: ' + err
                    });
                });
        }, function(err) {
            callback({
                message: 'There was an error getting the original playlist: ' + err
            });
        });
};

/**
 * merge() merges the playlists in playlists together into a single playlist
 * on the account of the person merging them (merger). If only passed a single
 * playlist, works the same as fork() (but probably slower).
 *
 * @param Array playlistIds
 *  an array of playlist IDs
 * @param Array owners
 *  an array of the owners of the playlists being merge
 * @param String merger
 *  the account ID of the person merging the playlists
 * @param Boolean publicity
 *  an optional parameter determining if the playlist is public or private (defaults to false)
 * @param Function callback
 *  callback with errors or nothing
 */
Spotifork.prototype.merge = function(playlistIds, owners, merger, publicity, callback) {
    var spotifyApi = this.spotifyApi;
    var tempThis = this;
    var playlistName = '';
    // Create playlist to merge other playlists into
    this.spotifyApi.createPlaylist(merger, 'temp', { 'public': (publicity !== null ? publicity : false) })
        .then(function(createData) {
            console.log(createData);
            tempThis.generateTrackList(playlistIds, owners, function(err, data) {
                if (err) {
                    callback({
                        message: 'There was an error generating the track list: ' + err.message
                    });
                } else {
                    // Add the names of the merged playlists to the new playlist name
                    spotifyApi.changePlaylistDetails(merger, createData.body.id, {name: 'Merge of ' + data.playlistName}).then(
                        function(newData) {
                            console.log('Updated new playlist name.');
                            callback();
                        }, function(err) {
                            callback({
                                message: 'Could not update playlist name: ' + err
                            });
                        });

                    tempThis.copySongs(data.tracks, createData.body.id, createData.body.owner.id, function(err) {
                        if (err) {
                            callback({
                                message: err.message
                            });
                        }
                    });
                }
            });
        }, function(err) {
            callback({
                message: 'There was an error creating the new playlist: ' + err
            });
        });

};


/**
 * generateTrackList() makes an array containing all the tracks in the playlists passed in playlistIds.
 * Each track is in the format spotify:track:id.
 *
 * @param Array playlistIds
 *  an array of one or more playlist IDs
 * @param Array owners
 *  an array of the user IDs of the owners of the playlists in playlistIds, in the same order as in playlistIds
 * @param Function callback
 *  the function called when generateTrackList is finished running. Takes two args, err and data.
 */
Spotifork.prototype.generateTrackList = function(playlistIds, owners, callback) {
    var spotifyApi = this.spotifyApi;
    var tempThis = this;
    var playlistName = '';
    var trackList = [];
    // Iterate over playlists
    async.forEachOf(playlistIds, function(playlistId, index, playlistIdsCallback) {
        // Get playlist info
        spotifyApi.getPlaylist(owners[index], playlistId /*{'fields': 'name, tracks.items.id, !headers'}*/)
            .then(function(getData) {
                // Make sure no ampersand is added before first playlist name
                if (playlistName.length !== 0) {
                    playlistName += ' & ';
                }

                playlistName += getData.body.name;

                // Copy each track id to trackList in format spotify:track:id
                async.each(getData.body.tracks.items, function(track, tracksCallback) {
                    // If it's not a user uploaded track
                    if (track.track.id !== null) {
                        if (trackList.indexOf('spotify:track:' + track.track.id) === -1) {
                            trackList.push('spotify:track:' + track.track.id);
                        }
                    } else {
                        console.log('A song could not be added because it was uploaded by the playlist owner.');
                    }
                    tracksCallback();
                }, function(err) {
                    if (err) {
                        callback({
                            message: 'There was an error adding a track to trackList: ' + err
                        });
                    } else {
                        playlistIdsCallback();
                    }
                });
            }, function(err) {
                callback({
                    message: 'Playlist name could not be retrieved: ' + err
                });
            });
    }, function(err) {
        if (err) {
            callback({
                message: 'Error processing playlist: ' + err
            });
        } else {
            var data = {
                playlistName: playlistName,
                tracks: trackList
            };
            callback(null, data);
            console.log('All playlists processed successfully.');
        }
    });
};


/**
 * copySongs() copies the songs in tracks to the new playlist
 *
 * @param String tracks
 *  a list of track ids in the format spotify:track:id
 * @param String copy
 *  the id of the playlist being copied to
 * @param String copier
 *  the id of the user who's copying
 * @param Function callback
 *  callback with error or nothing
 */
Spotifork.prototype.copySongs = function(tracks, copy, copier, callback) {
    var spotifyApi = this.spotifyApi;

    var numSongs = tracks.length;
    var placeholder = 0;

    // Adds songs in 100 song batches, since API limits requests to 100 added songs at once
    async.whilst(
        function() { return placeholder < numSongs; },
        function(whilstCallback) {
            // Add tracks found in original to fork
            spotifyApi.addTracksToPlaylist(copier, copy, tracks.slice(placeholder, (placeholder + 100 < numSongs ? placeholder + 100 : numSongs)))
            .then(function(data) {
                placeholder += 100;
                whilstCallback();
            }, function(err) {
                callback({
                    message: 'Error adding tracks to playlist: ' + err
                });
            });
        }, function(err, n) {
            console.log('test');
            if (err) {
                callback({
                    message: err
                });
            } else {
                callback();
            }
        }
    );

};

/**
 * getPredictions() searches for playlists whose names begin with the user's input.
 *
 * @param String name
 *  the name of the playlist that the user has input
 * @param String author
 *  the display name or ID of the author of the playlist that the user has input
 * @param Function callback
 *  callback with data
 */
Spotifork.prototype.getPredictions = function(name, author, callback) {
    var tempThis = this;
    // Get all playlists belonging to author
    this.spotifyApi.getUserPlaylists(author, {limit: 50})
        .then(function(data) {
            var display_name;
            var info = { matches: [] };
            tempThis.spotifyApi.getUser(author)
                .then(function(authorData) {
                    if (authorData.body.display_name !== null) {
                        info.display_name = authorData.body.display_name;
                    }
                }, function(err) {
                    console.log('Error retrieving author\'s profile: ' + err);
                });
            async.forEachOf(data.body.items, function(playlist, index, localCallback) {
                // Get playlists with names similar to what was typed (playlists whose names have at least 80% of the same
                // characters as what was typed)
                if (levenshtein.get(playlist.name.toLowerCase(), name.toLowerCase()) <= parseInt(.2 * name.length)) {
                    info.matches.push(playlist);
                }
                localCallback();
            }, function(err) {  // Runs when async.forEachOf is done
                if (err) {
                    console.log('There was an error iterating over the author\'s playlists: ' + err);
                } else {
                    console.log(info);
                    callback(info);
                }
            });
        }, function(err) {  // Promise error function
            console.log('Error getting user\'s playlists: ' + err);
            callback(err);
        });
};

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
Spotifork.prototype.grantAuthCode = function(code, callback) {
    var tempThis = this;
    this.spotifyApi.authorizationCodeGrant(code)
        .then(function(data) {
            // Set tokens on API object to be used in later calls
            tempThis.spotifyApi.setAccessToken(data.body['access_token']);
            tempThis.spotifyApi.setRefreshToken(data.body['refresh_token']);
            callback();
        }, function(err) {
            console.log('There was an error granting the authorization code: ' + err.message);
            callback({
                message: 'There was an error granting the authorization code: ' + err.message
            });
        });
}

// Exports
module.exports = Spotifork;

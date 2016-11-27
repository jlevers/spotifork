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
                    tempThis.copySongs(data.body.id, owner, forkData, function(err) {
                        if (err) {
                            callback({
                                message: err.message
                            });
                        } else {
                            callback();
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
}

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
    var tempThis = this;
    var playlistName = '';
    // Create playlist to merge other playlists into
    this.spotifyApi.createPlaylist(merger, 'temp', { 'public': (publicity !== null ? publicity : false) })
        .then(function(createData) {
            async.forEachOf(playlistIds, function(playlistId, index, localCallback) {
                // Get playlist name
                tempThis.spotifyApi.getPlaylist(owners[index], playlistId)
                    .then(function(getData) {

                        // Make sure no ampersand is added before first playlist name
                        if (playlistName.length !== 0) {
                            playlistName += ' & ';
                        }

                        playlistName += getData.body.name;

                        // Copy songs from current playlist to new playlist
                        tempThis.copySongs(playlistId, owners[index], createData, function(err) {
                            if(err) {
                                callback({
                                    message: err.message
                                });
                            } else {
                                localCallback();
                            }
                        });
                        //callback();
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
                    console.log('All playlists processed successfully.');
                    // Add the names of the merged playlists to the new playlist name
                    tempThis.spotifyApi.changePlaylistDetails(merger, createData.body.id, {name: 'Merge of ' + playlistName}).then(
                        function(newData) {
                            console.log('Updated new playlist name.');
                            callback();
                        }, function(err) {
                            callback({
                                message: 'Could not update playlist name: ' + err
                            });
                        });
                }
            });
        }, function(err) {
            callback({
                message: 'There was an error creating the new playlist: ' + err
            });
        });

}

/**
 * copySongs() copies the songs from the originalId playlist to the new playlist
 *
 * @param String originalId
 *  the ID of the original playlist
 * @param String owner
 *  the ID of the owner of the original playlist
 * @param Object copy
 *  the object containing data about the playlist songs are being copied to
 * @param Function callback
 *  callback with error or nothing
 */
Spotifork.prototype.copySongs = function(originalId, owner, copy, callback) {
    debugger;
    var tempThis = this;
    // Get tracks from original playlist
    this.spotifyApi.getPlaylistTracks(owner, originalId, {'fields': 'items.track.id'})
        .then(function(tracks) {

            // Make array of tracks in format spotify:track:<trackID>
            var trackList = [];
            async.each(tracks.body.items, function(track, localCallback) {
                // If it's not a user uploaded track
                if (track.track.id !== null) {
                    trackList.push('spotify:track:' + track.track.id);
                } else {
                    console.log('A song could not be added because it was uploaded by the playlist owner.');
                }
                localCallback();
            }, function(err) {
                if (err) {
                    callback({
                        message: 'There was an error adding a track to trackList: ' + err
                    });
                } else {
                    // Add tracks found in original to fork
                    tempThis.spotifyApi.addTracksToPlaylist(copy.body.owner.id, copy.body.id, trackList)
                        .then(function(data) {
                            console.log('Added tracks to playlist');
                            callback();
                        }, function(err) {
                            callback({
                                message: 'Error adding tracks to playlist: ' + err
                            });
                        });
                }
            });
        }, function(err) {
            callback({
                message: 'There was an error copying the songs from the original playlist: ' + err
            });
        });
}

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
    this.spotifyApi.getUserPlaylists(author)
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
                if(err) {
                    console.log('There was an error iterating over the author\'s playlists: ' + err);
                } else {
                    callback(info);
                }
            });
        }, function(err) {  // Promise error function
            console.log('Error getting user\'s playlists: ' + err);
            callback(err);
        });
}

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

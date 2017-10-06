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
        // Get playlist name
        spotifyApi.getPlaylist(owners[index], playlistId, {fields: 'name,tracks.total'})
            .then(function(getData) {

                // Make sure no ampersand is added before first playlist name
                if (playlistName.length !== 0) {
                    playlistName += ' & ';
                }

                playlistName += getData.body.name;

                var numSongs = getData.body.tracks.total;
                var placeholder = 0;

                // Copy songs to trackList in 100 song batches, since Spotify API limits getPlaylistTracks to 100 tracks
                async.whilst(
                    function() { return placeholder < numSongs; },
                    function(whilstCallback) {
                        spotifyApi.getPlaylistTracks(owners[index], playlistId, { offset: placeholder, limit: 100, fields: 'items' })
                            .then(function(trackData) {

                                placeholder += 100;

                                // Copy each track id to trackList in format spotify:track:id
                                async.each(trackData.body.items, function(track, tracksCallback) {
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
                                        whilstCallback();
                                    }
                                });
                            }, function(err) {
                                if (err) {
                                    callback({
                                        message: 'Error making track list: ' + err
                                    });
                                } else {
                                }
                            });
                    }, function(err) {
                        if (err) {
                            callback({
                                message: 'Error making track list: ' + err
                            });
                        } else {
                            playlistIdsCallback();
                        }
                    }
                );

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
 * @param Integer offset
 *  the offset with which to search Spotify playlists (e.g., if offset = 50 and limit = 50, results
 *  51 through 100 will be returned)
 * @param Function callback
 *  callback with data
 */
Spotifork.prototype.getPredictions = function(name, author, callback, offset = 0) {
    var tempThis = this;
    var spotifyApi = this.spotifyApi;
    var info = {
        matches: [],
        offset: offset
    };
    if (author !== '' && author.indexOf(' ') === -1) {
        // Get all playlists belonging to author
        spotifyApi.getUserPlaylists(author, {limit: 50})
            .then(function(data) {

                async.forEachOf(data.body.items, function(playlist, index, localCallback) {
                    // Get playlists with names similar to what was typed (playlists whose names have at least 80% of the same
                    // characters as what was typed)
                    if (levenshtein.get(playlist.name.toLowerCase(), name.toLowerCase()) <= parseInt(.2 * name.length)) {

                        tempThis.getName(author, function(err, data) {
                            if (err) {
                                callback({
                                    message: err.message
                                });
                            } else {
                                info.display_name = data.name;
                            }
                        });

                        info.matches.push(playlist);
                    }
                    localCallback();
                }, function(err) {  // Runs when async.forEachOf is done
                    if (err) {
                        console.log('There was an error iterating over the author\'s playlists: ' + err);
                    } else {
                        callback(info);
                    }
                });
            }, function(err) {  // Promise error function
                console.log('Error getting user\'s playlists: ' + err);
                callback(err);
            });
    } else {
        // Retrieve playlists related to the name the user inputs
        spotifyApi.searchPlaylists(name, { limit: 50, offset: offset})
            .then(function(data) {

                info.next = data.body.playlists.next !== null ? true : false;

                var words = name.split(' ');

                // Loop over playlists returned by API
                async.forEachOf(data.body.playlists.items, function(playlist, index, localCallback) {

                    var count = 0;

                    // Loop over each word in playlist name user inputted
                    async.forEachOf(words, function(word, index, wordCallback) {

                        // If playlist from API contains word from user inputted name, increment count
                        if (playlist.name.toLowerCase().indexOf(word.toLowerCase()) !== -1) {
                            count++;
                        }
                        wordCallback();
                    }, function(err) {
                        if (err) {
                            callback({
                                message: 'Error checking name of playlist against prediction results: ' + err
                            });

                        // If the API playlist name contains all words from the user inputted name, use it as a prediction
                        } else if (count === words.length) {

                            var copyPlaylist = playlist;

                            tempThis.getName(playlist.owner.id, function(err, data) {
                                if (err) {
                                    callback({
                                        message: err.message
                                    });
                                } else {
                                    console.log(data.name);
                                    copyPlaylist.display_name = data.name;
                                }
                            });

                            info.matches.push(copyPlaylist);
                        }
                    });
                    localCallback();
                }, function(err) {  // Runs when async.forEachOf is done
                    if (err) {
                        console.log('There was an error iterating over the author\'s playlists: ' + err);
                    } else {
                        callback(info);
                    }
                });
            }, function(err) {
                callback({
                    message: 'There was an error getting predictions: ' + err
                });
            });
    }
};

/**
 * getName() determines the display name to be used for a given Spotify user. It returns
 * display_name if it exists, and otherwise returns user id.
 *
 * @param String user
 *  the id of the user whose name is being determined
 * @param Function callback
 *  the function to call when getName() is done running. Takes two arguments, err and data
 */
Spotifork.prototype.getName = function(user, callback) {
    this.spotifyApi.getUser(user)
        .then(function(userData) {
            if (userData.body.display_name !== null) {
                callback(null, {name: userData.body.display_name});
            } else {
                callback(null, {name: user});
            }
        }, function(err) {
            callback({
                message: 'Error processing playlist owner\'s name: ' + err
            });
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
};

// Exports
module.exports = Spotifork;

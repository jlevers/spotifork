var SpotifyWebApi = require('spotify-web-api-node');
var async         = require('async');
var creds         = require('./creds.json');

// Define scopes and credentials
var scopes       = ['playlist-modify-public', 'playlist-modify-private'];
var clientId     = creds.clientId;
var clientSecret = creds.clientSecret;
var redirectUri  = creds.redirectUri;

// Set credentials
spotifyApi = new SpotifyWebApi({
    clientId:     clientId,
    clientSecret: clientSecret,
    redirectUri:  redirectUri
});

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
 *  an optional parameter determining if the playlist is public or private (defaults to false)
 */
function fork(playlist, owner, forker, publicity = false) {
    var original = spotifyApi.getPlaylist(owner, playlist, {'fields': 'id, name'})
        .then(function(data) {
            spotifyApi.createPlaylist(forker, 'Fork of ' + data.body.name, {'public': publicity})
                .then(function(forkData) {
                    copySongs(data.body.id, owner, forkData.body);
                }, function(err) {
                    console.log('There was an error creating the new playlist: ' + err);
                });
        }, function(err) {
            console.log('There was an error getting the original playlist: ' + err);
        });
}

/**
 * merge() merges the playlists in playlists together into a single playlist
 * on the account of the person merging them (merger). If only passed a single
 * playlist, works the same as fork() (but probably slower).
 *
 * @param Array playlists
 *  an array of arrays of playlists in the format [[playlistID, owner], [playlistID, owner], ... ]
 * @param String merger
 *  the account ID of the person merging the playlists
 * @param Boolean publicity
 *  an optional parameter determining if the playlist is public or private (defaults to false)
 */
function merge(playlists, merger, publicity = false) {
    var playlistNames = '';

    // Create playlist to merge other playlists into
    var tmp = spotifyApi.createPlaylist(merger, 'temp', {'public': publicity}, {'fields': 'id, owner.id'})
        .then(function(createData) {

            async.each(playlists, function(playlist, callback) {
                // Get playlist name
                var tmp = spotifyApi.getPlaylist(playlist[1], playlist[0], {'fields': 'name'})
                    .then(function(getData) {

                        // Make sure no ampersand is added before first playlist name
                        if (playlistNames.length !== 0) {
                            playlistNames += ' & ';
                        }

                        playlistNames += getData.body.name;

                        // Copy songs from current playlist to new playlist
                        copySongs(playlist[0], playlist[1], createData);
                        callback();
                    }, function(err) {
                        console.log('Playlist name could not be retrieved: ' + err);
                    });


            }, function(err) {
                if (err) {
                    console.log('Error processing playlist: ' + err);
                } else {
                    console.log('All playlists processed successfully.');
                    // Add the names of the merged playlists to the new playlist name
                    spotifyApi.changePlaylistDetails(merger, createData.body.id, 
                        {
                            name: 'Merge of ' + playlistNames,
                            'public': publicity
                        }).then(function(newData) {
                            console.log('Updated new playlist name.');
                        }, function(err) {
                            console.log('Could not update new playlist name: ' + err);
                        });
                }
            });

        }, function(err) {
            console.log('There was an error creating the new playlist: ' + err);
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
 */
function copySongs(originalId, owner, copy) {
    // Get tracks from original playlist
    spotifyApi.getPlaylistTracks(owner, originalId, {'fields': 'items.track.id'})
        .then(function(tracks) {

            // Make array of tracks in format spotify:track:<trackID>
            var trackList = [];
            async.each(tracks.body.items, function(track, callback) {
                // If it's not a user uploaded track
                if (track.track.id !== null) {
                    trackList.push('spotify:track:' + track.track.id);
                } else {
                    console.log('A song could not be added because it was uploaded by the playlist owner.');
                }
                callback();
            }, function(err) {
                if (err) {
                    console.log('There was an error adding a track to trackList: ' + err);
                } else {
                    // Add tracks found in original to fork
                    spotifyApi.addTracksToPlaylist(copy.body.owner.id, copy.body.id, trackList)
                        .then(function(data) {
                            console.log('Added tracks to playlist');
                        }, function(err) {
                            console.log('Error adding tracks to playlist: ' + err);
                        });
                }
            });
        }, function(err) {
            console.log('There was an error copying the songs from the original: ' + err);
        });
}

// Exports
exports.spotifyApi = spotifyApi;
exports.fork       = fork;
exports.merge      = merge

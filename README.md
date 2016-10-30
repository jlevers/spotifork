Spotifork
=========

Spotifork interfaces with the Spotify API, and makes it possible to copy other users' playlists to your own Spotify account, so that you can edit them. It also allows you to merge multiple other playlists into a single playlist on your account. It's still a work in progress.

Installation
-----

1. `git clone git@github.com:TheAtomicGoose/spotifork`
2. `cd spotifork`
3. `npm install`

Setup
-----

`cp lib/creds.example.json lib/creds.json`, then edit `clientId` and `clientSecret` to your own `clientId` and `clientSecret`, which can be created at the [Spotify Developer portal](https://developer.spotify.com).

Usage
-----

1. `npm start`
2. Go to [localhost:8888](http://localhost:8888)
3. Fork away!

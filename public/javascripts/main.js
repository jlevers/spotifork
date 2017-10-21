// Browserify block
var $ = global.jQuery = require('jquery');
var bootstrap = require('bootstrap/dist/js/bootstrap');
var debounce = require('throttle-debounce/debounce');
require('perfect-scrollbar/jquery')($);

// Styles
var bootstrapCSS = require('../../node_modules/bootstrap/dist/css/bootstrap.min.css');
var scrollCSS = require('../../node_modules/perfect-scrollbar/dist/css/perfect-scrollbar.css');
var stylesheet = require('../stylesheets/style.css');


$(document).ready(function() {

    // $('.pred').perfectScrollbar();

    // Show form form
    $('#fork').click(function() {
        $('#form-fork').css('display', 'block');
        $('#form-merge').css('display', 'none');
        $(this).addClass('active');
        $('#merge').removeClass('active', 100);
    });

    // Show merge form
    $('#merge').click(function() {
        $('#form-merge').css('display', 'block');
        $('#form-fork').css('display', 'none');
        $(this).addClass('active');
        $('#fork').removeClass('active', 100);
    });

    // Add another playlist field to merge
    $('#addPlaylist').click(function() {
        var playlist = $('#form-merge #playlists div.playlist:last').clone(true);
        playlist.find('[name="playlistID"]').val('');  // Empty the playlistID input field
        playlist.attr('data-playlist-num', playlist.data('playlist-num') + 1);  // Increment playlist-num data attr
        playlist.appendTo('#playlists');
    });

    // Remove a playlist field from merge
    $('#removePlaylist').click(function() {
        $('#form-merge #playlists div.playlist:last').remove();
    });

    // 450ms since the last input event fired, call the prediction function.
    // Look up debounce vs. throttle, and see header of ./jquery-throttle-debounce.min.js
    $('.playlist input').on('input', debounce(450, function() {

        // Find the correct div.playlist
        var playlistContainer = $(this).parent();

        $(':focus').next().css('height', $(':focus').next().css('height'));


        // If the input field has less than three characters, don't display list container
        if ($(':focus').val().length < 3) {
            $('.pred').css('display', 'none');
            return;
        }

        // Split it into name and author
        var input = $(':focus').val().split(', ');
        var playlistName = input[0];
        var playlistAuthor = '';
        if (input.length > 1) {
            playlistAuthor = input[1];
        }

        var offset = 0;
        var predictData;

        predict(playlistName, playlistAuthor);

        function predict(name, author, offset = 0) {

            // Show loading icon when loading more search results
            // $(document).ajaxStart(function() {
            //     console.log('start');
            //     playlistContainer.find('ul.pred').append('<li class="loading"><img src="../images/loading.svg"></li>');
            // }).ajaxStop(function() {
            //     console.log('end');
            //     playlistContainer.find('.loading').remove();
            // });

            // Ajax call to get predictions using jQuery Ajax
            $.post('/predict/',
                {
                    name: name,
                    author: author,
                    offset: offset
                }, predictCallback);
        }

        function predictCallback(data) {
            if (data.matches.length > 0) {

                if (offset === 0) {
                    // Clear out predictions container
                    $(':focus').next().children().remove();
                }

                data.matches.forEach(function(playlist) {
                    var userName = playlist.owner.display_name;

                    // Preventing errors on users who don't have display names,
                    // usually from users who didn't use Facebook to create their Spotify account
                    if (userName === undefined) {
                        userName = playlist.owner.id;
                    }
                    var pred = '<li data-id="' + playlist.id + '" data-owner="' + playlist.owner.id
                        + '">' + playlist.name + ', ' + userName + '</li>';

                    if (offset > 0) {
                        var children = $(':hover')[$(':hover').length - 2].children;
                        $(children[children.length - 1]).after(pred);
                    } else {
                        $(':focus').next().append(pred);
                    }
                });
                if (offset === 0) {
                    $(':focus').next().css('display', 'block');
                    $(':focus').next().css('height', 'auto');
                }

                // Create scrollbar if it doesn't exist, update it otherwise
                if (playlistContainer.find('.ps__scrollbar-y-rail').length === 0) {
                    playlistContainer.find('.pred').perfectScrollbar();
                } else {
                    playlistContainer.find('.pred').perfectScrollbar('update');
                }
                $('.pred').one('ps-y-reach-end.scrollbar', function() {
                    if (data.next) {
                        offset += 50;
                        predict(playlistName, playlistAuthor, offset);
                    }
                });
            } else {
                $('.pred').css('display', 'none');
                $(':focus').next().css('height', 'auto');
            }
        }
    }));


    // Make sure that the hidden playlist ID and owner fields are filled on submission
    $('.action-form').submit(function(event) {
        var playlists = $(event.target).find('.playlist');

        for (var i = 0; i < playlists.length; i++) {
            playlist = $(playlists[i]);
            var inputName = playlist.find('input[name="playlist"]');
            var inputAuthor = playlist.find('input[name="owner"]');
            if (inputName.val() === '' || inputAuthor.val() === '') {
                var input = playlist.find('.pl-input').val().split(', ');
                var name = input[0], author = input[1];
                inputName.val(name);
                inputAuthor.val(author);
            }
        }
    });

    // Placing listener on ul rather than li because li elements don't exist when page is loaded
    $('ul.pred').on('click', 'li', function(event) {
        var playlist = $(event.target).parent().parent();
        playlist.find('input[name="playlist"]').val($(event.target).data('id'));
        playlist.find('input[name="owner"]').val($(event.target).data('owner'));
        playlist.find('input[name="playlistID"]').val($(event.target).text());
        $('.pred').css('display', 'none');
        // $('ul.pred').children().remove();
    });
});

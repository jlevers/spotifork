$(document).ready(function() {
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

    // Add playlist field to merge
    $('#addPlaylist').click(function() {
        $('#form-merge #playlists div.playlist:first').clone().appendTo('#playlists');
    });

    // Remove playlist field from merge
    $('#removePlaylist').click(function() {
        $('#form-merge #playlists div.playlist:last').remove();
    });

    // 250ms since the last input event fired, call the prediction function.
    // Look up debounce vs. throttle, and see header of ./jquery-throttle-debounce.min.js
    $('.playlist input').on('input', $.debounce(350, function() {
        // If the field contains a comma (aka contains a playlist in the form "Name, Author")
        if ($(':focus').val().indexOf(',') > -1) {

            // Get playlist field value
            $(':focus').next().empty();
            // Split it into name and author
            var input = $(':focus').val().split(', ');
            var name = input[0], author = input[1];

            // Ajax call to get predictions using jQuery Ajax
            $.post('/predict/', 
                {
                    name: name, 
                    author: author
                }, 
                function(data) {
                    if (data.matches) {
                        data.matches.forEach(function(playlist) {
                            var userName = data.display_name;

                            // Preventing errors on users who don't have display names,
                            // usually from users who didn't use Facebook to create their Spotify account
                            if (userName === undefined) {
                                userName = playlist.owner.id;
                            }
                            var pred = '<li data-id="' + playlist.id + '" data-owner="' + playlist.owner.id
                                + '">' + playlist.name + ', ' + userName + '</li>';

                            $(':focus').next().append(pred);
                        });
                    }

                    $(':focus').next().css('display', 'block');
                });
        } else {
            $(':focus').next().css('display', 'none');
        }
    }));

    // Make sure that the hidden playlist ID and owner fields are filled on submission
    $('.action-form').submit(function(event) {
        var playlists = $(event.target).find('.playlist');
        console.log($(playlists[0]));
        // playlists.forEach(function(playlist) {
        //     playlist = $(playlist);
        //     var inputName = playlist.find('input[name="playlist"]');
        //     var inputAuthor = playlist.find('input[name="owner"]');
        //     if (inputName.val() === '' || inputAuthor.val() === '') {
        //         var input = playlist.find('.pl-input').val().split(', ');
        //         var name = input[0], author = input[1];
        //         inputName.val(name);
        //         inputAuthor.val(author);
        //     }
        // });

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
        $('.pred').empty();
    });
});

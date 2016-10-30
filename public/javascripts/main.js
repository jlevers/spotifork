$(document).ready(function() {
    $('#fork').click(function() {
        $('#form-fork').css('display', 'block');
        $('#form-merge').css('display', 'none');
        $(this).addClass('active');
        $('#merge').removeClass('active', 100);
    });
    
    $('#merge').click(function() {
        $('#form-merge').css('display', 'block');
        $('#form-fork').css('display', 'none');
        $(this).addClass('active');
        $('#fork').removeClass('active', 100);
    });

    $('#addPlaylist').click(function() {
        $('#form-merge #playlists div.playlist:first').clone().appendTo('#playlists');
    });

    $('#removePlaylist').click(function() {
        $('#form-merge #playlists div.playlist:last').remove();
    });

    $('.playlist input').on('input', function() {
        if ($(':focus').val().length >= 3) {
            $(':focus').next().empty();
            $.post('/predict/', { input: $(':focus').val() }, function(playlists) {
                // Limit songs in popup
                playlists.slice(0, 6).forEach(function(playlist) {
                    var name = playlist.owner.display_name;
                    if (name === null) {
                        name = playlist.owner.id;
                    }
                    var pred = '<li data-id="' + playlist.id + '" data-owner="' + playlist.owner.id + '">' + playlist.name + ', ' + name + '</li>';
                    $(':focus').next().append(pred);
                });

                $(':focus').next().css('display', 'block');
            });
        } else {
            $(':focus').next().css('display', 'none');
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

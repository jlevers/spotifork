$(document).ready(function() {
    $('#actions').change(function() {
        if ($('#actions').find(':selected').text().toLowerCase() === 'fork') {
            $('#form-fork').css('display', 'block');
            $('#form-merge').css('display', 'none');
        } else {
            $('#form-merge').css('display', 'block');
            $('#form-fork').css('display', 'none');
        }
    });

    $('#addPlaylist').click(function() {
        $('#form-merge #playlists div.playlist:first').clone().appendTo('#playlists');
    });

    $('#removePlaylist').click(function() {
        $('#form-merge #playlists div.playlist:last').remove();
    });
});

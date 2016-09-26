$(document).ready(function() {
    console.log('test');
    var action = window.location.search.substring(window.location.search.indexOf('=') + 1);
    var pluralize = ' playlist was forked';

    if (action === 'merge') {
        pluralize = ' playlists were merged';
    }

    $('#success').text('Your' + pluralize + ' successfully.');
});

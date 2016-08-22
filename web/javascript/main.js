$(document).ready(function() {
    console.log('test');
    $('[id^="form-"]:not(#form-action)').hide();
    $('#form-' + selected).show();
    $('#form-action').change(function() {
        var oldSelected = selected;
        selected = $('#form-action').val();

        $('#form-' + oldSelected).hide();
        $('#form-' + selected).show();
    });
});

'use strict';

var forms = require('forms');
var fields = forms.fields;
var validators = forms.validators;
var widgets = forms.widgets;

// This form selects whether to fork or merge playlists
var actionForm = forms.create({
    actions: fields.string({
        choices: {
            fork: 'Fork',
            merge: 'Merge'
        },
        widget: widgets.select()
    })
});


// This form can be used for both forking and merging
var forkForm = forms.create({
    playlistId: fields.string({required: validators.required('You need a playlist ID!')}),
    owner: fields.string({required: validators.required('The playlist\'s owner is required.')})
});

// Get HTML renders of forms
var actionFormRender = actionForm.toHTML();
var forkFormRender = forkForm.toHTML();

/*var mergeForm = forms.create({
    playlistId1: fields.string({required: validators.required('You need at least two playlist IDs for merging!')}),
    owner1: fields.string({required: validators.required('The playlist\'s owner is required.')})
    playlistId2: fields.string({required: validators.required('You need at least two playlist IDs for merging!')}),
    owner2: fields.string({required: validators.required('The playlist\'s owner is required.')})
});*/

exports.actionFormRender = actionFormRender;
exports.forkFormRender   = forkFormRender;

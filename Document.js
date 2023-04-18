// noinspection JSUnusedLocalSymbols,JSCheckFunctionSignatures

const {Schema, model} = require('mongoose');

const Document = ({
    _id: String,
    data: Object
});

module.exports = model('Document', Document);
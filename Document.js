// noinspection JSUnusedLocalSymbols,JSCheckFunctionSignatures

const {Schema, model} = require('mongoose');

const Document = ({
    _id: String,
    data: String
});

module.exports = model('Document', Document);
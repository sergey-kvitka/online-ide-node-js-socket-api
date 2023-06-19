// noinspection JSValidateTypes,JSUnresolvedFunction,HttpUrlsUsage

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({origin: '*', methods: '*'}));
app.use(express.json());

const mongoose = require('mongoose');
const Document = require('./Document');

const httpPort = 3050;
const socketPort = 3030;
const mongoDbConnect = 'mongodb://localhost/online-ide-files-db';

mongoose.connect(mongoDbConnect, {});

const io = require('socket.io')(socketPort, {cors: {origin: '*', methods: ['*']}});

io.on('connection', socket => {
    socket.on('get-document', async documentId => {
        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);
        console.log(`\tDocument connected (${documentId})`); // ! !

        socket.emit('load-document', document.data);

        socket.on('send-changes', newValue => {
            socket.broadcast.to(documentId).emit('receive-changes', newValue);
        });

        socket.on('save-document', async data => {
            await Document.findByIdAndUpdate(documentId, {data});
        });
    });

    socket.on('get-project-content', async projectId => {
        socket.join(projectId);
        console.log(`Project connected (${projectId})`); // ! !

        socket.on(`project-content-request-${projectId}`, async request => {
            const documentIds = request['fileIds'];
            let documents = await getContent(documentIds);
            socket.emit(`project-content-response-${projectId}`, {
                'documents': documents,
                'buildType': request['buildType']
            });
        });
    });
});

app.all('/', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.route('/getFile/:id').get(async (req, res, _) => {
    const id = req.params.id;
    const document = await getDocumentById(id);
    if (!document) {
        res.status(400).end();
        return;
    }
    const content = document.data;
    if (!content) {
        res.status(400).end();
        return;
    }
    res.status(200).end(content);
});

app.put('/saveFile', async (req, res, _) => {
    const requestBody = req.body;
    const id = requestBody['id'];
    const content = requestBody['content'];
    if (!id || !content) {
        res.status(400).end();
        return;
    }
    await createDocument(id, [...content].join(''));
    res.status(200).end();
});

app.listen(httpPort);

async function findOrCreateDocument(id) {
    if (!id) return;
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({_id: id, data: ''});
}

async function createDocument(id, content) {
    await Document.create({_id: id, data: content});
}

async function getContent(IDs) {
    if (!IDs) return;
    let documents = await Document.find({'_id': {$in: IDs}});
    return documents.map(document => ({
        id: document._id,
        content: document.data.split('\n')
    }));
}

async function getDocumentById(id) {
    // noinspection UnnecessaryLocalVariableJS
    const document = await Document.findById(id);
    return document;
}